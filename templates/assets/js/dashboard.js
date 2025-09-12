const DashboardState = {
    user: null,
    isOnline: true,
    lastActivity: Date.now(),
    sessionTimeout: 30 * 60 * 1000,
    sessionWarningTime: 5 * 60 * 1000,
    sessionCheckInterval: null,
    warningShown: false
};

function initializeDashboard() {
    if (!checkAuthentication()) {
        return;
    }
    initializeSessionMonitoring();
    setupDashboardEventListeners();
    checkServerStatus();
}

function checkAuthentication() {
    return true;
}

function initializeSessionMonitoring() {
    document.addEventListener('click', updateLastActivity);
    document.addEventListener('keypress', updateLastActivity);
    document.addEventListener('mousemove', debounce(updateLastActivity, 10000));
    DashboardState.sessionCheckInterval = setInterval(checkSession, 60000);
}

function updateLastActivity() {
    DashboardState.lastActivity = Date.now();
    DashboardState.warningShown = false;
}

function checkSession() {
    const now = Date.now();
    const timeSinceActivity = now - DashboardState.lastActivity;
    if (timeSinceActivity > (DashboardState.sessionTimeout - DashboardState.sessionWarningTime) && !DashboardState.warningShown) {
        showSessionWarning();
        DashboardState.warningShown = true;
    }
    if (timeSinceActivity > DashboardState.sessionTimeout) {
        handleSessionTimeout();
    }
}

function showSessionWarning() {
    const remainingMinutes = Math.ceil(DashboardState.sessionWarningTime / 60000);
    if (confirm(`Your session will expire in ${remainingMinutes} minutes due to inactivity. Click OK to keep the session active.`)) {
        updateLastActivity();
    }
}

function handleSessionTimeout() {
    alert('Your session has expired due to inactivity. You will be redirected to the login page.');
    logout();
}

function setupDashboardEventListeners() {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    document.addEventListener('keydown', handleDashboardKeyboardShortcuts);
}

function handleVisibilityChange() {
    if (!document.hidden) {
        checkServerStatus();
        updateLastActivity();
    }
}

function handleOnlineStatus() {
    DashboardState.isOnline = true;
    showStatusMessage('Connection restored', 'success');
    if (typeof fetchData === 'function') {
        fetchData();
    }
}

function handleOfflineStatus() {
    DashboardState.isOnline = false;
    showStatusMessage('Connection lost - Trying to reconnect...', 'warning');
}

function handleDashboardKeyboardShortcuts(event) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        if (confirm('Are you sure you want to log out of the dashboard?')) {
            logout();
        }
    }
    if (event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key === 'r')) {
        if (!confirm('Refresh the page? This may interrupt ongoing operations.')) {
            event.preventDefault();
        }
    }
}

async function checkServerStatus() {
    try {
        const response = await fetch('/status');
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const status = await response.json();
        updateServerStatusDisplay(status);
    } catch (error) {
        showStatusMessage('Server connectivity error', 'error');
    }
}

function updateServerStatusDisplay(status) {
    const statusIndicators = document.querySelectorAll('.server-status-indicator');
    statusIndicators.forEach(indicator => {
        if (status.status === 'online') {
            indicator.classList.add('bg-green-500', 'animate-pulse');
            indicator.classList.remove('bg-red-500', 'bg-yellow-500');
        } else {
            indicator.classList.add('bg-red-500');
            indicator.classList.remove('bg-green-500', 'animate-pulse');
        }
    });
}

async function logout() {
    if (!confirm('Are you sure you want to log out of the dashboard?')) {
        return;
    }
    try {
        if (DashboardState.sessionCheckInterval) {
            clearInterval(DashboardState.sessionCheckInterval);
        }
        showLogoutLoader();
        const response = await fetch('/logout');
        if (response.ok) {
            clearDashboardData();
            window.location.href = '/login';
        } else {
            throw new Error('Logout error');
        }
    } catch (error) {
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        showStatusMessage('Error during logout. Redirecting...', 'error');
    }
}

function showLogoutLoader() {
    const loader = document.createElement('div');
    loader.id = 'logoutLoader';
    loader.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80';
    loader.innerHTML = `
        <div class="text-center text-white">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
            <p class="text-lg">Logging out...</p>
        </div>
    `;
    document.body.appendChild(loader);
}

function clearDashboardData() {
    if (typeof currentAgents !== 'undefined') {
        currentAgents = {};
    }
    if (typeof networkData !== 'undefined') {
        networkData = { nodes: [], scale: 1, offsetX: 0, offsetY: 0 };
    }
    const keysToRemove = ['dashboard_preferences', 'recent_commands', 'view_state'];
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
}

function showStatusMessage(message, type = 'info') {
    const statusColors = {
        success: 'bg-green-900 border-green-500 text-green-300',
        warning: 'bg-yellow-900 border-yellow-500 text-yellow-300',
        error: 'bg-red-900 border-red-500 text-red-300',
        info: 'bg-blue-900 border-blue-500 text-blue-300'
    };
    const statusIcons = {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️'
    };
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 ${statusColors[type]} px-4 py-3 rounded-lg border text-sm shadow-lg transform transition-all duration-300 translate-x-full`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-lg">${statusIcons[type]}</span>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 hover:opacity-75">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </button>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

function saveDashboardPreferences() {
    const preferences = {
        currentView: currentView || 'table',
        lastActivity: DashboardState.lastActivity,
        timestamp: Date.now()
    };
    try {
        localStorage.setItem('dashboard_preferences', JSON.stringify(preferences));
    } catch (error) {
    }
}

function loadDashboardPreferences() {
    try {
        const stored = localStorage.getItem('dashboard_preferences');
        if (stored) {
            const preferences = JSON.parse(stored);
            if (preferences.currentView && ['table', 'graph'].includes(preferences.currentView)) {
                if (typeof switchView === 'function') {
                    switchView(preferences.currentView);
                }
            }
            return preferences;
        }
    } catch (error) {
    }
    return null;
}

function enhanceAccessibility() {
    const shortcuts = [
        { key: 'Alt+1', action: () => switchView('table'), description: 'Table View' },
        { key: 'Alt+2', action: () => switchView('graph'), description: 'Graph View' },
        { key: 'Alt+G', action: () => openAgentGenerator?.(), description: 'Open Agent Generator' },
        { key: 'Alt+L', action: logout, description: 'Logout' }
    ];
    const shortcutTooltip = document.createElement('div');
    shortcutTooltip.id = 'shortcutTooltip';
    shortcutTooltip.className = 'fixed bottom-4 left-4 bg-black bg-opacity-90 text-white text-xs p-3 rounded-lg border border-gray-600 opacity-0 transition-opacity duration-300 z-40';
    shortcutTooltip.innerHTML = `
        <h4 class="font-bold mb-2 text-blue-400">Keyboard Shortcuts</h4>
        <div class="space-y-1">
            ${shortcuts.map(s => `<div><kbd class="bg-gray-700 px-1 rounded">${s.key}</kbd> - ${s.description}</div>`).join('')}
        </div>
        <div class="mt-2 text-gray-400">Press F1 to show/hide</div>
    `;
    document.body.appendChild(shortcutTooltip);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            const tooltip = document.getElementById('shortcutTooltip');
            tooltip.style.opacity = tooltip.style.opacity === '1' ? '0' : '1';
        }
    });
}

function monitorPerformance() {
    setInterval(() => {
        if ('memory' in performance) {
            const memory = performance.memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
            if (usedMB > 100) {
            }
        }
    }, 60000);
}

function addConnectionIndicators() {
    const connectionIndicator = document.createElement('div');
    connectionIndicator.id = 'connectionIndicator';
    connectionIndicator.className = 'flex items-center gap-2 text-sm';
    connectionIndicator.innerHTML = `
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse server-status-indicator"></div>
        <span id="connectionStatus">System Online</span>
    `;
    const userInfo = document.querySelector('.flex.items-center.gap-3');
    if (userInfo) {
        userInfo.appendChild(connectionIndicator);
    }
}

function setupAutoSave() {
    setInterval(() => {
        saveDashboardPreferences();
    }, 30000);
    window.addEventListener('beforeunload', (e) => {
        saveDashboardPreferences();
        if (document.querySelectorAll('#tabs .console-tab').length > 0) {
            e.preventDefault();
            e.returnValue = 'You have open consoles. Are you sure you want to leave?';
        }
    });
}

function debugDashboard() {
}

function initializeTheme() {
    const theme = localStorage.getItem('dashboard_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
}

function setupAdvancedFeatures() {
    addConnectionIndicators();
    setupAutoSave();
    enhanceAccessibility();
    monitorPerformance();
    loadDashboardPreferences();
    initializeTheme();
}

function cleanupDashboard() {
    if (DashboardState.sessionCheckInterval) {
        clearInterval(DashboardState.sessionCheckInterval);
    }
    document.removeEventListener('click', updateLastActivity);
    document.removeEventListener('keypress', updateLastActivity);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeDashboard();
        setupAdvancedFeatures();
    }, 100);
});

window.addEventListener('beforeunload', cleanupDashboard);

if (typeof window !== 'undefined') {
    window.dashboardAuth = {
        info: debugDashboard,
        logout: logout,
        checkStatus: checkServerStatus,
        state: DashboardState,
        clearData: clearDashboardData
    };
}
