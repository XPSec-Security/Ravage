"""
Seed script - Generate 30 fake infected agents for dashboard testing
"""

import sqlite3
import hashlib
import random
from datetime import datetime, timedelta

from database.models import init_database, get_database_path

HOSTNAMES = [
    "WS-PC001", "WS-PC002", "WS-PC003", "DC-PRIMARY", "DC-BACKUP",
    "SRV-FILE01", "SRV-MAIL01", "SRV-WEB01", "SRV-SQL01", "SRV-APP01",
    "HR-PC010", "HR-PC011", "FIN-PC020", "FIN-PC021", "FIN-PC022",
    "DEV-PC030", "DEV-PC031", "DEV-PC032", "DEV-PC033", "DEV-PC034",
    "MKT-PC040", "MKT-PC041", "EXEC-PC050", "EXEC-PC051", "IT-PC060",
    "IT-PC061", "IT-PC062", "KIOSK-01", "RECEP-PC01", "LAB-PC070",
]

USERNAMES = [
    "jsmith", "agarcia", "mwilson", "rjohnson", "klee",
    "admin", "svc_backup", "pthompson", "lrodriguez", "dkim",
    "nmartinez", "bclark", "jlopez", "twalker", "ahernandez",
    "cmorris", "mrobinson", "jallen", "syoung", "rking",
    "dwright", "shill", "ascott", "pgreen", "tbaker",
    "jadams", "mnelson", "ccarter", "rmitchell", "lperez",
]

DOMAINS = [
    "CORP.LOCAL", "CORP.LOCAL", "CORP.LOCAL", "CORP.LOCAL",
    "ACME.INT", "ACME.INT", "ACME.INT",
    "DEVNET.IO", "DEVNET.IO",
    "WORKGROUP",
]

now = datetime.now()


def make_uuid(hostname, username):
    raw = f"{hostname}-{username}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def random_timestamp(min_hours_ago, max_hours_ago):
    delta = timedelta(seconds=random.randint(min_hours_ago * 3600, max_hours_ago * 3600))
    return (now - delta).strftime("%Y-%m-%d %H:%M:%S")


def main():
    init_database()
    db_path = get_database_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM agents")

    agents = []
    for i in range(30):
        hostname = HOSTNAMES[i]
        username = USERNAMES[i]
        domain = random.choice(DOMAINS)

        is_server = hostname.startswith(("DC-", "SRV-"))
        is_admin_user = username in ("admin", "svc_backup") or hostname.startswith("DC-")
        admin = "y" if is_admin_user or random.random() < 0.2 else "n"

        pid = random.randint(1000, 65000)
        infected = random_timestamp(2, 72)

        # 12 agents online (last_seen < 30s), rest offline at various times
        if i < 12:
            seconds_ago = random.randint(1, 30)
            last_seen = (now - timedelta(seconds=seconds_ago)).strftime("%Y-%m-%d %H:%M:%S")
        else:
            last_seen = random_timestamp(0, 48)

        uuid = make_uuid(hostname, username)

        agents.append((uuid, hostname, username, domain, admin, pid, infected, last_seen))

    cursor.executemany(
        "INSERT OR REPLACE INTO agents (uuid, hostname, username, domain, admin, pid, infected, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        agents,
    )

    conn.commit()
    conn.close()

    online = sum(1 for a in agents if (now - datetime.strptime(a[7], "%Y-%m-%d %H:%M:%S")).total_seconds() < 60)
    admins = sum(1 for a in agents if a[4] == "y")

    print(f"\033[92m[+]\033[0m Seeded {len(agents)} agents ({online} online, {admins} admins)")
    print()
    print(f"  {'UUID':<18} {'HOSTNAME':<14} {'USER':<14} {'DOMAIN':<12} {'ADM':>3}  {'PID':>5}  STATUS")
    print(f"  {'─'*18} {'─'*14} {'─'*14} {'─'*12} {'─'*3}  {'─'*5}  {'─'*7}")
    for uuid, host, user, domain, admin, pid, inf, ls in agents:
        delta = (now - datetime.strptime(ls, "%Y-%m-%d %H:%M:%S")).total_seconds()
        status = "\033[92monline\033[0m" if delta < 60 else "\033[91moffline\033[0m"
        print(f"  {uuid:<18} {host:<14} {user:<14} {domain:<12} {admin:>3}  {pid:>5}  {status}")


if __name__ == "__main__":
    main()