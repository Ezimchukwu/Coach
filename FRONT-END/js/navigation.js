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
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMGUwZTAiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIyMCIgZmlsbD0iI2JkYmRiZCIvPjxwYXRoIGQ9Ik0yMCA4MEMyMCA2MCAzMCA1MCA1MCA1MFM4MCA2MCA4MCA4MFoiIGZpbGw9IiNiZGJkYmQiLz48L3N2Zz4=';

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
    
    // Handle mobile sidebar toggle
    const navbarToggler = document.querySelector('.navbar-toggler');
    const sidebar = document.querySelector('.sidebar');

    if (navbarToggler && sidebar) {
        navbarToggler.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (event) => {
        if (window.innerWidth <= 768) {
            const isClickInside = sidebar.contains(event.target) || 
                                navbarToggler.contains(event.target);
            
            if (!isClickInside && sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        }
    });

    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
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
                photo: sessionUser.photo || DEFAULT_AVATAR
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
            const userData = result.data.user;
            // Update UI with fresh data from API
            updateProfileUI({
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || 'user@example.com',
                photo: userData.photo || DEFAULT_AVATAR
            });
            
            // Update session data with fresh data
            session.user = userData;
            localStorage.setItem('session', JSON.stringify(session));
        }
    } catch (error) {
        console.error('Error updating user profile:', error);
        // Already displayed session data, so just log the error
    }
}

function updateProfileUI(user) {
    // Update profile photo and name
    const profilePhotos = document.querySelectorAll('.profile-photo, #navProfilePhoto');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    console.log('Updating profile UI with user data:', user);
    
    // Try to get user email from multiple sources
    const email = user.email || localStorage.getItem('userEmail') || JSON.parse(localStorage.getItem('session'))?.user?.email || 'user@example.com';
    
    // Update all profile photo elements
    profilePhotos.forEach(photo => {
        if (photo) {
            // Get the photo URL from user data
            let photoUrl = user.photo || DEFAULT_AVATAR;
            
            // Only update the src if we have a new photo URL
            if (photoUrl) {
                // Handle both relative and absolute URLs
                if (photoUrl.startsWith('data:')) {
                    photo.src = photoUrl;
                } else if (photoUrl.startsWith('http')) {
                    photo.src = photoUrl;
                } else if (photoUrl.startsWith('/uploads/')) {
                    photo.src = `${API_BASE_URL.replace('/api', '')}${photoUrl}`;
                } else {
                    photo.src = DEFAULT_AVATAR;
                }
                
                // Store the photo URL in localStorage for persistence
                localStorage.setItem('userProfilePhoto', photoUrl);
            } else {
                photo.src = DEFAULT_AVATAR;
            }
            
            // Add error handler in case the image fails to load
            photo.onerror = function() {
                console.error('Failed to load image:', this.src);
                this.src = DEFAULT_AVATAR;
            };
        }
    });

    // Update user name and email if elements exist
    if (userName) {
        userName.textContent = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : email.split('@')[0];
    }
    
    if (userEmail) {
        userEmail.textContent = email;
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
        const token = localStorage.getItem('token');
        const serverPort = localStorage.getItem('serverPort') || '5000';

        // Call logout endpoint
        const response = await fetch(`http://localhost:${serverPort}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Logout failed');
        }

        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('serverPort');
        
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // Still clear local storage and redirect even if the server request fails
        localStorage.removeItem('token');
        localStorage.removeItem('serverPort');
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