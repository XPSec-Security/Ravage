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
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS command_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            command TEXT NOT NULL,
            output TEXT DEFAULT '',
            operator TEXT DEFAULT '',
            status TEXT DEFAULT 'completed',
            timestamp TEXT NOT NULL,
            FOREIGN KEY (uuid) REFERENCES agents(uuid) ON DELETE CASCADE
        )
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_history_uuid ON command_history(uuid)
    ''')
    # Migration: add status column to existing databases
    try:
        cursor.execute('ALTER TABLE command_history ADD COLUMN status TEXT DEFAULT "completed"')
    except sqlite3.OperationalError:
        pass  # Column already exists
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_history_uuid_status ON command_history(uuid, status)
    ''')
    conn.commit()
    conn.close()
    print(f"\033[92m[+]\033[0m Database initialized: {DB_FILE}")

def get_database_path():
    return DB_FILE
