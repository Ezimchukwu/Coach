// Function to copy profile link to clipboard
function copyProfileLink() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.user) {
            showToast('error', 'Please log in to share your profile');
            return;
        }
        
        const userId = session.user.id || session.user._id;
        if (!userId) {
            showToast('error', 'Could not determine user ID');
            return;
        }
        
        const browserOrigin = window.location.origin;
        const profileLink = `${browserOrigin}/profile/${userId}`;
        
        console.log('Copying profile link:', profileLink);
        
        navigator.clipboard.writeText(profileLink)
            .then(() => showToast('success', 'Profile link copied to clipboard'))
            .catch(err => {
                console.error('Failed to copy:', err);
                showToast('error', 'Failed to copy profile link');
            });
    } catch (error) {
        console.error('Error copying profile link:', error);
        showToast('error', 'Failed to copy profile link');
    }
}

// Function to share profile on LinkedIn
function shareOnLinkedIn() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.user) {
            showToast('error', 'Please log in to share your profile');
            return;
        }
        
        const userId = session.user.id || session.user._id;
        if (!userId) {
            showToast('error', 'Could not determine user ID');
            return;
        }
        
        const browserOrigin = window.location.origin;
        const profileLink = `${browserOrigin}/profile/${userId}`;
        
        console.log('Sharing profile on LinkedIn:', profileLink);
        
        const url = encodeURIComponent(profileLink);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    } catch (error) {
        console.error('Error sharing to LinkedIn:', error);
        showToast('error', 'Failed to share to LinkedIn');
    }
}

// Function to share profile on Twitter
function shareOnTwitter() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.user) {
            showToast('error', 'Please log in to share your profile');
            return;
        }
        
        const userId = session.user.id || session.user._id;
        if (!userId) {
            showToast('error', 'Could not determine user ID');
            return;
        }
        
        const browserOrigin = window.location.origin;
        const profileLink = `${browserOrigin}/profile/${userId}`;
        
        console.log('Sharing profile on Twitter:', profileLink);
        
        const url = encodeURIComponent(profileLink);
        const text = encodeURIComponent('Check out my coaching profile!');
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    } catch (error) {
        console.error('Error sharing to Twitter:', error);
        showToast('error', 'Failed to share to Twitter');
    }
}

// Function to share profile on Facebook
function shareOnFacebook() {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.user) {
            showToast('error', 'Please log in to share your profile');
            return;
        }
        
        const userId = session.user.id || session.user._id;
        if (!userId) {
            showToast('error', 'Could not determine user ID');
            return;
        }
        
        const browserOrigin = window.location.origin;
        const profileLink = `${browserOrigin}/profile/${userId}`;
        
        console.log('Sharing profile on Facebook:', profileLink);
        
        const url = encodeURIComponent(profileLink);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    } catch (error) {
        console.error('Error sharing to Facebook:', error);
        showToast('error', 'Failed to share to Facebook');
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

        // Get the current path and navigate to login page
        const currentPath = window.location.pathname;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        window.location.href = `${basePath}/login.html`;
    } catch (error) {
        console.error('Logout error:', error);
        // Ensure redirect happens even if there's an error
        const currentPath = window.location.pathname;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        window.location.href = `${basePath}/login.html`;
    }
}

// Make handleLogout available globally for onclick handlers
window.handleLogout = handleLogout; 