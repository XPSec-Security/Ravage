"""
Screen Stream Server
TCP server that receives JPEG frames from agents for live screen viewing.

Protocol:
  Agent → Server handshake: [4-byte BE uint32 uuid_len][uuid_bytes]
  Agent → Server frames:    [4-byte BE uint32 frame_len][jpeg_bytes] (loop)
"""

import socket
import struct
import threading


class ScreenStreamServer:
    def __init__(self, host="0.0.0.0", port=7331, logger=None):
        self.host = host
        self.port = port
        self.logger = logger
        self._lock = threading.Lock()
        self._latest_frames = {}       # uuid -> bytes
        self._active_conns = {}        # uuid -> socket
        self._server_socket = None
        self._running = False
        self._thread = None

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._accept_loop, daemon=True)
        self._thread.start()
        if self.logger:
            self.logger.log_event(f"SCREEN STREAM - TCP server listening on port {self.port}")

    def stop(self):
        self._running = False
        if self._server_socket:
            try:
                self._server_socket.close()
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _accept_loop(self):
        try:
            self._server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self._server_socket.bind((self.host, self.port))
            self._server_socket.listen(10)
            self._server_socket.settimeout(1.0)

            while self._running:
                try:
                    conn, addr = self._server_socket.accept()
                    t = threading.Thread(
                        target=self._handle_agent,
                        args=(conn, addr),
                        daemon=True,
                    )
                    t.start()
                except socket.timeout:
                    continue
                except Exception:
                    if self._running:
                        continue
                    break
        except Exception as e:
            if self.logger:
                self.logger.log_event(f"SCREEN STREAM - Server error: {e}")

    def _handle_agent(self, conn, addr):
        uuid = None
        try:
            conn.settimeout(30.0)

            # Handshake: 4-byte BE length + UUID bytes
            uuid_len_bytes = self._recv_exact(conn, 4)
            if not uuid_len_bytes:
                return
            uuid_len = struct.unpack(">I", uuid_len_bytes)[0]
            if uuid_len == 0 or uuid_len > 64:
                return
            uuid_bytes = self._recv_exact(conn, uuid_len)
            if not uuid_bytes:
                return
            uuid = uuid_bytes.decode("utf-8", errors="replace").strip()

            if self.logger:
                self.logger.log_event(
                    f"SCREEN STREAM - Agent {uuid[:8]} streaming from {addr[0]}"
                )

            with self._lock:
                old = self._active_conns.get(uuid)
                if old:
                    try:
                        old.close()
                    except Exception:
                        pass
                self._active_conns[uuid] = conn

            conn.settimeout(10.0)

            # Receive frames
            while self._running:
                len_bytes = self._recv_exact(conn, 4)
                if not len_bytes:
                    break
                frame_len = struct.unpack(">I", len_bytes)[0]
                if frame_len == 0 or frame_len > 5 * 1024 * 1024:
                    break
                frame_data = self._recv_exact(conn, frame_len)
                if not frame_data:
                    break
                with self._lock:
                    self._latest_frames[uuid] = frame_data

        except Exception:
            pass
        finally:
            try:
                conn.close()
            except Exception:
                pass
            if uuid:
                with self._lock:
                    if self._active_conns.get(uuid) is conn:
                        self._active_conns.pop(uuid, None)
                if self.logger:
                    self.logger.log_event(
                        f"SCREEN STREAM - Agent {uuid[:8]} disconnected"
                    )

    def _recv_exact(self, conn, n):
        data = b""
        while len(data) < n:
            try:
                chunk = conn.recv(n - len(data))
                if not chunk:
                    return None
                data += chunk
            except Exception:
                return None
        return data

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_latest_frame(self, uuid):
        with self._lock:
            return self._latest_frames.get(uuid)

    def is_streaming(self, uuid):
        with self._lock:
            return uuid in self._active_conns

    def stop_stream(self, uuid):
        with self._lock:
            conn = self._active_conns.pop(uuid, None)
            self._latest_frames.pop(uuid, None)
        if conn:
            try:
                conn.close()
            except Exception:
                pass

    def get_active_streams(self):
        with self._lock:
            return list(self._active_conns.keys())
