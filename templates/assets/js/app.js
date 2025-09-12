async function fetchData() {
    try {
        const response = await fetch(CONFIG.API.DATA);
        const data = await response.json();

        if (currentView === 'table') {
            updateAgentsTable(data.agents);
        } else {
            updateNetworkGraph(data.agents);
        }

        updateEventLog(data.events);
        updateTabOutputs(data.agents);

        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

function initializeDataPolling() {
    fetchData();
    setInterval(fetchData, CONFIG.UPDATE_INTERVAL);
}

function setupGlobalEventListeners() {
    const modal = document.getElementById('agentGeneratorModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAgentGenerator();
            }
        });
    }

    document.addEventListener('keydown', handleKeyboardShortcuts);
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        openAgentGenerator();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        switchView('table');
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        switchView('graph');
    }

    if (e.key === 'Escape') {
        closeAgentGenerator();
    }
}

function handleWindowResize() {
    if (currentView === 'graph' && networkData.nodes.length > 0) {
        const agents = Object.values(currentAgents);
        if (agents.length > 0) {
            initializeNodes(agents);
            updateNetworkGraphDisplay();
        }
    }
}

function handleVisibilityChange() {
    if (!document.hidden) {
        fetchData();
    }
}

function validateRequiredElements() {
    const requiredElements = [
        'agentsTableBody',
        'agentCount',
        'eventLog',
        'tabs',
        'network-container',
        'agentGeneratorModal'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));

    if (missingElements.length > 0) {
        throw new Error(`Elements not found: ${missingElements.join(', ')}`);
    }
}

function initializeApplication() {
    try {
        validateRequiredElements();

        currentView = 'table';
        networkData = {
            nodes: [],
            scale: CONFIG.NETWORK.DEFAULT_SCALE,
            offsetX: 0,
            offsetY: 0
        };

        setupGlobalEventListeners();
        initializeDataPolling();

    } catch (error) {
        showErrorMessage('Application initialization error');
    }
}

function showErrorMessage(message) {
    console.error('Error:', message);

    const eventLog = document.getElementById('eventLog');
    if (eventLog) {
        const div = document.createElement('div');
        div.className = 'text-red-400 text-xs mb-2 p-2 bg-red-900 bg-opacity-50 rounded border-l-2 border-red-500 leading-relaxed';
        div.textContent = `ERROR: ${message}`;
        eventLog.appendChild(div);
        eventLog.scrollTop = eventLog.scrollHeight;
    }
}

function showSuccessMessage(message) {
    const eventLog = document.getElementById('eventLog');
    if (eventLog) {
        const div = document.createElement('div');
        div.className = 'text-green-400 text-xs mb-2 p-2 bg-green-900 bg-opacity-50 rounded border-l-2 border-green-500 leading-relaxed';
        div.textContent = `${message}`;
        eventLog.appendChild(div);
        eventLog.scrollTop = eventLog.scrollHeight;
    }
}

function clearAllData() {
    currentAgents = {};
    networkData = {
        nodes: [],
        scale: CONFIG.NETWORK.DEFAULT_SCALE,
        offsetX: 0,
        offsetY: 0
    };

    updateAgentsTable([]);
    updateEventLog([]);

    const tabs = document.getElementById('tabs');
    if (tabs) {
        tabs.innerHTML = `
            <div class="text-center text-gray-400 mt-8 p-8 floating-window">
                <p class="text-lg">Click "Console" in the table to open the agent's terminal</p>
                <p class="text-sm mt-2 opacity-75">Terminals will appear here as independent windows</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
});

if (typeof window !== 'undefined') {
    window.dashboardDebug = {
        clear: clearAllData,
        config: CONFIG,
        agents: () => currentAgents,
        network: () => networkData
    };
}
