async function initDownloadsTab() {
    try {
        const downloadsContainer = document.getElementById('downloads-content');
        if (!downloadsContainer) return;

        downloadsContainer.innerHTML = `
            <div class="text-center py-8">
                <div class="inline-block animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p class="text-gray-400">Loading downloaded files...</p>
            </div>
        `;

        const response = await fetch('/api/downloads/list');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const files = await response.json();
        renderDownloadsList(files);
    } catch (error) {
        console.error('Error loading downloads:', error);
        const downloadsContainer = document.getElementById('downloads-content');
        if (downloadsContainer) {
            downloadsContainer.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Error loading downloads</p>
                    <button onclick="initDownloadsTab()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm">Try Again</button>
                </div>
            `;
        }
    }
}

function renderDownloadsList(files) {
    const downloadsContainer = document.getElementById('downloads-content');
    if (!downloadsContainer) return;

    if (!files || files.length === 0) {
        downloadsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <p>No downloaded files found</p>
                <p class="text-xs mt-2">Files downloaded from agents will appear here</p>
            </div>
        `;
        return;
    }


    files.sort((a, b) => b.modified - a.modified);

    let html = `
        <div class="table-container rounded-lg border border-gray-700 overflow-hidden">
            <table class="downloads-table w-full text-sm">
                <thead class="sticky top-0">
                    <tr class="bg-gray-800 text-gray-300">
                        <th class="px-4 py-3 text-left border-b border-gray-700">Filename</th>
                        <th class="px-4 py-3 text-left border-b border-gray-700">Agent UUID</th>
                        <th class="px-4 py-3 text-left border-b border-gray-700">Date</th>
                        <th class="px-4 py-3 text-left border-b border-gray-700">Size</th>
                        <th class="px-4 py-3 text-left border-b border-gray-700">Type</th>
                        <th class="px-4 py-3 text-center border-b border-gray-700">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    files.forEach(file => {
        let agentUuid = file.uuid || 'Unknown';
        
        if (agentUuid === 'Unknown' && file.filename) {
            const uuidMatch = file.filename.match(/^([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})_/);
            if (uuidMatch) {
                agentUuid = uuidMatch[1];
            } else if (file.filename.startsWith('screenshot_')) {
                const screenshotMatch = file.filename.match(/^screenshot_([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/);
                if (screenshotMatch) {
                    agentUuid = screenshotMatch[1];
                }
            } else if (file.filename.includes('_')) {
                const hexMatch = file.filename.match(/^([a-fA-F0-9]+)_/);
                if (hexMatch) {
                    agentUuid = hexMatch[1];
                }
            }
        }

        const fileSize = formatFileSize(file.size);
        const fileExtension = file.filename.split('.').pop().toLowerCase();
        const fileDate = new Date(file.modified * 1000).toLocaleString();

        html += `
            <tr class="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-50">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        ${getFileIcon(fileExtension)}
                        <span class="text-white font-medium truncate max-w-xs" title="${file.filename}">
                            ${file.filename}
                        </span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="text-xs font-mono text-gray-300 bg-gray-800 px-2 py-1 rounded" title="${agentUuid}">
                        ${agentUuid.length > 8 ? agentUuid.substring(0, 8) + '...' : agentUuid}
                    </span>
                </td>
                <td class="px-4 py-3 text-gray-300">${fileDate}</td>
                <td class="px-4 py-3 text-gray-300">${fileSize}</td>
                <td class="px-4 py-3">
                    <span class="text-xs font-medium bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                        ${fileExtension.toUpperCase()}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-2">
                        <a href="/uploads/${file.filename}" download="${file.filename}" 
                           class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-all duration-200 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </a>
                        <button onclick="deleteDownloadedFile('${file.filename}')" 
                                class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    downloadsContainer.innerHTML = html;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(extension) {
    const iconMap = {
        'png': '<svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
        'jpg': '<svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
        'jpeg': '<svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
        'exe': '<svg class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>',
        'dll': '<svg class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>',
        'txt': '<svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
        'pdf': '<svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
        'zip': '<svg class="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>',
        'rar': '<svg class="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>'
    };

    return iconMap[extension] || '<svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>';
}

async function deleteDownloadedFile(filename) {
    if (!confirm(`Are you sure you want to delete the file "${filename}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/downloads/delete/${filename}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
            showNotification('File deleted successfully', 'success');
            initDownloadsTab();
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showNotification(`Error deleting file: ${error.message}`, 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 ${type === 'success' ? 'bg-green-900 border-green-500 text-green-300' : 'bg-red-900 border-red-500 text-red-300'} px-4 py-3 rounded-lg text-sm shadow-lg transform transition-all duration-300 translate-x-full border`;
    
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5 ${type === 'success' ? 'text-green-400' : 'text-red-400'}" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="${type === 'success' ? 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' : 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'}" clip-rule="evenodd"/>
            </svg>
            <div>
                <div class="font-bold">${type === 'success' ? 'Success' : 'Error'}</div>
                <div class="text-xs opacity-75">${message}</div>
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

function switchToDownloadsTab() {
    const downloadsTab = document.getElementById('downloads-tab');
    if (downloadsTab) {
        const allTabs = document.querySelectorAll('.main-tab');
        const allTabContents = document.querySelectorAll('.tab-content');
        
        allTabs.forEach(tab => {
            tab.classList.remove('active-tab');
            tab.classList.add('inactive-tab');
        });
        
        allTabContents.forEach(content => {
            content.classList.add('hidden');
        });
        
        downloadsTab.classList.remove('inactive-tab');
        downloadsTab.classList.add('active-tab');
        
        const downloadsContent = document.getElementById('downloads-content');
        if (downloadsContent) {
            downloadsContent.classList.remove('hidden');
            initDownloadsTab();
        }
    }
}
