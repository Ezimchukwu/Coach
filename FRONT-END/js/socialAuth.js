// Social Authentication Handler
const GOOGLE_CLIENT_ID = '390313645821-k0lb6lopmpvkhfuniictveifcf2708q8.apps.googleusercontent.com';
const BACKEND_URL = 'http://localhost:5000';

// Function to handle Google Sign-in
async function handleGoogleSignup() {
    const width = 500;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(
        `${BACKEND_URL}/api/auth/google`,
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
        alert('Please enable popups for this website');
        return;
    }

    try {
        const checkToken = setInterval(() => {
            try {
                if (!popup || popup.closed) {
                    clearInterval(checkToken);
                    return;
                }

                const currentUrl = popup.location.href;
                if (currentUrl.includes('token=')) {
                    clearInterval(checkToken);
                    const token = new URL(currentUrl).searchParams.get('token');
                    if (token) {
                        localStorage.setItem('authToken', token);
                        popup.close();
                        window.location.href = '/Coach/FRONT-END/dashboard.html';
                    }
                }
            } catch (e) {
                // Cross-origin errors are expected while the popup is on the Google domain
                if (e.name !== 'SecurityError') {
                    console.error('Error checking token:', e);
                }
            }
        }, 500);

    } catch (error) {
        console.error('Authentication error:', error);
        alert('An error occurred during authentication. Please try again.');
    }
}

// Function to check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('authToken') !== null;
}

// Function to logout
function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/Coach/FRONT-END/login.html';
}

// Export functions for use in other files
window.handleGoogleSignup = handleGoogleSignup;
window.isAuthenticated = isAuthenticated;
window.logout = logout; 