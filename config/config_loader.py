"""
Config Loader
Module for loading configurations from profiles/profile.yaml
"""

import os
import yaml
import traceback

class ConfigLoader:
    def __init__(self):
        self.config = None
        self.profiles_path = os.path.join('profiles', 'profile.yaml')
    
    def load_config(self):
        try:
            if not os.path.exists(self.profiles_path):
                print(f"\033[91m[ERROR]\033[0m File {self.profiles_path} not found!")
                self._list_profiles_directory()
                return False
            with open(self.profiles_path, 'r', encoding='utf-8') as f:
                content = f.read()
            with open(self.profiles_path, 'r', encoding='utf-8') as f:
                self.config = yaml.safe_load(f)
            if not self.config:
                print(f"\033[91m[ERROR]\033[0m Loaded configuration is empty or None!")
                return False
            self._validate_config()
            self._validate_ssl_config()
            print(f"\033[92m[+]\033[0m Configuration loaded from {self.profiles_path}")
            return True
        except Exception as e:
            print(f"\033[91m[ERROR]\033[0m Error loading configuration: {e}")
            return False
    
    def _validate_ssl_config(self):
        ssl_config = self.get_global_ssl_config()
        if ssl_config.get('enabled', False):
            self._validate_ssl_files('global', ssl_config)
    
    def _validate_ssl_files(self, component, ssl_config):
        cert_file = ssl_config.get('cert_file')
        key_file = ssl_config.get('key_file')
        
        if cert_file and not os.path.exists(cert_file):
            print(f"\033[93m[WARNING]\033[0m SSL cert file not found for {component}: {cert_file}")

        if key_file and not os.path.exists(key_file):
            print(f"\033[93m[WARNING]\033[0m SSL key file not found for {component}: {key_file}")

        if cert_file and key_file and os.path.exists(cert_file) and os.path.exists(key_file):
            print(f"\033[92m[+]\033[0m SSL configuration validated for {component}")
            return True
        return False

    def _list_profiles_directory(self):
        profiles_dir = 'profiles'
        if os.path.exists(profiles_dir):
            files = os.listdir(profiles_dir)
            print(f"\033[92m[+]\033[0m Files in {profiles_dir}: {files}")
        else:
            print(f"\033[91m[ERROR]\033[0m Directory {profiles_dir} does not exist!")

    def _validate_config(self):
        operators = self.config.get('operators', [])
        for i, op in enumerate(operators):
            name = op.get('name', 'N/A')
            has_password = 'credentials' in op and 'password' in op.get('credentials', {})
        teamserver = self.config.get('teamserver', {})
        bind_config = teamserver.get('bind', {})
        admin_port = bind_config.get('port', 6001)
        admin_host = bind_config.get('host', '0.0.0.0')
        response_headers = bind_config.get('response_headers', [])
        listeners = self.config.get('listeners', [])
        for i, listener in enumerate(listeners):
            listener_id = listener.get('id', 'N/A')
            profile = listener.get('profile', {})
            bind_config = profile.get('bind', {})
            listener_port = bind_config.get('port', 'N/A')
            protocol = bind_config.get('protocol', 'http')
            http_config = profile.get('http', {})
            uris = http_config.get('uris', [])

    def get_config(self):
        return self.config
    
    def get_operators(self):
        if not self.config:
            return []
        return self.config.get('operators', [])
    
    def get_teamserver_config(self):
        if not self.config:
            return {}
        return self.config.get('teamserver', {})
    
    def get_global_ssl_config(self):
        if not self.config:
            return {}
        return self.config.get('ssl', {})
    
    def get_teamserver_ssl_config(self):
        return self.get_global_ssl_config()
    
    def get_agent_ssl_config(self):
        return self.get_global_ssl_config()
    
    def get_response_headers(self):
        teamserver = self.get_teamserver_config()
        bind_config = teamserver.get('bind', {})
        return bind_config.get('response_headers', [])
    
    def get_listeners(self):
        if not self.config:
            return []
        return self.config.get('listeners', [])
    
    def get_listener_by_id(self, listener_id):
        listeners = self.get_listeners()
        for listener in listeners:
            if listener.get('id') == listener_id:
                return listener
        return None
    
    def get_agent_profile_config(self):
        listeners = self.get_listeners()
        if listeners:
            return listeners[0].get('profile', {})
        return {}
    def get_agent_response_headers(self):
        profile = self.get_agent_profile_config()
        http_config = profile.get('http', {})
        return http_config.get('response_headers', [])
    
    def get_agent_request_headers(self):
        profile = self.get_agent_profile_config()
        http_config = profile.get('http', {})
        return http_config.get('request_headers', [])
    
    def get_agent_user_agent(self):
        profile = self.get_agent_profile_config()
        http_config = profile.get('http', {})
        return http_config.get('user_agent', '')
    
    def get_agent_upstream_hosts(self):
        profile = self.get_agent_profile_config()
        upstream_config = profile.get('upstream', {})
        return upstream_config.get('hosts', [])
    
    def get_agent_uris(self):
        profile = self.get_agent_profile_config()
        http_config = profile.get('http', {})
        return http_config.get('uris', [])
    
    def get_primary_agent_uri(self):
        uris = self.get_agent_uris()
        if uris:
            return uris[0]
        return '/main.c76af346.css'
    
    def get_aes_key(self):
        key_dropper = self.config.get('aes_key', [])
        if key_dropper and len(key_dropper) > 0:
            data = key_dropper[0].get('data', {})
            # Get the AES key, ensuring it's at least 32 characters
            key = data.get('key', '12345678901234567890123456789012')
            # Pad the key to ensure it's at least 32 bytes (for AES-256)
            if len(key) < 32:
                key = key.ljust(32, '0')
            return key
        return '12345678901234567890123456789012'  # Default 32-byte key
    
    def get_agent_sleep_time(self):
        agent_config = self.config.get('agent', {})
        return agent_config.get('sleep_time', 6)
    
    def get_agent_jitter(self):
        agent_config = self.config.get('agent', {})
        jitter = agent_config.get('jitter', 0)
        return max(0, min(100, jitter))
    
    def get_agent_debug_mode(self):
        agent_config = self.config.get('agent', {})
        return agent_config.get('debug', False)
    
    def is_ssl_enabled(self):
        return self.get_global_ssl_config().get('enabled', False)