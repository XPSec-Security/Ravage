function openTab(uuid) {
    if (document.getElementById('tab-' + uuid)) {
        document.getElementById('tab-' + uuid).scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const tabs = document.getElementById('tabs');
    if (tabs.children.length === 1 && tabs.children[0].className.includes('text-center')) {
        tabs.innerHTML = '';
    }

    const tab = createConsoleTab(uuid);
    tabs.appendChild(tab);
    tab.scrollIntoView({ behavior: 'smooth' });
}

function createConsoleTab(uuid) {
    const agent = currentAgents[uuid];
    if (!agent) return null;

    const tab = document.createElement('div');
    tab.id = 'tab-' + uuid;
    tab.className = 'console-tab p-6';
    
    tab.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-3">
                <div class="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                <h3 class="text-xl font-bold text-white">
                    ${agent.hostname || 'Unknown'} 
                </h3>
                <span class="text-sm text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                    ${agent.username || 'Unknown'}@${agent.domain || 'WORKGROUP'}
                </span>
            </div>
            <button onclick="closeTab('${uuid}')" class="text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-30 px-3 py-1 rounded transition-all duration-200">
                ✕ Close
            </button>
        </div>
        
        <div class="mb-6">
            <div class="border-b border-gray-700 flex">
                <button 
                    onclick="switchAgentTab('${uuid}', 'console')" 
                    id="console-tab-btn-${uuid}" 
                    class="px-4 py-3 text-blue-400 border-b-2 border-blue-500 font-medium">
                    Console
                </button>
                <button 
                    onclick="switchAgentTab('${uuid}', 'screenshot')" 
                    id="screenshot-tab-btn-${uuid}" 
                    class="px-4 py-3 text-gray-400 hover:text-gray-300">
                    Screenshot
                </button>
            </div>
        </div>
        
        <div id="console-content-${uuid}">
            <div class="bg-black rounded-lg border border-gray-600 overflow-hidden shadow-lg">
                <div class="bg-gray-800 px-4 py-3 text-sm text-gray-300 border-b border-gray-600 flex justify-between items-center">
                    <span class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        Console
                    </span>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-mono bg-gray-700 px-2 py-1 rounded">UUID: ${uuid.substring(0, 8)}...</span>
                        <button onclick="sendQuickHelp('${uuid}')" class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-all duration-200 flex items-center gap-1" title="Show commands (F1 or Ctrl+H)">
                            Help
                        </button>
                    </div>
                </div>
                <div class="console-container h-96">
                    <pre id="console-output-${uuid}" class="text-green-400 p-4 text-sm leading-relaxed h-full overflow-y-auto" style="font-family: 'Courier New', monospace;">${agent.cmdout || 'Console started.\n\nType "help" to see available commands.\nShortcuts: F1 or Ctrl+H for quick help.'}</pre>
                    <div class="console-input-line flex items-center px-4 pb-2 w-full">
                        <span class="text-green-400 mr-2">></span>
                        <input 
                            type="text" 
                            id="command-input-${uuid}" 
                            class="flex-1 bg-black border-none text-green-400 p-0 focus:outline-none text-sm"
                            placeholder="Type command here..." 
                            autocomplete="off"
                            onkeydown="handleConsoleInput(event, '${uuid}')"
                            style="font-family: 'Courier New', monospace;"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div id="screenshot-content-${uuid}" class="hidden">
            <div class="bg-black rounded-lg border border-gray-600 overflow-hidden shadow-lg h-96">
                <div class="bg-gray-800 px-4 py-3 text-sm text-gray-300 border-b border-gray-600 flex justify-between items-center">
                    <span class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        Screenshot Viewer
                    </span>
                    <button 
                        onclick="checkExistingScreenshot('${uuid}')" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-all duration-200 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                        </svg>
                        Refresh
                    </button>
                </div>
                <div id="screenshot-container-${uuid}" class="flex h-full items-center justify-center">
                    <div class="text-center text-gray-500 w-full">
                        <p>No screenshot available</p>
                        <p class="text-sm mt-2">To view screenshot, run 'screenshot' command</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const commandInput = document.getElementById(`command-input-${uuid}`);
        if (commandInput) {
            commandInput.focus();
        }
    }, 100);
    
    return tab;
}

function handleConsoleInput(event, uuid) {
    const commandInput = document.getElementById(`command-input-${uuid}`);
    
    if (event.key === 'Enter') {
        event.preventDefault();
        const command = commandInput.value.trim();
        
        if (command) {
            sendCommand(uuid, command);
            commandInput.value = '';
        }
    } else if (event.key === 'F1') {
        event.preventDefault();
        commandInput.value = '';
        sendCommand(uuid, 'help');
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        sendQuickHelp(uuid);
    }
}

async function sendCommand(uuid, command) {
    if (!command) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('command', command);

        const consoleOutput = document.getElementById(`console-output-${uuid}`);
        const currentOutput = consoleOutput.textContent;
        
        if (command.toLowerCase() === 'help') {
            consoleOutput.textContent = currentOutput + `\n\n> ${command}\n[Loading documentation...]`;
        } else {
            consoleOutput.textContent = currentOutput + `\n\n> ${command}\n[Command sent to agent, waiting for response...]`;
        }

        const response = await fetch(`${CONFIG.API.COMMAND}/${uuid}`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            if (command.toLowerCase() === 'help') {
                setTimeout(fetchData, 200);
            } else {
                setTimeout(fetchData, 500);
            }
            
            const commandInput = document.getElementById(`command-input-${uuid}`);
            if (commandInput) {
                commandInput.focus();
            }
        } else {
            alert('Error sending command');
        }
    } catch (error) {
        alert('Error sending command');
    }
}

async function sendQuickHelp(uuid) {
    try {
        const formData = new FormData();
        formData.append('command', 'help');

        const consoleOutput = document.getElementById(`console-output-${uuid}`);
        const currentOutput = consoleOutput.textContent;
        consoleOutput.textContent = currentOutput + `\n\n> help\n[Loading command list...]`;

        const response = await fetch(`${CONFIG.API.COMMAND}/${uuid}`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            setTimeout(fetchData, 150);
            
            const commandInput = document.getElementById(`command-input-${uuid}`);
            if (commandInput) {
                commandInput.focus();
            }
        } else {
            consoleOutput.textContent = currentOutput + `\n\n> help\n[Error loading help]`;
            alert('Error requesting help');
        }
    } catch (error) {
        const consoleOutput = document.getElementById(`console-output-${uuid}`);
        const currentOutput = consoleOutput.textContent;
        consoleOutput.textContent = currentOutput + `\n\n> help\n[Connectivity error]`;
        alert('Error requesting help');
    }
}

function closeTab(uuid) {
    const tab = document.getElementById('tab-' + uuid);
    if (tab) {
        tab.remove();
        
        const tabs = document.getElementById('tabs');
        if (tabs.children.length === 0) {
            tabs.innerHTML = `
                <div class="text-center text-gray-400 mt-8 p-8 floating-window">
                    <p class="text-lg">Click "Interact" in the table to open the agent's terminal</p>
                    <p class="text-sm mt-2 opacity-75">Terminals will appear here as independent windows</p>
                </div>
            `;
        }
    }
}

function updateTabOutputs(agents) {
    agents.forEach(agent => {
        const tab = document.getElementById(`tab-${agent.uuid}`);
        if (tab) {
            const consoleOutput = document.getElementById(`console-output-${agent.uuid}`);
            if (consoleOutput) {
                const oldScroll = consoleOutput.scrollTop;
                
                consoleOutput.textContent = agent.cmdout || 'Waiting for commands...';
                
                consoleOutput.scrollTop = oldScroll;
                
                setTimeout(() => {
                    const commandInput = document.getElementById(`command-input-${agent.uuid}`);
                    if (commandInput) {
                        commandInput.focus();
                    }
                }, 50);
            }
        }
    });
}
