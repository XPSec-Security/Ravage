"""
Authentication Module
Authentication system for the administrative server
"""

from functools import wraps
from flask import session, request, redirect, jsonify

class AuthManager:
    def __init__(self, config_loader, logger):
        self.config_loader = config_loader
        self.logger = logger
    
    def validate_credentials(self, username, password):
        config = self.config_loader.get_config()
        if not config:
            return False
        
        operators = config.get('operators', [])
        
        for operator in operators:
            op_name = operator.get('name')
            op_credentials = operator.get('credentials', {})
            op_password = op_credentials.get('password')
            
            if op_name == username and op_password == password:
                return True
        return False
    
    def login_user(self, username):
        from datetime import datetime
        
        session['authenticated'] = True
        session['username'] = username
        session['login_time'] = datetime.now().isoformat()
        self.logger.log_event(f"LOGIN SUCCESS - User '{username}' authenticated")
    
    def logout_user(self):
        username = session.get('username', 'Unknown')
        
        session.clear()
        
        self.logger.log_event(f"LOGOUT - User '{username}' logged out")
    
    def is_authenticated(self):
        return 'authenticated' in session and session['authenticated']
    
    def get_current_user(self):
        return session.get('username', 'Unknown')

def login_required(auth_manager):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not auth_manager.is_authenticated():
                if request.is_json or request.path.startswith('/api/'):
                    return jsonify({"error": "Authentication required"}), 401
                return redirect('/login')
            return f(*args, **kwargs)
        return decorated_function
    return decorator
