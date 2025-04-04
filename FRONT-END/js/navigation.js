// Constants
const API_BASE_URL = 'http://localhost:5000/api';
const PAGES = {
    DASHBOARD: 'dashboard.html',
    SCHEDULE: 'schedule.html',
    COURSES: 'courses.html',
    RESOURCES: 'resources.html',
    COMMUNITY: 'community.html',
    LOGIN: 'login.html',
    PROFILE: 'profile.html',
    SETTINGS: 'settings.html'
};

// Session Management
function checkSession() {
    const session = localStorage.getItem('session');
    if (!session) {
        redirectToLogin();
        return null;
    }
    return JSON.parse(session);
}

function redirectToLogin() {
    window.location.href = PAGES.LOGIN;
}

// Navigation Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation elements
    initializeNavigation();
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

function initializeNavigation() {
    // Update active navigation link
    const currentPage = window.location.pathname.split('/').pop() || PAGES.DASHBOARD;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Initialize user profile in navigation
    updateUserProfile();
}

async function updateUserProfile() {
    try {
        const session = checkSession();
        if (!session) return;

        // Use session data for immediate display while API call is in progress
        const sessionUser = session.user;
        if (sessionUser) {
            console.log('Session user data:', sessionUser);
            
            // Immediately update UI with session data
            updateProfileUI({
                firstName: sessionUser.firstName || '',
                lastName: sessionUser.lastName || '',
                email: sessionUser.email || 'user@example.com',
                photo: sessionUser.photo || 'images/default-avatar.png'
            });
        }

        // Then try to get fresh data from API
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) {
            console.error('API error:', response.status, response.statusText);
            return; // Already displayed session data, so no need to show error
        }

        const result = await response.json();
        console.log('User profile data from API:', result);
        
        if (result.data && result.data.user) {
            // Update UI with fresh data from API
            updateProfileUI(result.data.user);
        }
    } catch (error) {
        console.error('Error updating user profile:', error);
        // Already displayed session data, so just log the error
    }
}

function updateProfileUI(user) {
    // Update profile photo and name
    const profilePhoto = document.querySelector('.profile-photo');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    console.log('Updating profile UI with user data:', user);
    
    // Try to get user email from multiple sources
    const email = user.email || localStorage.getItem('userEmail') || JSON.parse(localStorage.getItem('session'))?.user?.email || 'user@example.com';
    
    if (profilePhoto) {
        // Ensure there's a fallback image path
        const defaultImagePath = 'images/default-avatar.png';
        profilePhoto.src = user.photo || defaultImagePath;
        
        // Add error handler in case the image fails to load
        profilePhoto.onerror = function() {
            this.src = defaultImagePath;
            console.log('Profile image failed to load, using default');
        };
    }
    
    if (userName) {
        // Use firstName and lastName if available, otherwise fallback to email
        if (user.firstName || user.lastName) {
            userName.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        } else {
            const storedName = localStorage.getItem('userName');
            userName.textContent = storedName || email.split('@')[0] || 'User';
        }
    }
    
    // Update email element if it exists
    if (userEmail) {
        console.log('Setting user email to:', email);
        userEmail.textContent = email;
        
        // Also update localStorage to ensure consistency
        if (email && email !== 'user@example.com') {
            localStorage.setItem('userEmail', email);
        }
    }

    // Update notification badges if they exist in the response
    if (user.notifications || user.messages) {
        updateNotificationBadges(user.notifications, user.messages);
    }
}

function updateNotificationBadges(notifications = 0, messages = 0) {
    const notificationBadge = document.querySelector('.notification-badge');
    const messageBadge = document.querySelector('.message-badge');
    
    if (notificationBadge) {
        notificationBadge.textContent = notifications;
        notificationBadge.style.display = notifications > 0 ? 'block' : 'none';
    }
    
    if (messageBadge) {
        messageBadge.textContent = messages;
        messageBadge.style.display = messages > 0 ? 'block' : 'none';
    }
}

async function handleLogout() {
    try {
        console.log('Attempting to logout...'); // Debug log
        
        // Clear local storage first
        localStorage.removeItem('session');
        
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // Ensure we still redirect even if there's an error
        window.location.href = 'login.html';
    }
}

// Toast Notifications
function showToast(type, message) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast show bg-${type === 'error' ? 'danger' : 'success'} text-white`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export functions for use in other modules
window.checkSession = checkSession;
window.showToast = showToast;
window.API_BASE_URL = API_BASE_URL; 