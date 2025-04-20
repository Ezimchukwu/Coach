// Constants
const API_BASE_URL = 'http://localhost:5000/api';
const GOOGLE_CLIENT_ID = '390313645821-k0lb6lopmpvkhfuniictveifcf2708q8.apps.googleusercontent.com';

// Initialize AOS
AOS.init({
    duration: 800,
    easing: 'ease-out',
    once: true
});

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        console.error('Server check failed:', error);
        return false;
    }
}

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const buttonText = loginButton.querySelector('.button-text');
const spinner = loginButton.querySelector('.spinner-border');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const rememberMe = document.getElementById('rememberMe');
const googleSignInBtn = document.getElementById('googleSignInBtn');

// Show popup blocked message with instructions
function showPopupBlockedMessage() {
    const message = `
        <div class="alert alert-warning">
            <h5 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>Popup Blocked</h5>
            <p class="mb-0">Please allow popups for this website to use Google Sign-In. Here's how:</p>
            <ol class="mt-2 mb-0">
                <li>Look for the popup blocked icon <i class="fas fa-window-restore"></i> in your browser's address bar</li>
                <li>Click it and select "Always allow popups from this site"</li>
                <li>Click the "Sign in with Google" button again</li>
            </ol>
        </div>
    `;
    errorMessage.innerHTML = message;
    errorMessage.classList.remove('d-none');
}

// Handle Google Sign-In
function handleGoogleSignIn() {
    // Direct redirect to Google auth endpoint
    window.location.href = `${API_BASE_URL}/auth/google`;
}

// Handle successful social login
function handleSocialLoginSuccess(token) {
    if (!token) {
        showError('Authentication failed');
        return;
    }

    // Store the token
    localStorage.setItem('authToken', token);
    
    // Store session data
    const session = {
        token,
        expiresAt: Date.now() + SESSION_DURATION
    };
    localStorage.setItem('session', JSON.stringify(session));
    
    // Show success message and redirect
    showSuccess('Successfully signed in!');
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePasswordBtn.querySelector('i').classList.toggle('fa-eye');
    togglePasswordBtn.querySelector('i').classList.toggle('fa-eye-slash');
});

// Email validation
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Show error message
function showError(message) {
    errorMessage.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
        </div>
    `;
    errorMessage.classList.remove('d-none');
}

// Show success message
function showSuccess(message) {
    successMessage.innerHTML = `
        <div class="alert alert-success">
            <i class="fas fa-check-circle me-2"></i>
            ${message}
        </div>
    `;
    successMessage.classList.remove('d-none');
}

// Session management
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

function setSession(token, user) {
    const session = {
        token,
        user,
        expiresAt: Date.now() + SESSION_DURATION
    };
    localStorage.setItem('session', JSON.stringify(session));
    
    // Save email if remember me is checked
    if (rememberMe.checked) {
        localStorage.setItem('rememberedEmail', user.email);
    } else {
        localStorage.removeItem('rememberedEmail');
    }
}

// Load remembered email
const rememberedEmail = localStorage.getItem('rememberedEmail');
if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberMe.checked = true;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters for token or error
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
        // Store the token and redirect
        handleSocialLoginSuccess(token);
    } else if (error) {
        showError(decodeURIComponent(error));
    }

    // Add click handler for Google Sign-In button
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }

    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const session = checkSession();
    if (session) {
        emailInput.value = session.user.email;
        loginButton.classList.add('d-none');
        logoutButton.classList.remove('d-none');
        
        // Refresh session if needed
        refreshSession();
    }
    
    // Check if this is a protected route
    checkProtectedRoute();
});

// Auto refresh session
setInterval(refreshSession, SESSION_DURATION / 2);

// Success message display
function showSuccessMessage(message) {
    successMessage.innerHTML = `
        <div class="text-center">
            <i class="fas fa-check-circle text-success fa-2x mb-2"></i>
            <div>${message}</div>
        </div>
    `;
    successMessage.classList.remove('d-none');
}

// Input validation and real-time feedback
emailInput.addEventListener('input', () => {
    const isValid = emailInput.checkValidity();
    emailInput.classList.toggle('is-invalid', !isValid);
});

passwordInput.addEventListener('input', () => {
    const isValid = passwordInput.value.length >= 6;
    passwordInput.classList.toggle('is-invalid', !isValid);
});

// Add smooth transitions for form elements
document.querySelectorAll('.form-control, .btn').forEach(element => {
    element.style.transition = 'all 0.3s ease';
});

// Social login buttons hover effect
document.querySelectorAll('.social-btn').forEach(button => {
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-3px)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
    });
}); 

function checkSession() {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session) return null;
    
    if (Date.now() > session.expiresAt) {
        clearSession();
        return null;
    }
    
    return session;
}

function clearSession() {
    localStorage.removeItem('session');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function refreshSession() {
    const session = checkSession();
    if (session) {
        setSession(session.token, session.user);
    }
}

// Handle regular login
async function handleLogin(event) {
    event.preventDefault();
    hideMessages();

    try {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Show loading state
        buttonText.style.display = 'none';
        spinner.classList.remove('d-none');
        loginButton.disabled = true;

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            // Check if this is a Google-authenticated account
            if (data.message && data.message.includes('google authentication')) {
                // Highlight the Google Sign-In button
                googleSignInBtn.classList.add('btn-pulse');
                setTimeout(() => googleSignInBtn.classList.remove('btn-pulse'), 2000);
                
                showError(`
                    <div>
                        <p>This email was registered using Google Sign-In.</p>
                        <p>Please use the "Sign in with Google" button above to login.</p>
                    </div>
                `);
                return;
            }
            throw new Error(data.message || 'Login failed');
        }

        // Store authentication data
        localStorage.setItem('authToken', data.data.token);
        
        // Store session data
        const session = {
            token: data.data.token,
            user: data.data.user,
            expiresAt: Date.now() + SESSION_DURATION
        };
        localStorage.setItem('session', JSON.stringify(session));

        showSuccess('Login successful!');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Failed to login');
    } finally {
        // Reset loading state
        buttonText.style.display = 'inline';
        spinner.classList.add('d-none');
        loginButton.disabled = false;
    }
}

// UI Helper Functions
function showLoading(show) {
    loginButton.disabled = show;
    buttonText.style.display = show ? 'none' : 'inline';
    spinner.classList.toggle('d-none', !show);
    if (googleSignInBtn) {
        googleSignInBtn.disabled = show;
    }
}

function hideMessages() {
    successMessage.classList.add('d-none');
    errorMessage.classList.add('d-none');
}

// Protected route check
function checkProtectedRoute() {
    const protectedPaths = [
        '/membership-payment.html',
        '/success.html',
        '/email-templates.html'
    ];
    
    const currentPath = window.location.pathname;
    const isProtectedRoute = protectedPaths.some(path => currentPath.endsWith(path));
    
    if (isProtectedRoute) {
        const session = checkSession();
        if (!session) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(currentPath);
            return false;
        }
    }
    return true;
}

// Add CSS for Google button pulse animation
const style = document.createElement('style');
style.textContent = `
    .btn-pulse {
        animation: pulse 1s;
        box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
    }
    
    @keyframes pulse {
        0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
        }
        
        70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
        }
        
        100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
        }
    }
`;
document.head.appendChild(style); 