// DOM Elements
const resourceGrid = document.getElementById('resourceGrid');
const filterButtons = document.querySelectorAll('.btn-filter');
const searchInput = document.querySelector('.search-box input');
const successStoryCards = document.querySelectorAll('.success-story-card');

// Initialize resources page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const session = checkSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        await Promise.all([
            loadResources(),
            initializeFilters(),
            initializeSearch(),
            initializeAnimations()
        ]);

    } catch (error) {
        console.error('Error initializing resources:', error);
        showToast('error', 'Failed to initialize resources page');
    }
});

// Load resources from API
async function loadResources() {
    try {
        const session = checkSession();
        if (!session) return;

        showLoadingState();

        const response = await fetch(`${API_BASE_URL}/resources`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load resources');

        const { resources } = await response.json();
        renderResources(resources);
        hideLoadingState();
    } catch (error) {
        console.error('Error loading resources:', error);
        showToast('error', 'Failed to load resources');
        hideLoadingState();
    }
}

// Render resources in the grid
function renderResources(resources) {
    resourceGrid.innerHTML = resources.map(resource => `
        <div class="col-md-4" data-category="${resource.category}">
            <div class="resource-card">
                <div class="resource-type">
                    <i class="fas ${getResourceIcon(resource.type)}"></i>
                    <span>${resource.type}</span>
                </div>
                <h3>${resource.title}</h3>
                <p>${resource.description}</p>
                <div class="resource-meta">
                    <span><i class="fas ${getMetricIcon(resource.type)}"></i> ${formatMetric(resource.metrics)}</span>
                    <span><i class="fas fa-star"></i> ${resource.rating}/5</span>
                </div>
                <a href="#" class="btn btn-primary" onclick="accessResource('${resource._id}')">${getActionText(resource.type)}</a>
            </div>
        </div>
    `).join('');
}

// Initialize filter functionality
function initializeFilters() {
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Filter resources
            filterResources(filter);
        });
    });
}

// Filter resources by category
function filterResources(category) {
    const resources = document.querySelectorAll('#resourceGrid > div');
    const searchTerm = searchInput.value.toLowerCase();

    resourceGrid.classList.add('filtering');

    resources.forEach(resource => {
        const resourceCategory = resource.dataset.category;
        const resourceTitle = resource.querySelector('h3').textContent.toLowerCase();
        const matchesCategory = category === 'all' || resourceCategory === category;
        const matchesSearch = resourceTitle.includes(searchTerm);

        resource.style.display = (matchesCategory && matchesSearch) ? 'block' : 'none';
    });

    setTimeout(() => {
        resourceGrid.classList.remove('filtering');
    }, 300);
}

// Initialize search functionality
function initializeSearch() {
    let searchTimeout;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const activeFilter = document.querySelector('.btn-filter.active').dataset.filter;
            filterResources(activeFilter);
        }, 300);
    });
}

// Initialize animations
function initializeAnimations() {
    // Animate resource cards on scroll
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

    document.querySelectorAll('.resource-card').forEach(card => {
        observer.observe(card);
    });

    // Animate metrics in success stories
    const metricsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateMetric(entry.target);
                metricsObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });

    document.querySelectorAll('.metric-value').forEach(metric => {
        metricsObserver.observe(metric);
    });
}

// Animate metrics with counting effect
function animateMetric(element) {
    const value = parseInt(element.textContent);
    const suffix = element.textContent.replace(/[0-9]/g, '');
    const duration = 2000;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
        current += stepValue;
        element.textContent = Math.round(current) + suffix;
        
        step++;
        if (step >= steps) {
            element.textContent = value + suffix;
            clearInterval(interval);
        }
    }, duration / steps);
}

// Handle resource access
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

        // Track resource access
        trackResourceAccess(resourceId);
    } catch (error) {
        console.error('Error accessing resource:', error);
        showToast('error', 'Failed to access resource');
    }
}

// Track resource access for analytics
async function trackResourceAccess(resourceId) {
    try {
        const session = checkSession();
        if (!session) return;

        await fetch(`${API_BASE_URL}/analytics/resource-access`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                resourceId,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Error tracking resource access:', error);
    }
}

// Utility functions
function getResourceIcon(type) {
    const icons = {
        'E-Book': 'fa-book',
        'Video': 'fa-video',
        'Template': 'fa-file-alt',
        'Podcast': 'fa-headphones',
        'Worksheet': 'fa-tasks',
        'Guide': 'fa-compass'
    };
    return icons[type] || 'fa-file';
}

function getMetricIcon(type) {
    const icons = {
        'E-Book': 'fa-download',
        'Video': 'fa-eye',
        'Template': 'fa-download',
        'Podcast': 'fa-play',
        'Worksheet': 'fa-download',
        'Guide': 'fa-download'
    };
    return icons[type] || 'fa-chart-bar';
}

function formatMetric(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
}

function getActionText(type) {
    const actions = {
        'E-Book': 'Download Now',
        'Video': 'Watch Now',
        'Template': 'Download Template',
        'Podcast': 'Listen Now',
        'Worksheet': 'Download',
        'Guide': 'Read Now'
    };
    return actions[type] || 'Access Now';
}

// Loading state management
function showLoadingState() {
    resourceGrid.innerHTML = Array(6).fill(0).map(() => `
        <div class="col-md-4">
            <div class="resource-card loading">
                <div class="resource-type">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading...</span>
                </div>
                <h3>Loading...</h3>
                <p>Please wait while we load the resources...</p>
            </div>
        </div>
    `).join('');
}

function hideLoadingState() {
    document.querySelectorAll('.resource-card.loading').forEach(card => {
        card.classList.remove('loading');
    });
} 