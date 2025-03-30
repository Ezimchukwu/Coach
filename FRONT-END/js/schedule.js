// DOM Elements
const calendarGrid = document.getElementById('calendarGrid');
const currentWeekElement = document.getElementById('currentWeek');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');
const upcomingSessionsElement = document.getElementById('upcomingSessions');
const coachesListElement = document.getElementById('coachesList');
const scheduleModal = new bootstrap.Modal(document.getElementById('scheduleModal'));
const scheduleForm = document.getElementById('scheduleForm');
const confirmScheduleBtn = document.getElementById('confirmSchedule');

// State
let currentDate = new Date();
let selectedSlot = null;
let selectedCoach = null;

// Initialize schedule page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const session = checkSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        await Promise.all([
            loadCalendar(),
            loadUpcomingSessions(),
            loadCoaches()
        ]);

        // Add event listeners
        prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
        nextWeekBtn.addEventListener('click', () => navigateWeek(1));
        confirmScheduleBtn.addEventListener('click', handleScheduleSubmit);
    } catch (error) {
        console.error('Error initializing schedule:', error);
        showToast('error', 'Failed to initialize schedule');
    }
});

// Calendar functions
async function loadCalendar() {
    try {
        updateCurrentWeekDisplay();
        const slots = await fetchAvailableSlots();
        renderCalendar(slots);
    } catch (error) {
        console.error('Error loading calendar:', error);
        showToast('error', 'Failed to load calendar');
    }
}

function updateCurrentWeekDisplay() {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    currentWeekElement.textContent = `Week of ${formatDate(startOfWeek, 'long')}`;
}

function navigateWeek(direction) {
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    loadCalendar();
}

async function fetchAvailableSlots() {
    const session = checkSession();
    if (!session) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/schedule/slots`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch slots');

        const { slots } = await response.json();
        return slots;
    } catch (error) {
        console.error('Error fetching slots:', error);
        return [];
    }
}

function renderCalendar(slots) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    let calendarHTML = '';
    
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        
        const daySlots = slots.filter(slot => 
            new Date(slot.time).toDateString() === currentDay.toDateString()
        );

        calendarHTML += `
            <div class="calendar-day">
                <div class="day-header">${formatDate(currentDay)}</div>
                <div class="day-slots">
                    ${renderTimeSlots(daySlots)}
                </div>
            </div>
        `;
    }

    calendarGrid.innerHTML = calendarHTML;

    // Add click event listeners to time slots
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('click', () => handleTimeSlotClick(slot));
    });
}

function renderTimeSlots(slots) {
    if (!slots.length) {
        return `<div class="text-center text-muted">No available slots</div>`;
    }

    return slots.map(slot => `
        <div class="time-slot ${slot.available ? 'available' : 'booked'}"
             data-time="${slot.time}"
             ${slot.available ? '' : 'disabled'}>
            ${formatTime(new Date(slot.time))}
        </div>
    `).join('');
}

// Session management
async function loadUpcomingSessions() {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/sessions/upcoming`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load sessions');

        const { sessions } = await response.json();
        renderUpcomingSessions(sessions);
    } catch (error) {
        console.error('Error loading upcoming sessions:', error);
        showToast('error', 'Failed to load upcoming sessions');
    }
}

function renderUpcomingSessions(sessions) {
    if (!sessions.length) {
        upcomingSessionsElement.innerHTML = `
            <div class="text-center p-4">
                <p class="text-muted mb-0">No upcoming sessions</p>
            </div>
        `;
        return;
    }

    upcomingSessionsElement.innerHTML = sessions.map(session => `
        <div class="session-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="session-time">${formatDate(session.startTime)}</div>
                    <h6 class="mb-1">${session.topic}</h6>
                    <p class="mb-0 text-muted">
                        <i class="fas fa-user-tie me-2"></i>${session.coach.name}
                        <br>
                        <i class="fas fa-clock me-2"></i>${session.duration} minutes
                    </p>
                </div>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="joinSession('${session._id}')">
                        Join
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelSession('${session._id}')">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Coach management
async function loadCoaches() {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/coaches`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load coaches');

        const { coaches } = await response.json();
        renderCoaches(coaches);
    } catch (error) {
        console.error('Error loading coaches:', error);
        showToast('error', 'Failed to load coaches');
    }
}

function renderCoaches(coaches) {
    if (!coaches.length) {
        coachesListElement.innerHTML = `
            <div class="text-center p-4">
                <p class="text-muted mb-0">No coaches available</p>
            </div>
        `;
        return;
    }

    coachesListElement.innerHTML = coaches.map(coach => `
        <div class="coach-item">
            <div class="d-flex align-items-center">
                <img src="${coach.photo || '/images/default-avatar.png'}" 
                     class="rounded-circle me-3" 
                     width="50" height="50" 
                     alt="${coach.name}">
                <div>
                    <h6 class="mb-1">${coach.name}</h6>
                    <p class="mb-2 text-muted">${coach.specialties.join(', ')}</p>
                    <div class="d-flex align-items-center">
                        <div class="coach-rating me-2">
                            ${renderRating(coach.rating)}
                        </div>
                        <button class="btn btn-sm btn-primary" onclick="selectCoach('${coach._id}', '${coach.name}')">
                            Select
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Event handlers
function handleTimeSlotClick(slotElement) {
    if (slotElement.classList.contains('booked')) return;

    // Remove previous selection
    document.querySelectorAll('.time-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });

    // Add selection to clicked slot
    slotElement.classList.add('selected');
    selectedSlot = slotElement.dataset.time;

    if (selectedCoach) {
        showScheduleModal();
    } else {
        showToast('info', 'Please select a coach first');
    }
}

function selectCoach(coachId, coachName) {
    selectedCoach = coachId;
    document.getElementById('selectedCoach').value = coachName;
    document.getElementById('selectedCoachId').value = coachId;

    if (selectedSlot) {
        showScheduleModal();
    }
}

function showScheduleModal() {
    document.getElementById('selectedTime').value = formatDate(new Date(selectedSlot));
    scheduleModal.show();
}

async function handleScheduleSubmit() {
    try {
        const session = checkSession();
        if (!session) return;

        const formData = {
            coachId: document.getElementById('selectedCoachId').value,
            startTime: selectedSlot,
            topic: document.getElementById('sessionTopic').value,
            duration: document.getElementById('sessionDuration').value,
            notes: document.getElementById('sessionNotes').value
        };

        const response = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to schedule session');

        showToast('success', 'Session scheduled successfully');
        scheduleModal.hide();
        
        // Reset form and selections
        scheduleForm.reset();
        selectedSlot = null;
        selectedCoach = null;

        // Reload calendar and sessions
        await Promise.all([
            loadCalendar(),
            loadUpcomingSessions()
        ]);
    } catch (error) {
        console.error('Error scheduling session:', error);
        showToast('error', 'Failed to schedule session');
    }
}

// Utility functions
function formatDate(date, format = 'short') {
    if (format === 'long') {
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    }).format(date);
}

function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    }).format(date);
}

function renderRating(rating) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(`<i class="fas fa-star${i <= rating ? ' text-warning' : ' text-muted'}"></i>`);
    }
    return stars.join('');
}

// Session actions
async function joinSession(sessionId) {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to join session');

        showToast('success', 'Joining session...');
        // Here you would typically redirect to the video conference
    } catch (error) {
        console.error('Error joining session:', error);
        showToast('error', 'Failed to join session');
    }
}

async function cancelSession(sessionId) {
    try {
        const session = checkSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (!response.ok) throw new Error('Failed to cancel session');

        showToast('success', 'Session cancelled successfully');
        await loadUpcomingSessions();
    } catch (error) {
        console.error('Error cancelling session:', error);
        showToast('error', 'Failed to cancel session');
    }
} 