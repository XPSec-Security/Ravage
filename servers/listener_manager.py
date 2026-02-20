"""
Listener Manager
Manages runtime C2 listener instances (start/stop/track)
"""

import threading
import errno


def build_listener_config(db_listener, config_loader):
    """Combine a DB listener row with its traffic profile from profile.yaml."""
    profile_id = db_listener['profile_id']
    profile = config_loader.get_profile_by_id(profile_id)
    if not profile:
        raise ValueError(f"Traffic profile '{profile_id}' not found in profile.yaml")
    return {
        'id': db_listener['id'],
        'name': db_listener['name'],
        'bind_host': db_listener['bind_host'],
        'bind_port': db_listener['bind_port'],
        'protocol': db_listener['protocol'],
        'profile_id': profile_id,
        'upstream_host': db_listener.get('upstream_host', 'localhost'),
        'external_host': db_listener.get('external_host', 'localhost'),
        'profile': profile,
        'created_at': db_listener.get('created_at', ''),
        'active': db_listener.get('active', 1),
    }


class ListenerManager:
    def __init__(self, config_loader, logger, db):
        self.config_loader = config_loader
        self.logger = logger
        self.db = db
        # listener_id -> C2Server instance
        self._running = {}

    def start_listener(self, listener_config):
        """Start a C2Server thread for the given listener config dict.

        Returns (success: bool, error_message: str | None).
        Waits up to 3 seconds for the server to confirm it has bound the port.
        """
        from servers.c2_server import C2Server

        listener_id = listener_config['id']
        if listener_id in self._running:
            self.logger.log_event(f"LISTENER - '{listener_id}' already running, skipping")
            return True, None

        try:
            server = C2Server(listener_config, self.config_loader, self.logger)
            startup_event = threading.Event()
            startup_error = []

            thread = threading.Thread(
                target=server.run,
                args=(startup_event, startup_error),
                name=f"c2-{listener_id}",
                daemon=True,
            )
            thread.start()

            # Wait up to 3 s for the server to bind (or fail)
            startup_event.wait(timeout=3.0)

            if startup_error:
                exc = startup_error[0]
                err_str = str(exc)
                # Provide a friendlier message for the most common OS errors
                if isinstance(exc, PermissionError) or getattr(exc, 'errno', None) == errno.EACCES:
                    err_str = (
                        f"Permission denied: cannot bind port {listener_config['bind_port']}. "
                        "Ports below 1024 require elevated privileges (run as root or use authbind)."
                    )
                elif getattr(exc, 'errno', None) == errno.EADDRINUSE:
                    err_str = f"Port {listener_config['bind_port']} is already in use by another process."
                self.logger.log_event(f"LISTENER - Failed to bind '{listener_id}': {err_str}")
                return False, err_str

            self._running[listener_id] = server
            self.logger.log_event(
                f"LISTENER - '{listener_config['name']}' started on "
                f"{listener_config['protocol'].upper()}://0.0.0.0:{listener_config['bind_port']}"
            )
            return True, None
        except Exception as e:
            self.logger.log_event(f"LISTENER - Failed to start '{listener_id}': {e}")
            return False, str(e)

    def start_all_from_db(self):
        """Start a C2Server for every active listener stored in the database."""
        listeners = self.db.get_all_listeners()
        started = 0
        for db_listener in listeners:
            if not db_listener.get('active', 1):
                continue
            try:
                listener_config = build_listener_config(db_listener, self.config_loader)
                ok, err = self.start_listener(listener_config)
                if ok:
                    started += 1
                elif err:
                    self.logger.log_event(
                        f"LISTENER - Could not start '{db_listener.get('id')}': {err}"
                    )
            except Exception as e:
                self.logger.log_event(
                    f"LISTENER - Could not start '{db_listener.get('id')}': {e}"
                )
        return started

    def stop_listener(self, listener_id):
        """Stop and remove the running C2Server for the given listener id."""
        server = self._running.pop(listener_id, None)
        if server is None:
            return False
        try:
            server.stop()
            self.logger.log_event(f"LISTENER - '{listener_id}' stopped")
            return True
        except Exception as e:
            self.logger.log_event(f"LISTENER - Failed to stop '{listener_id}': {e}")
            return False

    def is_running(self, listener_id):
        return listener_id in self._running

    def get_running_ids(self):
        return list(self._running.keys())
