// ============================================
// INITIALIZATION GUARD
// ============================================
// Prevent multiple script executions
if (window.ageDashboardInitialized) {
    const error = new Error('Duplicate initialization attempt - script loaded multiple times');
    console.warn('Age Dashboard already initialized, skipping duplicate initialization');
    if (window.ErrorHandler) {
        window.ErrorHandler.logCrash(error, 'Initialization Guard');
        window.ErrorHandler.emergencyCleanup();
    }
    throw error;
}
window.ageDashboardInitialized = true;

// ============================================
// DOM ELEMENTS
// ============================================
const dobInput = document.getElementById("dobInput");
const ageDisplay = document.getElementById("ageDisplay");
const dobField = document.getElementById("dob");
const saveDob = document.getElementById("saveDob");
const errorMsg = document.getElementById("errorMsg");

// Menu
const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");
const themeToggleMenu = document.getElementById("themeToggleMenu");
const settingsBtnMenu = document.getElementById("settingsBtnMenu");
const themeIcon = document.getElementById("themeIcon");

// Settings
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");

// Widgets
const statsPanel = document.getElementById("statsPanel");
const milestonePanel = document.getElementById("milestonePanel");
const clockWidget = document.getElementById("clockWidget");
const todoWidget = document.getElementById("todoWidget");

// Cached DOM elements for frequent updates (performance optimization)
let cachedDOMElements = null;

function initCachedDOMElements() {
    cachedDOMElements = {
        ageWhole: document.getElementById("ageWhole"),
        ageDecimal: document.getElementById("ageDecimal"),
        birthdayCountdown: document.getElementById("birthdayCountdown"),
        ageDuration: document.getElementById("ageDuration"),
        yearProgress: document.getElementById("yearProgress"),
        milestoneName: document.querySelector(".milestone-name"),
        milestoneCountdown: document.querySelector(".milestone-countdown"),
        currentTime: document.getElementById("currentTime"),
        currentDate: document.getElementById("currentDate"),
        timezone: document.getElementById("timezone")
    };
    
    // Validate that all elements exist to prevent null reference errors
    const missingElements = Object.entries(cachedDOMElements)
        .filter(([key, el]) => el === null)
        .map(([key]) => key);
    
    if (missingElements.length > 0) {
        console.warn('Warning: Missing DOM elements:', missingElements, 'App may not function properly.');
    }
}

// ============================================
// CONSTANTS
// ============================================
const MILLISECONDS_IN_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const MILLISECONDS_IN_HOUR = 60 * 60 * 1000;
const UPDATE_INTERVAL = 300; // Update every 300ms (optimized from 100ms for 67% CPU reduction)

// ============================================
// SETTINGS & STORAGE
// ============================================
let settings = {
    showStats: false,
    showMilestones: false,
    showClock: false,
    showTodo: false,
    showAnniversaries: false,
    showAnimation: true,
    theme: 'dark'
};

let todos = [];
let anniversaries = [];
let milestoneHistory = [];
let celebratedMilestones = new Set();

// Storage optimization: Debounce timers for batching storage operations
let storageDebounceTimers = {
    todos: null,
    anniversaries: null,
    settings: null,
    milestoneHistory: null,
    celebratedMilestones: null
};

// ============================================
// LOADER MANAGEMENT
// ============================================
document.body.classList.add('loading');

function hideLoader() {
    const loader = document.getElementById('loader');
    document.body.classList.remove('loading');
    loader.classList.add('hidden');
}

// ============================================
// CHROME EXTENSION API CHECK
// ============================================
if (typeof chrome === 'undefined' || !chrome.storage) {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: white;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Extension Not Loaded</h1>
            <p style="font-size: 1.2rem; margin-bottom: 1rem;">This extension must be loaded through Chrome Extensions.</p>
            <p style="font-size: 1rem; opacity: 0.9;">Please follow these steps:</p>
            <ol style="text-align: left; display: inline-block; margin-top: 1rem; font-size: 1rem;">
                <li>Open <strong>chrome://extensions/</strong></li>
                <li>Enable <strong>Developer mode</strong> (top-right toggle)</li>
                <li>Click <strong>"Load unpacked"</strong></li>
                <li>Select the extension folder</li>
                <li>Open a <strong>new tab</strong></li>
            </ol>
        </div>
    `;
    throw new Error('Chrome Extension API not available. Please load this as a Chrome extension.');
}

// ============================================
// INITIALIZATION
// ============================================
// Initialize tracking sets early for cleanup
window.trackedTimeouts = window.trackedTimeouts || new Set();
window.confettiAnimations = window.confettiAnimations || new Set();

let initializationComplete = false;

// Timeout fallback to prevent infinite loader
const initTimeout = setTimeout(() => {
    if (!initializationComplete) {
        console.error('Chrome storage initialization timed out');
        dobInput.style.display = "block";
        hideLoader();
    }
}, 5000); // 5 second timeout

// Track timeout for cleanup
window.trackedTimeouts.add(initTimeout);

chrome.storage.local.get(["dob", "settings", "todos", "anniversaries", "milestoneHistory", "celebratedMilestones"], (data) => {
    initializationComplete = true;
    clearTimeout(initTimeout);

    // Check for Chrome runtime errors
    if (chrome.runtime.lastError) {
        console.error('Chrome storage error:', chrome.runtime.lastError);
        dobInput.style.display = "block";
        hideLoader();
        return;
    }

    if (data.settings) {
        settings = { ...settings, ...data.settings };
        applySettings();
    }

    if (data.todos) {
        todos = data.todos;
    }

    if (data.anniversaries) {
        anniversaries = data.anniversaries;
    }

    if (data.milestoneHistory) {
        milestoneHistory = data.milestoneHistory;
    }

    if (data.celebratedMilestones) {
        celebratedMilestones = new Set(data.celebratedMilestones);
    }

    if (data.dob) {
        const storedDob = new Date(data.dob);
        if (!isNaN(storedDob.getTime())) {
            showAgeSection(storedDob);
        } else {
            dobInput.style.display = "block";
        }
    } else {
        dobInput.style.display = "block";
    }

    // Hide loader after initialization
    const loaderTimeout = setTimeout(hideLoader, 300);
    if (window.trackedTimeouts) {
        window.trackedTimeouts.add(loaderTimeout);
    }
});

// ============================================
// DOB HANDLING
// ============================================
saveDob.onclick = () => {
    const dobValue = dobField.value;
    
    if (!dobValue) {
        showError("Please select a date of birth.");
        return;
    }
    
    const selectedDate = new Date(dobValue);
    const now = new Date();
    
    if (isNaN(selectedDate.getTime())) {
        showError("Invalid date. Please try again.");
        return;
    }
    
    if (selectedDate > now) {
        showError("Date of birth cannot be in the future.");
        return;
    }
    
    const maxAgeYears = 150;
    const minDate = new Date(now.getFullYear() - maxAgeYears, now.getMonth(), now.getDate());
    if (selectedDate < minDate) {
        showError("Please enter a valid date of birth.");
        return;
    }
    
        chrome.storage.local.set({ dob: dobValue }, () => {
        if (chrome.runtime.lastError) {
            showError("Failed to save date of birth. Please try again.");
            console.error('Failed to save DOB:', chrome.runtime.lastError);
            return;
        }
        clearError();
        showAgeSection(selectedDate);
    });
};

// Change DOB from settings
document.getElementById("changeDobSettings").onclick = () => {
    if (confirm("Are you sure you want to change your date of birth? This will reload the page.")) {
        chrome.storage.local.remove("dob", () => {
            if (chrome.runtime.lastError) {
                alert("Failed to remove date of birth. Please try again.");
                console.error('Failed to remove DOB:', chrome.runtime.lastError);
                return;
            }
            location.reload();
        });
    }
};

dobField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        saveDob.click();
    }
});

function showError(message) {
    errorMsg.textContent = message;
}

function clearError() {
    errorMsg.textContent = "";
}

// ============================================
// AGE DISPLAY
// ============================================
let userDob = null;
// Initialize interval tracking on window object for error handler access
window.ageUpdateInterval = null;
window.clockUpdateInterval = null;

function showAgeSection(dob) {
    userDob = dob;
    dobInput.style.display = "none";
    ageDisplay.style.display = "block";

    // Initialize cached DOM elements for performance
    initCachedDOMElements();

    updateAge(dob);
    updateStats(dob);
    checkBirthday(dob);
    
    // Recalculate any existing milestone dates to fix incorrect historical dates
    recalculateMilestoneDates(dob);

    // Clear any existing intervals before creating new ones
    if (window.ageUpdateInterval) {
        clearInterval(window.ageUpdateInterval);
        window.ageUpdateInterval = null;
    }
    if (window.clockUpdateInterval) {
        clearInterval(window.clockUpdateInterval);
        window.clockUpdateInterval = null;
    }

    // Create new intervals
    window.ageUpdateInterval = setInterval(() => {
        updateAge(dob);
        updateStats(dob);
        checkMilestones(dob);
    }, UPDATE_INTERVAL);

    window.clockUpdateInterval = setInterval(() => updateClock(), 1000);
    updateClock();

    renderTodoList();
    renderAnniversaries();
    checkBirthday(dob);
}

function updateAge(dob) {
    const now = new Date();
    const ageInMilliseconds = now - dob;
    const ageInYears = ageInMilliseconds / MILLISECONDS_IN_YEAR;
    
    // Split age into whole and decimal parts
    const ageString = ageInYears.toFixed(9);
    const [wholePart, decimalPart] = ageString.split('.');
    
    // Use cached DOM elements for better performance (with null safety)
    if (cachedDOMElements && cachedDOMElements.ageWhole && cachedDOMElements.ageDecimal) {
        cachedDOMElements.ageWhole.textContent = wholePart;
        cachedDOMElements.ageDecimal.textContent = '.' + decimalPart;
    }
}

// ============================================
// STATISTICS PANEL
// ============================================
function updateStats(dob) {
    if (!settings.showStats) return;
    
    const now = new Date();
    const ageInMs = now - dob;
    
    const daysLived = Math.floor(ageInMs / MILLISECONDS_IN_DAY);
    const hoursLived = Math.floor(ageInMs / MILLISECONDS_IN_HOUR);
    
    // document.getElementById("daysLived").textContent = daysLived.toLocaleString();
    // document.getElementById("hoursLived").textContent = hoursLived.toLocaleString();
    
    // Birthday countdown
    const nextBirthday = getNextBirthday(dob);
    const timeUntilBirthday = nextBirthday - now;
    const daysUntil = Math.floor(timeUntilBirthday / MILLISECONDS_IN_DAY);
    const hoursUntil = Math.floor((timeUntilBirthday % MILLISECONDS_IN_DAY) / MILLISECONDS_IN_HOUR);
    
    // Use cached DOM elements for better performance (with null safety)
    if (cachedDOMElements && cachedDOMElements.birthdayCountdown && cachedDOMElements.ageDuration && cachedDOMElements.yearProgress) {
        cachedDOMElements.birthdayCountdown.textContent = `${daysUntil}d ${hoursUntil}h`;
        
        // Days since last birthday (age duration)
        const daysSinceBirthday = getDaysSinceLastBirthday(dob);
        cachedDOMElements.ageDuration.textContent = daysSinceBirthday.toLocaleString();
        
        // Year progress
        const yearProgress = getYearProgress(dob);
        cachedDOMElements.yearProgress.textContent = `${yearProgress}%`;
    }
    // document.getElementById("yearProgressBar").style.width = `${yearProgress}%`;
}

function getNextBirthday(dob) {
    const now = new Date();
    const thisYearBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    
    if (thisYearBirthday > now) {
        return thisYearBirthday;
    } else {
        return new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
    }
}

function getDaysSinceLastBirthday(dob) {
    const now = new Date();
    const lastBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    
    // If birthday hasn't happened this year yet, go back a year
    if (lastBirthday > now) {
        lastBirthday.setFullYear(now.getFullYear() - 1);
    }
    
    const daysSince = Math.floor((now - lastBirthday) / MILLISECONDS_IN_DAY);
    return daysSince;
}

function getYearProgress(dob) {
    const daysSince = getDaysSinceLastBirthday(dob);
    const percentage = (daysSince / 365.25) * 100;
    return Math.min(percentage, 100).toFixed(1);
}

// ============================================
// BIRTHDAY CELEBRATION
// ============================================
let birthdayCelebrated = false;

function checkBirthday(dob) {
    const now = new Date();
    const isBirthday = now.getDate() === dob.getDate() && now.getMonth() === dob.getMonth();
    
    if (isBirthday && !birthdayCelebrated) {
        showBirthdayCelebration();
        birthdayCelebrated = true;
    } else if (!isBirthday) {
        birthdayCelebrated = false;
    }
}

function showBirthdayCelebration() {
    const celebration = document.getElementById("birthdayCelebration");
    celebration.style.display = "flex";
    startConfetti("confettiCanvas");
    
    document.getElementById("closeCelebration").onclick = () => {
        celebration.style.display = "none";
    };
}

// ============================================
// MILESTONE SYSTEM
// ============================================
const MILESTONES = [
    { name: "1,000 Days", value: 1000, unit: 'days' },
    { name: "5,000 Days", value: 5000, unit: 'days' },
    { name: "10,000 Days", value: 10000, unit: 'days' },
    { name: "15,000 Days", value: 15000, unit: 'days' },
    { name: "20,000 Days", value: 20000, unit: 'days' },
    { name: "100,000 Hours", value: 100000, unit: 'hours' },
    { name: "250,000 Hours", value: 250000, unit: 'hours' },
    { name: "500,000 Hours", value: 500000, unit: 'hours' },
    { name: "1,000,000 Hours", value: 1000000, unit: 'hours' },
    { name: "1 Billion Seconds", value: 1000000000, unit: 'seconds' },
    { name: "2 Billion Seconds", value: 2000000000, unit: 'seconds' }
];

// Calculate the exact date when a milestone was reached
function calculateMilestoneDate(dob, value, unit) {
    let millisecondsToAdd = 0;
    
    if (unit === 'days') {
        millisecondsToAdd = value * MILLISECONDS_IN_DAY;
    } else if (unit === 'hours') {
        millisecondsToAdd = value * MILLISECONDS_IN_HOUR;
    } else if (unit === 'seconds') {
        millisecondsToAdd = value * 1000;
    }
    
    return new Date(dob.getTime() + millisecondsToAdd);
}

function checkMilestones(dob) {
    if (!settings.showMilestones) return;
    
    const now = new Date();
    const ageInMs = now - dob;
    const daysLived = Math.floor(ageInMs / MILLISECONDS_IN_DAY);
    const hoursLived = Math.floor(ageInMs / MILLISECONDS_IN_HOUR);
    const secondsLived = Math.floor(ageInMs / 1000);
    
    // Optimization: Only check milestones that haven't been celebrated yet
    const uncelebratedMilestones = MILESTONES.filter(m => !celebratedMilestones.has(m.name));
    
    for (const milestone of uncelebratedMilestones) {
        const milestoneKey = `${milestone.name}`;
        
        let reached = false;
        if (milestone.unit === 'days' && daysLived >= milestone.value) reached = true;
        if (milestone.unit === 'hours' && hoursLived >= milestone.value) reached = true;
        if (milestone.unit === 'seconds' && secondsLived >= milestone.value) reached = true;
        
        if (reached) {
            celebratedMilestones.add(milestoneKey);
            saveCelebratedMilestones();
            
            // Calculate the exact date when this milestone was reached
            const milestoneDate = calculateMilestoneDate(dob, milestone.value, milestone.unit);
            
            milestoneHistory.unshift({
                name: milestone.name,
                date: milestoneDate.toISOString(),
                value: milestone.value,
                unit: milestone.unit
            });
            saveMilestoneHistory();
            
            showMilestoneCelebration(milestone.name);
        }
    }
    
    updateNextMilestone(daysLived, hoursLived, secondsLived);
}

function updateNextMilestone(daysLived, hoursLived, secondsLived) {
    let nextMilestone = null;
    let smallestDiff = Infinity;
    
    // Optimization: Only check uncelebrated milestones
    const uncelebratedMilestones = MILESTONES.filter(m => !celebratedMilestones.has(m.name));
    
    for (const milestone of uncelebratedMilestones) {
        let current = 0;
        if (milestone.unit === 'days') current = daysLived;
        if (milestone.unit === 'hours') current = hoursLived;
        if (milestone.unit === 'seconds') current = secondsLived;
        
        if (current < milestone.value) {
            const diff = milestone.value - current;
            if (diff < smallestDiff) {
                smallestDiff = diff;
                nextMilestone = { ...milestone, remaining: diff };
            }
        }
    }
    
    // Use cached DOM elements for better performance (with null safety)
    if (nextMilestone && cachedDOMElements && cachedDOMElements.milestoneName && cachedDOMElements.milestoneCountdown) {
        cachedDOMElements.milestoneName.textContent = nextMilestone.name;
        let remainingText = "";
        if (nextMilestone.unit === 'days') {
            remainingText = `${nextMilestone.remaining.toLocaleString()} days to go`;
        } else if (nextMilestone.unit === 'hours') {
            const days = Math.floor(nextMilestone.remaining / 24);
            remainingText = `${days.toLocaleString()} days to go`;
        } else {
            const days = Math.floor(nextMilestone.remaining / (24 * 3600));
            remainingText = `${days.toLocaleString()} days to go`;
        }
        cachedDOMElements.milestoneCountdown.textContent = remainingText;
    }
}

function showMilestoneCelebration(milestoneName) {
    const celebration = document.getElementById("milestoneCelebration");
    document.getElementById("milestoneTitle").textContent = `🎯 ${milestoneName} Reached!`;
    document.getElementById("milestoneMessage").textContent = `Congratulations on this amazing milestone!`;
    celebration.style.display = "flex";
    startConfetti("milestoneConfettiCanvas");
    
    document.getElementById("closeMilestoneCelebration").onclick = () => {
        celebration.style.display = "none";
    };
}

// Format date with ordinal suffix (1st, 2nd, 3rd, etc.)
function formatOrdinalDate(date) {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';
    
    return `${day}${suffix} of ${month} ${year}`;
}

// Recalculate all milestone dates based on DOB (fixes incorrect historical dates)
function recalculateMilestoneDates(dob) {
    if (!dob || milestoneHistory.length === 0) return;
    
    let updated = false;
    milestoneHistory = milestoneHistory.map(m => {
        // Recalculate the correct date for this milestone
        const correctDate = calculateMilestoneDate(dob, m.value, m.unit);
        if (m.date !== correctDate.toISOString()) {
            updated = true;
            return { ...m, date: correctDate.toISOString() };
        }
        return m;
    });
    
    if (updated) {
        saveMilestoneHistory();
        console.log('Milestone dates recalculated and corrected');
    }
}

document.getElementById("viewMilestonesBtn").onclick = () => {
    showMilestoneHistory();
};

function showMilestoneHistory() {
    const modal = document.getElementById("milestoneHistoryModal");
    const list = document.getElementById("milestoneHistoryList");
    
    if (!userDob) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.7;">No date of birth set. Please set your age first.</p>';
        modal.classList.add('active');
        return;
    }
    
    // Sort reached milestones by date (most recent first)
    const sortedReachedHistory = [...milestoneHistory].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Calculate upcoming milestones
    const now = new Date();
    const ageInMs = now - userDob;
    const daysLived = Math.floor(ageInMs / MILLISECONDS_IN_DAY);
    const hoursLived = Math.floor(ageInMs / MILLISECONDS_IN_HOUR);
    const secondsLived = Math.floor(ageInMs / 1000);
    
    const upcomingMilestones = MILESTONES
        .filter(m => !celebratedMilestones.has(m.name))
        .map(milestone => {
            let current = 0;
            if (milestone.unit === 'days') current = daysLived;
            if (milestone.unit === 'hours') current = hoursLived;
            if (milestone.unit === 'seconds') current = secondsLived;
            
            if (current < milestone.value) {
                const remaining = milestone.value - current;
                let remainingDaysDisplay = 0;
                
                if (milestone.unit === 'days') {
                    remainingDaysDisplay = remaining;
                } else if (milestone.unit === 'hours') {
                    remainingDaysDisplay = Math.floor(remaining / 24);
                } else {
                    remainingDaysDisplay = Math.floor(remaining / (24 * 3600));
                }
                
                return {
                    ...milestone,
                    remaining: remainingDaysDisplay,
                    remainingFormatted: remainingDaysDisplay.toLocaleString()
                };
            }
            return null;
        })
        .filter(m => m !== null)
        .sort((a, b) => a.remaining - b.remaining); // Sort by soonest first
    
    // Build HTML with sections
    let html = '';
    
    // Reached Milestones Section
    if (sortedReachedHistory.length > 0) {
        html += '<div style="margin-bottom: 2rem;">';
        html += '<h3 style="margin-bottom: 1rem; opacity: 0.8; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">🏆 Milestones Reached</h3>';
        html += sortedReachedHistory.map(m => `
            <div class="milestone-history-item" style="margin-bottom: 0.75rem;">
                <h4 style="margin-bottom: 0.25rem;">${m.name}</h4>
                <p style="opacity: 0.7; font-size: 0.9rem;">${formatOrdinalDate(new Date(m.date))}</p>
            </div>
        `).join('');
        html += '</div>';
    }
    
    // Upcoming Milestones Section
    if (upcomingMilestones.length > 0) {
        html += '<div>';
        html += '<h3 style="margin-bottom: 1rem; opacity: 0.8; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">🎯 Upcoming Milestones</h3>';
        html += upcomingMilestones.map(m => `
            <div class="milestone-history-item" style="margin-bottom: 0.75rem; opacity: 0.85;">
                <h4 style="margin-bottom: 0.25rem;">Next: ${m.name}</h4>
                <p style="opacity: 0.7; font-size: 0.9rem;">${m.remainingFormatted} days to go</p>
            </div>
        `).join('');
        html += '</div>';
    }
    
    // No milestones at all
    if (sortedReachedHistory.length === 0 && upcomingMilestones.length === 0) {
        html = '<p style="text-align: center; opacity: 0.7;">Loading milestones...</p>';
    }
    
    list.innerHTML = html;
    modal.classList.add('active');
};

document.getElementById("closeMilestoneHistory").onclick = () => {
    document.getElementById("milestoneHistoryModal").classList.remove('active');
};

function saveMilestoneHistory() {
    // Debounce storage operations to batch rapid changes
    if (storageDebounceTimers.milestoneHistory) {
        clearTimeout(storageDebounceTimers.milestoneHistory);
    }
    
    storageDebounceTimers.milestoneHistory = setTimeout(() => {
        chrome.storage.local.set({ milestoneHistory: milestoneHistory.slice(0, 50) }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save milestone history:', chrome.runtime.lastError);
            }
            storageDebounceTimers.milestoneHistory = null;
        });
    }, 300);
}

function saveCelebratedMilestones() {
    // Debounce storage operations to batch rapid changes
    if (storageDebounceTimers.celebratedMilestones) {
        clearTimeout(storageDebounceTimers.celebratedMilestones);
    }
    
    storageDebounceTimers.celebratedMilestones = setTimeout(() => {
        chrome.storage.local.set({ celebratedMilestones: Array.from(celebratedMilestones) }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save celebrated milestones:', chrome.runtime.lastError);
            }
            storageDebounceTimers.celebratedMilestones = null;
        });
    }, 300);
}

// ============================================
// CONFETTI ANIMATION
// ============================================
function startConfetti(canvasId) {
    // Cancel any existing confetti animations to prevent memory leaks
    if (window.confettiAnimations && window.confettiAnimations.size > 0) {
        window.confettiAnimations.forEach(animId => cancelAnimationFrame(animId));
        window.confettiAnimations.clear();
    }
    
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas element not found:', canvasId);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confetti = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8'];
    
    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 10,
            tiltAngleIncremental: Math.random() * 0.07 + 0.05,
            tiltAngle: 0
        });
    }
    
    let animationId;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach((c, i) => {
            ctx.beginPath();
            ctx.lineWidth = c.r / 2;
            ctx.strokeStyle = c.color;
            ctx.moveTo(c.x + c.tilt + c.r, c.y);
            ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r);
            ctx.stroke();
            
            c.tiltAngle += c.tiltAngleIncremental;
            c.y += (Math.cos(c.d) + 3 + c.r / 2) / 2;
            c.x += Math.sin(c.d);
            c.tilt = Math.sin(c.tiltAngle - i / 3) * 15;
            
            if (c.y > canvas.height) {
                confetti.splice(i, 1);
            }
        });
        
        if (confetti.length > 0) {
            animationId = requestAnimationFrame(draw);
            // Track animation ID for cleanup
            if (window.confettiAnimations) {
                window.confettiAnimations.add(animationId);
            }
        } else {
            // Animation complete, remove from tracking
            if (animationId && window.confettiAnimations) {
                window.confettiAnimations.delete(animationId);
            }
        }
    }
    
    draw();
    
    // Cleanup after 5 seconds
    const timeoutId = setTimeout(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            if (window.confettiAnimations) {
                window.confettiAnimations.delete(animationId);
            }
        }
    }, 5000);
    
    // Track timeout for cleanup
    if (window.trackedTimeouts) {
        window.trackedTimeouts.add(timeoutId);
    }
}

// ============================================
// CLOCK WIDGET
// ============================================
function updateClock() {
    if (!settings.showClock) return;
    
    const now = new Date();
    
    // 12-hour format
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Use cached DOM elements for better performance (with null safety)
    if (cachedDOMElements && cachedDOMElements.currentTime && cachedDOMElements.currentDate && cachedDOMElements.timezone) {
        cachedDOMElements.currentTime.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        cachedDOMElements.currentDate.textContent = now.toLocaleDateString('en-US', options);
        
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const offset = -now.getTimezoneOffset() / 60;
        const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
        cachedDOMElements.timezone.textContent = `${timezone} (GMT${offsetStr})`;
    }
}

// ============================================
// TODO LIST WIDGET
// ============================================
document.getElementById("toggleTodoBtn").onclick = () => {
    const content = document.getElementById("todoContent");
    const btn = document.getElementById("toggleTodoBtn");
    if (content.style.display === "none") {
        content.style.display = "block";
        btn.textContent = "−";
    } else {
        content.style.display = "none";
        btn.textContent = "+";
    }
};

document.getElementById("addTodoBtn").onclick = () => {
    const input = document.getElementById("todoInput");
    const text = input.value.trim();
    
    if (text) {
        todos.push({ id: Date.now(), text, completed: false });
        saveTodos();
        renderTodoList();
        input.value = "";
    }
};

document.getElementById("todoInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        document.getElementById("addTodoBtn").click();
    }
});

function renderTodoList() {
    if (!settings.showTodo) return;
    
    const list = document.getElementById("todoList");
    
    if (todos.length === 0) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 1rem;">No tasks yet. Add one above!</p>';
        return;
    }
    
    list.innerHTML = todos.map(todo => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <span class="todo-text">${todo.text}</span>
            <div class="todo-actions">
                <button onclick="toggleTodo(${todo.id})">${todo.completed ? '↩' : '✓'}</button>
                <button onclick="deleteTodo(${todo.id})">🗑</button>
            </div>
        </li>
    `).join('');
}

window.toggleTodo = (id) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodoList();
    }
};

window.deleteTodo = (id) => {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodoList();
};

function saveTodos() {
    // Debounce storage operations to batch rapid changes
    if (storageDebounceTimers.todos) {
        clearTimeout(storageDebounceTimers.todos);
    }
    
    storageDebounceTimers.todos = setTimeout(() => {
        chrome.storage.local.set({ todos }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save todos:', chrome.runtime.lastError);
            }
            storageDebounceTimers.todos = null;
        });
    }, 300);
}

// ============================================
// ANNIVERSARY TRACKER (Settings Only)
// ============================================
function renderAnniversaries() {
    // Only render in settings modal now
    renderSettingsAnniversaries();
}

function saveAnniversaries() {
    // Debounce storage operations to batch rapid changes
    if (storageDebounceTimers.anniversaries) {
        clearTimeout(storageDebounceTimers.anniversaries);
    }
    
    storageDebounceTimers.anniversaries = setTimeout(() => {
        chrome.storage.local.set({ anniversaries }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save anniversaries:', chrome.runtime.lastError);
            }
            storageDebounceTimers.anniversaries = null;
        });
    }, 300);
}

// ============================================
// MENU MANAGEMENT
// ============================================
menuBtn.onclick = () => {
    menuDropdown.classList.toggle('active');
    menuBtn.classList.toggle('active');
};

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
        menuDropdown.classList.remove('active');
        menuBtn.classList.remove('active');
    }
});

// ============================================
// SETTINGS MANAGEMENT
// ============================================
settingsBtnMenu.onclick = () => {
    settingsModal.classList.add('active');
    updateSettingsUI();
    menuDropdown.classList.remove('active');
    menuBtn.classList.remove('active');
};

closeSettings.onclick = () => {
    settingsModal.classList.remove('active');
};

settingsModal.onclick = (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
};

function updateSettingsUI() {
    document.getElementById("showStats").checked = settings.showStats;
    document.getElementById("showMilestones").checked = settings.showMilestones;
    document.getElementById("showClock").checked = settings.showClock;
    document.getElementById("showTodo").checked = settings.showTodo;
    document.getElementById("showAnniversaries").checked = settings.showAnniversaries;
    document.getElementById("showAnimation").checked = settings.showAnimation;
    
    // Render anniversaries in settings
    renderSettingsAnniversaries();
}

// Settings Anniversary Management
document.getElementById("settingsAddAnniversaryBtn").onclick = () => {
    const labelInput = document.getElementById("settingsAnniversaryLabel");
    const dateInput = document.getElementById("settingsAnniversaryDate");
    
    const label = labelInput.value.trim();
    const date = dateInput.value;
    
    if (label && date) {
        anniversaries.push({ id: Date.now(), label, date });
        saveAnniversaries();
        renderAnniversaries();
        renderSettingsAnniversaries();
        labelInput.value = "";
        dateInput.value = "";
    }
};

function renderSettingsAnniversaries() {
    const list = document.getElementById("settingsAnniversaryList");
    
    if (anniversaries.length === 0) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 1rem; font-size: 0.9rem;">No anniversaries added yet.</p>';
        return;
    }
    
    list.innerHTML = anniversaries.map(ann => {
        const annDate = new Date(ann.date);
        return `
            <div class="settings-anniversary-item" data-id="${ann.id}">
                <div class="settings-anniversary-info">
                    <div class="settings-anniversary-name">${ann.label}</div>
                    <div class="settings-anniversary-date">${annDate.toLocaleDateString()}</div>
                </div>
                <button class="settings-anniversary-delete" data-id="${ann.id}">Delete</button>
            </div>
        `;
    }).join('');
}

// Event delegation for settings anniversary delete buttons
document.getElementById("settingsAnniversaryList").addEventListener('click', (e) => {
    if (e.target.classList.contains('settings-anniversary-delete')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        if (confirm('Delete this anniversary?')) {
            anniversaries = anniversaries.filter(a => a.id !== id);
            saveAnniversaries();
            renderAnniversaries();
            renderSettingsAnniversaries();
        }
    }
});

['showStats', 'showMilestones', 'showClock', 'showTodo', 'showAnniversaries', 'showAnimation'].forEach(settingKey => {
    document.getElementById(settingKey).onchange = (e) => {
        settings[settingKey] = e.target.checked;
        saveSettings();
        applySettings();
    };
});

function applySettings() {
    statsPanel.style.display = settings.showStats ? 'block' : 'none';
    milestonePanel.style.display = settings.showMilestones ? 'block' : 'none';
    clockWidget.style.display = settings.showClock ? 'block' : 'none';
    todoWidget.style.display = settings.showTodo ? 'block' : 'none';

    const starfield = document.getElementById("starfield");
    starfield.style.display = settings.showAnimation ? 'block' : 'none';

    if (settings.showAnimation && !window.starfieldRunning) {
        initStarfield();
    } else if (!settings.showAnimation && window.starfieldRunning) {
        stopStarfield();
    }

    if (userDob) {
        updateStats(userDob);
        renderTodoList();
        renderAnniversaries();
    }

    document.body.className = settings.theme === 'light' ? 'light-theme' : '';
}

function saveSettings() {
    // Debounce storage operations to batch rapid changes
    if (storageDebounceTimers.settings) {
        clearTimeout(storageDebounceTimers.settings);
    }
    
    storageDebounceTimers.settings = setTimeout(() => {
        chrome.storage.local.set({ settings }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save settings:', chrome.runtime.lastError);
                alert('Failed to save settings. Please try again.');
            }
            storageDebounceTimers.settings = null;
        });
    }, 300);
}

// ============================================
// THEME TOGGLE
// ============================================
themeToggleMenu.onclick = () => {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    themeIcon.textContent = settings.theme === 'dark' ? '🌙' : '☀️';
    saveSettings();
    applySettings();
    menuDropdown.classList.remove('active');
    menuBtn.classList.remove('active');
};

// Set initial theme icon
themeIcon.textContent = settings.theme === 'dark' ? '🌙' : '☀️';

// ============================================
// STARFIELD ANIMATION
// ============================================
window.starfieldRunning = false;
window.starfieldAnimationId = null;
window.starfieldResizeHandler = null;

function initStarfield() {
    // Prevent multiple initializations
    if (window.starfieldRunning) {
        return;
    }

    window.starfieldRunning = true;
    const canvas = document.getElementById("starfield");
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];
    const starCount = 300;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create stars with angle-based positioning (radiating from center)
    for (let i = 0; i < starCount; i++) {
        const angle = Math.random() * Math.PI * 2; // Random direction
        const distance = Math.random() * 1000; // Distance from center

        stars.push({
            angle: angle,
            distance: distance,
            speed: Math.random() * 2 + 1,
            size: Math.random() * 1.5 + 0.5,
            initialDistance: distance
        });
    }

    function animate() {
        if (!settings.showAnimation || !window.starfieldRunning) {
            window.starfieldRunning = false;
            if (window.starfieldAnimationId) {
                cancelAnimationFrame(window.starfieldAnimationId);
                window.starfieldAnimationId = null;
            }
            return;
        }

        // Clear with slight trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        stars.forEach(star => {
            // Move star outward from center
            star.distance += star.speed;

            // Reset star if it goes off screen
            const maxDistance = Math.max(canvas.width, canvas.height);
            if (star.distance > maxDistance * 1.5) {
                star.distance = 0;
                star.angle = Math.random() * Math.PI * 2;
            }

            // Calculate position based on angle and distance from center
            const x = centerX + Math.cos(star.angle) * star.distance;
            const y = centerY + Math.sin(star.angle) * star.distance;

            // Calculate size and opacity based on distance
            const progress = star.distance / (maxDistance * 1.5);
            const size = star.size * (0.5 + progress * 2);
            const opacity = Math.min(1, progress * 2) * (1 - progress * 0.5);

            // Draw star
            if (opacity > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();

                // Add a subtle glow for stars further away
                if (progress > 0.3) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.1})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        window.starfieldAnimationId = requestAnimationFrame(animate);
    }

    animate();

    // Remove old resize handler if exists
    if (window.starfieldResizeHandler) {
        window.removeEventListener('resize', window.starfieldResizeHandler);
        window.starfieldResizeHandler = null;
    }

    // Handle window resize with new handler
    window.starfieldResizeHandler = () => {
        if (canvas && window.starfieldRunning) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    };
    window.addEventListener('resize', window.starfieldResizeHandler);
}

function stopStarfield() {
    window.starfieldRunning = false;
    if (window.starfieldAnimationId) {
        cancelAnimationFrame(window.starfieldAnimationId);
        window.starfieldAnimationId = null;
    }
    if (window.starfieldResizeHandler) {
        window.removeEventListener('resize', window.starfieldResizeHandler);
        window.starfieldResizeHandler = null;
    }
}

// Make stopStarfield globally accessible for error handler
window.stopStarfield = stopStarfield;

// Initialize starfield if enabled
if (settings.showAnimation) {
    initStarfield();
}

// ============================================
// CRASH LOGS VIEWER
// ============================================
document.getElementById("viewCrashLogsBtn").onclick = () => {
    showCrashLogs();
};

document.getElementById("closeCrashLogs").onclick = () => {
    document.getElementById("crashLogsModal").classList.remove('active');
};

document.getElementById("clearCrashLogsBtn").onclick = () => {
    if (confirm('Are you sure you want to clear all crash logs?')) {
        if (window.ErrorHandler) {
            window.ErrorHandler.clearCrashLogs(() => {
                showCrashLogs(); // Refresh the view
            });
        }
    }
};

// Click outside to close
document.getElementById("crashLogsModal").onclick = (e) => {
    if (e.target.id === "crashLogsModal") {
        document.getElementById("crashLogsModal").classList.remove('active');
    }
};

function showCrashLogs() {
    const modal = document.getElementById("crashLogsModal");
    const list = document.getElementById("crashLogsList");

    if (window.ErrorHandler) {
        window.ErrorHandler.getCrashLogs((logs) => {
            if (logs.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; padding: 3rem; opacity: 0.7;">
                        <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">✅ No crashes detected</p>
                        <p style="font-size: 0.9rem;">Your extension is running smoothly!</p>
                    </div>
                `;
            } else {
                list.innerHTML = logs.map((log, index) => {
                    const date = new Date(log.timestamp);
                    const timeAgo = getTimeAgo(date);

                    return `
                        <div class="crash-log-item" style="
                            background: rgba(255, 255, 255, 0.05);
                            border-left: 3px solid ${index === 0 ? '#ff6b6b' : '#4ecdc4'};
                            padding: 1rem;
                            margin-bottom: 1rem;
                            border-radius: 0.5rem;
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                <div>
                                    <span style="font-weight: 600; color: #ff6b6b;">Error</span>
                                    <span style="opacity: 0.5; margin-left: 0.5rem;">•</span>
                                    <span style="opacity: 0.7; margin-left: 0.5rem; font-size: 0.9rem;">${log.context}</span>
                                </div>
                                <span style="opacity: 0.5; font-size: 0.85rem;">${timeAgo}</span>
                            </div>
                            <div style="margin-bottom: 0.5rem;">
                                <strong style="color: #f9ca24;">Message:</strong>
                                <p style="margin: 0.25rem 0; font-family: monospace; font-size: 0.9rem; opacity: 0.9;">${escapeHtml(log.message)}</p>
                            </div>
                            <details style="margin-top: 0.5rem;">
                                <summary style="cursor: pointer; opacity: 0.7; font-size: 0.85rem; user-select: none;">
                                    Stack Trace
                                </summary>
                                <pre style="
                                    margin-top: 0.5rem;
                                    padding: 0.75rem;
                                    background: rgba(0, 0, 0, 0.3);
                                    border-radius: 0.25rem;
                                    font-size: 0.75rem;
                                    overflow-x: auto;
                                    opacity: 0.8;
                                    line-height: 1.4;
                                ">${escapeHtml(log.stack)}</pre>
                            </details>
                            <div style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.5;">
                                ${date.toLocaleString()}
                            </div>
                        </div>
                    `;
                }).join('');
            }

            modal.classList.add('active');
        });
    } else {
        list.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 2rem;">Error handler not available</p>';
        modal.classList.add('active');
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
