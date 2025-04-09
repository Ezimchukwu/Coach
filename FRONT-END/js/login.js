// Constants
const API_URL = 'http://localhost:5000/api';  // Use fixed port 5000

// Initialize AOS
AOS.init({
    duration: 800,
    easing: 'ease-out',
    once: true
});

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch(`${API_URL}/health`);
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

// Login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset messages
    successMessage.classList.add('d-none');
    errorMessage.classList.add('d-none');
    
    // Get form values
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validation
    if (!email || !isValidEmail(email)) {
        showError('Please enter a valid email address');
        emailInput.focus();
        return;
    }
    
    if (!password) {
        showError('Please enter your password');
        passwordInput.focus();
        return;
    }
    
    // Show loading state
    buttonText.textContent = 'Signing in...';
    spinner.classList.remove('d-none');
    loginButton.disabled = true;
    
    try {
        // Check if server is running first
        const isServerRunning = await checkServer();
        if (!isServerRunning) {
            throw new Error('Server is not running. Please ensure the backend server is started.');
        }

        console.log('Attempting login with:', { email });
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        console.log('Response status:', response.status);
        
        // Get the response text first
        const responseText = await response.text();
        console.log('Raw response:', responseText);

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid response from server');
        }

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        if (!data.token || !data.data || !data.data.user) {
            throw new Error('Invalid response format from server');
        }

        console.log('Login successful, user data:', data.data.user);
            
        // Set session with complete user data
        setSession(data.token, data.data.user);
        
        // Store user data in local storage
        const user = data.data.user;
        if (user) {
            console.log('Setting local storage user fields:', {
                email: user.email,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            });
            
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userName', user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.email.split('@')[0]);
        }
        
        // Show success message and redirect
        showSuccess('Login successful! Redirecting to dashboard...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Failed to login. Please try again.');
    } finally {
        // Reset button state
        buttonText.textContent = 'Sign In';
        spinner.classList.add('d-none');
        loginButton.disabled = false;
    }
});

// Logout functionality
logoutButton.addEventListener('click', async () => {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('session');
        window.location.href = 'login.html';
    }
});

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

// Check session on page load
document.addEventListener('DOMContentLoaded', () => {
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