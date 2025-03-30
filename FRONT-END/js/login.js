// Initialize AOS
AOS.init({
    duration: 800,
    easing: 'ease-out',
    once: true
});

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
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Show success message with animation
        showSuccess('Login successful! Redirecting to dashboard...');
            loginButton.classList.add('d-none');
            logoutButton.classList.remove('d-none');
            
        // Set session
        setSession(data.token, data.data.user);
        
        // Show progress bar
        let progress = 0;
        const progressBar = document.createElement('div');
        progressBar.className = 'progress mt-3';
        progressBar.innerHTML = '<div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%"></div>';
        successMessage.appendChild(progressBar);
        
        const progressInterval = setInterval(() => {
            progress += 5;
            progressBar.querySelector('.progress-bar').style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(progressInterval);
                window.location.href = 'dashboard.html';
            }
        }, 50);

    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Invalid email or password');
        emailInput.classList.add('is-invalid');
        passwordInput.classList.add('is-invalid');
    } finally {
        buttonText.textContent = 'Sign In';
        spinner.classList.add('d-none');
        loginButton.disabled = false;
    }
});

// Logout functionality
logoutButton.addEventListener('click', async () => {
    try {
        await fetch('http://localhost:5000/api/auth/logout', {
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