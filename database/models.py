"""
Database Models
Table definitions and database initialization
"""

import sqlite3
import os

DB_FILE = 'agents.db'

def init_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agents (
            uuid TEXT PRIMARY KEY,
            hostname TEXT,
            username TEXT,
            domain TEXT,
            admin TEXT,
            pid INTEGER,
            infected TEXT,
            last_seen TEXT,
            command TEXT,
            cmdout TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print(f"\033[92m[+]\033[0m Database initialized: {DB_FILE}")

def get_database_path():
    return DB_FILE
