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

        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user profile');

        const user = await response.json();
        
        // Update profile photo and name
        const profilePhoto = document.querySelector('.profile-photo');
        const userName = document.getElementById('userName');
        
        if (profilePhoto) {
            profilePhoto.src = user.photo || 'images/default-avatar.png';
        }
        
        if (userName) {
            userName.textContent = user.name;
        }

        // Update notification badges
        updateNotificationBadges(user.notifications, user.messages);
    } catch (error) {
        console.error('Error updating user profile:', error);
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
        const session = checkSession();
        if (!session) return;

        // Call logout endpoint
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        // Clear local storage
        localStorage.removeItem('session');
        
        // Redirect to login
        redirectToLogin();
    } catch (error) {
        console.error('Error during logout:', error);
        showToast('error', 'Failed to logout');
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