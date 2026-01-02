// ============================================
// AGE DASHBOARD - MODULAR ENTRY POINT
// ============================================

import { storage } from './modules/storage.js';
import { settings } from './modules/settingsManager.js';
import { AgeCalculator } from './modules/ageCalculator.js';
import { MilestoneSystem } from './modules/milestoneSystem.js';
import { TodoManager } from './modules/todoManager.js';
import { animationManager } from './modules/animationManager.js';
import { dom } from './ui/domManager.js';

import { STORAGE_KEYS, UPDATE_INTERVALS, UI_CONFIG, ERRORS, MILESTONES } from './utils/constants.js';
import { isBirthday, formatCountdown, validateDateOfBirth } from './utils/dateUtils.js';
import { formatTime, formatDate, getTimezoneInfo } from './utils/helpers.js';

// ============================================
// APPLICATION STATE
// ============================================
let ageCalculator = null;
let milestoneSystem = null;
let todoManager = null;
let userDob = null;
let birthdayCelebrated = false;
let ageUpdateInterval = null;
let clockUpdateInterval = null;
let starfieldControl = null;

// ============================================
// INITIALIZATION GUARD
// ============================================
if (window.appInitialized) {
    const error = new Error('Duplicate initialization attempt');
    console.warn('App already initialized, skipping duplicate initialization');
    if (window.ErrorHandler) {
        window.ErrorHandler.logCrash(error, 'Initialization Guard');
        window.ErrorHandler.emergencyCleanup();
    }
    throw error;
}
window.appInitialized = true;

// Track resources
window.trackedTimeouts = window.trackedTimeouts || new Set();
window.confettiAnimations = window.confettiAnimations || new Set();

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
    throw new Error(ERRORS.EXTENSION_NOT_LOADED);
}

// ============================================
// MAIN INITIALIZATION
// ============================================
async function initializeApp() {
    try {
        // Reinitialize DOM manager to ensure all elements are found
        dom.reinitialize();
        
        dom.showLoader();
        await storage.initialize();
        await settings.initialize();
        settings.applySettings();

        setupDOBHandler();
        setupMenuHandlers();
        setupThemeToggle();

        const data = await storage.get(STORAGE_KEYS.DOB);
        
        if (data[STORAGE_KEYS.DOB]) {
            const storedDob = new Date(data[STORAGE_KEYS.DOB]);
            const validation = validateDateOfBirth(storedDob);
            
            if (validation.isValid) {
                await showAgeSection(storedDob);
            } else {
                showDOBInput();
            }
        } else {
            showDOBInput();
        }

        const loaderTimeout = setTimeout(() => dom.hideLoader(), UI_CONFIG.LOADER_HIDE_DELAY);
        window.trackedTimeouts.add(loaderTimeout);

    } catch (error) {
        console.error('Initialization error:', error);
        if (window.ErrorHandler) {
            window.ErrorHandler.logCrash(error, 'App Initialization');
        }
        showDOBInput();
        dom.hideLoader();
    }
}

// ============================================
// DOB INPUT HANDLING
// ============================================
function setupDOBHandler() {
    const saveDob = dom.get('saveDob');
    const dobField = dom.get('dobField');

    if (saveDob) {
        saveDob.onclick = handleSaveDOB;
    }

    if (dobField) {
        dobField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveDob?.click();
            }
        });
    }

    // Change DOB from settings
    const changeDobBtn = document.getElementById('changeDobSettings');
    if (changeDobBtn) {
        changeDobBtn.onclick = () => {
            if (confirm('Are you sure you want to change your date of birth? This will reload the page.')) {
                storage.remove(STORAGE_KEYS.DOB).then(() => location.reload());
            }
        };
    }
}

async function handleSaveDOB() {
    const dobField = dom.get('dobField');
    const dobValue = dobField?.value;

    if (!dobValue) {
        showError(ERRORS.NO_DOB_SELECTED);
        return;
    }

    const selectedDate = new Date(dobValue);
    const validation = validateDateOfBirth(selectedDate);

    if (!validation.isValid) {
        showError(validation.error || ERRORS.INVALID_DOB);
        return;
    }

    try {
        await storage.set(STORAGE_KEYS.DOB, dobValue);
        clearError();
        await showAgeSection(selectedDate);
    } catch (error) {
        showError(ERRORS.SAVE_FAILED);
        if (window.ErrorHandler) {
            window.ErrorHandler.logCrash(error, 'Save DOB');
        }
    }
}

function showError(message) {
    const errorMsg = dom.get('errorMsg');
    if (errorMsg) {
        errorMsg.textContent = message;
    }
}

function clearError() {
    const errorMsg = dom.get('errorMsg');
    if (errorMsg) {
        errorMsg.textContent = '';
    }
}

function showDOBInput() {
    dom.show('dobInput', 'block');
    dom.hide('ageDisplay');
}

// ============================================
// AGE DISPLAY
// ============================================
async function showAgeSection(dob) {
    userDob = dob;
    dom.hide('dobInput');
    dom.show('ageDisplay', 'block');

    // Initialize calculators
    ageCalculator = new AgeCalculator(dob);
    milestoneSystem = new MilestoneSystem(ageCalculator);
    todoManager = new TodoManager();

    // Initialize modules
    await milestoneSystem.initialize();
    await todoManager.initialize();

    // Setup event listeners
    milestoneSystem.onEvent((event, data) => {
        if (event === 'milestone-reached') {
            showMilestoneCelebration(data.name);
        }
    });

    // Apply settings to show/hide widgets based on saved preferences
    settings.applySettings();

    // Initial updates
    updateAgeDisplay();
    updateStatsDisplay();
    checkBirthdayStatus();
    milestoneSystem.recalculateDates();

    // Render UI
    todoManager.render();
    setupTodoHandlers();
    setupSettingsHandlers();

    // Start intervals
    clearIntervals();
    ageUpdateInterval = setInterval(() => {
        updateAgeDisplay();
        updateStatsDisplay();
        checkMilestones();
    }, UPDATE_INTERVALS.AGE_UPDATE);

    clockUpdateInterval = setInterval(updateClockDisplay, UPDATE_INTERVALS.CLOCK_UPDATE);
    updateClockDisplay();

    window.ageUpdateInterval = ageUpdateInterval;
    window.clockUpdateInterval = clockUpdateInterval;

    // Setup starfield if enabled
    if (settings.getSetting('showAnimation')) {
        starfieldControl = animationManager.initStarfield('starfield');
        window.starfieldRunning = true;
    }
}

// ============================================
// AGE DISPLAY UPDATE
// ============================================
function updateAgeDisplay() {
    if (!ageCalculator) return;
    const breakdown = ageCalculator.getAgeBreakdown();
    dom.setText('ageWhole', breakdown.whole);
    dom.setText('ageDecimal', breakdown.decimal);
}

// ============================================
// STATISTICS DISPLAY
// ============================================
function updateStatsDisplay() {
    if (!ageCalculator || !settings.getSetting('showStats')) return;
    const stats = ageCalculator.getStatistics();
    dom.setText('birthdayCountdown', `${stats.daysUntilBirthday}d ${stats.hoursUntilBirthday}h`);
    dom.setText('ageDuration', stats.daysSinceBirthday.toLocaleString());
    dom.setText('yearProgress', `${stats.yearProgress}%`);
}

// ============================================
// MILESTONE CHECKING
// ============================================
function checkMilestones() {
    if (!milestoneSystem || !settings.getSetting('showMilestones')) return;
    milestoneSystem.checkMilestones();
    
    const next = milestoneSystem.getNextMilestone();
    if (next && dom.has('milestoneName') && dom.has('milestoneCountdown')) {
        dom.setText('milestoneName', next.name);
        dom.setText('milestoneCountdown', formatCountdown(next.remainingDays));
    }
}

function showMilestoneCelebration(milestoneName) {
    const celebration = dom.get('milestoneCelebration');
    if (celebration) {
        dom.setText('milestoneTitle', `🎯 ${milestoneName} Reached!`);
        dom.setText('milestoneMessage', 'Congratulations on this amazing milestone!');
        dom.show('milestoneCelebration', 'flex');

        const closeBtn = dom.get('closeMilestoneCelebration');
        if (closeBtn) {
            closeBtn.onclick = () => {
                dom.hide('milestoneCelebration');
            };
        }

        animationManager.startConfetti('milestoneConfettiCanvas');
    }
}

// ============================================
// BIRTHDAY CHECKING
// ============================================
function checkBirthdayStatus() {
    if (!userDob) return;
    const now = new Date();
    const isBirthdayToday = isBirthday(now, userDob);

    if (isBirthdayToday && !birthdayCelebrated) {
        showBirthdayCelebration();
        birthdayCelebrated = true;
    } else if (!isBirthdayToday) {
        birthdayCelebrated = false;
    }
}

function showBirthdayCelebration() {
    const celebration = dom.get('birthdayCelebration');
    if (celebration) {
        dom.show('birthdayCelebration', 'flex');
        const closeBtn = dom.get('closeCelebration');
        if (closeBtn) {
            closeBtn.onclick = () => {
                dom.hide('birthdayCelebration');
            };
        }
        animationManager.startConfetti('confettiCanvas');
    }
}

// ============================================
// CLOCK DISPLAY
// ============================================
function updateClockDisplay() {
    if (!settings.getSetting('showClock')) return;
    const now = new Date();
    dom.setText('currentTime', formatTime(now));
    dom.setText('currentDate', formatDate(now));
    const tzInfo = getTimezoneInfo();
    dom.setText('timezone', tzInfo.full);
}

// ============================================
// TODO HANDLERS
// ============================================
function setupTodoHandlers() {
    const toggleBtn = dom.get('toggleTodoBtn');
    const addBtn = dom.get('addTodoBtn');
    const input = dom.get('todoInput');
    const content = dom.get('todoContent');

    if (toggleBtn) {
        toggleBtn.onclick = () => {
            const isHidden = content?.style.display === 'none';
            if (content) content.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '−' : '+';
        };
    }

    if (addBtn) {
        addBtn.onclick = async () => {
            const text = input?.value.trim();
            if (text) {
                await todoManager.addTodo(text);
                todoManager.render();
                if (input) input.value = '';
            }
        };
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addBtn?.click();
            }
        });
    }

    const todoList = dom.get('todoList');
    if (todoList) {
        todoList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('todo-toggle')) {
                const id = parseInt(e.target.dataset.id);
                await todoManager.toggleTodo(id);
                todoManager.render();
            } else if (e.target.classList.contains('todo-delete')) {
                const id = parseInt(e.target.dataset.id);
                await todoManager.deleteTodo(id);
                todoManager.render();
            }
        });
    }
}

// ============================================
// MENU HANDLERS
// ============================================
function setupMenuHandlers() {
    const menuBtn = dom.get('menuBtn');
    const menuDropdown = dom.get('menuDropdown');
    const settingsBtn = dom.get('settingsBtnMenu');
    const settingsModal = dom.get('settingsModal');
    const closeSettings = dom.get('closeSettings');

    if (menuBtn) {
        menuBtn.onclick = () => {
            dom.toggleClass('menuDropdown', 'active');
            dom.toggleClass('menuBtn', 'active');
        };
    }

    document.addEventListener('click', (e) => {
        if (!menuBtn?.contains(e.target) && !menuDropdown?.contains(e.target)) {
            dom.removeClass('menuDropdown', 'active');
            dom.removeClass('menuBtn', 'active');
        }
    });

    if (settingsBtn) {
        settingsBtn.onclick = () => {
            updateSettingsUI();
            dom.addClass('settingsModal', 'active');
            dom.removeClass('menuDropdown', 'active');
            dom.removeClass('menuBtn', 'active');
        };
    }

    if (closeSettings) {
        closeSettings.onclick = () => {
            dom.removeClass('settingsModal', 'active');
        };
    }

    if (settingsModal) {
        settingsModal.onclick = (e) => {
            if (e.target === settingsModal) {
                dom.removeClass('settingsModal', 'active');
            }
        };
    }

    // Milestone history
    const viewMilestonesBtn = document.getElementById('viewMilestonesBtn');
    if (viewMilestonesBtn) {
        viewMilestonesBtn.onclick = showMilestoneHistory;
    }

    const closeMilestoneHistory = document.getElementById('closeMilestoneHistory');
    if (closeMilestoneHistory) {
        closeMilestoneHistory.onclick = () => {
            dom.removeClass('milestoneHistoryModal', 'active');
        };
    }

    // Crash logs
    const viewCrashLogsBtn = document.getElementById('viewCrashLogsBtn');
    if (viewCrashLogsBtn) {
        viewCrashLogsBtn.onclick = showCrashLogs;
    }

    const closeCrashLogs = document.getElementById('closeCrashLogs');
    if (closeCrashLogs) {
        closeCrashLogs.onclick = () => {
            dom.removeClass('crashLogsModal', 'active');
        };
    }
}

function showMilestoneHistory() {
    if (!milestoneSystem || !userDob) return;
    const modal = dom.get('milestoneHistoryModal');
    const list = document.getElementById('milestoneHistoryList');
    if (list) {
        list.innerHTML = milestoneSystem.getHistoryHTML();
        dom.addClass('milestoneHistoryModal', 'active');
    }
}

function showCrashLogs() {
    if (!window.ErrorHandler) return;
    const modal = dom.get('crashLogsModal');
    window.ErrorHandler.getCrashLogs((logs) => {
        const list = document.getElementById('crashLogsList');
        if (list) {
            if (logs.length === 0) {
                list.innerHTML = `<div style="text-align: center; padding: 3rem; opacity: 0.7;"><p style="font-size: 1.2rem; margin-bottom: 0.5rem;">✅ No crashes detected</p><p style="font-size: 0.9rem;">Your extension is running smoothly!</p></div>`;
            } else {
                list.innerHTML = logs.map((log, index) => {
                    const date = new Date(log.timestamp);
                    const timeAgo = getTimeAgoFromDate(date);
                    return `
                        <div class="crash-log-item" style="background: rgba(255, 255, 255, 0.05); border-left: 3px solid ${index === 0 ? '#ff6b6b' : '#4ecdc4'}; padding: 1rem; margin-bottom: 1rem; border-radius: 0.5rem;">
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
                                <summary style="cursor: pointer; opacity: 0.7; font-size: 0.85rem; user-select: none;">Stack Trace</summary>
                                <pre style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(0, 0, 0, 0.3); border-radius: 0.25rem; font-size: 0.75rem; overflow-x: auto; opacity: 0.8; line-height: 1.4;">${escapeHtml(log.stack)}</pre>
                            </details>
                            <div style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.5;">${date.toLocaleString()}</div>
                        </div>
                    `;
                }).join('');
            }
            dom.addClass('crashLogsModal', 'active');
        }
    });
}

function getTimeAgoFromDate(date) {
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

// ============================================
// SETTINGS HANDLERS
// ============================================
function setupSettingsHandlers() {
    const settingKeys = ['showStats', 'showMilestones', 'showClock', 'showTodo', 'showAnniversaries', 'showAnimation'];

    settingKeys.forEach(key => {
        const element = dom.get(key);
        
        if (!element) {
            console.warn(`Settings checkbox not found: ${key}`);
            return;
        }
        
        // Set initial checkbox state
        const currentValue = settings.getSetting(key);
        element.checked = currentValue;
        
        // Attach change listener
        element.onchange = async (e) => {
            const newValue = e.target.checked;
            console.log(`Setting changed: ${key} = ${newValue}`);
            
            // Save setting
            await settings.setSetting(key, newValue);
            
            // Apply all settings to UI
            settings.applySettings();

            // Handle animation-specific logic
            if (key === 'showAnimation') {
                if (newValue && !window.starfieldRunning) {
                    starfieldControl = animationManager.initStarfield('starfield');
                    window.starfieldRunning = true;
                } else if (!newValue && starfieldControl) {
                    starfieldControl.stop();
                    window.starfieldRunning = false;
                }
            }

            // Handle todo rendering
            if (key === 'showTodo' && todoManager) {
                if (newValue) {
                    todoManager.render();
                }
            }
            
            // Handle stats/milestone/clock updates
            if (key === 'showStats') {
                if (newValue) updateStatsDisplay();
            }
            if (key === 'showMilestones') {
                if (newValue) checkMilestones();
            }
            if (key === 'showClock') {
                if (newValue) updateClockDisplay();
            }
            if (key === 'showAnniversaries') {
                // anniversariesWidget will be shown/hidden by applySettings()
            }
        };
    });
}

function updateSettingsUI() {
    const settingKeys = ['showStats', 'showMilestones', 'showClock', 'showTodo', 'showAnniversaries', 'showAnimation'];
    
    settingKeys.forEach(key => {
        const element = dom.get(key);
        if (element) {
            const currentValue = settings.getSetting(key);
            element.checked = currentValue;
            console.log(`Synced checkbox ${key} to ${currentValue}`);
        } else {
            console.warn(`Checkbox element not found for: ${key}`);
        }
    });
    
    // Sync theme toggle if present
    const themeToggle = dom.get('themeToggleMenu');
    if (themeToggle) {
        themeToggle.innerHTML = (settings.getSetting('theme') === 'dark' ? '🌙' : '☀️') + ' <span>Toggle Theme</span>';
    }
}

// ============================================
// THEME TOGGLE
// ============================================
function setupThemeToggle() {
    const themeToggle = dom.get('themeToggleMenu');
    if (themeToggle) {
        themeToggle.onclick = async () => {
            const currentTheme = settings.getSetting('theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            await settings.setSetting('theme', newTheme);
            settings.applySettings();
            dom.removeClass('menuDropdown', 'active');
            dom.removeClass('menuBtn', 'active');
        };
    }
}

// ============================================
// CLEANUP
// ============================================
function clearIntervals() {
    if (ageUpdateInterval) {
        clearInterval(ageUpdateInterval);
        ageUpdateInterval = null;
    }
    if (clockUpdateInterval) {
        clearInterval(clockUpdateInterval);
        clockUpdateInterval = null;
    }
}

window.addEventListener('beforeunload', () => {
    clearIntervals();
    animationManager.stopAll();
    if (starfieldControl?.stop) {
        starfieldControl.stop();
    }
});

// Global cleanup function for error handler
window.appCleanup = () => {
    clearIntervals();
    animationManager.stopAll();
    if (starfieldControl?.stop) {
        starfieldControl.stop();
    }
};

// ============================================
// START APPLICATION
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
