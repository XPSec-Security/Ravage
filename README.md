<div align="center">
  <img src="images/ravage-home.png" alt="RAVAGE Logo" width="500"/>
  <h3>Ravage Framework | PowerShell Weaponized</h3>
  <p>stay stealth.</p>
</div>

## Overview

**Ravage Framework** is a Command & Control (C2) framework designed for cybersecurity professionals, red teams, and penetration testers. It provides a secure, modular architecture with dynamic configuration, strong encryption, and advanced evasion techniques to simulate realistic attack scenarios, created by XPSec Security.

## Key Features

- **Modular Architecture**: Clear separation between C2 server, admin interface, and agents
- **End-to-End Encryption**: Full SSL/TLS support with AES-256 encryption and random IV
- **Multi-Layer Obfuscation**: Advanced PowerShell and HTA obfuscation techniques
- **Interactive Dashboard**: Modern web interface with real-time agent monitoring
- **Dynamic Listener Management**: Create, start, and delete C2 listeners from the web panel at runtime
- **Traffic Profiles**: Reusable HTTP traffic patterns (headers, URIs, user-agent) assigned per listener
- **Secure File Operations**: Encrypted file transfer capabilities
- **Traffic Masquerading**: Header spoofing and content mimicking
- **Timing Randomization**: Configurable jitter for agent communication
- **In-Memory Execution**: Minimized disk operations to reduce forensic footprint

## Project Screenshots

<div align="center">
  <img src="images/img_01.png" alt="Dashboard View" width="600"/>
  <p><em>Graph view</em></p>

  <img src="images/img_02.png" alt="Command Execution" width="600"/>
  <p><em>List view</em></p>
</div>

## Installation Guide

### Prerequisites

- Python 3.8+
- OpenSSL (for SSL certificate generation)

### Step-by-Step Setup

1. **Clone the repository**
```bash
git clone https://github.com/XPSec-Security/Ravage.git
cd Ravage
```

2. **Create and activate virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Create SSL certificates**
```bash
mkdir certs
# For development/testing (self-signed)
openssl req -x509 -newkey rsa:4096 -keyout certs/server.key -out certs/server.crt -days 365 -nodes

# For production environments, use Let's Encrypt or proper CA-signed certificates
```

5. **Configure the framework**
```bash
cp profiles/profile.yaml.example profiles/profile.yaml
# Edit profiles/profile.yaml with your settings (see Configuration section)
```

6. **Launch the framework**
```bash
python main.py
```

## Configuration in Depth

The Ravage framework uses a single YAML configuration file located at `profiles/profile.yaml`.

### Core Configuration (`profile.yaml`)

```yaml
teamserver:
  bind:
    host: "0.0.0.0"      # Admin interface binding address
    port: 2053           # Admin interface port
    response_headers:    # Custom headers for disguising server identity
      - "Server: Microsoft-IIS/8.5"
      - "X-Powered-By: ASP.NET"

agent:
  sleep_time: 6          # Time in seconds between agent check-ins
  jitter: 20             # Random timing variation (percent)
  debug: false           # Enable/disable debug mode in agent
  stream_port: 7331      # TCP port used by screenwatch for live screen streaming

operators:
  - name: "operator1"
    credentials:
      password: "secure_password"  # Use strong passwords in production

aes_key:
  - data:
      key: "s3cure_AES_Key_Must_Be_32_Chars_Long"  # AES key for encryption (32+ chars)

ssl:
  enabled: true          # Enable SSL/TLS
  cert_file: "certs/server.crt"
  key_file: "certs/server.key"
  ssl_version: "TLSv1_2"
  ciphers: "HIGH:!aNULL:!MD5"

# Traffic profiles — define HTTP traffic patterns reused by listeners
profiles:
  - id: "default"
    description: "Default profile"
    http:
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      uris:
        - "/account/login"    # Agent communication endpoint
        - "/search/?q=rvge"   # Dropper delivery endpoint
      request_headers:
        - "Accept: */*"
        - "Referer: https://google.com/"
      response_headers:
        - "content-type: text/html; charset=utf-8"
        - "server: cloudflare"
        - "cf-cache-status: HIT"
```

### Traffic Profiles

Profiles define the HTTP traffic pattern for a listener. You can define as many profiles as needed and assign them to different listeners via the web panel. Three built-in profiles are included in `profile.yaml.example`:

| Profile ID | Description |
|------------|-------------|
| `default` | Generic HTTP traffic with Cloudflare-like response headers |
| `youtube` | Mimics YouTube video browsing traffic |
| `teams` | Mimics Microsoft Teams API traffic |


## Command Reference

| Category | Command | Description | Example |
|----------|---------|-------------|---------|
| **File Ops** | `upload` | Upload file to server | `upload C:\Windows\important.txt` |
| | `download` | Download file from agent | `download https://example.com/file.txt C:\path\to\save` |
| | `list` | List directory contents | `list C:\Users\Administrator\Desktop` |
| | `delete` | Delete file or directory | `delete C:\temp\evidence.txt` |
| | `fcopy` | Copy file or directory | `fcopy C:\temp\evidence.txt C:\exfil\loot.txt` |
| | `mkdir` | Create a directory | `mkdir C:\l00t` |
| **Process Mgmt** | `plist` | List running processes | `plist` |
| | `pkill` | Kill process by ID | `pkill 1234` |
| | `pname` | Find process by name | `pname explorer` |
| **PowerShell** | `shell` | Execute in isolated runspace | `shell Get-WmiObject Win32_OperatingSystem` |
| | `execute` | Execute local binary file | `execute C:\path\to\file.exe` |
| **Recon** | `screenshot` | Capture full screen or specific process window | `screenshot` or `screenshot 1234` |
| | `screenwatch` | Start/stop real-time screen streaming to dashboard | `screenwatch on` / `screenwatch off` |
| | `who` | Basic user information | `who` |
| **Task Management** | `jobs` | List or cancel queued tasks (server-side) | `jobs list` / `jobs kill 7` |
| **Stealth** | `asleep` | Adjust sleep interval | `asleep 10` (10s) |
| | `exit` | Terminate agent | `exit` |
| **Lateral Movement** | `make_token` | Create authentication token | `make_token DOMAIN\User:Password` |
| | `rev2self` | Reset process token to current user | `rev2self` |
| | `smb_exec` | Execute command via SMB | `smb_exec TARGET "whoami"` or `smb_exec TARGET "ipconfig /all" DOMAIN\User:Password` |
| | `wmi_exec` | Execute command via WMI | `wmi_exec TARGET "whoami"` or `wmi_exec TARGET "ipconfig /all" DOMAIN\User:Password` |

### Command Notes

- **`screenshot [pid]`** — Omit `pid` for a full virtual-screen capture. Pass a process ID to capture that process's window only (uses `PrintWindow`, works even when the window is minimized or off-screen).
- **`screenwatch on|off`** — The C2 opens a dedicated TCP port (`stream_port` in `profile.yaml`, default `7331`). The agent connects from a background Runspace and continuously streams JPEG frames. The live feed is visible in the **Live View** tab of the agent panel. Run `screenwatch off` to stop streaming and close the connection.
- **`jobs list`** — Server-side only. Displays all queued, dispatched, and completed tasks for the agent with their ID, timestamp, operator, and status.
- **`jobs kill <id>`** — Cancels a queued or in-flight task by its ID before the agent executes it. Has no effect on already-completed tasks.

## Community

Join our community for support, updates, and collaboration:

- 🐛 [Discord](https://discord.gg/PXXDMzAxWM)

## ⚠️ Disclaimer

 Ravage is designed for legal security testing and educational purposes only. Users are responsible for complying with all applicable laws. The developers assume no liability for misuse of this software.
