let networkData = { 
    nodes: [], 
    scale: CONFIG.NETWORK.DEFAULT_SCALE, 
    offsetX: 0, 
    offsetY: 0 
};

let isDragging = false;
let dragData = { 
    node: null, 
    startX: 0, 
    startY: 0, 
    nodeStartX: 0, 
    nodeStartY: 0 
};

let isPanning = false;
let panData = { 
    startX: 0, 
    startY: 0, 
    startOffsetX: 0, 
    startOffsetY: 0 
};

function updateNetworkGraph(agents) {
    const container = document.getElementById('network-container');
    
    if (agents.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 mt-8 text-lg">No connected agents</div>';
        return;
    }

    if (networkData.nodes.length === 0 || networkData.nodes.length !== agents.length) {
        initializeNodes(agents);
    }

    updateExistingNodes(agents);
    updateNetworkGraphDisplay();
}

function initializeNodes(agents) {
    const containerRect = document.getElementById('network-container').getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const radius = Math.min(centerX, centerY) - 100;

    const maxAgents = Math.min(agents.length, CONFIG.MAX_NETWORK_AGENTS);
    
    networkData.nodes = agents.slice(0, maxAgents).map((agent, index) => {
        const angle = (index / maxAgents) * 2 * Math.PI;
        const nodeRadius = radius * CONFIG.NETWORK.NODE_RADIUS_FACTOR;
        
        return {
            id: agent.uuid,
            hostname: agent.hostname,
            username: agent.username,
            domain: agent.domain || 'WORKGROUP',
            isOnline: isAgentOnline(agent.last_seen),
            isAdmin: isAgentAdmin(agent.admin),
            x: centerX + Math.cos(angle) * nodeRadius,
            y: centerY + Math.sin(angle) * nodeRadius
        };
    });
}

function updateExistingNodes(agents) {
    networkData.nodes.forEach((node, index) => {
        if (agents[index]) {
            const agent = agents[index];
            node.id = agent.uuid;
            node.hostname = agent.hostname;
            node.username = agent.username;
            node.domain = agent.domain || 'WORKGROUP';
            node.isOnline = isAgentOnline(agent.last_seen);
            node.isAdmin = isAgentAdmin(agent.admin);
        }
    });
}

function updateNetworkGraphDisplay() {
    const container = document.getElementById('network-container');
    const containerRect = container.getBoundingClientRect();
    
    container.innerHTML = '';

    if (networkData.nodes.length === 0) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.background = 'radial-gradient(circle at center, #1a202c 0%, #0f172a 100%)';
    svg.style.borderRadius = '8px';

    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.setAttribute('transform', 
        `translate(${networkData.offsetX}, ${networkData.offsetY}) scale(${networkData.scale})`
    );

    const serverX = containerRect.width / 2;
    const serverY = containerRect.height / 2;

    networkData.nodes.forEach(node => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', serverX);
        line.setAttribute('y1', serverY);
        line.setAttribute('x2', node.x);
        line.setAttribute('y2', node.y);
        line.setAttribute('stroke', node.isOnline ? '#10b981' : '#ef4444');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', node.isOnline ? '0' : '8,4');
        line.setAttribute('opacity', '0.6');
        mainGroup.appendChild(line);
    });

    addServerNode(mainGroup, serverX, serverY);

    networkData.nodes.forEach((node, index) => {
        addAgentNode(mainGroup, node, index);
    });

    svg.appendChild(mainGroup);
    container.appendChild(svg);

    svg.addEventListener('mousedown', startPan);
    svg.addEventListener('wheel', handleWheel);

    addNetworkLegend(container);
}

function addServerNode(group, x, y) {
    const serverGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    serverGroup.innerHTML = `
        <ellipse cx="${x+3}" cy="${y+28}" rx="25" ry="6" fill="rgba(0,0,0,0.4)"/>
        <circle cx="${x}" cy="${y}" r="35" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.3">
            <animate attributeName="r" values="30;45;30" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite"/>
        </circle>
        <rect x="${x-20}" y="${y-15}" width="40" height="25" rx="4" fill="#1f2937" stroke="#ef4444" stroke-width="3"/>
        <rect x="${x-17}" y="${y-12}" width="34" height="19" fill="#374151"/>
        <circle cx="${x-12}" cy="${y-8}" r="2" fill="#10b981">
            <animate attributeName="fill" values="#10b981;#22c55e;#10b981" dur="1s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${x-7}" cy="${y-8}" r="2" fill="#f59e0b">
            <animate attributeName="fill" values="#f59e0b;#fbbf24;#f59e0b" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${x-2}" cy="${y-8}" r="2" fill="#ef4444">
            <animate attributeName="fill" values="#ef4444;#f87171;#ef4444" dur="2s" repeatCount="indefinite"/>
        </circle>
        <rect x="${x-15}" y="${y-2}" width="30" height="2" fill="#6b7280"/>
        <rect x="${x-15}" y="${y+1}" width="30" height="2" fill="#6b7280"/>
        <rect x="${x-15}" y="${y+4}" width="30" height="2" fill="#6b7280"/>
        <text x="${x}" y="${y+25}" text-anchor="middle" fill="#ef4444" font-size="12" font-weight="bold">C2 Server</text>
    `;
    group.appendChild(serverGroup);
}

function addAgentNode(group, node, index) {
    const agentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    agentGroup.classList.add('draggable-node');
    agentGroup.style.cursor = 'grab';
    
    const adminEffects = node.isAdmin ? `
        <g class="admin-lightning">
            <path d="M${node.x-25} ${node.y-20} L${node.x-15} ${node.y-25} L${node.x-20} ${node.y-15} L${node.x-10} ${node.y-20} L${node.x-15} ${node.y-10}" 
                  stroke="#7c3aed" stroke-width="2" fill="none" opacity="0.8">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite"/>
            </path>
        </g>
    ` : '';

    agentGroup.innerHTML = `
        <ellipse cx="${node.x+2}" cy="${node.y+16}" rx="18" ry="4" fill="rgba(0,0,0,0.3)"/>
        ${adminEffects}
        <rect x="${node.x - 18}" y="${node.y - 14}" width="36" height="24" rx="3" 
              fill="#374151" stroke="${node.isOnline ? '#10b981' : '#ef4444'}" stroke-width="${node.isAdmin ? '4' : '3'}" 
              ${node.isAdmin ? 'filter="drop-shadow(0 0 8px #7c3aed)"' : ''}>
        </rect>
        <rect x="${node.x - 15}" y="${node.y - 11}" width="30" height="18" fill="#1f2937"/>
        <rect x="${node.x - 8}" y="${node.y - 8}" width="4" height="4" fill="#0078d4"/>
        <rect x="${node.x - 3}" y="${node.y - 8}" width="4" height="4" fill="#00bcf2"/>
        <rect x="${node.x - 8}" y="${node.y - 3}" width="4" height="4" fill="#00d427"/>
        <rect x="${node.x - 3}" y="${node.y - 3}" width="4" height="4" fill="#ffb900"/>
        <circle cx="${node.x + 22}" cy="${node.y - 18}" r="4" fill="${node.isOnline ? '#10b981' : '#ef4444'}"/>
        <text x="${node.x}" y="${node.y + 37}" text-anchor="middle" fill="#e5e7eb" font-size="10" font-weight="bold">${node.hostname || 'Unknown'}</text>
        <text x="${node.x}" y="${node.y + 48}" text-anchor="middle" fill="#9ca3af" font-size="8">${node.domain}\\${node.username}</text>
    `;
    
    agentGroup.addEventListener('mousedown', (e) => startDrag(e, index));
    agentGroup.addEventListener('click', (e) => {
        if (!isDragging) {
            openTab(node.id);
        }
    });
    
    group.appendChild(agentGroup);
}

function addNetworkLegend(container) {
    const legend = document.createElement('div');
    legend.className = 'absolute bottom-4 right-4 text-xs text-gray-300 bg-black bg-opacity-80 p-3 rounded-lg border border-gray-600';
    legend.innerHTML = `
        <div class="mb-3 text-center text-yellow-400 font-bold border-b border-gray-600 pb-2">Network Map</div>
        <div class="flex items-center gap-2 mb-2"><div class="w-3 h-3 bg-green-500 rounded-full"></div><span>Online Agent</span></div>
        <div class="flex items-center gap-2 mb-2"><div class="w-3 h-3 bg-red-500 rounded-full"></div><span>Offline Agent</span></div>
        <div class="flex items-center gap-2 mb-2"><div class="w-3 h-3 bg-purple-500 rounded-full"></div><span>Admin Privileges</span></div>
        <div class="flex items-center gap-2 mb-3"><div class="w-3 h-3 bg-red-500 rounded border border-red-400"></div><span>C2 Server</span></div>
        <div class="text-xs text-gray-400 border-t border-gray-600 pt-2 space-y-1">
            <div>🖱️ Drag computers</div>
            <div>🔍 Scroll to zoom</div>
            <div>👆 Click to interact</div>
        </div>
    `;
    container.appendChild(legend);
}

function startDrag(e, nodeIndex) {
    e.stopPropagation();
    isDragging = true;
    dragData.node = nodeIndex;
    dragData.startX = e.clientX;
    dragData.startY = e.clientY;
    dragData.nodeStartX = networkData.nodes[nodeIndex].x;
    dragData.nodeStartY = networkData.nodes[nodeIndex].y;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    e.preventDefault();
}

function drag(e) {
    if (!isDragging || dragData.node === null) return;
    
    const deltaX = (e.clientX - dragData.startX) / networkData.scale;
    const deltaY = (e.clientY - dragData.startY) / networkData.scale;
    
    networkData.nodes[dragData.node].x = dragData.nodeStartX + deltaX;
    networkData.nodes[dragData.node].y = dragData.nodeStartY + deltaY;
    
    updateNetworkGraphDisplay();
}

function endDrag() {
    setTimeout(() => { isDragging = false; }, 10);
    dragData.node = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', endDrag);
}

function startPan(e) {
    if (e.target.closest('.draggable-node')) return;
    
    isPanning = true;
    panData.startX = e.clientX;
    panData.startY = e.clientY;
    panData.startOffsetX = networkData.offsetX;
    panData.startOffsetY = networkData.offsetY;
    
    document.addEventListener('mousemove', pan);
    document.addEventListener('mouseup', endPan);
}

function pan(e) {
    if (!isPanning) return;
    
    networkData.offsetX = panData.startOffsetX + (e.clientX - panData.startX);
    networkData.offsetY = panData.startOffsetY + (e.clientY - panData.startY);
    
    updateNetworkGraphDisplay();
}

function endPan() {
    isPanning = false;
    document.removeEventListener('mousemove', pan);
    document.removeEventListener('mouseup', endPan);
}

function handleWheel(e) {
    e.preventDefault();
    
    const scaleFactor = e.deltaY > 0 ? (1 / CONFIG.NETWORK.ZOOM_FACTOR) : CONFIG.NETWORK.ZOOM_FACTOR;
    const oldScale = networkData.scale;
    
    networkData.scale = clamp(
        networkData.scale * scaleFactor,
        CONFIG.NETWORK.MIN_SCALE,
        CONFIG.NETWORK.MAX_SCALE
    );
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    networkData.offsetX = mouseX - (mouseX - networkData.offsetX) * (networkData.scale / oldScale);
    networkData.offsetY = mouseY - (mouseY - networkData.offsetY) * (networkData.scale / oldScale);
    
    updateNetworkGraphDisplay();
}

function zoomIn() {
    networkData.scale = Math.min(networkData.scale * CONFIG.NETWORK.ZOOM_FACTOR, CONFIG.NETWORK.MAX_SCALE);
    updateNetworkGraphDisplay();
}

function zoomOut() {
    networkData.scale = Math.max(networkData.scale / CONFIG.NETWORK.ZOOM_FACTOR, CONFIG.NETWORK.MIN_SCALE);
    updateNetworkGraphDisplay();
}

function resetZoom() {
    networkData.scale = CONFIG.NETWORK.DEFAULT_SCALE;
    networkData.offsetX = 0;
    networkData.offsetY = 0;
    updateNetworkGraphDisplay();
}
