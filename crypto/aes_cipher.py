"""
AES Cipher Module
Implementation of AES encryption for communication with agents
Format: Data → Base64 → AES(with random IV) → Base64
"""

import base64
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend

class AESCipher:
    def __init__(self, key=None):
        if key is None:
            key = "12345678901234567890123456789012"
        elif isinstance(key, str):
            key = key.encode('utf-8').ljust(32)[:32]
        else:
            key = key.ljust(32)[:32]
        
        self.key = key
    
    def encrypt(self, data):
        try:
            step1_base64 = base64.b64encode(data.encode('utf-8'))
            iv = os.urandom(16)
            cipher = Cipher(
                algorithms.AES(self.key),
                modes.CBC(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            padder = padding.PKCS7(algorithms.AES.block_size).padder()
            padded_data = padder.update(step1_base64) + padder.finalize()
            encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
            final_data = iv + encrypted_data
            final_result = base64.b64encode(final_data).decode('utf-8')
            
            return final_result
        except Exception as e:
            print(f"\033[91m[ERROR]\033[0m AES - Encryption error: {str(e)}")
            raise
    
    def decrypt(self, data):
        try:
            encrypted_data = base64.b64decode(data.encode('utf-8'))
            iv = encrypted_data[:16]
            ciphertext = encrypted_data[16:]            
            cipher = Cipher(
                algorithms.AES(self.key),
                modes.CBC(iv),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            padded_data = decryptor.update(ciphertext) + decryptor.finalize()
            unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
            unpadded_data = unpadder.update(padded_data) + unpadder.finalize()
            final_result = base64.b64decode(unpadded_data).decode('utf-8')
            
            return final_result
        except Exception as e:
            print(f"\033[91m[ERROR]\033[0m AES - Decryption error: {str(e)}")
            raise

_global_cipher = None

def initialize_cipher_from_config(config_loader):
    global _global_cipher
    try:
        aes_key = config_loader.get_aes_key()
        print(f"\033[92m[+]\033[0m Initializing AES cipher with config key")
        _global_cipher = AESCipher(aes_key)
        return True
    except Exception as e:
        print(f"\033[91m[ERROR]\033[0m Error initializing AES cipher: {e}")
        print(f"\033[93m[WARNING]\033[0m Using default AES key...")
        _global_cipher = AESCipher()
        return False

def get_cipher():
    global _global_cipher
    if _global_cipher is None:
        print(f"\033[93m[WARNING]\033[0m AES Cipher not initialized, using default key...")
        _global_cipher = AESCipher()
    return _global_cipher

def aes_encrypt_decrypt(data, method):
    cipher = get_cipher()
    if method == "encrypt":
        return cipher.encrypt(data)
    else:
        return cipher.decrypt(data)