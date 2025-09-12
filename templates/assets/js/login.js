const LoginState = {
    isLoading: false,
    attempts: 0,
    maxAttempts: 5,
    lockoutTime: 300000,
    isLocked: false
};

const elements = {
    form: null,
    usernameInput: null,
    passwordInput: null,
    loginButton: null,
    loadingState: null,
    flashMessages: null
};

function initializeLogin() {
    elements.form = document.getElementById('loginForm');
    elements.usernameInput = document.getElementById('username');
    elements.passwordInput = document.getElementById('password');
    elements.loginButton = document.getElementById('loginButton');
    elements.loadingState = document.getElementById('loadingState');
    elements.flashMessages = document.getElementById('flashMessages');
    
    if (!elements.form) {
        return;
    }
    
    setupBasicEventListeners();
    checkLockoutStatus();
    if (elements.usernameInput) {
        elements.usernameInput.focus();
    }
    autoHideFlashMessages();
}

function setupBasicEventListeners() {
    elements.usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.passwordInput.focus();
        }
    });
    elements.usernameInput.addEventListener('input', validateInputs);
    elements.passwordInput.addEventListener('input', validateInputs);
    elements.usernameInput.addEventListener('focus', addFocusEffect);
    elements.passwordInput.addEventListener('focus', addFocusEffect);
    elements.usernameInput.addEventListener('blur', removeFocusEffect);
    elements.passwordInput.addEventListener('blur', removeFocusEffect);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearForm();
        }
        if (e.key === 'F1') {
            e.preventDefault();
            const tooltip = document.getElementById('shortcutTooltip');
            if (tooltip) {
                tooltip.style.opacity = tooltip.style.opacity === '1' ? '0' : '1';
            }
        }
    });
}

function setupEventListeners() {
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.usernameInput.addEventListener('keypress', handleKeyPress);
    elements.passwordInput.addEventListener('keypress', handleKeyPress);
    elements.usernameInput.addEventListener('input', validateInputs);
    elements.passwordInput.addEventListener('input', validateInputs);
    elements.usernameInput.addEventListener('focus', addFocusEffect);
    elements.passwordInput.addEventListener('focus', addFocusEffect);
    elements.usernameInput.addEventListener('blur', removeFocusEffect);
    elements.passwordInput.addEventListener('blur', removeFocusEffect);
    elements.loginButton.addEventListener('click', preventMultipleClicks);
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

async function handleFormSubmit(event) {
    if (LoginState.isLoading || LoginState.isLocked) {
        event.preventDefault();
        return;
    }
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value.trim();
    if (!validateForm(username, password)) {
        event.preventDefault();
        return;
    }
    setLoadingState(true);
}

function validateForm(username, password) {
    clearErrors();
    let isValid = true;
    if (!username) {
        showFieldError(elements.usernameInput, 'Username is required');
        isValid = false;
    } else if (username.length < 2) {
        showFieldError(elements.usernameInput, 'Username is too short');
        isValid = false;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        showFieldError(elements.usernameInput, 'Username contains invalid characters');
        isValid = false;
    }
    if (!password) {
        showFieldError(elements.passwordInput, 'Password is required');
        isValid = false;
    } else if (password.length < 3) {
        showFieldError(elements.passwordInput, 'Password is too short');
        isValid = false;
    }
    return isValid;
}

function showFieldError(field, message) {
    field.classList.add('border-red-500', 'bg-red-900', 'bg-opacity-20');
    let errorMsg = field.parentNode.querySelector('.field-error');
    if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.className = 'field-error text-red-400 text-xs mt-1 flex items-center gap-1';
        field.parentNode.appendChild(errorMsg);
    }
    errorMsg.innerHTML = `
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        ${message}
    `;
    field.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        field.style.animation = '';
    }, 500);
}

function clearErrors() {
    [elements.usernameInput, elements.passwordInput].forEach(field => {
        field.classList.remove('border-red-500', 'bg-red-900', 'bg-opacity-20');
        const errorMsg = field.parentNode.querySelector('.field-error');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
}

function setLoadingState(loading) {
    LoginState.isLoading = loading;
    if (loading) {
        elements.loginButton.style.display = 'none';
        elements.loadingState.classList.remove('hidden');
        elements.usernameInput.disabled = true;
        elements.passwordInput.disabled = true;
    } else {
        elements.loginButton.style.display = 'block';
        elements.loadingState.classList.add('hidden');
        elements.usernameInput.disabled = false;
        elements.passwordInput.disabled = false;
    }
}

function handleKeyPress(event) {
}

function validateInputs() {
    const username = elements.usernameInput.value.trim();
    const password = elements.passwordInput.value.trim();
    if (username.length > 0) {
        elements.usernameInput.classList.remove('border-red-500', 'bg-red-900', 'bg-opacity-20');
    }
    if (password.length > 0) {
        elements.passwordInput.classList.remove('border-red-500', 'bg-red-900', 'bg-opacity-20');
    }
    const isFormValid = username.length >= 1 && password.length >= 1;
    elements.loginButton.disabled = !isFormValid;
    if (isFormValid) {
        elements.loginButton.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        elements.loginButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function addFocusEffect(event) {
    const field = event.target;
    field.parentNode.classList.add('focused-field');
}

function removeFocusEffect(event) {
    const field = event.target;
    field.parentNode.classList.remove('focused-field');
}

function preventMultipleClicks(event) {
    if (LoginState.isLoading) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
}

function handleKeyboardShortcuts(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleFormSubmit(event);
    }
    if (event.key === 'Escape') {
        clearForm();
    }
}

function clearForm() {
    elements.usernameInput.value = '';
    elements.passwordInput.value = '';
    clearErrors();
    elements.usernameInput.focus();
}

function checkLockoutStatus() {
    const lockoutData = localStorage.getItem('login_lockout');
    if (lockoutData) {
        const { timestamp, attempts } = JSON.parse(lockoutData);
        const timePassed = Date.now() - timestamp;
        if (timePassed < LoginState.lockoutTime) {
            setLockoutState(true, Math.ceil((LoginState.lockoutTime - timePassed) / 1000));
        } else {
            localStorage.removeItem('login_lockout');
        }
    }
}

function setLockoutState(locked, remainingSeconds = 0) {
    LoginState.isLocked = locked;
    if (locked) {
        showError(`Too many attempts. Try again in ${remainingSeconds} seconds.`);
        elements.loginButton.disabled = true;
        elements.usernameInput.disabled = true;
        elements.passwordInput.disabled = true;
        const countdown = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds <= 0) {
                clearInterval(countdown);
                setLockoutState(false);
                location.reload();
            } else {
                const errorEl = document.querySelector('.flash-message');
                if (errorEl) {
                    errorEl.innerHTML = `
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                            Too many attempts. Try again in ${remainingSeconds} seconds.
                        </div>
                    `;
                }
            }
        }, 1000);
    }
}

function autoHideFlashMessages() {
    if (elements.flashMessages && elements.flashMessages.children.length > 0) {
        setTimeout(() => {
            const messages = elements.flashMessages.querySelectorAll('.flash-message');
            messages.forEach(message => {
                message.style.animation = 'fadeOut 0.3s ease-out forwards';
            });
            setTimeout(() => {
                if (elements.flashMessages) {
                    elements.flashMessages.innerHTML = '';
                }
            }, 300);
        }, 5000);
    }
}

function showError(message) {
    if (!elements.flashMessages) return;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-900 bg-opacity-50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm mb-2 flash-message';
    errorDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            ${message}
        </div>
    `;
    elements.flashMessages.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => errorDiv.remove(), 300);
    }, 4000);
}

function addShakeAnimation() {
    if (!document.getElementById('shake-animation')) {
        const style = document.createElement('style');
        style.id = 'shake-animation';
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }
            
            .focused-field {
                transform: scale(1.02);
                transition: transform 0.2s ease;
            }
        `;
        document.head.appendChild(style);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    addShakeAnimation();
    initializeLogin();
});

if (typeof window !== 'undefined') {
    window.loginDebug = {
        info: debugLogin,
        state: LoginState,
        clearLockout: () => localStorage.removeItem('login_lockout'),
        testLockout: () => setLockoutState(true, 10)
    };
}
