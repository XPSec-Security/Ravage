function switchAgentTab(uuid, tabName) {
    const consoleContent = document.getElementById(`console-content-${uuid}`);
    const screenshotContent = document.getElementById(`screenshot-content-${uuid}`);
    
    const consoleBtn = document.getElementById(`console-tab-btn-${uuid}`);
    const screenshotBtn = document.getElementById(`screenshot-tab-btn-${uuid}`);
    
    consoleContent.classList.add('hidden');
    screenshotContent.classList.add('hidden');
    consoleBtn.classList.remove('text-blue-400', 'border-b-2', 'border-blue-500', 'font-medium');
    consoleBtn.classList.add('text-gray-400', 'hover:text-gray-300');
    screenshotBtn.classList.remove('text-blue-400', 'border-b-2', 'border-blue-500', 'font-medium');
    screenshotBtn.classList.add('text-gray-400', 'hover:text-gray-300');
    
    if (tabName === 'console') {
        consoleContent.classList.remove('hidden');
        consoleBtn.classList.remove('text-gray-400', 'hover:text-gray-300');
        consoleBtn.classList.add('text-blue-400', 'border-b-2', 'border-blue-500', 'font-medium');
    } else if (tabName === 'screenshot') {
        screenshotContent.classList.remove('hidden');
        screenshotBtn.classList.remove('text-gray-400', 'hover:text-gray-300');
        screenshotBtn.classList.add('text-blue-400', 'border-b-2', 'border-blue-500', 'font-medium');
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
