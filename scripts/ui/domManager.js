// ============================================
// DOM MANAGER MODULE
// ============================================

export class DOMManager {
    constructor() {
        this.elements = {};
        this.initElements();
    }

    initElements() {
        this.elements.dobInput = document.getElementById('dobInput');
        this.elements.dobField = document.getElementById('dob');
        this.elements.saveDob = document.getElementById('saveDob');
        this.elements.errorMsg = document.getElementById('errorMsg');
        this.elements.ageDisplay = document.getElementById('ageDisplay');
        this.elements.ageWhole = document.getElementById('ageWhole');
        this.elements.ageDecimal = document.getElementById('ageDecimal');
        this.elements.menuBtn = document.getElementById('menuBtn');
        this.elements.menuDropdown = document.getElementById('menuDropdown');
        this.elements.themeToggleMenu = document.getElementById('themeToggleMenu');
        this.elements.settingsBtnMenu = document.getElementById('settingsBtnMenu');
        this.elements.themeIcon = document.getElementById('themeIcon');
        this.elements.settingsModal = document.getElementById('settingsModal');
        this.elements.closeSettings = document.getElementById('closeSettings');
        this.elements.statsPanel = document.getElementById('statsPanel');
        this.elements.milestonePanel = document.getElementById('milestonePanel');
        this.elements.clockWidget = document.getElementById('clockWidget');
        this.elements.todoWidget = document.getElementById('todoWidget');
        this.elements.anniversariesWidget = document.getElementById('anniversariesWidget');
        this.elements.birthdayCountdown = document.getElementById('birthdayCountdown');
        this.elements.ageDuration = document.getElementById('ageDuration');
        this.elements.yearProgress = document.getElementById('yearProgress');
        this.elements.milestoneName = document.querySelector('.milestone-name');
        this.elements.milestoneCountdown = document.querySelector('.milestone-countdown');
        this.elements.currentTime = document.getElementById('currentTime');
        this.elements.currentDate = document.getElementById('currentDate');
        this.elements.timezone = document.getElementById('timezone');
        this.elements.todoList = document.getElementById('todoList');
        this.elements.todoInput = document.getElementById('todoInput');
        this.elements.addTodoBtn = document.getElementById('addTodoBtn');
        this.elements.toggleTodoBtn = document.getElementById('toggleTodoBtn');
        this.elements.todoContent = document.getElementById('todoContent');
        this.elements.starfield = document.getElementById('starfield');
        this.elements.loader = document.getElementById('loader');
        this.elements.birthdayCelebration = document.getElementById('birthdayCelebration');
        this.elements.closeCelebration = document.getElementById('closeCelebration');
        this.elements.milestoneCelebration = document.getElementById('milestoneCelebration');
        this.elements.closeMilestoneCelebration = document.getElementById('closeMilestoneCelebration');
        this.elements.milestoneTitle = document.getElementById('milestoneTitle');
        this.elements.milestoneMessage = document.getElementById('milestoneMessage');
        this.elements.crashLogsModal = document.getElementById('crashLogsModal');
        this.elements.milestoneHistoryModal = document.getElementById('milestoneHistoryModal');
        
        // Settings checkboxes
        this.elements.showStats = document.getElementById('showStats');
        this.elements.showMilestones = document.getElementById('showMilestones');
        this.elements.showClock = document.getElementById('showClock');
        this.elements.showTodo = document.getElementById('showTodo');
        this.elements.showAnniversaries = document.getElementById('showAnniversaries');
        this.elements.showAnimation = document.getElementById('showAnimation');
        
        this.validateElements();
    }

    validateElements() {
        const essentialElements = ['dobInput', 'dobField', 'saveDob', 'errorMsg', 'ageDisplay', 'ageWhole', 'ageDecimal', 'menuBtn', 'menuDropdown', 'settingsModal'];
        const missing = essentialElements.filter(key => !this.elements[key]);
        if (missing.length > 0) {
            console.warn('Missing DOM elements:', missing);
        }
    }

    // Reinitialize all elements - useful after DOM changes or for lazy initialization
    reinitialize() {
        this.initElements();
    }

    get(key) {
        return this.elements[key] || null;
    }

    has(key) {
        return !!this.elements[key];
    }

    setText(key, value) {
        const element = this.get(key);
        if (element) element.textContent = value;
    }

    setHTML(key, html) {
        const element = this.get(key);
        if (element) element.innerHTML = html;
    }

    show(key, displayStyle = 'block') {
        const element = this.get(key);
        if (element) element.style.display = displayStyle;
    }

    hide(key) {
        const element = this.get(key);
        if (element) element.style.display = 'none';
    }

    toggle(key) {
        const element = this.get(key);
        if (element) {
            const isHidden = element.style.display === 'none';
            element.style.display = isHidden ? 'block' : 'none';
            return isHidden;
        }
        return false;
    }

    addClass(key, className) {
        const element = this.get(key);
        if (element) element.classList.add(className);
    }

    removeClass(key, className) {
        const element = this.get(key);
        if (element) element.classList.remove(className);
    }

    toggleClass(key, className) {
        const element = this.get(key);
        if (element) element.classList.toggle(className);
    }

    setAttribute(key, attr, value) {
        const element = this.get(key);
        if (element) element.setAttribute(attr, value);
    }

    hideLoader() {
        const loader = this.get('loader');
        if (loader) {
            document.body.classList.remove('loading');
            loader.classList.add('hidden');
        }
    }

    showLoader() {
        const loader = this.get('loader');
        if (loader) {
            document.body.classList.add('loading');
            loader.classList.remove('hidden');
        }
    }
}

export const dom = new DOMManager();
