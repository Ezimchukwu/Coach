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

        // Validate form
        if (!validateForm(firstName, lastName, email, phone, password, confirmPassword, interest, terms)) {
            return;
        }

        // Show loading state
        buttonText.textContent = 'Creating Account...';
        spinner.classList.remove('d-none');
        registerButton.disabled = true;

        try {
            // Prepare data for API
            const userData = {
                firstName,
                lastName,
                email,
                phone,
                password,
                interest
            };

            // Send registration request to API
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            const data = await response.json();

            // Show success message
            successMessage.classList.remove('d-none');
            registerForm.reset();

            // Store user data
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userName', `${firstName} ${lastName}`);

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            errorMessage.textContent = 'Registration failed. Please try again.';
            errorMessage.classList.remove('d-none');
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
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// Real-time password strength validation
function validatePasswordStrength() {
    const password = document.getElementById('password');
    const strengthIndicator = password.nextElementSibling;
    
    if (password.value.length < 8) {
        password.classList.add('is-invalid');
        return;
    }
    
    const hasUpperCase = /[A-Z]/.test(password.value);
    const hasLowerCase = /[a-z]/.test(password.value);
    const hasNumbers = /\d/.test(password.value);
    const hasSpecialChar = /[@$!%*?&]/.test(password.value);
    
    if (hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar) {
        password.classList.remove('is-invalid');
        password.classList.add('is-valid');
    } else {
        password.classList.add('is-invalid');
        password.classList.remove('is-valid');
    }
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