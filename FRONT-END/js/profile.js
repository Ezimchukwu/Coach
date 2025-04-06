// Constants
const API_BASE_URL = (() => {
    const serverPort = localStorage.getItem('serverPort') || '5000';
    return `http://localhost:${serverPort}`;
})();

const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMGUwZTAiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIyMCIgZmlsbD0iI2JkYmRiZCIvPjxwYXRoIGQ9Ik0yMCA4MEMyMCA2MCAzMCA1MCA1MCA1MFM4MCA2MCA4MCA4MFoiIGZpbGw9IiNiZGJkYmQiLz48L3N2Zz4=';

// DOM Elements
const profilePhoto = document.getElementById('profilePhoto');
const profileName = document.getElementById('profileName');
const profileLocation = document.getElementById('profileLocation');
const profileBio = document.getElementById('profileBio');

// Show/hide loading overlay
function showLoadingIndicator(show) {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Show toast message
function showToast(type, message) {
    const toastContainer = document.querySelector('.toast-container');
    const toastHTML = `
        <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toast = new bootstrap.Toast(toastContainer.lastElementChild);
    toast.show();
}

// Get profile ID from URL
function getProfileId() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

// Resolve photo URL with multiple fallback options
function resolvePhotoUrl(photoPath) {
    if (!photoPath) return DEFAULT_AVATAR;
    if (photoPath.startsWith('data:')) return photoPath;
    if (photoPath.startsWith('http')) return `${photoPath}?t=${Date.now()}`;
    
    // Extract just the filename
    let filename;
    if (photoPath.includes('/')) {
        filename = photoPath.split('/').pop();
    } else {
        filename = photoPath;
    }
    filename = filename.split('?')[0].split('#')[0];
    
    console.log('Extracted image filename:', filename);
    
    // Generate multiple possible paths for fallback
    const serverPort = localStorage.getItem('serverPort') || '5000';
    const serverUrl = `http://localhost:${serverPort}`;
    
    return [
        // Direct path from API
        `${serverUrl}${photoPath}?t=${Date.now()}`,
        // Path without /api prefix
        `${serverUrl}/uploads/profiles/${filename}?t=${Date.now()}`,
        // Direct uploads path without api
        `${serverUrl}/uploads/profiles/profileImage-${filename}?t=${Date.now()}`,
        // Direct path with full filename
        `${serverUrl}/uploads/profiles/${filename}?t=${Date.now()}`
    ];
}

// Try loading image with multiple fallbacks
function tryLoadingImage(element, urlsOrUrl) {
    if (!element) return;
    
    // Convert single URL to array for consistent handling
    const urls = Array.isArray(urlsOrUrl) ? urlsOrUrl : [urlsOrUrl];
    let currentIndex = 0;
    
    function tryNextUrl() {
        if (currentIndex >= urls.length) {
            console.error('All image URLs failed, using default avatar');
            element.src = DEFAULT_AVATAR;
            element.classList.remove('loading');
            return;
        }
        
        const currentUrl = urls[currentIndex];
        console.log(`Attempting to load image (${currentIndex + 1}/${urls.length}):`, currentUrl);
        
        const img = new Image();
        
        img.onload = function() {
            console.log('Successfully loaded image:', currentUrl);
            element.src = currentUrl;
            element.classList.remove('loading');
        };
        
        img.onerror = function() {
            console.error(`Failed to load image URL (${currentIndex + 1}/${urls.length}):`, currentUrl);
            currentIndex++;
            tryNextUrl();
        };
        
        img.src = currentUrl;
    }
    
    // Start trying URLs
    tryNextUrl();
}

// Load profile data
async function loadProfile() {
    const profileId = getProfileId();
    if (!profileId) {
        showToast('error', 'Invalid profile URL');
        return;
    }

    try {
        showLoadingIndicator(true);
        
        console.log(`Fetching profile with ID: ${profileId}`);
        
        // The correct URL format for the API endpoint
        const profileUrl = `${API_BASE_URL}/api/profile/${profileId}`;
        console.log(`Making API request to: ${profileUrl}`);

        const response = await fetch(profileUrl);
        
        if (!response.ok) {
            let errorMessage = 'Failed to load profile';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
            throw new Error(errorMessage);
        }

        const responseData = await response.json();
        
        if (!responseData.success || !responseData.data) {
            throw new Error('Invalid response format from server');
        }
        
        const { data } = responseData;
        console.log('Loaded profile data:', data);

        // Update profile photo with multiple fallback strategies
        if (data.photo) {
            profilePhoto.classList.add('loading');
            const photoUrls = resolvePhotoUrl(data.photo);
            tryLoadingImage(profilePhoto, photoUrls);
        } else {
            profilePhoto.src = DEFAULT_AVATAR;
        }

        // Update other profile information
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        profileName.textContent = fullName || 'User';
        profileLocation.textContent = data.location || 'Location not specified';
        profileBio.textContent = data.bio || 'No bio available';

        document.title = `${fullName || 'User'} - Profile`;

    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('error', error.message || 'Failed to load profile');
        
        // Set defaults for error case
        profilePhoto.src = DEFAULT_AVATAR;
        profileName.textContent = 'Profile Not Found';
        profileLocation.textContent = '';
        profileBio.textContent = 'Unable to load this profile. It may be private or not exist.';
    } finally {
        showLoadingIndicator(false);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadProfile); 