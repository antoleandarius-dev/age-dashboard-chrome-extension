// ============================================
// STORAGE MANAGER MODULE
// ============================================

import { STORAGE_KEYS, UPDATE_INTERVALS } from '../utils/constants.js';

class StorageManager {
    constructor() {
        this.debounceTimers = {};
        this.cache = {};
        this.initialized = false;
    }

    async initialize() {
        return new Promise((resolve) => {
            const keys = Object.values(STORAGE_KEYS);
            chrome.storage.local.get(keys, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('Storage initialization error:', chrome.runtime.lastError);
                    resolve({});
                } else {
                    this.cache = data;
                    this.initialized = true;
                    resolve(data);
                }
            });
        });
    }

    async get(keys) {
        return new Promise((resolve) => {
            if (!Array.isArray(keys)) keys = [keys];
            chrome.storage.local.get(keys, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('Storage get error:', chrome.runtime.lastError);
                    resolve({});
                } else {
                    Object.assign(this.cache, data);
                    resolve(data);
                }
            });
        });
    }

    async set(key, value, debounceTime = UPDATE_INTERVALS.STORAGE_DEBOUNCE) {
        this.cache[key] = value;
        if (this.debounceTimers[key]) {
            clearTimeout(this.debounceTimers[key]);
        }
        return new Promise((resolve) => {
            this.debounceTimers[key] = setTimeout(() => {
                chrome.storage.local.set({ [key]: value }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Failed to save ${key}:`, chrome.runtime.lastError);
                    }
                    this.debounceTimers[key] = null;
                    resolve();
                });
            }, debounceTime);
        });
    }

    async setMultiple(data, debounceTime = UPDATE_INTERVALS.STORAGE_DEBOUNCE) {
        Object.assign(this.cache, data);
        return new Promise((resolve) => {
            setTimeout(() => {
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to save multiple values:', chrome.runtime.lastError);
                    }
                    resolve();
                });
            }, debounceTime);
        });
    }

    async remove(keys) {
        if (!Array.isArray(keys)) keys = [keys];
        keys.forEach(key => delete this.cache[key]);
        return new Promise((resolve) => {
            chrome.storage.local.remove(keys, () => {
                if (chrome.runtime.lastError) {
                    console.error('Storage remove error:', chrome.runtime.lastError);
                }
                resolve();
            });
        });
    }

    async clear() {
        this.cache = {};
        return new Promise((resolve) => {
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    console.error('Storage clear error:', chrome.runtime.lastError);
                }
                resolve();
            });
        });
    }

    getFromCache(key) {
        return this.cache[key];
    }

    async flushDebounce() {
        const pendingKeys = Object.keys(this.debounceTimers).filter(key => this.debounceTimers[key]);
        for (const key of pendingKeys) {
            clearTimeout(this.debounceTimers[key]);
            const data = { [key]: this.cache[key] };
            await new Promise((resolve) => {
                chrome.storage.local.set(data, resolve);
            });
            this.debounceTimers[key] = null;
        }
    }
}

export const storage = new StorageManager();
