// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.backgroundColor = 'transparent';
        navbar.style.boxShadow = 'none';
    }
});

// Mobile menu toggle
const navbarToggler = document.querySelector('.navbar-toggler');
const navbarCollapse = document.querySelector('.navbar-collapse');

navbarToggler.addEventListener('click', function() {
    navbarCollapse.classList.toggle('show');
});

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    if (!navbarCollapse.contains(e.target) && !navbarToggler.contains(e.target)) {
        navbarCollapse.classList.remove('show');
    }
});

// Animate elements on scroll
const animateOnScroll = function() {
    const elements = document.querySelectorAll('.service-card, .pricing-card');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        
        if (elementTop < window.innerHeight && elementBottom > 0) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
};

// Initial animation check
document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('.service-card, .pricing-card');
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.6s ease-out';
    });
    
    animateOnScroll();
});

// Animate on scroll
window.addEventListener('scroll', animateOnScroll);

// Form submission handler with actual API integration
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('#submitBtn');
    const buttonText = submitBtn.querySelector('.button-text');
    const spinner = submitBtn.querySelector('.spinner-border');
    const successMessage = document.querySelector('#successMessage');
    const errorMessage = document.querySelector('#errorMessage');
    
    // Reset messages
    successMessage.classList.add('d-none');
    errorMessage.classList.add('d-none');
    
    // Show loading state
    buttonText.textContent = 'Submitting...';
    spinner.classList.remove('d-none');
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Send data to your backend API
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Subscription failed');
        }

        // Show success message
        successMessage.classList.remove('d-none');
        form.reset();
        
        // Store subscription status in localStorage
        localStorage.setItem('subscribed', 'true');
        localStorage.setItem('userEmail', data.email);
        
        // Track conversion
        if (typeof gtag !== 'undefined') {
            gtag('event', 'newsletter_signup', {
                'event_category': 'engagement',
                'event_label': data.interest
            });
        }
    } catch (error) {
        console.error('Form submission error:', error);
        errorMessage.classList.remove('d-none');
        errorMessage.textContent = 'Sorry, something went wrong. Please try again later.';
    } finally {
        buttonText.textContent = 'Get Started Now';
        spinner.classList.add('d-none');
        submitBtn.disabled = false;
    }
}

// Interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });
    
    // Check if user is already subscribed
    const isSubscribed = localStorage.getItem('subscribed') === 'true';
    if (isSubscribed) {
        const userEmail = localStorage.getItem('userEmail');
        const subscribeForm = document.getElementById('subscribeForm');
        if (subscribeForm) {
            const emailInput = subscribeForm.querySelector('input[type="email"]');
            if (emailInput) {
                emailInput.value = userEmail;
                emailInput.setAttribute('readonly', true);
            }
            const submitBtn = subscribeForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Already Subscribed';
                submitBtn.disabled = true;
            }
        }
    }
    
    // Handle user authentication state
    const userProfileBar = document.getElementById('userProfileBar');
    const userNameElement = userProfileBar.querySelector('.user-name');
    const logoutBtn = document.getElementById('logoutBtn');
    const registerButton = document.querySelector('.nav-item:nth-last-child(2) .nav-link');
    const loginButton = document.querySelector('.nav-item:last-child .nav-link');

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');

    if (isLoggedIn && userEmail) {
        // Show user profile bar
        userProfileBar.classList.remove('d-none');
        userProfileBar.classList.add('show');
        userNameElement.textContent = userName || userEmail.split('@')[0];

        // Hide register/login buttons
        registerButton.parentElement.style.display = 'none';
        loginButton.parentElement.style.display = 'none';

        // Handle logout
        logoutBtn.addEventListener('click', () => {
            // Clear user data
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');

            // Hide user profile bar
            userProfileBar.classList.remove('show');
            userProfileBar.classList.add('d-none');

            // Show register/login buttons
            registerButton.parentElement.style.display = 'block';
            loginButton.parentElement.style.display = 'block';

            // Reload page to reset state
            window.location.reload();
        });
    } else {
        // Ensure profile bar is hidden and buttons are visible
        userProfileBar.classList.add('d-none');
        registerButton.parentElement.style.display = 'block';
        loginButton.parentElement.style.display = 'block';
    }
    
    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Dynamic content loading for pricing plans
    const loadPricingPlans = async () => {
        try {
            const response = await fetch('/api/pricing-plans');
            const plans = await response.json();
            
            const pricingContainer = document.querySelector('.pricing-cards');
            if (pricingContainer && plans.length) {
                pricingContainer.innerHTML = plans.map(plan => `
                    <div class="col-lg-4">
                        <div class="pricing-card ${plan.featured ? 'featured' : ''}">
                            <h3>${plan.name}</h3>
                            <div class="price">$${plan.price}<span>/month</span></div>
                            <ul class="features-list">
                                ${plan.features.map(feature => `
                                    <li><i class="fas fa-check"></i> ${feature}</li>
                                `).join('')}
                            </ul>
                            <a href="#" class="btn ${plan.featured ? 'btn-primary' : 'btn-outline-primary'} w-100">
                                Choose Plan
                            </a>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading pricing plans:', error);
        }
    };
    
    // Load pricing plans
    loadPricingPlans();
    
    // Form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                validateInput(input);
            });
            
            input.addEventListener('blur', () => {
                validateInput(input);
            });
        });
    });
});

// Input validation helper
function validateInput(input) {
    input.classList.remove('is-invalid');
    let isValid = true;
    
    if (input.hasAttribute('required') && !input.value.trim()) {
        isValid = false;
        showError(input, 'This field is required');
    }
    
    if (input.type === 'email' && input.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value)) {
            isValid = false;
            showError(input, 'Please enter a valid email address');
        }
    }
    
    return isValid;
}

// Show error message helper
function showError(input, message) {
    input.classList.add('is-invalid');
    const feedbackDiv = input.nextElementSibling;
    if (feedbackDiv && feedbackDiv.classList.contains('invalid-feedback')) {
        feedbackDiv.textContent = message;
    } else {
        const newFeedbackDiv = document.createElement('div');
        newFeedbackDiv.className = 'invalid-feedback';
        newFeedbackDiv.textContent = message;
        input.parentNode.insertBefore(newFeedbackDiv, input.nextSibling);
    }
}

// Update hero text dynamically
function updateHeroText() {
    const heroText = document.querySelector('.hero-description');
    if (heroText) {
        heroText.textContent = "I empower people to break through obstacles, gain clarity, and take bold steps toward a fulfilling life. While therapy heals the past, I focus on the now and the next—helping you unlock your potential and create the success you deserve.";
        heroText.setAttribute('data-aos', 'fade-up');
        heroText.setAttribute('data-aos-delay', '200');
    }
}

// Call updateHeroText when DOM is loaded
document.addEventListener('DOMContentLoaded', updateHeroText);

// Initialize tooltips and popovers if using Bootstrap
if (typeof bootstrap !== 'undefined') {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
} 