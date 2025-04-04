// Constants
const API_URL = 'http://localhost:5000/api';
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
    static async saveSettings() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('You are not logged in. Please log in and try again.');
            }
            
            console.log('Saving settings...');
            showToast('info', 'Saving your settings...');
            
            const settings = this.gatherSettings();
            const response = await fetchWithRetry(`${API_URL}/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to save settings');
            }
            
            console.log('Settings saved successfully!');
            showToast('success', 'Settings saved successfully!');
        } catch (error) {
            console.error('Save settings error:', error);
            showToast('error', `Failed to save settings: ${error.message}`);
        }
    }

    static gatherSettings() {
        return {
            notifications: {
                sessionReminders: elements.inputs.sessionReminders.checked,
                reminderTime: elements.inputs.reminderTime.value,
                messages: elements.inputs.messageNotifs.checked,
                achievements: elements.inputs.achievementNotifs.checked,
                resources: elements.inputs.resourceNotifs.checked
            },
            communication: {
                preferredMethod: elements.inputs.contactPreference.value,
                timeZone: elements.inputs.timeZone.value
            },
            privacy: {
                profileVisibility: elements.inputs.profileVisibility.value,
                shareAchievements: elements.inputs.shareAchievements.checked,
                shareProgress: elements.inputs.shareProgress.checked
            },
            security: {
                twoFactorEnabled: elements.inputs.twoFactorAuth.checked
            }
        };
    }

    static async loadSettings() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('You are not logged in. Please log in and try again.');
            }
            
            console.log('Loading settings...');
            
            // Initialize loading state for settings form
            const loadingIndicator = document.getElementById('settingsLoadingIndicator');
            if (loadingIndicator) loadingIndicator.classList.remove('d-none');
            
            // Add a small delay before fetching to avoid rapid requests if page is refreshed
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const response = await fetchWithRetry(`${API_URL}/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.classList.add('d-none');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to load settings (${response.status})`);
            }

            const data = await response.json().catch(() => null);
            console.log('Settings loaded:', data);
            
            // Check if data is in the expected format
            if (!data) {
                throw new Error('No data received from server');
            }
            
            if (data.data) {
                this.applySettings(data.data);
            } else {
                this.applySettings(data);
            }
            
            showToast('success', 'Settings loaded successfully');
        } catch (error) {
            console.error('Load settings error:', error);
            showToast('error', `Failed to load settings: ${error.message}`);
            
            // Use default settings as fallback
            this.applyDefaultSettings();
        }
    }

    static applyDefaultSettings() {
        console.log('Using default settings');
        const defaultSettings = {
            notifications: {
                sessionReminders: true,
                reminderTime: '30',
                messages: true,
                achievements: true,
                resources: false
            },
            communication: {
                preferredMethod: 'email',
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            privacy: {
                profileVisibility: 'public',
                shareAchievements: true,
                shareProgress: false
            },
            security: {
                twoFactorEnabled: false
            }
        };
        
        try {
            this.applySettings(defaultSettings);
            showToast('warning', 'Using default settings. Could not load your saved settings.');
        } catch (error) {
            console.error('Error applying default settings:', error);
            // If even that fails, we'll try to set each control individually
            this.applySettingsSafe(defaultSettings);
        }
    }

    static applySettingsSafe(settings) {
        // A more careful approach that checks each element before trying to set it
        const { notifications, communication, privacy, security } = settings;
        
        // Helper to safely set a checkbox
        const setCheckbox = (element, value) => {
            if (element && typeof value === 'boolean') {
                element.checked = value;
            }
        };
        
        // Helper to safely set a select value
        const setSelect = (element, value) => {
            if (element && value) {
                // Check if the option exists first
                const optionExists = Array.from(element.options).some(option => option.value === value);
                if (optionExists) {
                    element.value = value;
                } else if (element.options.length > 0) {
                    // Fall back to first option
                    element.selectedIndex = 0;
                }
            }
        };
        
        // Apply settings safely
        try {
            // Notifications
            setCheckbox(elements.inputs.sessionReminders, notifications?.sessionReminders);
            setSelect(elements.inputs.reminderTime, notifications?.reminderTime);
            setCheckbox(elements.inputs.messageNotifs, notifications?.messages);
            setCheckbox(elements.inputs.achievementNotifs, notifications?.achievements);
            setCheckbox(elements.inputs.resourceNotifs, notifications?.resources);
            
            // Communication
            setSelect(elements.inputs.contactPreference, communication?.preferredMethod);
            setSelect(elements.inputs.timeZone, communication?.timeZone);
            
            // Privacy
            setSelect(elements.inputs.profileVisibility, privacy?.profileVisibility);
            setCheckbox(elements.inputs.shareAchievements, privacy?.shareAchievements);
            setCheckbox(elements.inputs.shareProgress, privacy?.shareProgress);
            
            // Security
            setCheckbox(elements.inputs.twoFactorAuth, security?.twoFactorEnabled);
            
            console.log('Default settings applied safely');
        } catch (error) {
            console.error('Error applying settings safely:', error);
        }
    }

    static applySettings(settings) {
        console.log('Applying settings:', settings);
        
        // Validate settings object
        if (!settings) {
            console.error('Invalid settings object: null or undefined');
            this.applyDefaultSettings();
            return;
        }
        
        try {
            // Extract sections with fallbacks
            const notifications = settings.notifications || {};
            const communication = settings.communication || {};
            const privacy = settings.privacy || {};
            const security = settings.security || {};
            
            // Apply settings safely using our helper method
            this.applySettingsSafe({
                notifications,
                communication,
                privacy,
                security
            });
        } catch (error) {
            console.error('Error in applySettings:', error);
            this.applyDefaultSettings();
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    populateTimeZones();
    SettingsManager.loadSettings();
}); 