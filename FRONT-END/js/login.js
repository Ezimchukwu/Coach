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

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePasswordBtn.querySelector('i').classList.toggle('fa-eye');
    togglePasswordBtn.querySelector('i').classList.toggle('fa-eye-slash');
});

// Form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Hide any existing messages
    successMessage.classList.add('d-none');
    errorMessage.classList.add('d-none');
    
    // Show loading state
    buttonText.textContent = 'Signing in...';
    spinner.classList.remove('d-none');
    loginButton.disabled = true;
    
    // Get form data
    const email = emailInput.value;
    const password = passwordInput.value;
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For demo purposes, check if email contains "@" and password length >= 6
        if (email.includes('@') && password.length >= 6) {
            // Successful login
            successMessage.classList.remove('d-none');
            loginButton.classList.add('d-none');
            logoutButton.classList.remove('d-none');
            
            // Store login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            
            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        // Show error message
        errorMessage.classList.remove('d-none');
        errorMessage.textContent = error.message;
    } finally {
        // Reset button state
        buttonText.textContent = 'Sign In';
        spinner.classList.add('d-none');
        loginButton.disabled = false;
    }
});

// Logout functionality
logoutButton.addEventListener('click', () => {
    // Clear login state
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    
    // Show success message
    successMessage.textContent = 'Logged out successfully!';
    successMessage.classList.remove('d-none');
    
    // Reset form
    loginForm.reset();
    
    // Show login button, hide logout button
    loginButton.classList.remove('d-none');
    logoutButton.classList.add('d-none');
    
    // Redirect after 2 seconds
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
});

// Check login state on page load
document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userEmail = localStorage.getItem('userEmail');
    
    if (isLoggedIn && userEmail) {
        emailInput.value = userEmail;
        loginButton.classList.add('d-none');
        logoutButton.classList.remove('d-none');
    }
});

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