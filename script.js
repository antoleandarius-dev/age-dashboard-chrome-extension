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

// ============================================
// CONSTANTS
// ============================================
const MILLISECONDS_IN_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const MILLISECONDS_IN_HOUR = 60 * 60 * 1000;
const UPDATE_INTERVAL = 100; // Update every 100ms

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
chrome.storage.local.get(["dob", "settings", "todos", "anniversaries", "milestoneHistory", "celebratedMilestones"], (data) => {
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
    setTimeout(hideLoader, 300);
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
        clearError();
        showAgeSection(selectedDate);
    });
};

// Change DOB from settings
document.getElementById("changeDobSettings").onclick = () => {
    if (confirm("Are you sure you want to change your date of birth? This will reload the page.")) {
        chrome.storage.local.remove("dob", () => {
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

function showAgeSection(dob) {
    userDob = dob;
    dobInput.style.display = "none";
    ageDisplay.style.display = "block";
    
    updateAge(dob);
    updateStats(dob);
    checkBirthday(dob);
    
    setInterval(() => {
        updateAge(dob);
        updateStats(dob);
        checkMilestones(dob);
    }, UPDATE_INTERVAL);
    
    setInterval(() => updateClock(), 1000);
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
    
    document.getElementById("ageWhole").textContent = wholePart;
    document.getElementById("ageDecimal").textContent = '.' + decimalPart;
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
    
    document.getElementById("birthdayCountdown").textContent = `${daysUntil}d ${hoursUntil}h`;
    
    // Days since last birthday (age duration)
    const daysSinceBirthday = getDaysSinceLastBirthday(dob);
    document.getElementById("ageDuration").textContent = daysSinceBirthday.toLocaleString();
    
    // Year progress
    const yearProgress = getYearProgress(dob);
    document.getElementById("yearProgress").textContent = `${yearProgress}%`;
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

function checkMilestones(dob) {
    if (!settings.showMilestones) return;
    
    const now = new Date();
    const ageInMs = now - dob;
    const daysLived = Math.floor(ageInMs / MILLISECONDS_IN_DAY);
    const hoursLived = Math.floor(ageInMs / MILLISECONDS_IN_HOUR);
    const secondsLived = Math.floor(ageInMs / 1000);
    
    for (const milestone of MILESTONES) {
        const milestoneKey = `${milestone.name}`;
        
        let reached = false;
        if (milestone.unit === 'days' && daysLived >= milestone.value) reached = true;
        if (milestone.unit === 'hours' && hoursLived >= milestone.value) reached = true;
        if (milestone.unit === 'seconds' && secondsLived >= milestone.value) reached = true;
        
        if (reached && !celebratedMilestones.has(milestoneKey)) {
            celebratedMilestones.add(milestoneKey);
            saveCelebratedMilestones();
            
            milestoneHistory.unshift({
                name: milestone.name,
                date: new Date().toISOString(),
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
    
    for (const milestone of MILESTONES) {
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
    
    if (nextMilestone) {
        document.querySelector(".milestone-name").textContent = nextMilestone.name;
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
        document.querySelector(".milestone-countdown").textContent = remainingText;
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

document.getElementById("viewMilestonesBtn").onclick = () => {
    showMilestoneHistory();
};

function showMilestoneHistory() {
    const modal = document.getElementById("milestoneHistoryModal");
    const list = document.getElementById("milestoneHistoryList");
    
    if (milestoneHistory.length === 0) {
        list.innerHTML = '<p style="text-align: center; opacity: 0.7;">No milestones reached yet. Keep going!</p>';
    } else {
        list.innerHTML = milestoneHistory.map(m => `
            <div class="milestone-history-item">
                <h4>${m.name}</h4>
                <p>${new Date(m.date).toLocaleDateString()} at ${new Date(m.date).toLocaleTimeString()}</p>
            </div>
        `).join('');
    }
    
    modal.classList.add('active');
};

document.getElementById("closeMilestoneHistory").onclick = () => {
    document.getElementById("milestoneHistoryModal").classList.remove('active');
};

function saveMilestoneHistory() {
    chrome.storage.local.set({ milestoneHistory: milestoneHistory.slice(0, 50) });
}

function saveCelebratedMilestones() {
    chrome.storage.local.set({ celebratedMilestones: Array.from(celebratedMilestones) });
}

// ============================================
// CONFETTI ANIMATION
// ============================================
function startConfetti(canvasId) {
    const canvas = document.getElementById(canvasId);
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
        }
    }
    
    draw();
    
    setTimeout(() => {
        if (animationId) cancelAnimationFrame(animationId);
    }, 5000);
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
    
    document.getElementById("currentTime").textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("currentDate").textContent = now.toLocaleDateString('en-US', options);
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -now.getTimezoneOffset() / 60;
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
    document.getElementById("timezone").textContent = `${timezone} (GMT${offsetStr})`;
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
    chrome.storage.local.set({ todos });
}

// ============================================
// ANNIVERSARY TRACKER (Settings Only)
// ============================================
function renderAnniversaries() {
    // Only render in settings modal now
    renderSettingsAnniversaries();
}

function saveAnniversaries() {
    chrome.storage.local.set({ anniversaries });
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
        window.starfieldRunning = false;
    }
    
    if (userDob) {
        updateStats(userDob);
        renderTodoList();
        renderAnniversaries();
    }
    
    document.body.className = settings.theme === 'light' ? 'light-theme' : '';
}

function saveSettings() {
    chrome.storage.local.set({ settings });
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

function initStarfield() {
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
        if (!settings.showAnimation) return;
        
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
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Initialize starfield if enabled
if (settings.showAnimation) {
    initStarfield();
}
