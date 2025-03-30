// DOM Elements
const programCards = document.querySelectorAll('.program-card');
const successStoryCards = document.querySelectorAll('.success-story-card');
const benefitCards = document.querySelectorAll('.benefit-card');

// Initialize courses page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const session = checkSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        await Promise.all([
            loadUserProgress(),
            loadProgramDetails(),
            initializeAnimations()
        ]);

    } catch (error) {
        console.error('Error initializing courses:', error);
        showToast('error', 'Failed to initialize courses page');
    }
});

// Load user's progress in programs
async function loadUserProgress() {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/users/progress`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load progress');

        const { progress } = await response.json();
        updateProgressIndicators(progress);
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Update progress indicators on program cards
function updateProgressIndicators(progress) {
    programCards.forEach(card => {
        const programId = card.dataset.programId;
        const programProgress = progress.find(p => p.programId === programId);
        
        if (programProgress) {
            const progressElement = card.querySelector('.progress-indicator');
            if (progressElement) {
                progressElement.style.width = `${programProgress.percentage}%`;
            }
        }
    });
}

// Load detailed program information
async function loadProgramDetails() {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/programs/details`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load program details');

        const { programs } = await response.json();
        updateProgramDetails(programs);
    } catch (error) {
        console.error('Error loading program details:', error);
    }
}

// Update program cards with detailed information
function updateProgramDetails(programs) {
    programCards.forEach(card => {
        const programId = card.dataset.programId;
        const program = programs.find(p => p._id === programId);
        
        if (program) {
            const statsElement = card.querySelector('.program-stats');
            if (statsElement) {
                statsElement.innerHTML = `
                    <span><i class="fas fa-users"></i> ${program.enrolledCount}+ Enrolled</span>
                    <span><i class="fas fa-star"></i> ${program.rating}/5</span>
                `;
            }
        }
    });
}

// Initialize animations and interactions
function initializeAnimations() {
    // Animate program cards on scroll
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

    [...programCards, ...successStoryCards, ...benefitCards].forEach(card => {
        observer.observe(card);
    });

    // Add hover effects
    programCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}

// Handle program enrollment
async function enrollInProgram(programId) {
    try {
        const session = checkSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/programs/${programId}/enroll`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to enroll in program');

        showToast('success', 'Successfully enrolled in program');
        await loadUserProgress(); // Refresh progress indicators
    } catch (error) {
        console.error('Error enrolling in program:', error);
        showToast('error', 'Failed to enroll in program');
    }
}

// Handle success story interactions
function initializeSuccessStories() {
    successStoryCards.forEach(card => {
        const metricsElements = card.querySelectorAll('.metric-value');
        
        // Animate metrics when they come into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateMetric(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5
        });

        metricsElements.forEach(metric => observer.observe(metric));
    });
}

// Animate metrics with counting effect
function animateMetric(element) {
    const value = parseInt(element.textContent);
    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
        current += stepValue;
        element.textContent = Math.round(current) + (element.dataset.suffix || '%');
        
        step++;
        if (step >= steps) {
            element.textContent = value + (element.dataset.suffix || '%');
            clearInterval(interval);
        }
    }, duration / steps);
}

// Handle program sharing
function shareProgram(programId, programName) {
    if (navigator.share) {
        navigator.share({
            title: `Check out ${programName} on CoachPro Elite`,
            text: `I found this amazing coaching program: ${programName}`,
            url: `${window.location.origin}/programs/${programId}`
        }).catch(console.error);
    } else {
        // Fallback for browsers that don't support Web Share API
        const url = `${window.location.origin}/programs/${programId}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('success', 'Program link copied to clipboard');
        }).catch(() => {
            showToast('error', 'Failed to copy program link');
        });
    }
}

// Initialize success stories when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSuccessStories); 