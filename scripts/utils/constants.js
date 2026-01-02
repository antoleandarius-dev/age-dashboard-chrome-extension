// ============================================
// CONSTANTS MODULE
// ============================================

export const MILLISECONDS = {
    YEAR: 365.25 * 24 * 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    HOUR: 60 * 60 * 1000,
    SECOND: 1000
};

export const UPDATE_INTERVALS = {
    AGE_UPDATE: 300,
    CLOCK_UPDATE: 1000,
    STORAGE_DEBOUNCE: 300
};

export const MAX_AGES = {
    MAX_AGE_YEARS: 150,
    MAX_CRASH_LOGS: 50,
    MAX_MILESTONE_HISTORY: 50
};

export const STORAGE_KEYS = {
    DOB: 'dob',
    SETTINGS: 'settings',
    TODOS: 'todos',
    ANNIVERSARIES: 'anniversaries',
    MILESTONE_HISTORY: 'milestoneHistory',
    CELEBRATED_MILESTONES: 'celebratedMilestones',
    CRASH_LOGS: 'crashLogs'
};

export const DEFAULT_SETTINGS = {
    showStats: false,
    showMilestones: false,
    showClock: false,
    showTodo: false,
    showAnniversaries: false,
    showAnimation: true,
    theme: 'dark'
};

export const MILESTONES = [
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

export const CONFETTI_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8'];

export const UI_CONFIG = {
    INITIALIZATION_TIMEOUT: 5000,
    LOADER_HIDE_DELAY: 300,
    CRASH_LOOP_WINDOW: 60000,
    MAX_CRASHES_IN_WINDOW: 5
};

export const ERRORS = {
    INVALID_DOB: 'Invalid date. Please try again.',
    FUTURE_DOB: 'Date of birth cannot be in the future.',
    INVALID_AGE_RANGE: 'Please enter a valid date of birth.',
    NO_DOB_SELECTED: 'Please select a date of birth.',
    SAVE_FAILED: 'Failed to save date of birth. Please try again.',
    EXTENSION_NOT_LOADED: 'Chrome Extension API not available. Please load this as a Chrome extension.'
};
