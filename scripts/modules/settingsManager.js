// ============================================
// SETTINGS MANAGER MODULE
// ============================================

import { storage } from './storage.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../utils/constants.js';
import { dom } from '../ui/domManager.js';

export class SettingsManager {
    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.listeners = new Set();
    }

    async initialize() {
        const data = await storage.get(STORAGE_KEYS.SETTINGS);
        if (data[STORAGE_KEYS.SETTINGS]) {
            this.settings = { ...this.settings, ...data[STORAGE_KEYS.SETTINGS] };
        }
        return this.settings;
    }

    getSetting(key) {
        return this.settings[key];
    }

    getAllSettings() {
        return { ...this.settings };
    }

    async setSetting(key, value) {
        this.settings[key] = value;
        await storage.set(STORAGE_KEYS.SETTINGS, this.settings);
        this.notifyListeners(key, value);
    }

    async updateSettings(updates) {
        this.settings = { ...this.settings, ...updates };
        await storage.set(STORAGE_KEYS.SETTINGS, this.settings);
        Object.entries(updates).forEach(([key, value]) => {
            this.notifyListeners(key, value);
        });
    }

    async resetToDefaults() {
        this.settings = { ...DEFAULT_SETTINGS };
        await storage.set(STORAGE_KEYS.SETTINGS, this.settings);
        this.notifyListeners('*', this.settings);
    }

    async toggleSetting(key) {
        const newValue = !this.settings[key];
        await this.setSetting(key, newValue);
        return newValue;
    }

    applySettings() {
        console.log('Applying settings:', this.settings);
        
        // Apply widget visibility settings
        dom.show('statsPanel', this.settings.showStats ? 'block' : 'none');
        dom.show('milestonePanel', this.settings.showMilestones ? 'block' : 'none');
        dom.show('clockWidget', this.settings.showClock ? 'block' : 'none');
        dom.show('todoWidget', this.settings.showTodo ? 'block' : 'none');
        dom.show('anniversariesWidget', this.settings.showAnniversaries ? 'block' : 'none');
        
        // Apply animation settings
        const starfield = dom.get('starfield');
        if (starfield) starfield.style.display = this.settings.showAnimation ? 'block' : 'none';
        
        // Apply theme settings
        const body = document.body;
        if (this.settings.theme === 'light') {
            body.classList.add('light-theme');
        } else {
            body.classList.remove('light-theme');
        }
        const themeIcon = dom.get('themeIcon');
        if (themeIcon) themeIcon.textContent = this.settings.theme === 'dark' ? '🌙' : '☀️';
    }

    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    async importSettings(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            const validKeys = Object.keys(DEFAULT_SETTINGS);
            const isValid = Object.keys(imported).every(key => validKeys.includes(key));
            if (!isValid) {
                console.error('Invalid settings format');
                return false;
            }
            await this.updateSettings(imported);
            return true;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }

    onChange(callback) {
        this.listeners.add(callback);
    }

    offChange(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(key, value) {
        this.listeners.forEach(callback => {
            try {
                callback(key, value);
            } catch (error) {
                console.error('Error in settings listener:', error);
            }
        });
    }
}

export const settings = new SettingsManager();
