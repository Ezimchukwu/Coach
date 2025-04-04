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
const API_BASE_URL = (() => {
    // Try to get the port from localStorage (set by backend)
    const serverPort = localStorage.getItem('serverPort') || '5000';
    return `http://localhost:${serverPort}/api`;
})();
// Default avatar as a data URI (a simple user icon)
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMGUwZTAiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIyMCIgZmlsbD0iI2JkYmRiZCIvPjxwYXRoIGQ9Ik0yMCA4MEMyMCA2MCAzMCA1MCA1MCA1MFM4MCA2MCA4MCA4MFoiIGZpbGw9IiNiZGJkYmQiLz48L3N2Zz4=';
// Default cover as a data URI (a simple gradient)
const DEFAULT_COVER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgODAwIDIwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiBncmFkaWVudFRyYW5zZm9ybT0icm90YXRlKDQ1KSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzRhOTBlMiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzM1N2FiZCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2dyYWQpIi8+PC9zdmc+';
const dashboardContent = document.querySelector('.dashboard-content');

// API request queue and rate limit handling
const apiRequestQueue = [];
let isProcessingQueue = false;
let rateLimitResetTime = 0;

// Process API requests in queue
async function processApiQueue() {
    if (isProcessingQueue || apiRequestQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    // Check if we need to wait for rate limit to reset
    const now = Date.now();
    if (rateLimitResetTime > now) {
        const waitTime = rateLimitResetTime - now;
        console.log(`Waiting ${waitTime}ms for rate limit to reset...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const request = apiRequestQueue.shift();
    try {
        const result = await request.execute();
        request.resolve(result);
    } catch (error) {
        request.reject(error);
    } finally {
        isProcessingQueue = false;
        // Process next request with a small delay to avoid rate limits
        setTimeout(() => processApiQueue(), 1000);
    }
}

// Fetch with rate limit handling
async function fetchWithRateLimit(url, options = {}) {
    // Return a Promise that will be resolved when the request is processed
    return new Promise((resolve, reject) => {
        // Create an execution function
        const execute = async () => {
            try {
                const response = await fetch(url, options);
                
                // Handle rate limiting
                if (response.status === 429) {
                    // Parse retry-after header or default to 10 seconds
                    const retryAfter = response.headers.get('Retry-After') || 10;
                    const retryMs = parseInt(retryAfter) * 1000;
                    
                    // Update rate limit reset time
                    rateLimitResetTime = Date.now() + retryMs;
                    
                    console.log(`Rate limited. Retry after ${retryAfter}s`);
                    showToast('warning', `Server is busy. Retrying in ${parseInt(retryAfter)}s...`);
                    
                    // Add this request back to the front of the queue
                    apiRequestQueue.unshift({ execute, resolve, reject });
                    
                    // Wait for rate limit to reset
                    setTimeout(() => processApiQueue(), retryMs);
                    return null;
                }
                
                return response;
            } catch (error) {
                console.error('Fetch error:', error);
                throw error;
            }
        };
        
        // Add to queue
        apiRequestQueue.push({ execute, resolve, reject });
        
        // Process queue
        processApiQueue();
    });
}

// Check if user is logged in
function checkAuth() {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.token) {
        window.location.href = 'login.html';
        return null;
    }
    return session;
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Directly set the bio field while waiting for the data to load
    const bioElement = document.getElementById('profileBio');
    if (bioElement) {
        // This ensures we see something if loading takes time
        bioElement.textContent = 'Loading bio...';
    }
    
    initializeDashboard();
});

// Initialize dashboard with better error handling
async function initializeDashboard() {
    try {
        // First check authentication
    const session = checkAuth();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        // Show loading indicator
        showLoadingIndicator(true);
        
        // Initialize UI elements first
        initializeUIElements();
        
        // Then initialize event listeners
        initializeEventListeners();
        
        console.log("Dashboard initialization started...");
        
        // Load user data first and wait for it
        const userData = await loadUserData();
        
        // After user data is loaded, update the interface
        if (userData) {
            updateUserInterface(userData);
        }
        
        // Load other data in parallel
        Promise.allSettled([
            loadActivityTimeline().catch(err => {
                console.error('Failed to load timeline:', err);
                return null;
            }),
            loadUpcomingSessions().catch(err => {
                console.error('Failed to load sessions:', err);
                return null;
            })
        ]).finally(() => {
            // Hide loading indicator regardless of result
            showLoadingIndicator(false);
        });
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('error', 'Dashboard initialization failed. Please refresh the page.');
        showLoadingIndicator(false);
    }
}

// Shows or hides the loading indicator
function showLoadingIndicator(show) {
    try {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (!loadingOverlay) {
            // Create loading overlay if it doesn't exist
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
            document.body.appendChild(overlay);
            
            // Show or hide the newly created overlay
            overlay.style.display = show ? 'flex' : 'none';
        } else {
            // Show or hide existing overlay
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error handling loading indicator:', error);
    }
}

// Initialize UI elements
function initializeUIElements() {
    try {
        // Get dashboard content container
        const dashboardContent = document.querySelector('.dashboard-content');
        if (dashboardContent) window.dashboardContent = dashboardContent;
        
        // Get profile elements
        const profilePhoto = document.querySelector('#profilePhoto') || document.querySelector('.profile-photo');
        if (profilePhoto) {
            window.profilePhoto = profilePhoto;
            profilePhoto.onerror = () => {
                console.log('Profile photo error, setting default');
                profilePhoto.src = DEFAULT_AVATAR;
            };
            if (!profilePhoto.src || profilePhoto.src.endsWith('undefined') || profilePhoto.src.includes('default-avatar.png')) {
                console.log('Setting initial profile photo');
                profilePhoto.src = DEFAULT_AVATAR;
            }
        }

        const navProfilePhoto = document.querySelector('#navProfilePhoto');
        if (navProfilePhoto) {
            window.navProfilePhoto = navProfilePhoto;
            navProfilePhoto.onerror = () => {
                console.log('Nav profile photo error, setting default');
                navProfilePhoto.src = DEFAULT_AVATAR;
            };
            if (!navProfilePhoto.src || navProfilePhoto.src.endsWith('undefined') || navProfilePhoto.src.includes('default-avatar.png')) {
                console.log('Setting initial nav profile photo');
                navProfilePhoto.src = DEFAULT_AVATAR;
            }
        }

        // Initialize other UI elements only if they exist
        ['userName', 'welcomeUserName', 'userEmail', 'activityTimeline', 'upcomingSessions'].forEach(id => {
            const element = document.getElementById(id);
            if (element) window[id] = element;
        });
    } catch (error) {
        console.error('Error initializing UI elements:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    try {
        // Initialize navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link) {
                link.addEventListener('click', (e) => {
                    const section = link.getAttribute('data-section');
                    if (section) {
                        navLinks.forEach(l => l.classList.remove('active'));
                        link.classList.add('active');
                    }
                });
            }
        });

        // Initialize logout button
        const logoutBtn = document.querySelector('.top-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
            console.log('Logout button listener initialized');
        }

        // Initialize settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                window.location.href = 'settings.html';
            });
        }

        // Initialize file upload
        initializeProfileUpload();
    } catch (error) {
        console.error('Error initializing event listeners:', error);
    }
}

// Profile Photo Upload Handling
function initializeProfileUpload() {
    try {
        // Create file input if it doesn't exist
        let photoInput = document.getElementById('photoUpload');
        if (!photoInput) {
            photoInput = document.createElement('input');
            photoInput.type = 'file';
            photoInput.id = 'photoUpload';
            photoInput.accept = 'image/*';
            photoInput.style.display = 'none';
            document.body.appendChild(photoInput);
        }

        // Find profile photo element
        const profilePhoto = window.profilePhoto;
        if (profilePhoto && profilePhoto.parentElement) {
            // Create camera button if it doesn't exist
            let cameraButton = profilePhoto.parentElement.querySelector('.photo-upload-btn');
            if (!cameraButton) {
                cameraButton = document.createElement('button');
                cameraButton.className = 'photo-upload-btn';
                cameraButton.innerHTML = '<i class="fas fa-camera"></i>';
                profilePhoto.parentElement.style.position = 'relative';
                profilePhoto.parentElement.appendChild(cameraButton);
                
                // Add click handler to camera button
                cameraButton.onclick = () => photoInput.click();
            }
        }

        // Add change handler to file input
        photoInput.addEventListener('change', handleProfilePhotoUpload);

        // Restore profile photos
        restoreProfilePhotos();
    } catch (error) {
        console.error('Error initializing profile upload:', error);
    }
}

// Fix image paths - completely rewritten
function getImageUrl(path) {
    // Handle empty paths, data URLs, and absolute URLs
    if (!path) return DEFAULT_AVATAR;
    if (path.startsWith('data:')) return path;
    if (path.startsWith('http')) return path;
    
    // Extract just the filename
    let filename;
    
    if (path.includes('/')) {
        // Get the last part of the path (the filename)
        filename = path.split('/').pop();
    } else {
        // Path is already just a filename
        filename = path;
    }
    
    // Strip any query parameters or hashes
    filename = filename.split('?')[0].split('#')[0];
    
    // Log for debugging
    console.log('Image filename extracted:', filename);
    
    // Direct path to the uploads folder
    return `${API_BASE_URL}/uploads/profiles/${filename}`;
}

// Load activity timeline
async function loadActivityTimeline() {
    try {
        const session = checkAuth();
        if (!session) return;

        // Mock data for activities since the endpoint is not available
        const mockActivities = [
            {
                type: 'session',
                title: 'Coaching Session Completed',
                description: 'Completed a 1-hour coaching session',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                type: 'achievement',
                title: 'Goal Achieved',
                description: 'Reached monthly coaching target',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            },
            {
                type: 'resource',
                title: 'Resource Accessed',
                description: 'Viewed "Leadership Development Guide"',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];

        // Render the mock activities
        renderActivities(mockActivities);
        
        console.log('Mock activities loaded successfully');
        return mockActivities;
    } catch (error) {
        console.error('Error loading activity timeline:', error);
        showToast('error', 'Failed to load activities. Using cached data.');
        return [];
    }
}

function renderActivities(activities) {
    const timeline = document.getElementById('activityTimeline');
    if (!timeline) return;

    if (!activities || activities.length === 0) {
        timeline.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="fas fa-history fa-2x mb-3"></i>
                <p>No recent activities to display</p>
            </div>
        `;
        return;
    }

    const activityHTML = activities.map(activity => `
            <div class="activity-item">
            <div class="activity-icon ${getActivityIcon(activity.type)}">
                <i class="fas ${getActivityIconClass(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <h6 class="activity-title">${activity.title}</h6>
                <p class="activity-description text-muted mb-1">${activity.description}</p>
                <small class="text-muted">${formatTimeAgo(new Date(activity.timestamp))}</small>
            </div>
            </div>
        `).join('');

    timeline.innerHTML = activityHTML;
}

function getActivityIcon(type) {
    switch (type) {
        case 'session':
            return 'bg-primary';
        case 'achievement':
            return 'bg-success';
        case 'resource':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

function getActivityIconClass(type) {
    switch (type) {
        case 'session':
            return 'fa-calendar-check';
        case 'achievement':
            return 'fa-trophy';
        case 'resource':
            return 'fa-book';
        default:
            return 'fa-circle';
    }
}

// Helper function to format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
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
                    <i class="fas fa-clock me-2"></i> ${session.duration}
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

// Update user interface with better error handling
function updateUserInterface(user) {
    try {
        // Get email from multiple sources to ensure reliability
        const email = user.email || localStorage.getItem('userEmail') || 
                     JSON.parse(localStorage.getItem('session'))?.user?.email || 'No email available';
        
        console.log('Using email:', email);
        
        // Update name in header if element exists
        if (window.userNameElement) {
            const firstName = user.firstName || user.name?.split(' ')[0] || 'User';
            const lastName = user.lastName || user.name?.split(' ').slice(1).join(' ') || '';
            window.userNameElement.textContent = `${firstName} ${lastName}`.trim();
        }
        if (window.welcomeUserNameElement) {
            const firstName = user.firstName || user.name?.split(' ')[0] || 'User';
            window.welcomeUserNameElement.textContent = `Welcome back, ${firstName}!`;
        }
        
        // Update email if element exists
        if (window.userEmail) {
            window.userEmail.textContent = email;
            // Ensure email is saved to localStorage for persistence
            if (email && email !== 'No email available') {
                localStorage.setItem('userEmail', email);
            }
        }

        // Update profile header section
        const profileHeaderName = document.getElementById('profileHeaderName');
        const profileHeaderEmail = document.getElementById('profileHeaderEmail');
        
        if (profileHeaderName) {
            profileHeaderName.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not available';
        }
        
        if (profileHeaderEmail) {
            profileHeaderEmail.textContent = email;
        }

        // Update profile details section
        const profileDetails = {
            'profileName': `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not available',
            'profileEmail': email,
            'profilePhone': user.phoneNumber || 'Not provided',
            'profileLocation': user.address ? 
                `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',') || 'Not provided' 
                : 'Not provided',
            'profileBio': user.bio || ''
        };

        // Debug log for profile details
        console.log('Profile details to update:', profileDetails);
        console.log('Raw bio content:', user.bio);

        // Special handling for bio field
        const bioElement = document.getElementById('profileBio');
        if (bioElement) {
            if (user.bio && user.bio !== 'null' && user.bio !== 'undefined') {
                bioElement.textContent = user.bio;
                console.log('Set profile bio to:', user.bio);
            } else {
                bioElement.textContent = 'No bio available';
                console.log('Set profile bio to default message');
            }
            bioElement.classList.remove('loading');
        }

        // Update other profile detail elements
        Object.entries(profileDetails).forEach(([id, value]) => {
            if (id === 'profileBio') return; // Skip bio as we handled it separately
            
            const element = document.getElementById(id);
            if (element) {
                // Remove loading state if present
                element.classList.remove('loading');
                
                // Force clear and set the text content
                element.innerHTML = '';
                element.textContent = value;
                
                console.log(`Updated ${id} with value:`, value);
            } else {
                console.warn(`Element with ID ${id} not found`);
            }
        });
        
        // Update profile photos with better error handling
        const photoUrl = user.profileImage ? getImageUrl(user.profileImage) : DEFAULT_AVATAR;
        
        function updatePhotoElement(element, url) {
            if (!element) return;
            
            console.log('Attempting to load photo from URL:', url);
            
            // Create a new Image to test loading
            const img = new Image();
            
            img.onload = function() {
                console.log('Successfully loaded image:', url);
                element.src = url;
                element.classList.remove('loading');
                
                // Cache the successful URL in localStorage
                try {
                    localStorage.setItem('lastSuccessfulPhotoUrl', url);
                } catch (err) {
                    console.warn('Could not cache photo URL:', err);
                }
            };
            
            img.onerror = function(e) {
                console.error('Failed to load image:', url, e);
                
                // First fallback: try alternative URL path
                const alternativeUrl = url.replace('/uploads/profiles/', '/api/uploads/profiles/');
                console.log('Trying first fallback URL:', alternativeUrl);
                
                const fallbackImg1 = new Image();
                fallbackImg1.onload = function() {
                    console.log('First fallback URL loaded successfully:', alternativeUrl);
                    element.src = alternativeUrl;
                    element.classList.remove('loading');
                    
                    // Cache the successful URL
                    try {
                        localStorage.setItem('lastSuccessfulPhotoUrl', alternativeUrl);
                    } catch (err) {
                        console.warn('Could not cache photo URL:', err);
                    }
                };
                
                fallbackImg1.onerror = function() {
                    console.error('First fallback URL also failed:', alternativeUrl);
                    
                    // Second fallback: try with direct server path
                    const directUrl = `http://localhost:5000/uploads/profiles/${url.split('/').pop()}`;
                    console.log('Trying direct URL fallback:', directUrl);
                    
                    const fallbackImg2 = new Image();
                    fallbackImg2.onload = function() {
                        console.log('Direct URL fallback loaded successfully:', directUrl);
                        element.src = directUrl;
                        element.classList.remove('loading');
                        
                        // Cache the successful URL
                        try {
                            localStorage.setItem('lastSuccessfulPhotoUrl', directUrl);
                        } catch (err) {
                            console.warn('Could not cache photo URL:', err);
                        }
                    };
                    
                    fallbackImg2.onerror = function() {
                        console.error('All fallback URLs failed, using default avatar');
                        element.src = DEFAULT_AVATAR;
                        element.classList.remove('loading');
                    };
                    
                    fallbackImg2.src = directUrl;
                };
                
                fallbackImg1.src = alternativeUrl;
            };
            
            img.src = url;
        }
        
        // Update both profile photos with error handling
        if (window.profilePhoto) {
            updatePhotoElement(window.profilePhoto, photoUrl);
        }
        if (window.navProfilePhoto) {
            updatePhotoElement(window.navProfilePhoto, photoUrl);
        }
        
        // Cache the successful photo URL in localStorage
        if (photoUrl !== DEFAULT_AVATAR) {
            localStorage.setItem('lastSuccessfulPhotoUrl', photoUrl);
        }
        
        // Update stats if available and elements exist
    if (user.stats) {
        updateUserStats(user.stats);
    }
    } catch (error) {
        console.error('Error updating user interface:', error);
        // Attempt to restore default values for critical UI elements
        try {
            // Reset loading states and show default values
            const defaultValues = {
                'profileName': 'Not available',
                'profileEmail': 'Not available',
                'profilePhone': 'Not provided',
                'profileLocation': 'Not provided',
                'profileBio': 'No bio available'
            };

            Object.entries(defaultValues).forEach(([id, value]) => {
                const elements = document.querySelectorAll(`#${id}, .${id}`);
                elements.forEach(element => {
                    if (element) {
                        element.classList.remove('loading');
                        element.textContent = value;
                    }
                });
            });

            if (window.userNameElement) window.userNameElement.textContent = 'User';
            if (window.welcomeUserNameElement) window.welcomeUserNameElement.textContent = 'Welcome, User!';
            if (window.userEmail) window.userEmail.textContent = 'Not available';
            
            // Try to use cached photo URL first, then fall back to default
            const cachedPhotoUrl = localStorage.getItem('lastSuccessfulPhotoUrl');
            const fallbackUrl = cachedPhotoUrl || DEFAULT_AVATAR;
            
            if (window.profilePhoto) {
                window.profilePhoto.src = fallbackUrl;
                window.profilePhoto.classList.remove('loading');
            }
            if (window.navProfilePhoto) {
                window.navProfilePhoto.src = fallbackUrl;
                window.navProfilePhoto.classList.remove('loading');
            }
        } catch (e) {
            console.error('Failed to restore default UI values:', e);
        }
    }
}

// Handle Profile Photo Upload
async function handleProfilePhotoUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) {
            showToast('error', 'Please select an image to upload');
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            showToast('error', 'Please select a valid image file (JPEG, PNG, or GIF)');
            return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            showToast('error', 'Image size should be less than 5MB');
            return;
        }

        // Show loading state
        showLoadingIndicator(true);
        const photoElement = document.getElementById('profilePhoto');
        if (photoElement) {
            photoElement.style.opacity = '0.5';
        }

        // Create FormData
        const formData = new FormData();
        formData.append('photo', file);

        // Get auth token
        const session = checkAuth();
        if (!session) {
            showToast('error', 'Please log in to upload a photo');
            return;
        }

        // Make API request
        const response = await fetch(`${API_BASE_URL}/dashboard/profile/photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            },
            body: formData
        });

        // First try to parse the response as JSON
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If not JSON, get the text and create an error object
            const text = await response.text();
            throw new Error(text || 'Server returned an invalid response');
        }

        if (!response.ok) {
            throw new Error(data.message || 'Error uploading photo');
        }

        // Update UI with new photo
        if (photoElement && data.data && data.data.photoUrl) {
            const photoUrl = data.data.photoUrl;
            
            // Create a new Image to test the URL
            const img = new Image();
            img.onload = function() {
                photoElement.src = photoUrl;
                photoElement.style.opacity = '1';
                
                // Update all profile photos on the page
                document.querySelectorAll('.profile-photo').forEach(photo => {
                    photo.src = photoUrl;
                });
                
                // Save to localStorage for persistence
                try {
                    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                    userData.photo = photoUrl;
                    localStorage.setItem('userData', JSON.stringify(userData));
                    
                    // Also update the session user data
                    const session = JSON.parse(localStorage.getItem('session') || '{}');
                    if (session.user) {
                        session.user.photo = photoUrl;
                        localStorage.setItem('session', JSON.stringify(session));
                    }
                } catch (err) {
                    console.warn('Failed to update local storage:', err);
                }
            };
            
            img.onerror = function() {
                console.error('Failed to load new profile photo URL:', photoUrl);
                photoElement.src = DEFAULT_AVATAR;
                photoElement.style.opacity = '1';
                showToast('error', 'Failed to load the new profile photo');
            };
            
            img.src = photoUrl;
        }

        showToast('success', 'Profile photo updated successfully');

    } catch (error) {
        console.error('Profile photo upload error:', error);
        showToast('error', error.message || 'Failed to upload profile photo');
        
        // Reset photo element opacity and src if needed
        const photoElement = document.getElementById('profilePhoto');
        if (photoElement) {
            photoElement.style.opacity = '1';
            if (!photoElement.src || photoElement.src.endsWith('undefined')) {
                photoElement.src = DEFAULT_AVATAR;
            }
        }
    } finally {
        showLoadingIndicator(false);
        // Reset the file input
        event.target.value = '';
    }
}

// Add this function to initialize file upload listeners
function initializeFileUploads() {
    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
        photoUpload.addEventListener('change', handleProfilePhotoUpload);
        console.log('Photo upload listener initialized'); // Debug log
    } else {
        console.error('Photo upload element not found');
    }
}

// Call initializeFileUploads when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeFileUploads();
    restoreProfilePhotos();
});

// Add this function to restore profile photos on page load
function restoreProfilePhotos() {
    const session = checkAuth();
    if (session?.user?.profileImage) {
        const photoUrl = getImageUrl(session.user.profileImage);
        console.log('Restoring photo URL:', photoUrl); // Debug log
            
        const profilePhotos = document.querySelectorAll('.profile-photo, #navProfilePhoto, #profilePhoto');
        profilePhotos.forEach(photo => {
            if (photo) {
                photo.src = photoUrl;
                console.log('Restored photo element:', photo.id); // Debug log
            }
        });
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
        const defaultCover = DEFAULT_COVER;
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
        const session = checkAuth();
        if (!session) {
            showToast('error', 'Please log in again');
            return;
        }

        showToast('info', 'Loading profile data...');

        // Use fetchWithRateLimit instead of regular fetch
        const response = await fetchWithRateLimit(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        // If we got null response, request was re-queued due to rate limiting
        if (response === null) {
            console.log('Edit profile data request was requeued due to rate limiting');
            return;
        }

        // If we can't get fresh data, try using cached data from session
        if (!response.ok) {
            console.warn(`Failed to fetch profile data from API: ${response.status}`);
            
            // Use session data as fallback
            if (session.user) {
                console.log('Using cached user data from session');
                populateEditForm(session.user);
                return;
            }
            
            throw new Error(`Failed to fetch user data: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.data || !data.data.user) {
            throw new Error('Invalid user data format');
        }

        const user = data.data.user;
        populateEditForm(user);
        
    } catch (error) {
        console.error('Error opening edit profile:', error);
        showToast('error', 'Failed to load profile data. Please try again.');
    }
}

// Helper function to populate edit profile form
function populateEditForm(user) {
    try {
        // Ensure the edit form elements exist
        const editNameField = document.getElementById('editName');
        const editEmailField = document.getElementById('editEmail');
        const editPhoneField = document.getElementById('editPhone');
        const editLocationField = document.getElementById('editLocation');
        const editBioField = document.getElementById('editBio');

        if (!editNameField) {
            console.error('Edit form fields not found');
            throw new Error('Edit form not properly initialized');
        }

        console.log('Populating edit form with user data:', user);
        
        // Populate form fields
        editNameField.value = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        
        if (editEmailField) editEmailField.value = user.email || '';
        if (editPhoneField) editPhoneField.value = user.phoneNumber || '';

        if (editLocationField) {
            editLocationField.value = user.address ? 
                `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',') : '';
        }

        // Special handling for bio field
        if (editBioField) {
            if (user.bio && user.bio !== 'null' && user.bio !== 'undefined') {
                editBioField.value = user.bio;
                console.log('Set bio field value to:', user.bio);
            } else {
                editBioField.value = '';
                console.log('Set bio field value to empty string');
            }
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        modal.show();
    } catch (error) {
        console.error('Error populating edit form:', error);
        showToast('error', 'Unable to open edit profile form. Please refresh the page.');
    }
}

// Save Profile Changes
async function saveProfile(event, attempt = 0) {
    event.preventDefault();
    
    try {
        const session = checkAuth();
        if (!session) {
            showToast('error', 'Please log in again');
            return;
        }

        // Show loading state
        const saveBtn = event.target.querySelector('button[type="submit"]');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
        }

        // Get form data
        const fullName = document.getElementById('editName').value.trim();
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const email = document.getElementById('editEmail').value.trim();
        const bioValue = document.getElementById('editBio').value.trim();

        console.log('Bio value from form:', bioValue);

        // Process location
        const location = document.getElementById('editLocation').value.trim();
        const locationParts = location.split(',').map(part => part.trim()).filter(Boolean);
        const address = {
            street: locationParts[0] || '',
            city: locationParts[1] || '',
            state: locationParts[2] || ''
        };

        const formData = {
            firstName,
            lastName,
            email,
            phoneNumber: document.getElementById('editPhone').value.trim(),
            address,
            bio: bioValue
        };

        console.log('Updating profile with:', formData);

        // Use the fetchWithRateLimit function instead of fetch
        const response = await fetchWithRateLimit(`${API_BASE_URL}/users/profile`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        // If we got null response, request was re-queued due to rate limiting
        if (response === null) {
            console.log('Request was requeued due to rate limiting');
            return;
        }

        console.log('Profile update response status:', response.status);

        // Get response body
        const responseText = await response.text();
        console.log('Profile update response:', responseText);

        // If not OK and not empty response, try to parse error
        if (!response.ok) {
            if (responseText.trim()) {
                try {
                    const errorData = JSON.parse(responseText);
                    throw new Error(errorData?.message || `Failed to update profile: ${response.status}`);
                } catch (parseError) {
                    throw new Error(`Failed to update profile: ${response.status}`);
                }
            } else {
                throw new Error(`Failed to update profile: ${response.status}`);
            }
        }

        // Parse success response
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Error parsing profile update response:', parseError);
            throw new Error('Invalid response format from server');
        }

        if (!data || !data.data || !data.data.user) {
            throw new Error('Invalid response: Missing user data');
        }

        const updatedUser = data.data.user;
        console.log('Updated user data:', updatedUser);
        
        // Make sure bio is properly set in the updated user data
        if (bioValue && (!updatedUser.bio || updatedUser.bio === 'null' || updatedUser.bio === 'undefined')) {
            console.log('Setting missing bio in user data:', bioValue);
            updatedUser.bio = bioValue;
        }
        
        // Update session with new user data
        const updatedSession = {
            ...session,
            user: {
                ...session.user,
                ...updatedUser
            }
        };
        localStorage.setItem('session', JSON.stringify(updatedSession));

        // Directly update UI elements
        const bioElement = document.getElementById('profileBio');
        if (bioElement) {
            bioElement.textContent = updatedUser.bio || bioValue || 'No bio available';
            console.log('Updated bio element with:', bioElement.textContent);
        }

        // Update profile name in both places
        const profileName = document.getElementById('profileName');
        if (profileName) {
            profileName.textContent = `${firstName} ${lastName}`.trim();
        }
        
        // Update profile email
        const profileEmail = document.getElementById('profileEmail');
        if (profileEmail) {
            profileEmail.textContent = email;
        }
        
        // Update profile phone
        const profilePhone = document.getElementById('profilePhone');
        if (profilePhone) {
            profilePhone.textContent = formData.phoneNumber || 'Not provided';
        }
        
        // Update profile location
        const profileLocation = document.getElementById('profileLocation');
        if (profileLocation) {
            const formattedLocation = [address.street, address.city, address.state]
                .filter(Boolean)
                .join(', ');
            profileLocation.textContent = formattedLocation || 'Not provided';
        }
        
        // Update header elements
        const profileHeaderName = document.getElementById('profileHeaderName');
        if (profileHeaderName) {
            profileHeaderName.textContent = `${firstName} ${lastName}`.trim();
        }
        
        const profileHeaderEmail = document.getElementById('profileHeaderEmail');
        if (profileHeaderEmail) {
            profileHeaderEmail.textContent = email;
        }

        // Then update all UI elements with updated user data
        updateUserInterface(updatedUser);

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        if (modal) {
            modal.hide();
        }

        showToast('success', 'Profile updated successfully');

    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('error', error.message || 'Failed to update profile');
        
        // Even if server update failed, update the UI with the user entered data
        try {
            // Get the current session
            const session = JSON.parse(localStorage.getItem('session'));
            if (session?.user) {
                // Update the user object with form data
                const bioValue = document.getElementById('editBio').value.trim();
                const bioElement = document.getElementById('profileBio');
                
                // Update bio in the UI directly
                if (bioElement && bioValue) {
                    bioElement.textContent = bioValue;
                    console.log('Updated bio element with local value:', bioValue);
                    
                    // Also update the session
                    session.user.bio = bioValue;
                    localStorage.setItem('session', JSON.stringify(session));
                }
            }
        } catch (localError) {
            console.error('Failed to apply local changes:', localError);
        }
    } finally {
        // Reset button state
        const saveBtn = event.target.querySelector('button[type="submit"]');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        }
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
            // Show loading state
        const logoutBtn = document.querySelector('.top-logout-btn');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        }

        const session = checkAuth();
        if (session?.token) {
            console.log('Logging out user...');
            
            // Call logout API with rate limiting
            const response = await fetchWithRateLimit(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response && !response.ok) {
                console.warn(`Logout API returned status: ${response.status}`);
            } else {
                console.log('Logout API call successful');
            }
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Continue with logout even if API call fails
    } finally {
        // Clear all local storage data
            localStorage.removeItem('session');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        localStorage.removeItem('lastSuccessfulPhotoUrl');
        localStorage.removeItem('photoPreviewUrl');
        localStorage.removeItem('cachedProfilePhoto');
        
        console.log('Local storage cleared');

            // Show success message
            showToast('success', 'Logged out successfully');

            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
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

// Load user data with better rate limit handling
async function loadUserData() {
    try {
        const session = checkAuth();
        if (!session) return;

        console.log("Loading user data...");
        
        // Initialize profile details with loading indicators first
        const profileDetailIds = ['profileName', 'profileEmail', 'profilePhone', 'profileLocation', 'profileBio'];
        profileDetailIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('loading');
                element.textContent = 'Loading...';
            }
        });

        // Use fetchWithRateLimit instead of regular fetch
        const response = await fetchWithRateLimit(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Accept': 'application/json'
            }
        });

        // If we got null response, request was re-queued due to rate limiting
        if (response === null) {
            console.log('User data request was requeued due to rate limiting');
            return;
        }

        if (!response.ok) {
            if (response.status === 401) {
                clearSession();
                window.location.href = 'login.html';
                return;
            }
            
            throw new Error(`Failed to load user data: ${response.status}`);
        }

        const data = await response.json();
        console.log('User data received:', data); // Debug log

        if (!data || !data.data || !data.data.user) {
            throw new Error('Invalid user data format');
        }

        const user = data.data.user;
        
        // Update session with latest user data
        const updatedSession = {
            ...session,
            user: {
                ...session.user,
                ...user
            }
        };
        localStorage.setItem('session', JSON.stringify(updatedSession));

        // Update UI with user data
        updateUserInterface(user);

        // Specifically update bio field
        setTimeout(() => {
            const bioElement = document.getElementById('profileBio');
            if (bioElement) {
                bioElement.innerHTML = '';
                bioElement.textContent = user.bio || 'No bio available';
                bioElement.classList.remove('loading');
                console.log('Bio content explicitly updated:', bioElement.textContent);
            } else {
                console.warn('Bio element not found for direct update');
            }
        }, 100);

        return user;
    } catch (error) {
        console.error('Error loading user data:', error);
        
        // Try to use cached session data if available
        const session = JSON.parse(localStorage.getItem('session'));
        if (session?.user) {
            console.log('Using cached user data from session');
            updateUserInterface(session.user);
            
            // Update bio from cached data
            const bioElement = document.getElementById('profileBio');
            if (bioElement) {
                bioElement.textContent = session.user.bio || 'No bio available';
                bioElement.classList.remove('loading');
            }
            
            return session.user;
        }

        // Use default values as last resort
        updateUserInterface({
            firstName: 'User',
            lastName: '',
            email: 'Not available',
            profileImage: DEFAULT_AVATAR,
            bio: 'No bio available'
        });

        // Update all profile detail elements with error state
        const profileDetailIds = ['profileName', 'profileEmail', 'profilePhone', 'profileLocation', 'profileBio'];
        profileDetailIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('loading');
                if (id === 'profileBio') {
                    element.textContent = 'No bio available';
                } else if (id === 'profileEmail') {
                    element.textContent = 'Not available';
                } else if (id === 'profilePhone' || id === 'profileLocation') {
                    element.textContent = 'Not provided';
                } else {
                    element.textContent = 'Not available';
                }
            }
        });

        // Show a more user-friendly error message
        if (error.message.includes('429')) {
            showToast('error', 'Server is busy. Please try again in a moment.');
        } else {
            showToast('error', 'Unable to load profile data. Using default values.');
        }
    }
}

// Notifications and Messages
async function loadNotifications() {
    try {
        const session = checkAuth();
        if (!session) return;

        // For now, just set notifications to 0 since the endpoint isn't ready
        updateNotificationBadge(0);
        return;

        // Uncomment when the notifications endpoint is ready
        /*
        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                updateNotificationBadge(0);
                return;
            }
            throw new Error(`Failed to load notifications: ${response.status}`);
        }

        const { notifications } = await response.json();
        updateNotificationBadge(notifications?.filter(n => !n.read)?.length || 0);
        */
    } catch (error) {
        console.error('Error loading notifications:', error);
        updateNotificationBadge(0);
    }
}

async function loadMessages() {
    try {
        const session = checkAuth();
        if (!session) return;

        // For now, just set messages to 0 since the endpoint isn't ready
        updateMessageBadge(0);
        return;

        // Uncomment when the messages endpoint is ready
        /*
        const response = await fetch(`${API_BASE_URL}/messages`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                updateMessageBadge(0);
                return;
            }
            throw new Error(`Failed to load messages: ${response.status}`);
        }

        const { messages } = await response.json();
        updateMessageBadge(messages?.filter(m => !m.read)?.length || 0);
        */
    } catch (error) {
        console.error('Error loading messages:', error);
        updateMessageBadge(0);
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
                    <div class="profile-cover" style="background-image: url('${user.coverPhoto || DEFAULT_COVER}')">
                        <button class="btn btn-light btn-sm cover-upload-btn" onclick="document.getElementById('coverUpload').click()">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    <div class="profile-info text-center">
                        <div class="profile-photo-container">
                            <img src="${user.photo || DEFAULT_AVATAR}" 
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

// Function to check server port
async function checkServerPort() {
    try {
        // Try ports from 5000 to 5010
        for (let port = 5000; port <= 5010; port++) {
            try {
                const response = await fetch(`http://localhost:${port}/api/server-info`);
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('serverPort', data.port.toString());
                    console.log(`Server found on port ${data.port}`);
                    return data.port;
                }
            } catch (err) {
                continue; // Try next port
            }
        }
        throw new Error('Could not find server on any port');
    } catch (error) {
        console.error('Error checking server port:', error);
        return 5000; // Default to 5000 if we can't find the server
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkServerPort(); // Check server port first
    initializeProfileUpload();
    initializeFileUploads();
    restoreProfilePhotos();
});