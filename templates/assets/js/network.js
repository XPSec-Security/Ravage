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

const DOMAIN_COLORS = [
    { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.08)', text: '#60a5fa' },
    { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.08)', text: '#a78bfa' },
    { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.08)', text: '#fbbf24' },
    { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.08)', text: '#22d3ee' },
    { stroke: '#ec4899', fill: 'rgba(236,72,153,0.08)', text: '#f472b6' },
    { stroke: '#14b8a6', fill: 'rgba(20,184,166,0.08)', text: '#2dd4bf' },
];

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

    const maxAgents = Math.min(agents.length, CONFIG.MAX_NETWORK_AGENTS);
    const agentSlice = agents.slice(0, maxAgents);

    const domains = {};
    agentSlice.forEach(agent => {
        const d = agent.domain || 'WORKGROUP';
        if (!domains[d]) domains[d] = [];
        domains[d].push(agent);
    });

    const domainNames = Object.keys(domains);
    const domainCount = domainNames.length;
    const baseRadius = Math.min(centerX, centerY) * 0.55;

    networkData.nodes = [];

    domainNames.forEach((domain, di) => {
        const groupAngle = (di / domainCount) * 2 * Math.PI - Math.PI / 2;
        const groupCenterX = centerX + Math.cos(groupAngle) * baseRadius;
        const groupCenterY = centerY + Math.sin(groupAngle) * baseRadius;

        const membersCount = domains[domain].length;
        const clusterRadius = Math.max(50, membersCount * 22);

        domains[domain].forEach((agent, ai) => {
            const memberAngle = (ai / membersCount) * 2 * Math.PI - Math.PI / 2;
            const nx = groupCenterX + Math.cos(memberAngle) * clusterRadius;
            const ny = groupCenterY + Math.sin(memberAngle) * clusterRadius;

            networkData.nodes.push({
                id: agent.uuid,
                hostname: agent.hostname,
                username: agent.username,
                domain: agent.domain || 'WORKGROUP',
                isOnline: isAgentOnline(agent.last_seen),
                isAdmin: isAgentAdmin(agent.admin),
                x: nx,
                y: ny,
                groupCenterX: groupCenterX,
                groupCenterY: groupCenterY,
                domainIndex: di
            });
        });
    });
}

function updateExistingNodes(agents) {
    const agentMap = {};
    agents.forEach(a => { agentMap[a.uuid] = a; });

    networkData.nodes.forEach(node => {
        const agent = agentMap[node.id];
        if (agent) {
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

    const domainGroups = {};
    networkData.nodes.forEach(node => {
        if (!domainGroups[node.domain]) {
            domainGroups[node.domain] = {
                nodes: [],
                centerX: node.groupCenterX,
                centerY: node.groupCenterY,
                colorIndex: node.domainIndex
            };
        }
        domainGroups[node.domain].nodes.push(node);
    });

    Object.entries(domainGroups).forEach(([domain, group]) => {
        const color = DOMAIN_COLORS[group.colorIndex % DOMAIN_COLORS.length];

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        group.nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x);
            maxY = Math.max(maxY, n.y);
        });
        const pad = 45;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rx = Math.max(60, (maxX - minX) / 2 + pad);
        const ry = Math.max(60, (maxY - minY) / 2 + pad);

        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('cx', cx);
        ellipse.setAttribute('cy', cy);
        ellipse.setAttribute('rx', rx);
        ellipse.setAttribute('ry', ry);
        ellipse.setAttribute('fill', color.fill);
        ellipse.setAttribute('stroke', color.stroke);
        ellipse.setAttribute('stroke-width', '1.5');
        ellipse.setAttribute('stroke-dasharray', '6,3');
        ellipse.setAttribute('opacity', '0.7');
        mainGroup.appendChild(ellipse);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', cx);
        label.setAttribute('y', cy - ry + 14);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', color.text);
        label.setAttribute('font-size', '11');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('opacity', '0.9');
        label.textContent = domain;
        mainGroup.appendChild(label);

        const connLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        connLine.setAttribute('x1', serverX);
        connLine.setAttribute('y1', serverY);
        connLine.setAttribute('x2', cx);
        connLine.setAttribute('y2', cy);
        connLine.setAttribute('stroke', color.stroke);
        connLine.setAttribute('stroke-width', '2');
        connLine.setAttribute('stroke-dasharray', '8,4');
        connLine.setAttribute('opacity', '0.3');
        mainGroup.appendChild(connLine);
    });

    networkData.nodes.forEach(node => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', serverX);
        line.setAttribute('y1', serverY);
        line.setAttribute('x2', node.x);
        line.setAttribute('y2', node.y);
        line.setAttribute('stroke', node.isOnline ? '#10b981' : '#ef4444');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', node.isOnline ? '0' : '6,3');
        line.setAttribute('opacity', '0.4');
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

    addNetworkLegend(container, domainGroups);
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
    agentGroup.style.cursor = 'pointer';

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
        <text x="${node.x}" y="${node.y + 48}" text-anchor="middle" fill="#9ca3af" font-size="8">${node.username}</text>
    `;

    agentGroup.addEventListener('mousedown', (e) => startDrag(e, index));
    agentGroup.addEventListener('click', (e) => {
        if (!isDragging) {
            openTab(node.id);
            switchView('table');
        }
    });

    group.appendChild(agentGroup);
}

function addNetworkLegend(container, domainGroups) {
    const legend = document.createElement('div');
    legend.className = 'absolute bottom-4 right-4 text-xs text-gray-300 bg-black bg-opacity-80 p-3 rounded-lg border border-gray-600';

    let domainItems = '';
    Object.entries(domainGroups).forEach(([domain, group]) => {
        const color = DOMAIN_COLORS[group.colorIndex % DOMAIN_COLORS.length];
        domainItems += `<div class="flex items-center gap-2 mb-1"><div class="w-3 h-1 rounded" style="background:${color.stroke}"></div><span>${domain} (${group.nodes.length})</span></div>`;
    });

    legend.innerHTML = `
        <div class="flex items-center gap-2 mb-2"><div class="w-3 h-3 bg-green-500 rounded-full"></div><span>Online</span></div>
        <div class="flex items-center gap-2 mb-2"><div class="w-3 h-3 bg-red-500 rounded-full"></div><span>Offline</span></div>
        <div class="flex items-center gap-2 mb-2"><div class="w-3 h-3 bg-purple-500 rounded-full"></div><span>Admin</span></div>
        <div class="border-t border-gray-600 mt-2 pt-2">${domainItems}</div>
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