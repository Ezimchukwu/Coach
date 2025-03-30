// DOM Elements
const memberCards = document.querySelectorAll('.member-card');
const discussionCards = document.querySelectorAll('.discussion-card');
const connectButtons = document.querySelectorAll('.btn-outline-primary');
const joinDiscussionButtons = document.querySelectorAll('.discussion-card .btn-primary');
const communityStats = document.querySelectorAll('.stat-value');

// Initialize community page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const session = checkSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        await Promise.all([
            loadCommunityStats(),
            loadFeaturedMembers(),
            loadActiveDiscussions(),
            initializeAnimations()
        ]);

    } catch (error) {
        console.error('Error initializing community:', error);
        showToast('error', 'Failed to initialize community page');
    }
});

// Load community statistics
async function loadCommunityStats() {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/community/stats`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load community stats');

        const stats = await response.json();
        updateCommunityStats(stats);
    } catch (error) {
        console.error('Error loading community stats:', error);
    }
}

// Update community statistics with animation
function updateCommunityStats(stats) {
    communityStats.forEach(statElement => {
        const key = statElement.dataset.stat;
        if (stats[key]) {
            animateNumber(statElement, stats[key]);
        }
    });
}

// Load featured members
async function loadFeaturedMembers() {
    try {
        const session = checkSession();
        if (!session) return;

        showLoadingState(memberCards);

        const response = await fetch(`${API_BASE_URL}/community/featured-members`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load featured members');

        const { members } = await response.json();
        renderFeaturedMembers(members);
        hideLoadingState(memberCards);
    } catch (error) {
        console.error('Error loading featured members:', error);
        hideLoadingState(memberCards);
    }
}

// Render featured members
function renderFeaturedMembers(members) {
    memberCards.forEach((card, index) => {
        if (members[index]) {
            const member = members[index];
            card.querySelector('img').src = member.photo || 'images/default-avatar.png';
            card.querySelector('h4').textContent = member.name;
            card.querySelector('p').textContent = member.role;
            card.querySelector('.member-badge').textContent = member.badge;
            card.querySelector('.member-stats').innerHTML = `
                <span><i class="fas fa-star"></i> ${member.rating}</span>
                <span><i class="fas fa-users"></i> ${member.connections}+</span>
            `;
        }
    });
}

// Load active discussions
async function loadActiveDiscussions() {
    try {
        const session = checkSession();
        if (!session) return;

        showLoadingState(discussionCards);

        const response = await fetch(`${API_BASE_URL}/community/discussions`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load discussions');

        const { discussions } = await response.json();
        renderDiscussions(discussions);
        hideLoadingState(discussionCards);
    } catch (error) {
        console.error('Error loading discussions:', error);
        hideLoadingState(discussionCards);
    }
}

// Render active discussions
function renderDiscussions(discussions) {
    discussionCards.forEach((card, index) => {
        if (discussions[index]) {
            const discussion = discussions[index];
            card.querySelector('.topic-tag').textContent = discussion.topic;
            card.querySelector('h4').textContent = discussion.title;
            card.querySelector('p').textContent = discussion.description;
            card.querySelector('.discussion-meta').innerHTML = `
                <span><i class="fas fa-comment"></i> ${discussion.replies} replies</span>
                <span><i class="fas fa-eye"></i> ${discussion.views} views</span>
            `;
        }
    });
}

// Initialize animations
function initializeAnimations() {
    // Animate elements on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    [...memberCards, ...discussionCards].forEach(card => {
        observer.observe(card);
    });
}

// Handle member connection
async function connectWithMember(memberId) {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/community/connect/${memberId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to connect with member');

        showToast('success', 'Connection request sent');
        updateConnectionButton(memberId);
    } catch (error) {
        console.error('Error connecting with member:', error);
        showToast('error', 'Failed to send connection request');
    }
}

// Handle joining discussion
async function joinDiscussion(discussionId) {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/community/discussions/${discussionId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to join discussion');

        showToast('success', 'Successfully joined discussion');
        window.location.href = `discussion.html?id=${discussionId}`;
    } catch (error) {
        console.error('Error joining discussion:', error);
        showToast('error', 'Failed to join discussion');
    }
}

// Utility functions
function animateNumber(element, target) {
    const duration = 2000;
    const steps = 60;
    const stepValue = target / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
        current += stepValue;
        element.textContent = Math.round(current) + (element.textContent.includes('+') ? '+' : '');
        
        step++;
        if (step >= steps) {
            element.textContent = target + (element.textContent.includes('+') ? '+' : '');
            clearInterval(interval);
        }
    }, duration / steps);
}

function updateConnectionButton(memberId) {
    const button = document.querySelector(`[data-member-id="${memberId}"]`);
    if (button) {
        button.textContent = 'Pending';
        button.disabled = true;
        button.classList.add('btn-secondary');
        button.classList.remove('btn-outline-primary');
    }
}

// Loading state management
function showLoadingState(elements) {
    elements.forEach(element => {
        element.classList.add('loading');
    });
}

function hideLoadingState(elements) {
    elements.forEach(element => {
        element.classList.remove('loading');
    });
}

// Event listeners
connectButtons.forEach(button => {
    button.addEventListener('click', () => {
        const memberId = button.dataset.memberId;
        connectWithMember(memberId);
    });
});

joinDiscussionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const discussionId = button.closest('.discussion-card').dataset.discussionId;
        joinDiscussion(discussionId);
    });
}); 