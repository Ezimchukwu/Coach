// Initialize AOS
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });

    // Get form elements
    const registerForm = document.getElementById('registerForm');
    const registerButton = document.getElementById('registerButton');
    const buttonText = registerButton.querySelector('.button-text');
    const spinner = registerButton.querySelector('.spinner-border');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        confirmPasswordInput.setAttribute('type', type);
        togglePassword.querySelector('i').classList.toggle('fa-eye');
        togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Form validation and submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Reset messages
        successMessage.classList.add('d-none');
        errorMessage.classList.add('d-none');

        // Get form values
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const interest = document.getElementById('interest').value;
        const terms = document.getElementById('terms').checked;

        // Enhanced validation with specific error messages
        const validationErrors = [];
        
        if (!firstName || !lastName) validationErrors.push('Please enter your full name');
        if (!isValidEmail(email)) validationErrors.push('Please enter a valid email address');
        if (!isValidPhone(phone)) validationErrors.push('Please enter a valid phone number');
        if (!isValidPassword(password)) validationErrors.push('Password must meet all requirements');
        if (password !== confirmPassword) validationErrors.push('Passwords do not match');
        if (!interest) validationErrors.push('Please select your area of interest');
        if (!terms) validationErrors.push('Please accept the terms and conditions');
        
        if (validationErrors.length > 0) {
            errorMessage.innerHTML = validationErrors.map(error => `<div>${error}</div>`).join('');
            errorMessage.classList.remove('d-none');
            return;
        }

        // Show loading state
        buttonText.textContent = 'Creating Account...';
        spinner.classList.remove('d-none');
        registerButton.disabled = true;

        try {
            // Check server connection
            const isConnected = await checkServerConnection();
            if (!isConnected) {
                throw new Error('Server is offline. Please start the backend server and try again.');
            }

            const response = await fetch('http://localhost:5000/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    phoneNumber: phone,
                    password,
                    passwordConfirm: confirmPassword,
                    interest,
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        country: ''
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error && data.error.code === 11000) {
                    // Clear the form and show a more user-friendly message
                    registerForm.reset();
                    throw new Error(`
                        <div class="alert alert-warning text-center">
                            <i class="fas fa-exclamation-triangle mb-2"></i>
                            <p>This email address is already registered.</p>
                            <div class="mt-2">
                                <a href="login.html" class="btn btn-primary btn-sm me-2">Login</a>
                                <a href="forgot-password.html" class="btn btn-secondary btn-sm">Reset Password</a>
                            </div>
                        </div>
                    `);
                }
                throw new Error(data.message || 'Registration failed. Please try again.');
            }

            // Show success message
            successMessage.innerHTML = `
                <div class="alert alert-success text-center">
                    <i class="fas fa-check-circle fa-2x mb-2"></i>
                    <p>Registration successful!</p>
                    <p class="small">Redirecting to login page...</p>
                </div>
            `;
            successMessage.classList.remove('d-none');
            
            // Clear form
            registerForm.reset();

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            
            // Handle specific error cases
            let errorMsg = error.message;
            if (error.message === 'Failed to fetch') {
                errorMsg = `
                    <div class="alert alert-danger text-center">
                        <i class="fas fa-exclamation-circle mb-2"></i>
                        <p>Unable to connect to the server.</p>
                        <ul class="list-unstyled small">
                            <li>1. Check if the backend server is running</li>
                            <li>2. Verify your internet connection</li>
                            <li>3. Try refreshing the page</li>
                        </ul>
                    </div>
                `;
            }
            
            errorMessage.innerHTML = errorMsg;
            errorMessage.classList.remove('d-none');
            errorMessage.scrollIntoView({ behavior: 'smooth' });
            
        } finally {
            // Reset button state
            buttonText.textContent = 'Create Account';
            spinner.classList.add('d-none');
            registerButton.disabled = false;
        }
    });

    // Real-time password validation
    passwordInput.addEventListener('input', validatePasswordStrength);
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);
});

// Validate form inputs
function validateForm(firstName, lastName, email, phone, password, confirmPassword, interest, terms) {
    const errorMessage = document.getElementById('errorMessage');
    
    if (!firstName || !lastName) {
        showError('Please enter your full name');
        return false;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return false;
    }

    if (!isValidPhone(phone)) {
        showError('Please enter a valid phone number');
        return false;
    }

    if (!isValidPassword(password)) {
        showError('Password must be at least 8 characters long and include uppercase, lowercase, number and special character');
        return false;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return false;
    }

    if (!interest) {
        showError('Please select your area of interest');
        return false;
    }

    if (!terms) {
        showError('Please accept the terms and conditions');
        return false;
    }

    return true;
}

// Show error message
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.remove('d-none');
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone format
function isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    return phoneRegex.test(phone);
}

// Validate password strength
function isValidPassword(password) {
    // Minimum 8 characters, must contain at least two of the following:
    // uppercase, lowercase, numbers
    if (password.length < 8) return false;
    
    let criteria = 0;
    if (/[A-Z]/.test(password)) criteria++;
    if (/[a-z]/.test(password)) criteria++;
    if (/[0-9]/.test(password)) criteria++;
    
    return criteria >= 2;
}

// Real-time password strength validation
function validatePasswordStrength() {
    const password = document.getElementById('password');
    const strengthIndicator = password.nextElementSibling;
    
    if (password.value.length < 8) {
        password.classList.add('is-invalid');
        return;
    }
    
    let criteria = 0;
    if (/[A-Z]/.test(password.value)) criteria++;
    if (/[a-z]/.test(password.value)) criteria++;
    if (/[0-9]/.test(password.value)) criteria++;
    
    if (criteria >= 2) {
        password.classList.remove('is-invalid');
        password.classList.add('is-valid');
    } else {
        password.classList.add('is-invalid');
        password.classList.remove('is-valid');
    }
}

function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    return Math.min(strength, 3);
}

// Real-time password match validation
function validatePasswordMatch() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (password.value === confirmPassword.value) {
        confirmPassword.classList.remove('is-invalid');
        confirmPassword.classList.add('is-valid');
    } else {
        confirmPassword.classList.add('is-invalid');
        confirmPassword.classList.remove('is-valid');
    }
}

// Handle social login buttons
document.querySelectorAll('.social-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        // Implement social login functionality here
        alert('Social login functionality will be implemented soon!');
    });
});

// Password strength indicator
function updatePasswordStrengthIndicator(password) {
    const strengthBar = document.createElement('div');
    strengthBar.className = 'password-strength-bar mt-2';
    
    const strength = calculatePasswordStrength(password);
    let strengthText = '';
    let strengthClass = '';
    
    switch(strength) {
        case 0:
            strengthText = 'Very Weak';
            strengthClass = 'bg-danger';
            break;
        case 1:
            strengthText = 'Weak';
            strengthClass = 'bg-warning';
            break;
        case 2:
            strengthText = 'Medium';
            strengthClass = 'bg-info';
            break;
        case 3:
            strengthText = 'Strong';
            strengthClass = 'bg-success';
            break;
    }
    
    strengthBar.innerHTML = `
        <div class="progress" style="height: 5px;">
            <div class="progress-bar ${strengthClass}" style="width: ${(strength + 1) * 25}%"></div>
        </div>
        <small class="text-muted mt-1">${strengthText}</small>
    `;
    
    const existingBar = document.querySelector('.password-strength-bar');
    if (existingBar) {
        existingBar.remove();
    }
    passwordInput.parentElement.appendChild(strengthBar);
}

// Enhanced password validation
passwordInput.addEventListener('input', function() {
    updatePasswordStrengthIndicator(this.value);
    validatePasswordStrength();
});

// Add debounce function for email validation
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Email availability check
const checkEmailAvailability = debounce(async (email) => {
    try {
        const response = await fetch(`http://localhost:5000/api/auth/check-email?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        const emailInput = document.getElementById('email');
        const emailFeedback = document.createElement('div');
        emailFeedback.className = 'email-feedback mt-1';
        
        if (data.available) {
            emailInput.classList.remove('is-invalid');
            emailInput.classList.add('is-valid');
            emailFeedback.innerHTML = '<small class="text-success"><i class="fas fa-check-circle"></i> Email is available</small>';
        } else {
            emailInput.classList.remove('is-valid');
            emailInput.classList.add('is-invalid');
            emailFeedback.innerHTML = `
                <div class="text-danger">
                    <small><i class="fas fa-exclamation-circle"></i> Email already registered</small>
                    <div class="mt-2">
                        <a href="login.html" class="btn btn-sm btn-outline-primary me-2">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </a>
                        <a href="forgot-password.html" class="btn btn-sm btn-outline-secondary">
                            <i class="fas fa-key"></i> Reset Password
                        </a>
                    </div>
                </div>
            `;
        }
        
        const existingFeedback = emailInput.parentElement.querySelector('.email-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        emailInput.parentElement.appendChild(emailFeedback);
        
        // Disable submit button if email is taken
        const submitButton = document.getElementById('registerButton');
        submitButton.disabled = !data.available;
        
    } catch (error) {
        console.error('Email check failed:', error);
    }
}, 500);

// Add email validation listener with immediate feedback
const emailInput = document.getElementById('email');
emailInput.addEventListener('input', function() {
    const email = this.value.trim();
    
    // Remove any existing feedback
    const existingFeedback = this.parentElement.querySelector('.email-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // Basic email format validation
    if (email && !isValidEmail(email)) {
        this.classList.add('is-invalid');
        const emailFeedback = document.createElement('div');
        emailFeedback.className = 'email-feedback mt-1';
        emailFeedback.innerHTML = '<small class="text-danger"><i class="fas fa-exclamation-circle"></i> Please enter a valid email address</small>';
        this.parentElement.appendChild(emailFeedback);
        return;
    }
    
    // If email format is valid, check availability
    if (email && isValidEmail(email)) {
        checkEmailAvailability(email);
    } else {
        this.classList.remove('is-valid', 'is-invalid');
    }
});

// Update form submission to prevent duplicate email registration
registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    // Check email availability one last time before submission
    try {
        const response = await fetch(`http://localhost:5000/api/auth/check-email?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!data.available) {
            errorMessage.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <div>This email is already registered!</div>
                    <div class="mt-3">
                        <a href="login.html" class="btn btn-primary me-2">
                            <i class="fas fa-sign-in-alt"></i> Login Instead
                        </a>
                        <a href="forgot-password.html" class="btn btn-secondary">
                            <i class="fas fa-key"></i> Reset Password
                        </a>
                    </div>
                </div>
            `;
            errorMessage.classList.remove('d-none');
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    } catch (error) {
        console.error('Final email check failed:', error);
    }
    
    // Continue with the rest of the form submission
    // ... rest of your existing form submission code ...
});

// Add this function at the top of your file
async function checkServerConnection() {
    try {
        const response = await fetch('http://localhost:5000/api/health', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Add this function to show server status
function showServerStatus(isConnected) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `server-status alert ${isConnected ? 'alert-success' : 'alert-danger'} mb-3`;
    statusDiv.innerHTML = isConnected ? 
        '<i class="fas fa-check-circle"></i> Server is connected' :
        '<i class="fas fa-exclamation-circle"></i> Server is offline. Please start the backend server.';
    
    const existingStatus = document.querySelector('.server-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const form = document.getElementById('registerForm');
    form.parentElement.insertBefore(statusDiv, form);
    
    // Disable/Enable form based on server status
    const submitButton = document.getElementById('registerButton');
    submitButton.disabled = !isConnected;
    if (!isConnected) {
        submitButton.innerHTML = '<i class="fas fa-exclamation-circle"></i> Server Offline';
    } else {
        submitButton.innerHTML = `
            <span class="button-text">Create Account</span>
            <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
        `;
    }
}

// Add automatic server checking
document.addEventListener('DOMContentLoaded', async function() {
    // Initial server check
    const isConnected = await checkServerConnection();
    showServerStatus(isConnected);
    
    // Periodic server checking every 10 seconds
    setInterval(async () => {
        const isConnected = await checkServerConnection();
        showServerStatus(isConnected);
    }, 10000);
    
    // ... rest of your DOMContentLoaded code ...
}); 