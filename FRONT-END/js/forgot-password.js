// Initialize AOS
AOS.init({
    duration: 800,
    once: true
});

// DOM Elements
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const submitButton = document.getElementById('submitButton');
const resetButton = document.getElementById('resetButton');
const emailInput = document.getElementById('email');
const resetTokenInput = document.getElementById('resetToken');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const togglePasswordBtn = document.getElementById('togglePassword');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
    const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    newPasswordInput.setAttribute('type', type);
    confirmPasswordInput.setAttribute('type', type);
    togglePasswordBtn.querySelector('i').classList.toggle('fa-eye');
    togglePasswordBtn.querySelector('i').classList.toggle('fa-eye-slash');
});

// Password strength indicator
function updatePasswordStrengthIndicator(password) {
    const strengthIndicator = document.querySelector('.password-strength-indicator');
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
    
    strengthIndicator.innerHTML = `
        <div class="progress" style="height: 5px;">
            <div class="progress-bar ${strengthClass}" style="width: ${(strength + 1) * 25}%"></div>
        </div>
        <small class="text-muted mt-1">${strengthText}</small>
    `;
}

function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    return Math.min(strength, 3);
}

// Step 1: Send reset token
forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset messages
    successMessage.classList.add('d-none');
    errorMessage.classList.add('d-none');
    
    const email = emailInput.value.trim();
    
    // Validate email
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const buttonText = submitButton.querySelector('.button-text');
    const spinner = submitButton.querySelector('.spinner-border');
    buttonText.textContent = 'Sending...';
    spinner.classList.remove('d-none');
    submitButton.disabled = true;
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/forgotPassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send reset token');
        }

        // Show success message and switch to reset form
        showSuccess('Reset token sent! Please check your email.');
        setTimeout(() => {
            forgotPasswordForm.classList.add('d-none');
            resetPasswordForm.classList.remove('d-none');
        }, 2000);

    } catch (error) {
        showError(error.message || 'Failed to send reset token. Please try again.');
    } finally {
        buttonText.textContent = 'Send Reset Link';
        spinner.classList.add('d-none');
        submitButton.disabled = false;
    }
});

// Step 2: Reset password
resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset messages
    successMessage.classList.add('d-none');
    errorMessage.classList.add('d-none');
    
    const token = resetTokenInput.value.trim();
    const password = newPasswordInput.value;
    const passwordConfirm = confirmPasswordInput.value;
    
    // Validate password
    if (!isValidPassword(password)) {
        showError('Password must be at least 8 characters long and include uppercase, lowercase, number and special character');
        return;
    }
    
    if (password !== passwordConfirm) {
        showError('Passwords do not match');
        return;
    }
    
    // Show loading state
    const buttonText = resetButton.querySelector('.button-text');
    const spinner = resetButton.querySelector('.spinner-border');
    buttonText.textContent = 'Resetting...';
    spinner.classList.remove('d-none');
    resetButton.disabled = true;
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/resetPassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                token,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password');
        }

        // Show success animation
        showSuccess(`
            <div class="text-center">
                <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
                <div>Password reset successful!</div>
                <div class="small text-muted">Redirecting to login...</div>
            </div>
        `);

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
                window.location.href = 'login.html';
            }
        }, 50);

    } catch (error) {
        showError(error.message || 'Failed to reset password. Please try again.');
    } finally {
        buttonText.textContent = 'Reset Password';
        spinner.classList.add('d-none');
        resetButton.disabled = false;
    }
});

// Utility functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

function showError(message) {
    errorMessage.innerHTML = `
        <div class="d-flex align-items-center text-danger">
            <i class="fas fa-exclamation-circle me-2"></i>
            <div>${message}</div>
        </div>
    `;
    errorMessage.classList.remove('d-none');
}

function showSuccess(message) {
    successMessage.innerHTML = message;
    successMessage.classList.remove('d-none');
}

// Password strength validation
newPasswordInput.addEventListener('input', function() {
    updatePasswordStrengthIndicator(this.value);
});

// Password match validation
confirmPasswordInput.addEventListener('input', function() {
    if (this.value === newPasswordInput.value) {
        this.classList.remove('is-invalid');
        this.classList.add('is-valid');
    } else {
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    }
}); 