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
const profileForm = document.getElementById('profileForm');

// Constants
const API_BASE_URL = 'http://localhost:5000/api';
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMGUwZTAiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIyMCIgZmlsbD0iI2JkYmRiZCIvPjxwYXRoIGQ9Ik0yMCA4MEMyMCA2MCAzMCA1MCA1MCA1MFM4MCA2MCA4MCA4MFoiIGZpbGw9IiNiZGJkYmQiLz48L3N2Zz4=';

// Store the port in local storage for consistency
localStorage.setItem('serverPort', '5000');

// Function to get the dynamic server URL based on the API_BASE_URL
function getServerUrl() {
    // Always use port 5000 for consistency
    return 'http://localhost:5000';
}

// Function to resolve photo URL with full path and cache busting
function resolvePhotoUrl(photoPath, bustCache = true) {
    if (!photoPath) return DEFAULT_AVATAR;
    
    // If it's already a full URL, return it
    if (photoPath.startsWith('http')) {
        return bustCache ? `${photoPath}?t=${Date.now()}` : photoPath;
    }
    
    // If it's a relative path, make it absolute
    const serverUrl = getServerUrl();
    const fullUrl = `${serverUrl}${photoPath}`;
    
    return bustCache ? `${fullUrl}?t=${Date.now()}` : fullUrl;
}

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

// Check authentication status
function checkAuth() {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.token || Date.now() > session.expiresAt) {
        window.location.href = 'login.html';
        return null;
    }
    return session;
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Initialize logout buttons
    const logoutButton = document.getElementById('logoutButton');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Directly set the bio field while waiting for the data to load
    const bioElement = document.getElementById('profileBio');
    if (bioElement) {
        bioElement.textContent = 'Loading bio...';
    }
    
    // Create toast container if it doesn't exist
    if (!document.querySelector('.toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    initializeDashboard();
    setupProfileForm();
    setupPhotoUpload();
});

// Initialize dashboard with improved error handling
async function initializeDashboard() {
    try {
        console.log('Starting dashboard initialization...'); // Debug log

        // First check authentication
        const session = checkAuth();
        if (!session) {
            console.log('No valid session found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // Show loading indicator
        showLoadingIndicator(true);
        
        // Initialize UI elements first
        console.log('Initializing UI elements...');
        initializeUIElements();
        
        // Then initialize event listeners
        console.log('Initializing event listeners...');
        initializeEventListeners();

        // Load user data from session first for immediate display
        console.log('Loading initial user data from session...');
        if (session.user) {
            updateUserInterface(session.user);
        }
        
        // Then try to get fresh data from the server
        console.log('Fetching fresh user data from server...');
        try {
            const userData = await loadUserData();
            if (userData) {
                console.log('Fresh user data received:', userData);
                updateUserInterface(userData);
                
                // Update session with fresh data
                session.user = { ...session.user, ...userData };
                localStorage.setItem('session', JSON.stringify(session));
            }
        } catch (error) {
            console.warn('Could not fetch fresh user data:', error);
            // Don't throw here - we already displayed session data
        }

        // Hide loading indicator
        showLoadingIndicator(false);
        
        // Load other data in background
        console.log('Loading additional data in background...');
        Promise.allSettled([
            loadActivityTimeline(),
            loadUpcomingSessions()
        ]).then(results => {
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.warn(`Background task ${index} failed:`, result.reason);
                }
            });
        });

        console.log('Dashboard initialization completed successfully');
        
    } catch (error) {
        console.error('Error in dashboard initialization:', error);
        showToast('error', 'Failed to load dashboard data. Please try again.');
        showLoadingIndicator(false);
    }
}

// Load user data with better error handling
async function loadUserData() {
    try {
        console.log('Starting loadUserData...'); // Debug log
        
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.token) {
            throw new Error('No valid session found');
        }

        console.log('Making API request to fetch user data...'); // Debug log

        // Use the correct API endpoint
        const response = await fetch('http://localhost:5000/api/dashboard/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Accept': 'application/json'
            }
        });

        console.log('API response status:', response.status); // Debug log

        if (!response.ok) {
            throw new Error(`Failed to load user data: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response data:', data); // Debug log

        if (!data.success) {
            throw new Error(data.message || 'Invalid response format');
        }

        // Handle different response formats
        const userData = data.data?.user || data.user || data.data;
        if (!userData) {
            throw new Error('No user data in response');
        }

        console.log('Successfully loaded user data:', userData); // Debug log
        return userData;

    } catch (error) {
        console.error('Error in loadUserData:', error);
        
        // Try to use session data as fallback
        try {
            const session = JSON.parse(localStorage.getItem('session'));
            if (session?.user) {
                console.log('Using session data as fallback');
                return session.user;
            }
        } catch (e) {
            console.error('Failed to get session data:', e);
        }
        
        throw error;
    }
}

// Shows or hides the loading indicator
function showLoadingIndicator(show) {
    try {
        let loadingOverlay = document.querySelector('.loading-overlay');
        
        // Create loading overlay if it doesn't exist
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="loading-message mt-2">Loading...</div>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        }
        
        loadingOverlay.style.display = show ? 'flex' : 'none';
        console.log(`Loading indicator ${show ? 'shown' : 'hidden'}`);
    } catch (error) {
        console.error('Error managing loading indicator:', error);
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

        // Initialize edit profile button
        const editProfileBtn = document.querySelector('[data-action="edit-profile"]');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', handleEditProfile);
            console.log('Edit profile button listener initialized');
        } else {
            console.warn('Edit profile button not found');
        }

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
        const profilePhoto = window.profilePhoto || document.getElementById('profilePhoto');
        if (profilePhoto && profilePhoto.parentElement) {
            // Create camera button if it doesn't exist
            let cameraButton = profilePhoto.parentElement.querySelector('.photo-upload-btn');
            if (!cameraButton) {
                cameraButton = document.createElement('button');
                cameraButton.className = 'photo-upload-btn';
                cameraButton.innerHTML = '<i class="fas fa-camera"></i>';
                profilePhoto.parentElement.style.position = 'relative';
                profilePhoto.parentElement.appendChild(cameraButton);
            }

            // Add click event listener to camera button
            cameraButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                photoInput.click();
            });
        }

        // Add change handler to file input
        photoInput.addEventListener('change', handleProfilePhotoUpload);
        console.log('Added photo upload change handler');

        // Restore profile photos
        restoreProfilePhotos();
    } catch (error) {
        console.error('Error initializing profile upload:', error);
    }
}

// Handle Profile Photo Upload with direct path to image
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

        // Show loading indicator
        const photoElements = document.querySelectorAll('.profile-photo, #navProfilePhoto, #profilePhoto');
        photoElements.forEach(el => {
            if (el) el.classList.add('loading');
        });

        // Create FormData
        const formData = new FormData();
        formData.append('photo', file); // Using 'photo' as the field name to match server expectation

        // Get auth token from session
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.token) {
            showToast('error', 'Please log in to upload a photo');
            photoElements.forEach(el => {
                if (el) el.classList.remove('loading');
            });
            return;
        }

        console.log('Uploading photo...'); // Debug log

        // Make API request
        const response = await fetch('http://localhost:5000/api/dashboard/profile/photo', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            },
            body: formData
        });

        console.log('Upload response status:', response.status); // Debug log

        const data = await response.json();
        console.log('Upload response data:', data); // Debug log

        if (!response.ok) {
            throw new Error(data.message || 'Failed to upload photo');
        }

        if (!data.success) {
            throw new Error(data.message || 'Invalid response from server');
        }

        // Get the photo URL from the response - handle different response formats
        const photoUrl = data.photoUrl || data.data?.photoUrl || data.data?.photo || data.photo;
        if (!photoUrl) {
            throw new Error('No photo URL received from server');
        }

        console.log('Received photo URL:', photoUrl); // Debug log

        // Update session storage with the new photo URL
        if (session.user) {
            session.user.photo = photoUrl;
        localStorage.setItem('session', JSON.stringify(session));
        }
        
        // Update all photo elements with the new URL
        photoElements.forEach(element => {
            if (!element) return;
            
            // Clear the current image
            element.src = '';
            
            // Set up load and error handlers
            element.onload = () => {
                console.log('Photo loaded successfully');
                element.classList.remove('loading');
                localStorage.setItem('lastSuccessfulPhotoUrl', photoUrl);
            };
            
            element.onerror = () => {
                console.error('Failed to load photo:', photoUrl);
                element.src = DEFAULT_AVATAR;
                element.classList.remove('loading');
            };
            
            // Set the new image source with cache-busting
            element.src = `${photoUrl}?t=${Date.now()}`;
        });
        
        // Show success message
        showToast('success', 'Profile photo updated successfully');
        
    } catch (error) {
        console.error('Profile photo upload error:', error);
        showToast('error', error.message || 'Failed to upload profile photo');
        
        // Reset photo elements
        const photoElements = document.querySelectorAll('.profile-photo, #navProfilePhoto, #profilePhoto');
        photoElements.forEach(element => {
            if (element) {
                element.classList.remove('loading');
                if (!element.src || element.src.includes('undefined')) {
                    element.src = DEFAULT_AVATAR;
                }
            }
        });
    } finally {
        // Reset file input
        event.target.value = '';
    }
}

// Helper function to try loading URLs in sequence
function tryLoadUrlSequence(element, urls, index) {
    if (index >= urls.length) {
        console.error('All photo URLs failed, using default avatar');
        element.src = DEFAULT_AVATAR;
        element.classList.remove('loading');
            return;
        }

    const url = urls[index];
    console.log(`Trying URL ${index + 1}/${urls.length}:`, url);
    
    element.onload = () => {
        console.log(`Successfully loaded image from URL ${index + 1}:`, url);
        element.classList.remove('loading');
        
        // Cache the successful URL
        localStorage.setItem('lastSuccessfulPhotoUrl', url);
    };
    
    element.onerror = () => {
        console.error(`Failed to load URL ${index + 1}:`, url);
        tryLoadUrlSequence(element, urls, index + 1);
    };
    
    element.src = url;
}

// Add event listener for profile photo updates
window.addEventListener('profilePhotoUpdated', (event) => {
    const { photoUrl } = event.detail;
    const photoElements = document.querySelectorAll('.profile-photo, #navProfilePhoto, #profilePhoto');
    photoElements.forEach(element => {
        if (element) {
            element.src = photoUrl;
        }
    });
});

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
    
    // Add additional event listeners for profile photo inputs
    const profilePhotoInput = document.getElementById('profilePhotoInput');
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', handleProfilePhotoUpload);
        console.log('Profile photo input listener initialized for profilePhotoInput');
    } else {
        console.error('Profile photo input element not found (profilePhotoInput)');
    }
    
    // Also find any other potential file upload elements
    document.querySelectorAll('input[type="file"][accept*="image"]').forEach(input => {
        if (!input.hasAttribute('onchange') && !input.hasListeners) {
            input.addEventListener('change', handleProfilePhotoUpload);
            input.hasListeners = true;
            console.log('Added profile photo handler to:', input.id || 'unnamed file input');
        }
    });
});

// Add this function to restore profile photos on page load
function restoreProfilePhotos() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.user) {
            console.log('No valid session found');
            return;
        }

        const photoUrl = session.user.photo;
        if (!photoUrl) {
            console.log('No profile photo URL in session');
            return;
        }

        console.log('Restoring profile photo from session:', photoUrl);
        
        // Extract filename for direct image access
        let filename = '';
        if (photoUrl.includes('/')) {
            filename = photoUrl.split('/').pop();
        } else {
            filename = photoUrl;
        }
        filename = filename.split('?')[0].split('#')[0];
        
        // Get the direct image URL
        const directImageUrl = getDirectImageUrl(filename);
        console.log('Using direct image URL:', directImageUrl);
            
        const profilePhotos = document.querySelectorAll('.profile-photo, #navProfilePhoto, #profilePhoto');
        profilePhotos.forEach(photo => {
            if (photo) {
                // Add loading class
                photo.classList.add('loading');
                
                // Set handlers
                photo.onload = function() {
                    console.log('Profile photo loaded successfully');
                    this.classList.remove('loading');
                };
                
                photo.onerror = function() {
                    console.error('Failed to load profile photo:', directImageUrl);
                    this.src = DEFAULT_AVATAR;
                    this.classList.remove('loading');
                };
                
                // Set the image source to our direct URL
                photo.src = directImageUrl;
                
                console.log('Restored photo element:', photo.id || 'unnamed photo element');
            }
        });
    } catch (error) {
        console.error('Error restoring profile photos:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const session = checkAuth();
    if (!session) {
        return; // Will redirect to login
    }

    // Initialize components
    await checkServerPort();
    initializeProfileUpload();
    
    // Update profile UI with session data
    const photoUrl = session.user.photo;
    if (photoUrl) {
        const currentApiUrl = (() => {
            const serverPort = localStorage.getItem('serverPort') || '5000';
            return `http://localhost:${serverPort}`;
        })();

        const fullPhotoUrl = photoUrl.startsWith('http') 
            ? photoUrl 
            : `${currentApiUrl}${photoUrl}`;
            
        const profilePhotos = document.querySelectorAll('.profile-photo, #navProfilePhoto, #profilePhoto');
        profilePhotos.forEach(photo => {
            if (photo) {
                photo.src = fullPhotoUrl;
                photo.onerror = function() {
                    console.error('Failed to load profile photo:', fullPhotoUrl);
                    this.src = DEFAULT_AVATAR;
                };
            }
        });
    }
});

// Handle edit profile button click
async function handleEditProfile() {
    try {
        console.log('Edit profile button clicked'); // Debug log

        // Get session data
        const sessionData = localStorage.getItem('session');
        if (!sessionData) {
            throw new Error('No session found');
        }

        let session;
        try {
            session = JSON.parse(sessionData);
        } catch (e) {
            console.error('Error parsing session data:', e);
            throw new Error('Invalid session data');
        }

        if (!session || !session.token) {
            throw new Error('No valid session found');
        }

        // Show loading state
        showLoadingState(true, 'Loading profile data...');

        // Get user data from session as fallback
        const userData = session.user || {};
        console.log('User data:', userData); // Debug log

        // Get modal and form
        const modal = document.getElementById('editProfileModal');
        if (!modal) {
            throw new Error('Edit profile modal not found');
        }

        const form = modal.querySelector('#editProfileForm');
        if (!form) {
            throw new Error('Edit profile form not found');
        }

        // Populate form fields
        const fields = {
            'editFirstName': userData.firstName || '',
            'editLastName': userData.lastName || '',
            'editEmail': userData.email || '',
            'editPhone': userData.phoneNumber || '',
            'editLocation': userData.location || '',
            'editBio': userData.bio || ''
        };

        // Update each field and log the value being set
        Object.entries(fields).forEach(([id, value]) => {
            const element = form.querySelector(`#${id}`);
            if (element) {
                element.value = value;
                console.log(`Setting ${id} to:`, value);
            } else {
                console.warn(`Field ${id} not found in form`);
            }
        });

        // Initialize Bootstrap modal
        const modalInstance = new bootstrap.Modal(modal);
        console.log('Showing modal'); // Debug log
        modalInstance.show();

        // Setup save button handler
        const saveButton = modal.querySelector('#saveProfileBtn');
        if (saveButton) {
            // Remove existing listeners
            const newSaveButton = saveButton.cloneNode(true);
            saveButton.parentNode.replaceChild(newSaveButton, saveButton);
            
            // Add new listener
            newSaveButton.addEventListener('click', () => handleSaveProfile(modalInstance));
            console.log('Save button handler attached'); // Debug log
        }

    } catch (error) {
        console.error('Error opening edit profile:', error);
        showToast('error', error.message || 'Error opening edit profile form');
    } finally {
        showLoadingState(false);
    }
}

// Handle save profile
async function handleSaveProfile(modalInstance) {
    const modal = document.getElementById('editProfileModal');
    const form = modal.querySelector('#editProfileForm');
    const saveButton = modal.querySelector('#saveProfileBtn');

    try {
        // Show loading state
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        // Get form data
        const formData = {
            firstName: form.querySelector('#editFirstName').value.trim(),
            lastName: form.querySelector('#editLastName').value.trim(),
            email: form.querySelector('#editEmail').value.trim(),
            phoneNumber: form.querySelector('#editPhone').value.trim(),
            location: form.querySelector('#editLocation').value.trim(),
            bio: form.querySelector('#editBio').value.trim()
        };

        console.log('Form data to save:', formData); // Debug log

        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email) {
            throw new Error('Please fill in all required fields');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            throw new Error('Please enter a valid email address');
        }

        // Get session data
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.token) {
            throw new Error('No valid session found');
        }

        // Update session data first (optimistic update)
        session.user = { ...session.user, ...formData };
        localStorage.setItem('session', JSON.stringify(session));

        // Update UI immediately
        updateProfileDisplay(session.user);

        // Close modal
        modalInstance.hide();

        // Show success message
        showToast('success', 'Profile updated successfully');
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('error', error.message || 'Error updating profile');
    } finally {
        // Reset button state
        saveButton.disabled = false;
        saveButton.innerHTML = 'Save Changes';
    }
}

// Show/hide loading state
function showLoadingState(show, message = 'Loading...') {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        if (show) {
            const loadingMessage = loadingOverlay.querySelector('.loading-message');
            if (loadingMessage) {
                loadingMessage.textContent = message;
            }
            loadingOverlay.style.display = 'flex';
        } else {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Update profile display in UI
function updateProfileDisplay(userData) {
    console.log('Updating profile display with:', userData); // Debug log

    const elements = {
        '#profileHeaderName': `${userData.firstName} ${userData.lastName}`,
        '#profileHeaderEmail': userData.email || 'Email not set',
        '#profileName': `${userData.firstName} ${userData.lastName}`,
        '#profileEmail': userData.email || 'Email not set',
        '#profilePhone': userData.phoneNumber || 'Phone not set',
        '#profileLocation': userData.location || 'Location not set',
        '#profileBio': userData.bio || 'No bio added yet',
        '#userName': `${userData.firstName} ${userData.lastName}`,
        '#welcomeUserName': `Welcome back, ${userData.firstName}!`,
        '#userEmail': userData.email || 'Email not set'
    };

    for (const [selector, value] of Object.entries(elements)) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
            console.log(`Updated ${selector} with:`, value); // Debug log
        } else {
            console.warn(`Element not found: ${selector}`);
        }
    }
}

// Show toast message
function showToast(type, message) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error('Toast container not found');
            return;
        }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);
    
    // Force reflow
    toast.offsetHeight;
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            
            // Remove from DOM after animation
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 10);
}

// Setup profile form
function setupProfileForm() {
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
}

// Populate profile form with user data
function populateProfileForm(user) {
    if (!profileForm) return;

    // Set form field values
    const fields = ['firstName', 'lastName', 'email', 'bio', 'phoneNumber', 'location'];
    fields.forEach(field => {
        const input = profileForm.querySelector(`[name="${field}"]`);
        if (input && user[field]) {
            input.value = user[field];
        }
    });

    // Update profile photo if exists
    if (user.photo) {
        const photoUrl = user.photo.startsWith('http') 
            ? user.photo 
            : `${API_BASE_URL.replace('/api', '')}${user.photo}`;
        
        if (profilePhoto) {
            profilePhoto.src = photoUrl;
            profilePhoto.onerror = () => {
                profilePhoto.src = '../images/default-avatar.svg';
            };
        }
    }
}

// Handle profile update
async function handleProfileUpdate(event) {
    event.preventDefault();

    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.token) {
            throw new Error('Please log in to update your profile');
        }

        const formData = new FormData(profileForm);
        const updates = {};
        
        // Convert FormData to object and validate
        formData.forEach((value, key) => {
            if (value.trim()) {
                updates[key] = value.trim();
            }
        });

        const response = await fetch(`${API_BASE_URL}/dashboard/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update profile');
        }

        const { data } = await response.json();
        
        // Update session data
        session.user = { ...session.user, ...data.user };
        localStorage.setItem('session', JSON.stringify(session));

        // Update UI
        populateProfileForm(data.user);
        
        // Trigger profile update in navigation
        if (window.updateUserProfile) {
            window.updateUserProfile();
        }

        showToast('success', 'Profile updated successfully');

    } catch (error) {
        console.error('Profile update error:', error);
        showToast('error', error.message || 'Failed to update profile');
    }
}

// Setup photo upload
function setupPhotoUpload() {
    if (photoUpload) {
        photoUpload.addEventListener('change', handlePhotoUpload);
    }
}

// Function to get the correct photo URL
function getPhotoUrl(photoPath) {
    if (!photoPath) return DEFAULT_AVATAR;
    if (photoPath.startsWith('http')) return photoPath;
    return `${API_BASE_URL.replace('/api', '')}${photoPath}`;
}

// Update profile photo if exists
function updateProfilePhoto(photoPath) {
    if (!profilePhoto) return;
    
    console.log('Updating profile photo with path:', photoPath);
    const photoUrl = getPhotoUrl(photoPath);
    console.log('Resolved photo URL:', photoUrl);
    
    // Set loading state
    profilePhoto.classList.add('loading');
    
    // Create a new image to test loading
    const img = new Image();
    img.onload = () => {
        console.log('Profile photo loaded successfully');
        profilePhoto.src = photoUrl;
        profilePhoto.classList.remove('loading');
    };
    img.onerror = () => {
        console.error('Failed to load profile photo:', photoUrl);
        profilePhoto.src = DEFAULT_AVATAR;
        profilePhoto.classList.remove('loading');
    };
    img.src = photoUrl;
}

// Handle photo upload
async function handlePhotoUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.token) {
            throw new Error('Please log in to upload a photo');
        }

        // Validate file type and size
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Please select a valid image file (JPEG, PNG, or GIF)');
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('Image size should be less than 5MB');
        }

        // Show loading state
        if (profilePhoto) {
            profilePhoto.classList.add('loading');
        }

        const formData = new FormData();
        formData.append('photo', file);

        console.log('Uploading photo...');
        const response = await fetch(`${API_BASE_URL}/dashboard/profile/photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload photo');
        }

        const { data } = await response.json();
        console.log('Upload response:', data);
        
        // Update profile photo in UI
        if (data.photoUrl) {
            updateProfilePhoto(data.photoUrl);
            
            // Update session data
            session.user.photo = data.photoUrl;
            localStorage.setItem('session', JSON.stringify(session));

            // Trigger profile update in navigation
            if (window.updateUserProfile) {
                window.updateUserProfile();
            }

            showToast('success', 'Profile photo updated successfully');
        } else {
            throw new Error('No photo URL received from server');
        }

    } catch (error) {
        console.error('Photo upload error:', error);
        showToast('error', error.message || 'Failed to upload photo');
        if (profilePhoto) {
            profilePhoto.classList.remove('loading');
        }
    } finally {
        // Reset file input
        event.target.value = '';
    }
}

// Function to validate image URLs and provide fallbacks
function validateImageUrl(url, elementId, fallbackUrl = DEFAULT_AVATAR) {
    if (!url) return fallbackUrl;
    
    // Create a test image
    const img = new Image();
    img.onerror = function() {
        console.error(`Image validation failed for URL: ${url}`);
        // Find the element and update its src
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`Applying fallback image to element: ${elementId}`);
            element.src = fallbackUrl;
        }
    };
    
    // Try to load the image
    img.src = url;
    return url;
}

// Fix image fallback for profile photo
document.addEventListener('DOMContentLoaded', () => {
    // Apply fallback for profile photos that don't load
    const profileElements = {
        'profilePhoto': true,
        'navProfilePhoto': true
    };
    
    // Add event listeners for all profile photos
    Object.keys(profileElements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.onerror = function() {
                console.error(`Failed to load image for element: ${id}`);
                this.src = DEFAULT_AVATAR;
                this.classList.remove('loading');
            };
        }
    });
});

// Function to force refresh profile photos with new URLs
function refreshProfilePhotos() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.user || !session.user.photo) {
            return;
        }
        
        const timestamp = Date.now();
        const serverUrl = getServerUrl();
        const photoPath = session.user.photo;
        const fullUrl = photoPath.startsWith('http') 
            ? `${photoPath}?t=${timestamp}`
            : `${serverUrl}${photoPath}?t=${timestamp}`;
        
        // Get all profile photo elements
        const photoElements = document.querySelectorAll('#profilePhoto, #navProfilePhoto, .profile-photo');
        
        // Update each element
        photoElements.forEach(element => {
            if (element) {
                // Force a refresh by clearing and setting the src
                element.src = '';
                setTimeout(() => {
                    element.src = fullUrl;
                    console.log(`Refreshed photo element ${element.id || 'unnamed'} with URL: ${fullUrl}`);
                }, 50);
            }
        });
    } catch (error) {
        console.error('Error refreshing profile photos:', error);
    }
}

// Refresh profile photos on page load and periodically
document.addEventListener('DOMContentLoaded', () => {
    // Initial load might have stale images, refresh after a short delay
    setTimeout(refreshProfilePhotos, 1000);
    
    // Also set up periodic refresh every 30 seconds in case of changes
    setInterval(refreshProfilePhotos, 30000);
});

// Debugging function for profile links
function testProfileLink() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.user) {
            console.error('No valid session found');
            return;
        }
        
        // Get user ID
        const userId = session.user.id || session.user._id;
        if (!userId) {
            console.error('Could not find user ID in session:', session.user);
            return;
        }
        
        // Generate various forms of the profile link
        const serverBaseUrl = getServerUrl();
        const browserBaseUrl = window.location.origin;
        
        console.group('Profile Link Debug Info');
        console.log('User ID:', userId);
        console.log('Server Base URL:', serverBaseUrl);
        console.log('Browser Base URL:', browserBaseUrl);
        console.log('Profile link (server):', `${serverBaseUrl}/profile/${userId}`);
        console.log('Profile link (browser):', `${browserBaseUrl}/profile/${userId}`);
        
        // Log session details
        console.log('Session user data:', session.user);
        console.groupEnd();
        
        return {
            userId,
            serverLink: `${serverBaseUrl}/profile/${userId}`,
            browserLink: `${browserBaseUrl}/profile/${userId}`
        };
    } catch (error) {
        console.error('Error in testProfileLink:', error);
    }
}

// Update user interface with better error handling
function updateUserInterface(user) {
    try {
        console.log('Updating user interface with data:', user); // Debug log

        if (!user) {
            console.error('No user data provided to updateUserInterface');
            return;
        }

        // Update basic user details first
        updateUserBasicDetails(user);
        
        // Update profile photos with improved error handling
        updateProfilePhotos(user);
        
        // Update stats if available
        if (user.stats) {
            updateUserStats(user.stats);
        }

        console.log('User interface updated successfully');

    } catch (error) {
        console.error('Error updating user interface:', error);
        // Don't restore default UI if we have partial data
        if (!user) {
            restoreDefaultUI();
        }
    }
}

// Update basic user information
function updateUserBasicDetails(user) {
    // Get email from multiple sources to ensure reliability
    const email = user.email || localStorage.getItem('userEmail') || 
                JSON.parse(localStorage.getItem('session'))?.user?.email || 'No email available';
    
    console.log('Using email:', email);
    
    // Handle name display - support both name field and firstName/lastName
    let fullName = '';
    
    if (user.firstName && user.lastName) {
        fullName = `${user.firstName} ${user.lastName}`.trim();
    } else if (user.name) {
        fullName = user.name;
        
        // Store parsed first/last name in user object for future use
        if (!user.firstName || !user.lastName) {
            const nameParts = user.name.split(' ');
            user.firstName = nameParts[0] || '';
            user.lastName = nameParts.slice(1).join(' ') || '';
        }
    } else {
        fullName = 'User';
    }
    
    // Update name in header if element exists
    if (window.userNameElement) {
        window.userNameElement.textContent = fullName;
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
        profileHeaderName.textContent = fullName || 'Not available';
    }
    
    if (profileHeaderEmail) {
        profileHeaderEmail.textContent = email;
    }

    // Update profile details section
    const profileDetails = {
        'profileName': fullName || 'Not available',
        'profileEmail': email,
        'profilePhone': user.phoneNumber || 'Not provided',
        'profileLocation': user.location || 'Not provided',
        'profileBio': user.bio || ''
    };

    // Debug log for profile details
    console.log('Profile details to update:', profileDetails);

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
}

// Update profile photos with enhanced error handling
function updateProfilePhotos(user) {
    console.log('Updating profile photos for user:', user);
    
    // Get photo URL - check multiple sources
    let photoPath = user.photo || user.profileImage || user.profilePhoto;
    
    // Use default avatar if no photo path found
    if (!photoPath) {
        console.log('No photo path found in user object, using default avatar');
        updateAllPhotoElements(DEFAULT_AVATAR);
        return;
    }
    
    // Handle different types of photo URLs
    let photoUrl;
    if (photoPath.startsWith('data:')) {
        photoUrl = photoPath;
    } else if (photoPath.startsWith('http')) {
        photoUrl = photoPath;
    } else if (photoPath.startsWith('/uploads/')) {
        photoUrl = `http://localhost:5000${photoPath}`;
    } else {
        photoUrl = DEFAULT_AVATAR;
    }
    
    console.log('Using photo URL:', photoUrl);
    
    // Find all photo elements
    const photoElements = [
        window.profilePhoto, 
        document.getElementById('profilePhoto'),
        document.getElementById('navProfilePhoto'),
        ...document.querySelectorAll('.profile-photo')
    ].filter(el => el); // Filter out null/undefined elements
    
    // Update each element with the photo URL
    photoElements.forEach(element => {
        element.src = photoUrl;
        element.onerror = function() {
            console.error('Failed to load image:', photoUrl);
            this.src = DEFAULT_AVATAR;
        };
    });
}

// Update all photo elements with a specific URL
function updateAllPhotoElements(url) {
    const photoElements = [
        window.profilePhoto, 
        document.getElementById('profilePhoto'),
        document.getElementById('navProfilePhoto'),
        ...document.querySelectorAll('.profile-photo')
    ].filter(el => el);
    
    photoElements.forEach(element => {
        element.src = url;
        element.onerror = function() {
            console.error('Failed to load image:', url);
            this.src = DEFAULT_AVATAR;
        };
    });
}

// Restore default UI values in case of error
function restoreDefaultUI() {
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
        
        updateAllPhotoElements(fallbackUrl);
    } catch (e) {
        console.error('Failed to restore default UI values:', e);
    }
}

// Helper function to get direct image URL through the dedicated endpoint
function getDirectImageUrl(filename) {
    // If it's a full URL or data URL, return as is
    if (!filename || filename.startsWith('data:') || filename.startsWith('http')) {
        return filename;
    }
    
    // Extract just the filename if it's a path
    let bareFilename = filename;
    if (filename.includes('/')) {
        bareFilename = filename.split('/').pop();
    }
    
    // Clean up the filename (remove query params)
    bareFilename = bareFilename.split('?')[0].split('#')[0];
    
    // Use the direct image endpoint
    return `http://localhost:5000/profileImage/${bareFilename}?t=${Date.now()}`;
}

// Add the missing getImageUrl function 
function getImageUrl(path) {
    // Handle empty paths, data URLs, and absolute URLs
    if (!path) return DEFAULT_AVATAR;
    if (path.startsWith('data:')) return path;
    if (path.startsWith('http')) return `${path}?t=${Date.now()}`;
    
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
    
    // Return an array of possible paths to try
    const baseUrl = 'http://localhost:5000';
    
    return [
        // Direct path to uploads folder
        `${baseUrl}/uploads/profiles/${filename}?t=${Date.now()}`,
        // With API prefix
        `${baseUrl}/api/uploads/profiles/${filename}?t=${Date.now()}`,
        // Original path
        `${baseUrl}${path}?t=${Date.now()}`,
        // Full filename path
        `${baseUrl}/uploads/profiles/profileImage-${filename}?t=${Date.now()}`,
        // Direct image endpoint
        `${baseUrl}/profileImage/${filename}?t=${Date.now()}`
    ];
}

// Add the missing loadActivityTimeline function
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

        // Render activities if the timeline element exists
        if (activityTimeline) {
            renderActivities(mockActivities);
            console.log('Mock activities loaded successfully');
        } else {
            console.log('Activity timeline element not found');
        }
        
        return mockActivities;
    } catch (error) {
        console.error('Error loading activity timeline:', error);
        return [];
    }
}

// Add missing renderActivities function
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

// Add missing getActivityIcon function
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

// Add missing getActivityIconClass function
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

// Add missing formatTimeAgo function
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

// Add missing checkServerPort function
async function checkServerPort() {
    try {
        // Force port 5000
        localStorage.setItem('serverPort', '5000');
        return '5000';
    } catch (error) {
        console.error('Error checking server port:', error);
        return '5000'; // Default fallback
    }
}

// Function to handle logout
async function handleLogout() {
    try {
        // Show loading state on logout button
        const logoutBtns = document.querySelectorAll('.top-logout-btn');
        logoutBtns.forEach(btn => {
            btn.disabled = true;
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'fas fa-spinner fa-spin';
        });

        // Clear all auth-related data from localStorage
        localStorage.removeItem('session');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('serverPort');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        
        try {
            // Call logout endpoint
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                console.error('Logout failed:', response.statusText);
            }
        } catch (error) {
            console.error('Logout request failed:', error);
            // Continue with client-side logout even if server request fails
        }

        // Get the current path and navigate up to the correct login page
        const currentPath = window.location.pathname;
        const pathToRoot = currentPath.includes('/FRONT-END/') ? '../' : '';
        
        // Redirect to login page using the correct relative path
        window.location.replace(`${pathToRoot}login.html`);
    } catch (error) {
        console.error('Logout error:', error);
        // Ensure redirect happens even if there's an error, using the same path logic
        const currentPath = window.location.pathname;
        const pathToRoot = currentPath.includes('/FRONT-END/') ? '../' : '';
        window.location.replace(`${pathToRoot}login.html`);
    }
}

// Make handleLogout available globally for onclick handlers
window.handleLogout = handleLogout;

// Add loadUpcomingSessions function
async function loadUpcomingSessions() {
    try {
        const session = checkAuth();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/dashboard/data`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load upcoming sessions');
        }

        const data = await response.json();
        
        // Get the upcoming sessions container
        const sessionsContainer = document.getElementById('upcomingSessions');
        if (!sessionsContainer) {
            console.log('Upcoming sessions container not found');
            return;
        }

        // If no upcoming sessions
        if (!data.data.upcomingSessions || data.data.upcomingSessions.length === 0) {
            sessionsContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-calendar fa-2x mb-3"></i>
                    <p>No upcoming sessions scheduled</p>
                </div>
            `;
            return;
        }

        // Render upcoming sessions
        const sessionsHTML = data.data.upcomingSessions.map(session => `
            <div class="session-item">
                <div class="session-icon">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="session-content">
                    <h6 class="session-title">${session.topic || 'Coaching Session'}</h6>
                    <p class="session-time">
                        <i class="far fa-clock me-1"></i>
                        ${new Date(session.startTime).toLocaleString()}
                    </p>
                    ${session.coach ? `
                        <p class="session-coach">
                            <i class="fas fa-user me-1"></i>
                            Coach: ${session.coach.name}
                        </p>
                    ` : ''}
                </div>
            </div>
        `).join('');

        sessionsContainer.innerHTML = sessionsHTML;
        
        return data.data.upcomingSessions;
    } catch (error) {
        console.error('Error loading upcoming sessions:', error);
        const sessionsContainer = document.getElementById('upcomingSessions');
        if (sessionsContainer) {
            sessionsContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                    <p>Error loading upcoming sessions</p>
                </div>
            `;
        }
        return [];
    }
}

// Make functions globally available
window.editProfile = editProfile;
window.saveProfile = saveProfile;