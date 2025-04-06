// Constants
const API_URL = (() => {
    const serverPort = localStorage.getItem('serverPort') || '5000';
    return `http://localhost:${serverPort}/api`;
})();
const PASSWORD_STRENGTH_LEVELS = {
    0: { class: 'very-weak', text: 'Too weak' },
    1: { class: 'weak', text: 'Weak' },
    2: { class: 'medium', text: 'Medium' },
    3: { class: 'strong', text: 'Strong' },
    4: { class: 'very-strong', text: 'Very strong' }
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds between retries

// DOM Elements
const elements = {
    forms: {
        passwordUpdate: document.getElementById('passwordUpdateForm'),
    },
    inputs: {
        currentPassword: document.getElementById('currentPassword'),
        newPassword: document.getElementById('newPassword'),
        confirmPassword: document.getElementById('confirmPassword'),
        twoFactorAuth: document.getElementById('twoFactorAuth'),
        sessionReminders: document.getElementById('sessionReminders'),
        reminderTime: document.getElementById('reminderTime'),
        messageNotifs: document.getElementById('messageNotifs'),
        achievementNotifs: document.getElementById('achievementNotifs'),
        resourceNotifs: document.getElementById('resourceNotifs'),
        contactPreference: document.getElementById('contactPreference'),
        timeZone: document.getElementById('timeZone'),
        profileVisibility: document.getElementById('profileVisibility'),
        shareAchievements: document.getElementById('shareAchievements'),
        shareProgress: document.getElementById('shareProgress')
    },
    buttons: {
        passwordToggles: document.querySelectorAll('.password-toggle'),
        saveSettings: document.getElementById('saveSettingsBtn'),
        resetSettings: document.getElementById('resetSettingsBtn')
    },
    toasts: {}
};

// Initialize toasts if they exist
const successToast = document.getElementById('successToast');
const errorToast = document.getElementById('errorToast');
const successMessage = document.getElementById('successToastMessage');
const errorMessage = document.getElementById('errorToastMessage');

if (successToast && successMessage) {
    elements.toasts.success = new bootstrap.Toast(successToast);
    elements.toasts.successMessage = successMessage;
}

if (errorToast && errorMessage) {
    elements.toasts.error = new bootstrap.Toast(errorToast);
    elements.toasts.errorMessage = errorMessage;
}

// Utility function to fetch with retry for rate limiting
async function fetchWithRetry(url, options = {}, maxRetries = MAX_RETRIES) {
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            const response = await fetch(url, options);
            
            // If response is ok or not a rate limit error, return it
            if (response.ok || response.status !== 429) {
                return response;
            }
            
            // Handle rate limiting (429 Too Many Requests)
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 2;
                const delayMs = parseInt(retryAfter) * 1000;
                
                retries++;
                console.log(`Rate limited. Retry ${retries}/${maxRetries} after ${retryAfter}s`);
                
                // Show toast notification for retry
                showToast('warning', `Server busy. Retrying in ${retryAfter}s (${retries}/${maxRetries})...`);
                
                // Wait for the specified delay
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }
            
            return response;
        } catch (error) {
            retries++;
            console.log(`Network error. Retry ${retries}/${maxRetries} after ${RETRY_DELAY/1000}s`);
            
            if (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            } else {
                throw error;
            }
        }
    }
    
    // If we've exhausted retries, make one final attempt
    try {
        return await fetch(url, options);
    } catch (error) {
        throw new Error(`Failed after ${maxRetries} retries: ${error.message}`);
    }
}

// Get token from session
function getAuthToken() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.token) {
            throw new Error('No valid session found');
        }
        return session.token;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}

// Password Strength Checker
class PasswordStrengthChecker {
    static check(password) {
        let score = 0;
        
        // Length check
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        return Math.min(4, Math.floor(score * 0.8));
    }

    static updateStrengthIndicator(password) {
        const strength = this.check(password);
        const strengthInfo = PASSWORD_STRENGTH_LEVELS[strength];
        const progressBar = document.querySelector('.password-strength .progress-bar');
        const strengthText = document.querySelector('.password-strength small');
        
        progressBar.style.width = `${(strength + 1) * 20}%`;
        progressBar.className = `progress-bar ${strengthInfo.class}`;
        strengthText.textContent = `Password strength: ${strengthInfo.text}`;
    }
}

// Settings Manager
class SettingsManager {
    static gatherSettings() {
        return {
            notifications: {
                sessionReminders: elements.inputs.sessionReminders?.checked || false,
                reminderTime: elements.inputs.reminderTime?.value || '1hour',
                messages: elements.inputs.messageNotifs?.checked || false,
                achievements: elements.inputs.achievementNotifs?.checked || false,
                resources: elements.inputs.resourceNotifs?.checked || false
            },
            communication: {
                preferredMethod: elements.inputs.contactPreference?.value || 'email',
                timeZone: elements.inputs.timeZone?.value || 'UTC'
            },
            privacy: {
                profileVisibility: elements.inputs.profileVisibility?.value || 'public',
                shareAchievements: elements.inputs.shareAchievements?.checked || false,
                shareProgress: elements.inputs.shareProgress?.checked || false
            },
            security: {
                twoFactorAuth: elements.inputs.twoFactorAuth?.checked || false
            }
        };
    }

    static async saveSettings() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('You are not logged in. Please log in and try again.');
            }
            
            console.log('Gathering settings to save...');
            const settings = SettingsManager.gatherSettings();
            console.log('Settings to save:', settings);
            
            showToast('info', 'Saving your settings...');
            
            const response = await fetchWithRetry(`${API_URL}/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (!response.ok) {
                throw new Error(data.message || `Failed to save settings (${response.status})`);
            }
            
            console.log('Settings saved successfully!');
            showToast('success', 'Settings saved successfully!');
            
            // Reload settings to confirm changes
            await SettingsManager.loadSettings();
        } catch (error) {
            console.error('Save settings error:', error);
            showToast('error', `Failed to save settings: ${error.message}`);
            
            // If it's an authentication error, redirect to login
            if (error.message.toLowerCase().includes('not logged in') || 
                error.message.toLowerCase().includes('token') ||
                error.message.toLowerCase().includes('unauthorized')) {
                window.location.href = '/login.html';
            }
        }
    }

    static async loadSettings() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('You are not logged in');
            }

            const response = await fetchWithRetry(`${API_URL}/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to load settings');
            }

            // If data.settings is not available, try to use data directly
            const settingsData = data.settings || data;
            if (!settingsData) {
                throw new Error('No settings data available');
            }

            this.applySettings(settingsData);
            console.log('Settings loaded successfully');
        } catch (error) {
            console.error('Error loading settings:', error);
            showToast('warning', 'Using default settings. Could not load your saved settings.');
            this.applyDefaultSettings();
        }
    }

    static applyDefaultSettings() {
        const defaultSettings = {
            notifications: {
                sessionReminders: true,
                reminderTime: '1hour',
                messages: true,
                achievements: true,
                resources: true
            },
            communication: {
                preferredMethod: 'email',
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            privacy: {
                profileVisibility: 'public',
                shareAchievements: true,
                shareProgress: true
            },
            security: {
                twoFactorAuth: false
            }
        };

        this.applySettings(defaultSettings);
    }

    static applySettings(settings) {
        // Apply notification settings
        if (settings.notifications) {
            elements.inputs.sessionReminders.checked = settings.notifications.sessionReminders;
            elements.inputs.reminderTime.value = settings.notifications.reminderTime;
            elements.inputs.messageNotifs.checked = settings.notifications.messages;
            elements.inputs.achievementNotifs.checked = settings.notifications.achievements;
            elements.inputs.resourceNotifs.checked = settings.notifications.resources;
        }

        // Apply communication settings
        if (settings.communication) {
            elements.inputs.contactPreference.value = settings.communication.preferredMethod;
            elements.inputs.timeZone.value = settings.communication.timeZone;
        }

        // Apply privacy settings
        if (settings.privacy) {
            elements.inputs.profileVisibility.value = settings.privacy.profileVisibility;
            elements.inputs.shareAchievements.checked = settings.privacy.shareAchievements;
            elements.inputs.shareProgress.checked = settings.privacy.shareProgress;
        }

        // Apply security settings
        if (settings.security) {
            elements.inputs.twoFactorAuth.checked = settings.security.twoFactorAuth;
        }
    }
}

// Password Management
class PasswordManager {
    static async updatePassword(currentPassword, newPassword, confirmPassword) {
        try {
            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }

            const token = getAuthToken();
            if (!token) {
                throw new Error('You are not logged in. Please log in and try again.');
            }

            console.log('Token found:', token); // Debug log
            console.log('Sending password update request...'); // Debug log

            const response = await fetch(`${API_URL}/auth/updateMyPassword`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    passwordCurrent: currentPassword,
                    password: newPassword,
                    passwordConfirm: confirmPassword
                })
            });

            console.log('Response received:', response.status); // Debug log

            const data = await response.json();
            console.log('Response data:', data); // Debug log

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update password');
            }

            // Update session if new token is provided
            if (data.token) {
                const session = JSON.parse(localStorage.getItem('session'));
                session.token = data.token;
                localStorage.setItem('session', JSON.stringify(session));
            }

            showToast('success', 'Password updated successfully!');
            elements.forms.passwordUpdate.reset();
        } catch (error) {
            console.error('Password update error details:', error); // Debug log
            showToast('error', error.message || 'Failed to update password');
        }
    }

    static togglePasswordVisibility(inputElement, toggleButton) {
        const type = inputElement.type === 'password' ? 'text' : 'password';
        inputElement.type = type;
        
        const icon = toggleButton.querySelector('i');
        icon.className = `fas fa-${type === 'password' ? 'eye' : 'eye-slash'}`;
    }
}

// Utility Functions
function showToast(type, message) {
    try {
        if (elements.toasts[type] && elements.toasts[`${type}Message`]) {
            elements.toasts[`${type}Message`].textContent = message;
            elements.toasts[type].show();
            return;
        }
        
        // If specific toast not found, create a dynamic one
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            // Create toast container if it doesn't exist
            const container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white';
        
        // Set background color based on type
        switch(type) {
            case 'success': toast.classList.add('bg-success'); break;
            case 'error': toast.classList.add('bg-danger'); break;
            case 'warning': toast.classList.add('bg-warning', 'text-dark'); break;
            case 'info': toast.classList.add('bg-info'); break;
            default: toast.classList.add('bg-secondary'); break;
        }
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        // Add toast to container
        (toastContainer || document.querySelector('.toast-container')).appendChild(toast);
        
        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast, { 
            delay: 5000,
            autohide: true
        });
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    } catch (error) {
        console.error('Error showing toast:', error);
        // Fallback to console
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

function populateTimeZones() {
    const timeZones = Intl.supportedValuesOf('timeZone');
    const select = elements.inputs.timeZone;
    
    timeZones.forEach(zone => {
        const option = new Option(zone, zone);
        select.add(option);
    });
}

// Event Listeners
function setupEventListeners() {
    // Password Update Form
    elements.forms.passwordUpdate.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const spinner = btn.querySelector('.spinner-border');
        
        try {
            btn.disabled = true;
            spinner.classList.remove('d-none');
            
            await PasswordManager.updatePassword(
                elements.inputs.currentPassword.value,
                elements.inputs.newPassword.value,
                elements.inputs.confirmPassword.value
            );
        } finally {
            btn.disabled = false;
            spinner.classList.add('d-none');
        }
    });

    // Password Strength Check
    elements.inputs.newPassword.addEventListener('input', (e) => {
        PasswordStrengthChecker.updateStrengthIndicator(e.target.value);
    });

    // Password Visibility Toggles
    elements.buttons.passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const input = e.target.closest('.input-group').querySelector('input');
            PasswordManager.togglePasswordVisibility(input, toggle);
        });
    });

    // Save Settings
    elements.buttons.saveSettings.addEventListener('click', () => {
        SettingsManager.saveSettings();
    });

    // Reset Settings
    elements.buttons.resetSettings.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            elements.forms.passwordUpdate.reset();
            // Additional reset logic here
            showToast('success', 'Settings reset to default');
        }
    });
}

// Add event listener for page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize navigation first
        if (typeof initializeNavigation === 'function') {
            console.log('Initializing navigation...');
            await initializeNavigation();
        } else {
            console.error('Navigation initialization function not found');
        }
        
        // Initialize settings
        console.log('Loading settings...');
        await SettingsManager.loadSettings();
        
        // Add event listeners for settings form
        if (elements.buttons.saveSettings) {
            elements.buttons.saveSettings.addEventListener('click', async () => {
                try {
                    await SettingsManager.saveSettings();
                } catch (error) {
                    console.error('Error saving settings:', error);
                    showToast('error', 'Failed to save settings: ' + error.message);
                }
            });
        }
        
        if (elements.buttons.resetSettings) {
            elements.buttons.resetSettings.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all settings to default?')) {
                    SettingsManager.applyDefaultSettings();
                    showToast('success', 'Settings reset to default');
                }
            });
        }
        
        // Initialize password toggles
        elements.buttons.passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const input = this.previousElementSibling;
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
        
        // Initialize password strength checker
        const newPasswordInput = elements.inputs.newPassword;
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', function() {
                PasswordStrengthChecker.updateStrengthIndicator(this.value);
            });
        }

        // Initialize time zones
        populateTimeZones();

        console.log('Settings page initialized successfully');
    } catch (error) {
        console.error('Error initializing settings page:', error);
        showToast('error', 'Failed to initialize settings page: ' + error.message);
    }
}); 