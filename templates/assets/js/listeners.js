// Listener Manager JS

function openListenerManager() {
    var modal = document.getElementById('listenerManagerModal');
    modal.style.display = 'flex';
    loadProfiles();
    loadListeners();
}

function closeListenerManager() {
    var modal = document.getElementById('listenerManagerModal');
    modal.style.display = 'none';
}

async function loadProfiles() {
    var select = document.getElementById('lProfile');
    if (!select) return;
    try {
        var resp = await fetch('/api/profiles');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        var profiles = Array.isArray(data) ? data : (data.profiles || []);
        if (profiles.length === 0) {
            select.innerHTML = '<option value="">No profiles found in profile.yaml</option>';
        } else {
            var opts = '';
            for (var i = 0; i < profiles.length; i++) {
                var p = profiles[i];
                var label = p.id + (p.description ? ' \u2014 ' + p.description : '');
                opts += '<option value="' + p.id + '">' + label + '</option>';
            }
            select.innerHTML = opts;
        }
    } catch (e) {
        select.innerHTML = '<option value="">Error loading profiles</option>';
    }
}

async function loadListeners() {
    var container = document.getElementById('listenersTableContainer');
    if (!container) return;
    container.innerHTML = '<div class="text-gray-400 text-sm text-center py-4">Loading...</div>';
    try {
        var resp = await fetch('/api/listeners');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        var listeners = Array.isArray(data) ? data : (data.listeners || []);

        if (listeners.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-sm text-center py-4">No listeners created yet.</div>';
            return;
        }

        var html = '<table class="w-full text-sm">';
        html += '<thead><tr class="text-left text-gray-400 border-b border-gray-700">';
        html += '<th class="pb-2 pr-4">Name</th>';
        html += '<th class="pb-2 pr-4">Bind</th>';
        html += '<th class="pb-2 pr-4">Protocol</th>';
        html += '<th class="pb-2 pr-4">Host Header</th>';
        html += '<th class="pb-2 pr-4">Ext Host</th>';
        html += '<th class="pb-2 pr-4">Profile</th>';
        html += '<th class="pb-2 pr-4">Status</th>';
        html += '<th class="pb-2"></th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < listeners.length; i++) {
            var l = listeners[i];
            var protoClass = l.protocol === 'https' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300';
            var statusClass = l.running ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400';
            var statusText = l.running ? 'Running' : 'Stopped';

            html += '<tr class="border-b border-gray-800">';
            html += '<td class="py-2 pr-4 text-white font-medium">' + escHtml(l.name) + '</td>';
            html += '<td class="py-2 pr-4 text-gray-300">' + escHtml(l.bind_host) + ':' + l.bind_port + '</td>';
            html += '<td class="py-2 pr-4"><span class="px-2 py-0.5 rounded text-xs font-semibold ' + protoClass + '">' + l.protocol.toUpperCase() + '</span></td>';
            html += '<td class="py-2 pr-4 text-gray-300 font-mono text-xs">' + escHtml(l.upstream_host || '—') + '</td>';
            html += '<td class="py-2 pr-4 text-gray-300 font-mono text-xs">' + escHtml(l.external_host || '—') + '</td>';
            html += '<td class="py-2 pr-4 text-gray-300">' + escHtml(l.profile_id) + '</td>';
            html += '<td class="py-2 pr-4"><span class="px-2 py-0.5 rounded text-xs font-semibold ' + statusClass + '">' + statusText + '</span></td>';
            html += '<td class="py-2 text-right"><button onclick="deleteListener(\'' + l.id + '\')" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded">Delete</button></td>';
            html += '</tr>';
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div class="text-red-400 text-sm text-center py-4">Error: ' + e.message + '</div>';
    }
}

async function createListener() {
    var name = document.getElementById('lName').value.trim();
    var profileId = document.getElementById('lProfile').value;
    var bindHost = document.getElementById('lBindHost').value.trim() || '0.0.0.0';
    var bindPort = parseInt(document.getElementById('lBindPort').value);
    var protocol = document.getElementById('lProtocol').value;
    var upstreamHost = document.getElementById('lUpstreamHost').value.trim();
    var externalHost = document.getElementById('lExternalHost').value.trim();
    var errorEl = document.getElementById('lCreateError');

    errorEl.style.display = 'none';
    errorEl.textContent = '';

    if (!name) { showCreateError('Name is required.'); return; }
    if (!profileId) { showCreateError('Select a traffic profile.'); return; }
    if (!bindPort || bindPort < 1 || bindPort > 65535) { showCreateError('Port must be between 1 and 65535.'); return; }
    if (!upstreamHost) { showCreateError('Upstream Host is required.'); return; }
    if (!externalHost) { showCreateError('External Host is required.'); return; }

    try {
        var resp = await fetch('/api/listeners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, profile_id: profileId, bind_host: bindHost, bind_port: bindPort, protocol: protocol, upstream_host: upstreamHost, external_host: externalHost })
        });

        var data = await resp.json();

        if (!resp.ok) {
            showCreateError(data.error || 'Error: HTTP ' + resp.status);
            return;
        }

        document.getElementById('lName').value = '';
        document.getElementById('lBindHost').value = '0.0.0.0';
        document.getElementById('lBindPort').value = '';
        document.getElementById('lProtocol').value = 'http';
        document.getElementById('lUpstreamHost').value = '';
        document.getElementById('lExternalHost').value = '';

        loadListeners();
    } catch (e) {
        showCreateError('Request failed: ' + e.message);
    }
}

function showCreateError(msg) {
    var errorEl = document.getElementById('lCreateError');
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
}

async function deleteListener(id) {
    if (!confirm('Delete this listener? The C2 server thread will stop on next restart.')) return;
    try {
        var resp = await fetch('/api/listeners/' + id, { method: 'DELETE' });
        if (!resp.ok) {
            var data = await resp.json();
            alert(data.error || 'Error: HTTP ' + resp.status);
            return;
        }
        loadListeners();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function loadListenerDropdown() {
    var select = document.getElementById('dropperListenerSelect');
    var note = document.getElementById('dropperListenerNote');
    if (!select) return;

    select.innerHTML = '<option value="">Loading...</option>';
    try {
        var resp = await fetch('/api/listeners');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var data = await resp.json();
        var all = Array.isArray(data) ? data : (data.listeners || []);
        var listeners = all.filter(function(l) { return l.active; });

        if (listeners.length === 0) {
            select.innerHTML = '<option value="">No active listeners</option>';
            if (note) note.style.display = 'block';
        } else {
            if (note) note.style.display = 'none';
            var opts = '';
            for (var i = 0; i < listeners.length; i++) {
                var l = listeners[i];
                opts += '<option value="' + l.id + '">[' + l.protocol.toUpperCase() + '] ' + escHtml(l.name) + ' \u2014 ' + escHtml(l.bind_host) + ':' + l.bind_port + ' (' + escHtml(l.profile_id) + ')</option>';
            }
            select.innerHTML = opts;
        }
    } catch (e) {
        select.innerHTML = '<option value="">Error loading listeners</option>';
        if (note) note.style.display = 'block';
    }
}

function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
