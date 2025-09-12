function switchView(view) {
    currentView = view;
    const tableView = document.getElementById('tableView');
    const graphView = document.getElementById('graphView');
    const downloadsView = document.getElementById('downloadsView');
    const tableBtn = document.getElementById('tableViewBtn');
    const graphBtn = document.getElementById('graphViewBtn');
    const downloadsBtn = document.getElementById('downloadsViewBtn');
    const pageTitle = document.querySelector('h2.text-2xl.font-bold');

    tableView.classList.add('hidden');
    graphView.classList.add('hidden');
    downloadsView.classList.add('hidden');
    
    tableBtn.classList.remove('bg-blue-600');
    tableBtn.classList.add('bg-gray-600');
    graphBtn.classList.remove('bg-blue-600');
    graphBtn.classList.add('bg-gray-600');
    downloadsBtn.classList.remove('bg-blue-600');
    downloadsBtn.classList.add('bg-gray-600');

    if (view === 'table' || view === 'graph') {
        if (pageTitle) {
            pageTitle.innerHTML = '<div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div> Connected Agents';
            pageTitle.classList.remove('text-blue-400', 'text-red-400', 'text-yellow-400');
            pageTitle.classList.add('text-green-400');
        }
        
        if (view === 'table') {
            tableView.classList.remove('hidden');
            tableBtn.classList.remove('bg-gray-600');
            tableBtn.classList.add('bg-blue-600');
            fetchData();
        } else {
            graphView.classList.remove('hidden');
            graphBtn.classList.remove('bg-gray-600');
            graphBtn.classList.add('bg-blue-600');
            updateNetworkGraph(Object.values(currentAgents));
        }
    } else if (view === 'downloads') {
        if (pageTitle) {
            pageTitle.innerHTML = '<div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div> Downloaded Files';
            pageTitle.classList.remove('text-green-400', 'text-red-400', 'text-yellow-400');
            pageTitle.classList.add('text-blue-400');
        }
        
        downloadsView.classList.remove('hidden');
        downloadsBtn.classList.remove('bg-gray-600');
        downloadsBtn.classList.add('bg-blue-600');
        initDownloadsTab();
    }
}

function updateAgentsTable(agents) {
    const tbody = document.getElementById('agentsTableBody');
    const agentCount = document.getElementById('agentCount');
    
    tbody.innerHTML = '';
    agentCount.textContent = agents.length;
    
    if (agents.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="11" class="px-4 py-8 text-center text-gray-400">
                No agents connected
            </td>
        `;
        tbody.appendChild(row);
        return;
    }

    agents.forEach(agent => {
        currentAgents[agent.uuid] = agent;
        tbody.appendChild(createAgentRow(agent));
    });
}

function createAgentRow(agent) {
    const isOnline = isAgentOnline(agent.last_seen);
    const isAdmin = isAgentAdmin(agent.admin);
    
    const row = document.createElement('tr');
    row.className = `hover:bg-gray-700 hover:bg-opacity-50 border-b border-gray-700 transition-all duration-200 ${isAdmin ? 'bg-red-900 bg-opacity-20 border-red-500 border-opacity-30' : ''}`;
    row.id = `agent-row-${agent.uuid}`;
    
    row.innerHTML = `
        <td class="px-4 py-3">
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} ${isOnline ? 'animate-pulse' : ''}"></div>
                <span class="text-xs font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}">
                    ${isOnline ? 'Online' : 'Offline'}
                </span>
                ${isAdmin ? `
                    <div class="ml-2 relative">
                        <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6 10l2-2 6 6" stroke="currentColor" stroke-width="2" fill="none"/>
                            <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1" fill="none"/>
                        </svg>
                        <div class="absolute inset-0 animate-ping">
                            <svg class="w-4 h-4 text-yellow-400 opacity-75" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 7L11 13 5 11 7 5 13 7Z" stroke="currentColor" stroke-width="1"/>
                            </svg>
                        </div>
                    </div>
                ` : ''}
            </div>
        </td>
        <td class="px-4 py-3">
            <span class="text-xs font-mono text-gray-300 bg-gray-800 px-2 py-1 rounded">${agent.uuid.substring(0, 8)}...</span>
        </td>
        <td class="px-4 py-3">
            <span class="font-semibold text-white">${agent.hostname || 'N/A'}</span>
        </td>
        <td class="px-4 py-3">
            <span class="text-gray-300">${agent.username || 'N/A'}</span>
        </td>
        <td class="px-4 py-3">
            <span class="text-gray-300">${agent.domain || 'WORKGROUP'}</span>
        </td>
        <td class="px-4 py-3">
            <span class="px-2 py-1 rounded text-xs font-medium ${isAdmin ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}">
                ${agent.admin || 'N/A'}
            </span>
        </td>
        <td class="px-4 py-3">
            <span class="text-gray-300 font-mono text-sm">${agent.pid || 'N/A'}</span>
        </td>
        <td class="px-4 py-3">
            <span class="text-gray-400 text-xs">${formatTime(agent.infected || agent.last_seen)}</span>
        </td>
        <td class="px-4 py-3">
            <span class="text-gray-400 text-xs">${formatTime(agent.last_seen)}</span>
        </td>
        <td class="px-4 py-3">
            <div class="flex items-center gap-2">
                <button 
                    onclick="openTab('${agent.uuid}')" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    Interact
                </button>
                <button 
                    onclick="deleteAgent('${agent.uuid}', '${agent.hostname || 'Unknown'}')" 
                    class="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
                    title="Delete Agent"
                >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

async function deleteAgent(uuid, hostname) {
    const confirmMessage = `Are you sure you want to delete agent "${hostname}" (${uuid.substring(0, 8)}...)?\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const deleteButton = document.querySelector(`#agent-row-${uuid} button[title="Delete Agent"]`);
        const originalContent = deleteButton.innerHTML;
        
        deleteButton.disabled = true;
        deleteButton.innerHTML = `
            <svg class="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
            </svg>
        `;
        
        const response = await fetch(`/api/agent/${uuid}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            const agentRow = document.getElementById(`agent-row-${uuid}`);
            if (agentRow) {
                agentRow.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                agentRow.style.opacity = '0';
                agentRow.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    agentRow.remove();
                    
                    const agentCount = document.getElementById('agentCount');
                    const currentCount = parseInt(agentCount.textContent) || 0;
                    agentCount.textContent = Math.max(0, currentCount - 1);
                    closeTab(uuid);
                    
                    delete currentAgents[uuid];
                    
                    if (currentView === 'graph') {
                        updateNetworkGraph(Object.values(currentAgents));
                    }
                    
                    const tbody = document.getElementById('agentsTableBody');
                    if (tbody.children.length === 0) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td colspan="11" class="px-4 py-8 text-center text-gray-400">
                                No agents connected
                            </td>
                        `;
                        tbody.appendChild(row);
                    }
                }, 300);
            }
            
            showDeleteSuccessNotification(hostname, uuid);
            
        } else {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error deleting agent:', error);
        
        const deleteButton = document.querySelector(`#agent-row-${uuid} button[title="Delete Agent"]`);
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = originalContent;
        }
        
        showDeleteErrorNotification(error.message, hostname);
    }
}

function showDeleteSuccessNotification(hostname, uuid) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 bg-green-900 border border-green-500 text-green-300 px-4 py-3 rounded-lg text-sm shadow-lg transform transition-all duration-300 translate-x-full';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <div>
                <div class="font-bold">Agent Deleted</div>
                <div class="text-xs opacity-75">${hostname} (${uuid.substring(0, 8)}...)</div>
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

function showDeleteErrorNotification(errorMessage, hostname) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 right-4 z-50 bg-red-900 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm shadow-lg transform transition-all duration-300 translate-x-full';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <div>
                <div class="font-bold">Delete Failed</div>
                <div class="text-xs opacity-75">${hostname}: ${errorMessage}</div>
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
    }, 5000);
}