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

// Newsletter form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text').textContent;
    const spinner = submitButton.querySelector('.spinner-border');
    
    try {
        // Show loading state
        submitButton.disabled = true;
        spinner.classList.remove('d-none');
        
        // Get form data
        const nameInput = form.querySelector('#name');
        const emailInput = form.querySelector('#email');
        const interestInput = form.querySelector('#interest');
        const privacyInput = form.querySelector('#privacyPolicy');

        // Log form field values for debugging
        console.log('Form Data:', {
            name: nameInput?.value,
            email: emailInput?.value,
            interest: interestInput?.value,
            privacyAccepted: privacyInput?.checked
        });

        // Validate each field individually
        if (!nameInput?.value?.trim()) {
            throw new Error('Please enter your name');
        }
        if (!emailInput?.value?.trim()) {
            throw new Error('Please enter your email');
        }
        if (!interestInput?.value?.trim()) {
            throw new Error('Please select your interest');
        }
        if (!privacyInput?.checked) {
            throw new Error('Please accept the privacy policy');
        }

        const formData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            interest: interestInput.value.trim(),
            privacyAccepted: privacyInput.checked
        };

        // Submit form data
        const response = await fetch('http://localhost:5000/api/newsletter/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        // Log the response for debugging
        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);

        if (!response.ok) {
            throw new Error(responseData.message || 'Subscription failed');
        }

        // Show success message
        showAlert('success', responseData.message || 'Thank you for subscribing!');
        
        // Reset form
        form.reset();
        
    } catch (error) {
        console.error('Form submission error:', error);
        showAlert('danger', error.message || 'Something went wrong. Please try again.');
        
    } finally {
        // Reset button state
        submitButton.disabled = false;
        spinner.classList.add('d-none');
        submitButton.querySelector('.button-text').textContent = buttonText;
    }
}

// Show alert message
function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.error('Alert container not found');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alert.parentNode === alertContainer) {
            alert.classList.remove('show');
            setTimeout(() => alertContainer.removeChild(alert), 150);
        }
    }, 5000);
}

// Add form submit event listener
document.addEventListener('DOMContentLoaded', function() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('Newsletter form not found');
    }
});

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

// Contact form submission
async function handleContactFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.textContent;
    
    try {
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
        
        // Get form data
        const formData = {
            name: form.querySelector('input[name="name"]').value.trim(),
            email: form.querySelector('input[name="email"]').value.trim(),
            service: form.querySelector('select[name="service"]').value.trim(),
            message: form.querySelector('textarea[name="message"]').value.trim()
        };

        // Validate form data
        if (!formData.name || !formData.email || !formData.service || !formData.message) {
            throw new Error('Please fill in all required fields');
        }

        // Submit form data
        const response = await fetch('http://localhost:5000/api/contact/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send message');
        }

        // Show success message with custom styling
        showContactAlert('success', `
            <div class="text-center">
                <i class="fas fa-check-circle fa-3x mb-3 text-success"></i>
                <h4 class="alert-heading mb-2">Message Sent Successfully!</h4>
                <p class="mb-0">Thank you for reaching out, ${formData.name}! We've received your message and will get back to you soon.</p>
            </div>
        `);
        
        // Reset form
        form.reset();
        
        // Scroll to the alert
        const alertContainer = document.getElementById('contactAlertContainer');
        if (alertContainer) {
            alertContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
    } catch (error) {
        console.error('Contact form submission error:', error);
        showContactAlert('danger', `
            <div class="text-center">
                <i class="fas fa-exclamation-circle fa-3x mb-3 text-danger"></i>
                <h4 class="alert-heading mb-2">Oops!</h4>
                <p class="mb-0">${error.message || 'Something went wrong. Please try again.'}</p>
            </div>
        `);
        
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = buttonText;
    }
}

// Show contact form alert message
function showContactAlert(type, message) {
    const alertContainer = document.getElementById('contactAlertContainer');
    if (!alertContainer) return;
    
    // Remove any existing alerts
    const existingAlert = alertContainer.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add some animation classes
    alert.style.animation = 'fadeInDown 0.5s ease-out';
    
    // Add the alert to the container
    alertContainer.appendChild(alert);
    
    // Auto dismiss success messages after 8 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (alert.parentNode === alertContainer) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 150);
            }
        }, 8000);
    }
}

// Add contact form submit event listener
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }
    
    // Add custom animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}); 