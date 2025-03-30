// DOM Elements
const userNameElement = document.getElementById('userName');
const welcomeUserNameElement = document.getElementById('welcomeUserName');
const activityTimeline = document.getElementById('activityTimeline');
const upcomingSessions = document.getElementById('upcomingSessions');
const logoutButton = document.getElementById('logoutButton');
const profilePhoto = document.getElementById('profilePhoto');
const photoUpload = document.getElementById('photoUpload');
const photoPreview = document.getElementById('photoPreview');
const photoPreviewModal = new bootstrap.Modal(document.getElementById('photoPreviewModal'));
const savePhotoBtn = document.getElementById('savePhotoBtn');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Constants
const API_BASE_URL = 'http://localhost:5000/api';
const dashboardContent = document.querySelector('.dashboard-content');

// Check if user is logged in
function checkAuth() {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.token) {
        window.location.href = 'login.html';
        return null;
    }
    return session;
}

// Initialize dashboard
async function initializeDashboard() {
    const session = checkAuth();
    if (!session) return;

    // Update user name
    const user = session.user;
    userNameElement.textContent = `${user.firstName}`;
    welcomeUserNameElement.textContent = `${user.firstName} ${user.lastName}`;

    // Load dashboard data
    await Promise.all([
        loadActivityTimeline(),
        loadUpcomingSessions(),
        loadUserStats()
    ]);
}

// Load activity timeline
async function loadActivityTimeline() {
    try {
        // TODO: Replace with actual API call
        const activities = [
            {
                type: 'session',
                title: 'Completed Coaching Session',
                description: 'Leadership Development Module 1',
                time: '2 hours ago'
            },
            {
                type: 'achievement',
                title: 'Earned Certificate',
                description: 'Communication Skills Basic',
                time: '1 day ago'
            },
            {
                type: 'course',
                title: 'Started New Course',
                description: 'Advanced Management Techniques',
                time: '2 days ago'
            }
        ];

        const html = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-time">${activity.time}</div>
                <h6 class="mb-1">${activity.title}</h6>
                <p class="mb-0 text-muted">${activity.description}</p>
            </div>
        `).join('');

        activityTimeline.innerHTML = html;
    } catch (error) {
        console.error('Error loading activity timeline:', error);
        activityTimeline.innerHTML = '<div class="text-center text-muted">Unable to load activities</div>';
    }
}

// Load upcoming sessions
async function loadUpcomingSessions() {
    try {
        // TODO: Replace with actual API call
        const sessions = [
            {
                title: 'Leadership Coaching',
                coach: 'Dr. Sarah Johnson',
                time: 'Tomorrow, 10:00 AM',
                duration: '1 hour'
            },
            {
                title: 'Team Management Workshop',
                coach: 'Michael Chen',
                time: 'Friday, 2:00 PM',
                duration: '2 hours'
            },
            {
                title: 'Career Development Session',
                coach: 'Emma Williams',
                time: 'Next Monday, 11:00 AM',
                duration: '1 hour'
            }
        ];

        const html = sessions.map(session => `
            <div class="upcoming-session-item">
                <div class="session-time">${session.time}</div>
                <h6 class="mb-1">${session.title}</h6>
                <p class="mb-0 text-muted">
                    <i class="fas fa-user-tie me-1"></i> ${session.coach}
                    <br>
                    <i class="fas fa-clock me-1"></i> ${session.duration}
                </p>
            </div>
        `).join('');

        upcomingSessions.innerHTML = html;
    } catch (error) {
        console.error('Error loading upcoming sessions:', error);
        upcomingSessions.innerHTML = '<div class="text-center text-muted">Unable to load sessions</div>';
    }
}

// Load user statistics
async function loadUserStats() {
    try {
        // TODO: Replace with actual API call
        // This will be implemented when the backend endpoints are ready
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Handle logout
logoutButton.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        const session = checkAuth();
        if (session?.token) {
            // Call logout API
            await fetch('http://localhost:5000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.token}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear session and redirect
        localStorage.removeItem('session');
        window.location.href = 'login.html';
    }
});

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Check session and load user data
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const session = checkSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        // Load user data
        const response = await fetch('http://localhost:5000/api/users/me', {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user data');

        const userData = await response.json();
        updateUserInterface(userData.data.user);
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('error', 'Failed to load user data');
    }
});

// Update UI with user data
function updateUserInterface(user) {
    userNameElement.textContent = `Welcome, ${user.name}!`;
    userEmail.textContent = user.email;
    
    if (user.photo) {
        profilePhoto.src = user.photo;
        photoPreview.src = user.photo;
    }
    
    // Update stats if available
    if (user.stats) {
        updateUserStats(user.stats);
    }
}

// Profile Photo Upload Handling
async function handleProfilePhotoUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            showToast('error', 'Please select an image file');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            showToast('error', 'Image size should not exceed 5MB');
            return;
        }

        // Show loading state
        const profilePhoto = document.getElementById('profilePhoto');
        const navProfilePhoto = document.getElementById('navProfilePhoto');
        profilePhoto.classList.add('loading');
        showToast('info', 'Uploading photo...');

        // Preview image immediately
        const reader = new FileReader();
        reader.onload = function(e) {
            profilePhoto.src = e.target.result;
            if (navProfilePhoto) {
                navProfilePhoto.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);

        // Create FormData
        const formData = new FormData();
        formData.append('photo', file);

        // Get session token
        const session = checkSession();
        if (!session) {
            showToast('error', 'Please log in again');
            return;
        }

        // Upload to server
        const response = await fetch(`${API_BASE_URL}/users/me/photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload photo');
        }

        const data = await response.json();
        const photoUrl = data.photoUrl || data.photo || data.url;

        // Update profile photos with server URL
        if (photoUrl) {
            profilePhoto.src = photoUrl;
            if (navProfilePhoto) {
                navProfilePhoto.src = photoUrl;
            }
        }

        // Update local storage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.photo = photoUrl;
        localStorage.setItem('user', JSON.stringify(userData));

        showToast('success', 'Profile photo updated successfully');
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        showToast('error', 'Failed to upload profile photo');
        
        // Restore default photo if upload failed
        const defaultPhoto = '/images/default-avatar.png';
        const profilePhoto = document.getElementById('profilePhoto');
        const navProfilePhoto = document.getElementById('navProfilePhoto');
        
        profilePhoto.src = defaultPhoto;
        if (navProfilePhoto) {
            navProfilePhoto.src = defaultPhoto;
        }
    } finally {
        const profilePhoto = document.getElementById('profilePhoto');
        profilePhoto.classList.remove('loading');
        event.target.value = ''; // Reset file input
    }
}

// Cover Photo Upload Handling
async function handleCoverPhotoUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            showToast('error', 'Please select an image file');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            showToast('error', 'Image size should not exceed 5MB');
            return;
        }

        // Show loading state
        const coverElement = document.querySelector('.profile-cover');
        coverElement.style.opacity = '0.5';
        showToast('info', 'Uploading cover photo...');

        // Preview image immediately
        const reader = new FileReader();
        reader.onload = function(e) {
            coverElement.style.backgroundImage = `url('${e.target.result}')`;
        };
        reader.readAsDataURL(file);

        // Create FormData
        const formData = new FormData();
        formData.append('cover', file);

        // Get session token
        const session = checkSession();
        if (!session) {
            showToast('error', 'Please log in again');
            return;
        }

        // Upload to server
        const response = await fetch(`${API_BASE_URL}/users/me/cover`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload cover photo');
        }

        const data = await response.json();
        const coverUrl = data.coverUrl || data.cover || data.url;

        // Update cover photo with server URL
        if (coverUrl) {
            coverElement.style.backgroundImage = `url('${coverUrl}')`;
        }

        // Update local storage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.coverPhoto = coverUrl;
        localStorage.setItem('user', JSON.stringify(userData));

        showToast('success', 'Cover photo updated successfully');
    } catch (error) {
        console.error('Error uploading cover photo:', error);
        showToast('error', 'Failed to upload cover photo');
        
        // Restore default cover if upload failed
        const defaultCover = '/images/default-cover.jpg';
        const coverElement = document.querySelector('.profile-cover');
        coverElement.style.backgroundImage = `url('${defaultCover}')`;
    } finally {
        const coverElement = document.querySelector('.profile-cover');
        coverElement.style.opacity = '1';
        event.target.value = ''; // Reset file input
    }
}

// Edit Profile Handling
async function editProfile() {
    try {
        const session = checkSession();
        if (!session) {
            showToast('error', 'Please log in again');
            return;
        }

        // Fetch current user data
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user data');

        const userData = await response.json();
        
        // Populate form fields
        document.getElementById('editName').value = userData.name || '';
        document.getElementById('editPhone').value = userData.phone || '';
        document.getElementById('editLocation').value = userData.location || '';
        document.getElementById('editBio').value = userData.bio || '';

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        modal.show();
    } catch (error) {
        console.error('Error opening edit profile:', error);
        showToast('error', 'Failed to load profile data');
    }
}

// Save Profile Changes
async function saveProfile(event) {
    event.preventDefault();
    
    try {
        const session = checkSession();
        if (!session) {
            showToast('error', 'Please log in again');
            return;
        }

        const formData = {
            name: document.getElementById('editName').value.trim(),
            phone: document.getElementById('editPhone').value.trim(),
            location: document.getElementById('editLocation').value.trim(),
            bio: document.getElementById('editBio').value.trim()
        };

        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to update profile');

        const updatedData = await response.json();
        
        // Update UI
        document.getElementById('profileName').textContent = updatedData.name;
        document.getElementById('userEmail').textContent = updatedData.email;
        
        // Update local storage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        Object.assign(userData, updatedData);
        localStorage.setItem('user', JSON.stringify(userData));

        // Close modal and show success message
        bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
        showToast('success', 'Profile updated successfully');
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('error', 'Failed to update profile');
    }
}

// Share Profile
async function shareProfile() {
    try {
        const shareData = {
            title: 'Check out my coaching profile',
            text: 'Join me on CoachPro Elite',
            url: window.location.href
        };

        if (navigator.share) {
            await navigator.share(shareData);
            showToast('success', 'Profile shared successfully');
        } else {
            await navigator.clipboard.writeText(window.location.href);
            showToast('success', 'Profile link copied to clipboard');
        }
    } catch (error) {
        console.error('Error sharing profile:', error);
        showToast('error', 'Failed to share profile');
    }
}

// Update user stats
function updateUserStats(stats) {
    // Update stats in the UI
    document.querySelector('.stat-value:nth-child(1)').textContent = stats.sessions || 0;
    document.querySelector('.progress-bar').style.width = `${stats.progress || 0}%`;
    document.querySelector('.stat-value:nth-child(3)').textContent = stats.achievements || 0;
}

// Toast notification
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast show bg-${type === 'error' ? 'danger' : 'success'} text-white`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-body">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
            ${message}
        </div>
    `;
    
    const container = document.querySelector('.toast-container') || (() => {
        const cont = document.createElement('div');
        cont.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(cont);
        return cont;
    })();
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Logout Handler
async function handleLogout() {
    try {
        const session = checkSession();
        if (session) {
            // Show loading state
            const logoutBtn = document.getElementById('logoutBtn');
            const originalContent = logoutBtn.innerHTML;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
            logoutBtn.disabled = true;

            // Call logout API
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to logout');
            }

            // Clear all session data
            localStorage.removeItem('session');
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Show success message
            showToast('success', 'Logged out successfully');

            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } else {
            // If no session exists, just redirect to login
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('error', 'Failed to logout. Please try again.');
        
        // Reset button state
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> <span>Logout</span>';
        logoutBtn.disabled = false;
    }
}

// Session Management
function checkSession() {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session) return null;
    
    if (Date.now() > session.expiresAt) {
        clearSession();
        return null;
    }
    
    return session;
}

function clearSession() {
    localStorage.removeItem('session');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check session first
        const session = checkSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        // Initialize navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const section = link.getAttribute('data-section');
                
                // Remove active class from all links
                navLinks.forEach(l => l.classList.remove('active'));
                // Add active class to clicked link
                link.classList.add('active');
            });
        });

        // Quick Actions Handlers
        const quickActions = document.querySelectorAll('.dropdown-item');
        quickActions.forEach(action => {
            action.addEventListener('click', (e) => {
                const href = action.getAttribute('href');
                if (href && !href.startsWith('#')) {
                    e.preventDefault();
                    window.location.href = href;
                }
            });
        });

        // Settings and Logout Button Handlers
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                window.location.href = 'settings.html';
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Load dashboard data
        await Promise.all([
            loadUserData(),
            loadNotifications(),
            loadMessages(),
            loadDashboardSection()
        ]);

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('error', 'Failed to initialize dashboard');
        // If there's an error, redirect to login
        window.location.href = 'login.html';
    }
});

// User Data Loading
async function loadUserData() {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                clearSession();
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Failed to load user data');
        }

        const userData = await response.json();
        updateUserInterface(userData);
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('error', 'Failed to load user data');
    }
}

// Notifications and Messages
async function loadNotifications() {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load notifications');

        const { notifications } = await response.json();
        updateNotificationBadge(notifications.filter(n => !n.read).length);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function loadMessages() {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/messages`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load messages');

        const { messages } = await response.json();
        updateMessageBadge(messages.filter(m => !m.read).length);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

function updateMessageBadge(count) {
    const badge = document.querySelector('.message-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

// Toast Notifications
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast show bg-${type === 'error' ? 'danger' : 'success'} text-white`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-body">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
            ${message}
        </div>
    `;
    
    const container = document.querySelector('.toast-container') || (() => {
        const cont = document.createElement('div');
        cont.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(cont);
        return cont;
    })();
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderDashboard(data) {
    const { upcomingSessions, recentActivities, stats } = data;
    
    dashboardContent.innerHTML = `
        <div class="row">
            <div class="col-lg-8">
                <!-- Upcoming Sessions -->
                <div class="dashboard-card mb-4">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title">Upcoming Sessions</h5>
                        <button class="btn btn-sm btn-primary" onclick="scheduleNewSession()">
                            <i class="fas fa-plus me-2"></i>Schedule Session
                        </button>
                    </div>
                    <div class="card-body p-0">
                        <div class="upcoming-sessions">
                            ${upcomingSessions.length > 0 ? upcomingSessions.map(session => `
                                <div class="session-item p-3 border-bottom">
                                    <div class="d-flex align-items-center">
                                        <img src="${session.coach.photo || '/images/default-avatar.png'}" 
                                             class="rounded-circle me-3" 
                                             width="50" height="50" 
                                             alt="${session.coach.name}">
                                        <div>
                                            <h6 class="mb-1">${session.topic}</h6>
                                            <p class="mb-0 text-muted">
                                                <i class="fas fa-user-tie me-2"></i>${session.coach.name}
                                                <br>
                                                <i class="fas fa-calendar me-2"></i>${formatDate(session.startTime)}
                                                <br>
                                                <i class="fas fa-clock me-2"></i>${session.duration} minutes
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center p-4">
                                    <p class="text-muted mb-0">No upcoming sessions</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h5 class="card-title">Recent Activity</h5>
                    </div>
                    <div class="card-body">
                        <div class="activity-timeline">
                            ${recentActivities.length > 0 ? recentActivities.map(activity => `
                                <div class="timeline-item">
                                    <div class="timeline-date">${formatDate(activity.createdAt)}</div>
                                    <div class="timeline-content">
                                        <h6 class="mb-1">${formatActivityType(activity.type)}</h6>
                                        <p class="mb-0">${activity.description}</p>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center">
                                    <p class="text-muted mb-0">No recent activities</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <!-- Quick Stats -->
                <div class="dashboard-card mb-4">
                    <div class="card-header">
                        <h5 class="card-title">Quick Stats</h5>
                    </div>
                    <div class="card-body">
                        <div class="stat-item mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span>Total Sessions</span>
                                <span class="badge bg-primary">${stats.totalSessions}</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${(stats.completedSessions / stats.totalSessions) * 100}%"></div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span>Resources Accessed</span>
                                <span class="badge bg-success">${stats.resourcesAccessed}</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar bg-success" style="width: 100%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h5 class="card-title">Quick Actions</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary" onclick="scheduleNewSession()">
                                <i class="fas fa-calendar-plus me-2"></i>Schedule Session
                            </button>
                            <button class="btn btn-outline-success" onclick="browseResources()">
                                <i class="fas fa-book me-2"></i>Browse Resources
                            </button>
                            <button class="btn btn-outline-info" onclick="joinCommunity()">
                                <i class="fas fa-users me-2"></i>Join Community
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    }).format(date);
}

function formatActivityType(type) {
    return type.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Action Functions
async function scheduleNewSession() {
    await loadSection('schedule');
}

async function browseResources() {
    await loadSection('resources');
}

async function joinCommunity() {
    await loadSection('community');
}

function renderResources(data) {
    const { resources, categories, popularResources } = data;
    
    dashboardContent.innerHTML = `
        <div class="row">
            <div class="col-lg-8">
                <!-- Resources Grid -->
                <div class="dashboard-card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title">Resources Library</h5>
                        <div class="btn-group">
                            ${categories.map(category => `
                                <button class="btn btn-outline-primary" onclick="filterResources('${category}')">
                                    ${formatResourceType(category)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row g-4">
                            ${resources.map(resource => `
                                <div class="col-md-6">
                                    <div class="resource-card">
                                        <div class="resource-thumbnail">
                                            <img src="${resource.thumbnail || '/images/default-resource.png'}" 
                                                 alt="${resource.title}">
                                        </div>
                                        <div class="resource-info p-3">
                                            <h6 class="mb-2">${resource.title}</h6>
                                            <p class="text-muted mb-2">${resource.description}</p>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="badge bg-${getResourceTypeBadge(resource.type)}">
                                                    ${formatResourceType(resource.type)}
                                                </span>
                                                <button class="btn btn-sm btn-primary" onclick="accessResource('${resource._id}')">
                                                    Access
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <!-- Popular Resources -->
                <div class="dashboard-card mb-4">
                    <div class="card-header">
                        <h5 class="card-title">Popular Resources</h5>
                    </div>
                    <div class="card-body p-0">
                        ${popularResources.map(resource => `
                            <div class="popular-resource-item p-3 border-bottom">
                                <h6 class="mb-2">${resource.title}</h6>
                                <p class="text-muted mb-2">${resource.description}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="text-muted">
                                        <i class="fas fa-eye me-1"></i>${resource.views} views
                                    </span>
                                    <button class="btn btn-sm btn-primary" onclick="accessResource('${resource._id}')">
                                        Access
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Resource Categories -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h5 class="card-title">Categories</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            ${categories.map(category => `
                                <button class="btn btn-outline-primary" onclick="filterResources('${category}')">
                                    <i class="fas fa-${getResourceTypeIcon(category)} me-2"></i>
                                    ${formatResourceType(category)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getResourceTypeBadge(type) {
    const badges = {
        document: 'primary',
        video: 'success',
        audio: 'info',
        link: 'warning'
    };
    return badges[type] || 'secondary';
}

function getResourceTypeIcon(type) {
    const icons = {
        document: 'file-alt',
        video: 'video',
        audio: 'headphones',
        link: 'link'
    };
    return icons[type] || 'file';
}

async function filterResources(category) {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/resources?category=${category}`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to filter resources');

        const data = await response.json();
        renderResources(data);
    } catch (error) {
        console.error('Error filtering resources:', error);
        showToast('error', 'Failed to filter resources');
    }
}

async function accessResource(resourceId) {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/access`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to access resource');

        const { url } = await response.json();
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error accessing resource:', error);
        showToast('error', 'Failed to access resource');
    }
}

function renderCommunity(data) {
    const { users, coaches, featuredMembers } = data;
    
    dashboardContent.innerHTML = `
        <div class="row">
            <div class="col-lg-8">
                <!-- Community Members -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h5 class="card-title">Community Members</h5>
                    </div>
                    <div class="card-body">
                        <div class="row g-4">
                            ${users.map(user => `
                                <div class="col-md-6">
                                    <div class="member-card">
                                        <div class="d-flex align-items-center">
                                            <img src="${user.photo || '/images/default-avatar.png'}" 
                                                 class="rounded-circle me-3" 
                                                 width="60" height="60" 
                                                 alt="${user.name}">
                                            <div>
                                                <h6 class="mb-1">${user.name}</h6>
                                                <p class="text-muted mb-2">${user.bio || 'No bio available'}</p>
                                                <div class="d-flex align-items-center">
                                                    <button class="btn btn-sm btn-primary me-2" onclick="connectWithMember('${user._id}')">
                                                        Connect
                                                    </button>
                                                    <button class="btn btn-sm btn-outline-primary" onclick="sendMessage('${user._id}')">
                                                        Message
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <!-- Featured Coaches -->
                <div class="dashboard-card mb-4">
                    <div class="card-header">
                        <h5 class="card-title">Featured Coaches</h5>
                    </div>
                    <div class="card-body p-0">
                        ${coaches.map(coach => `
                            <div class="coach-item p-3 border-bottom">
                                <div class="d-flex align-items-center">
                                    <img src="${coach.photo || '/images/default-avatar.png'}" 
                                         class="rounded-circle me-3" 
                                         width="50" height="50" 
                                         alt="${coach.name}">
                                    <div>
                                        <h6 class="mb-1">${coach.name}</h6>
                                        <p class="mb-2 text-muted">${coach.specialties.join(', ')}</p>
                                        <div class="d-flex align-items-center">
                                            <div class="rating me-2">
                                                ${renderRating(coach.rating)}
                                            </div>
                                            <button class="btn btn-sm btn-primary" onclick="scheduleWithCoach('${coach._id}')">
                                                Schedule Session
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Featured Members -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h5 class="card-title">Featured Members</h5>
                    </div>
                    <div class="card-body p-0">
                        ${featuredMembers.map(member => `
                            <div class="member-item p-3 border-bottom">
                                <div class="d-flex align-items-center">
                                    <img src="${member.photo || '/images/default-avatar.png'}" 
                                         class="rounded-circle me-3" 
                                         width="40" height="40" 
                                         alt="${member.name}">
                                    <div>
                                        <h6 class="mb-1">${member.name}</h6>
                                        <p class="mb-2 text-muted">${member.bio || 'No bio available'}</p>
                                        <div class="d-flex align-items-center">
                                            <button class="btn btn-sm btn-primary me-2" onclick="connectWithMember('${member._id}')">
                                                Connect
                                            </button>
                                            <button class="btn btn-sm btn-outline-primary" onclick="sendMessage('${member._id}')">
                                                Message
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function connectWithMember(memberId) {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/connections`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ memberId })
        });

        if (!response.ok) throw new Error('Failed to connect with member');

        showToast('success', 'Connection request sent successfully');
    } catch (error) {
        console.error('Error connecting with member:', error);
        showToast('error', 'Failed to send connection request');
    }
}

async function sendMessage(memberId) {
    try {
        const session = checkSession();
        if (!session) return;

        // Show message modal
        const modal = new bootstrap.Modal(document.getElementById('messageModal'));
        document.getElementById('selectedMemberId').value = memberId;
        modal.show();
    } catch (error) {
        console.error('Error opening message modal:', error);
        showToast('error', 'Failed to open message dialog');
    }
} 

function renderProfile(data) {
    const { user, stats, recentActivities } = data;
    
    dashboardContent.innerHTML = `
        <div class="row">
            <div class="col-lg-4">
                <!-- Profile Card -->
                <div class="dashboard-card profile-card mb-4">
                    <div class="profile-cover" style="background-image: url('${user.coverPhoto || '/images/default-cover.jpg'}')">
                        <button class="btn btn-light btn-sm cover-upload-btn" onclick="document.getElementById('coverUpload').click()">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div class="profile-info text-center">
                        <div class="profile-photo-container">
                            <img src="${user.photo || '/images/default-avatar.png'}" 
                                 alt="Profile" 
                                 class="profile-photo" 
                                 id="profilePhoto">
                            <button class="photo-upload-btn" onclick="document.getElementById('photoUpload').click()">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                        <h4 class="mb-1">${user.name}</h4>
                        <p class="text-muted mb-3">${user.email}</p>
                        <div class="profile-actions">
                            <button class="btn btn-primary" onclick="editProfile()">
                                <i class="fas fa-edit me-2"></i>Edit Profile
                            </button>
                            <button class="btn btn-light" onclick="shareProfile()">
                                <i class="fas fa-share-alt me-2"></i>Share
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Profile Stats -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h5 class="card-title">Your Stats</h5>
                    </div>
                    <div class="card-body">
                        <div class="stat-item mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span>Total Sessions</span>
                                <span class="badge bg-primary">${stats.totalSessions}</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${(stats.completedSessions / stats.totalSessions) * 100}%"></div>
                            </div>
                        </div>
                        <div class="stat-item mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span>Resources Created</span>
                                <span class="badge bg-success">${stats.resourcesCreated}</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar bg-success" style="width: 100%"></div>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span>Resources Accessed</span>
                                <span class="badge bg-info">${stats.resourcesAccessed}</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar bg-info" style="width: 100%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-8">
                <!-- Profile Details -->
                <div class="dashboard-card mb-4">
                    <div class="card-header">
                        <h5 class="card-title">Profile Details</h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6 class="text-muted">Full Name</h6>
                                <p>${user.name}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-muted">Email</h6>
                                <p>${user.email}</p>
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6 class="text-muted">Phone</h6>
                                <p>${user.phone || 'Not provided'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-muted">Location</h6>
                                <p>${user.location || 'Not provided'}</p>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12">
                                <h6 class="text-muted">Bio</h6>
                                <p>${user.bio || 'No bio available'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Activity Timeline -->
                <div class="dashboard-card">
                    <div class="card-header">
                        <h5 class="card-title">Recent Activity</h5>
                    </div>
                    <div class="card-body">
                        <div class="activity-timeline">
                            ${recentActivities.length > 0 ? recentActivities.map(activity => `
                                <div class="timeline-item">
                                    <div class="timeline-date">${formatDate(activity.createdAt)}</div>
                                    <div class="timeline-content">
                                        <h6 class="mb-1">${formatActivityType(activity.type)}</h6>
                                        <p class="mb-0">${activity.description}</p>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center">
                                    <p class="text-muted mb-0">No recent activities</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize file upload listeners
    initializeFileUploads();
}

function initializeFileUploads() {
    const photoUpload = document.getElementById('photoUpload');
    const coverUpload = document.getElementById('coverUpload');

    if (photoUpload) {
        photoUpload.addEventListener('change', handleProfilePhotoUpload);
    }

    if (coverUpload) {
        coverUpload.addEventListener('change', handleCoverPhotoUpload);
    }
}

// Navigation Handling
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const section = link.getAttribute('data-section');
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            link.classList.add('active');
        });
    });

    // Quick Actions Handlers
    const quickActions = document.querySelectorAll('.dropdown-item');
    quickActions.forEach(action => {
        action.addEventListener('click', (e) => {
            const href = action.getAttribute('href');
            if (href && !href.startsWith('#')) {
                e.preventDefault();
                window.location.href = href;
            }
        });
    });

    // Settings and Logout Button Handlers
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Initialize the dashboard
    loadDashboardSection();
});

// Load Dashboard Section
async function loadDashboardSection() {
    try {
        const session = checkSession();
        if (!session) return;

        // Load user data
        const userData = await fetchUserData();
        updateDashboardUI(userData);

        // Load upcoming sessions
        const sessions = await fetchUpcomingSessions();
        renderUpcomingSessions(sessions);

        // Load recent activity
        const activities = await fetchRecentActivity();
        renderActivityTimeline(activities);

        // Update stats
        updateStatistics();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('error', 'Failed to load dashboard data');
    }
}