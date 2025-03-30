// DOM Elements
const resetForm = document.getElementById('resetPasswordForm');
const resetToken = document.getElementById('resetToken');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');
const resetButton = document.getElementById('resetButton');
const buttonText = resetButton.querySelector('.button-text');
const spinner = resetButton.querySelector('.spinner-border');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');

// Password visibility toggle
togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
});

// Password validation
function isValidPassword(password) {
    return password.length >= 8;
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

// Reset password form submission
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset messages
    successMessage.classList.add('d-none');
    errorMessage.classList.add('d-none');
    
    // Get form values
    const token = resetToken.value.trim();
    const password = newPassword.value;
    const passwordConfirm = confirmPassword.value;
    
    // Validation
    if (!token) {
        showError('Please enter the reset code sent to your email');
        resetToken.focus();
        return;
    }

    if (!isValidPassword(password)) {
        showError('Password must be at least 8 characters long');
        newPassword.focus();
        return;
    }

    if (password !== passwordConfirm) {
        showError('Passwords do not match');
        confirmPassword.focus();
        return;
    }
    
    // Show loading state
    buttonText.textContent = 'Resetting Password...';
    spinner.classList.remove('d-none');
    resetButton.disabled = true;
    
    try {
        // Make API call to reset password
        const response = await fetch(`http://localhost:5000/api/auth/resetPassword/${token}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password,
                passwordConfirm
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password');
        }

        // Show success message
        successMessage.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle me-2"></i>
                Password reset successful! You can now login with your new password.
                <div class="mt-3">
                    <a href="login.html" class="btn btn-primary">
                        <i class="fas fa-sign-in-alt me-2"></i>Login Now
                    </a>
                </div>
            </div>
        `;
        successMessage.classList.remove('d-none');
        resetForm.reset();
        resetForm.classList.add('d-none');

        // Redirect to login page after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);

    } catch (error) {
        console.error('Reset password error:', error);
        showError(error.message || 'An error occurred while resetting your password. Please try again.');
    } finally {
        // Reset button state
        buttonText.textContent = 'Reset Password';
        spinner.classList.add('d-none');
        resetButton.disabled = false;
    }
}); 