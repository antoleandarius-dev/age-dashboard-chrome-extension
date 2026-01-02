// ============================================
// MILESTONE SYSTEM MODULE
// ============================================

import { storage } from './storage.js';
import { MILESTONES, STORAGE_KEYS, MAX_AGES } from '../utils/constants.js';
import { formatOrdinalDate } from '../utils/dateUtils.js';
import { dom } from '../ui/domManager.js';

export class MilestoneSystem {
    constructor(ageCalculator) {
        this.ageCalculator = ageCalculator;
        this.history = [];
        this.celebrated = new Set();
        this.listeners = new Set();
    }

    async initialize() {
        const data = await storage.get([STORAGE_KEYS.MILESTONE_HISTORY, STORAGE_KEYS.CELEBRATED_MILESTONES]);
        if (data[STORAGE_KEYS.MILESTONE_HISTORY]) {
            this.history = data[STORAGE_KEYS.MILESTONE_HISTORY];
        }
        if (data[STORAGE_KEYS.CELEBRATED_MILESTONES]) {
            this.celebrated = new Set(data[STORAGE_KEYS.CELEBRATED_MILESTONES]);
        }
    }

    checkMilestones() {
        const newMilestones = [];
        const stats = this.ageCalculator.getStatistics();
        const uncelebrated = MILESTONES.filter(m => !this.celebrated.has(m.name));
        for (const milestone of uncelebrated) {
            let reached = false;
            if (milestone.unit === 'days' && stats.daysLived >= milestone.value) reached = true;
            else if (milestone.unit === 'hours' && stats.hoursLived >= milestone.value) reached = true;
            else if (milestone.unit === 'seconds' && stats.secondsLived >= milestone.value) reached = true;
            if (reached) {
                this.celebrateMilestone(milestone);
                newMilestones.push(milestone);
            }
        }
        return newMilestones;
    }

    celebrateMilestone(milestone) {
        this.celebrated.add(milestone.name);
        const milestoneDate = this.ageCalculator.calculateMilestoneDate(milestone.value, milestone.unit);
        this.history.unshift({
            name: milestone.name,
            date: milestoneDate.toISOString(),
            value: milestone.value,
            unit: milestone.unit
        });
        if (this.history.length > MAX_AGES.MAX_MILESTONE_HISTORY) {
            this.history = this.history.slice(0, MAX_AGES.MAX_MILESTONE_HISTORY);
        }
        this.saveMilestoneData();
        this.notifyListeners('milestone-reached', milestone);
    }

    getNextMilestone() {
        const stats = this.ageCalculator.getStatistics();
        const uncelebrated = MILESTONES.filter(m => !this.celebrated.has(m.name));
        let nextMilestone = null;
        let smallestDiff = Infinity;
        for (const milestone of uncelebrated) {
            let current = 0;
            if (milestone.unit === 'days') current = stats.daysLived;
            else if (milestone.unit === 'hours') current = stats.hoursLived;
            else if (milestone.unit === 'seconds') current = stats.secondsLived;
            if (current < milestone.value) {
                const diff = milestone.value - current;
                if (diff < smallestDiff) {
                    smallestDiff = diff;
                    nextMilestone = {
                        ...milestone,
                        remaining: diff,
                        remainingDays: this.calculateRemainingDays(diff, milestone.unit)
                    };
                }
            }
        }
        return nextMilestone;
    }

    calculateRemainingDays(remaining, unit) {
        if (unit === 'days') return remaining;
        else if (unit === 'hours') return Math.floor(remaining / 24);
        else if (unit === 'seconds') return Math.floor(remaining / (24 * 3600));
        return 0;
    }

    getHistory() {
        return [...this.history].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    getUpcoming() {
        const stats = this.ageCalculator.getStatistics();
        const uncelebrated = MILESTONES.filter(m => !this.celebrated.has(m.name));
        const upcoming = uncelebrated.map(milestone => {
            let current = 0;
            if (milestone.unit === 'days') current = stats.daysLived;
            else if (milestone.unit === 'hours') current = stats.hoursLived;
            else if (milestone.unit === 'seconds') current = stats.secondsLived;
            if (current < milestone.value) {
                const remaining = milestone.value - current;
                return {
                    ...milestone,
                    remaining,
                    remainingDays: this.calculateRemainingDays(remaining, milestone.unit)
                };
            }
            return null;
        }).filter(m => m !== null).sort((a, b) => a.remaining - b.remaining);
        return upcoming;
    }

    recalculateDates() {
        let updated = false;
        this.history = this.history.map(m => {
            const correctDate = this.ageCalculator.calculateMilestoneDate(m.value, m.unit);
            if (m.date !== correctDate.toISOString()) {
                updated = true;
                return { ...m, date: correctDate.toISOString() };
            }
            return m;
        });
        if (updated) {
            this.saveMilestoneData();
            console.log('Milestone dates recalculated');
        }
    }

    getHistoryHTML() {
        const reached = this.getHistory();
        const upcoming = this.getUpcoming();
        let html = '';
        if (reached.length > 0) {
            html += '<div style="margin-bottom: 2rem;"><h3 style="margin-bottom: 1rem; opacity: 0.8; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">🏆 Milestones Reached</h3>';
            html += reached.map(m => `<div class="milestone-history-item" style="margin-bottom: 0.75rem;"><h4 style="margin-bottom: 0.25rem;">${m.name}</h4><p style="opacity: 0.7; font-size: 0.9rem;">${formatOrdinalDate(new Date(m.date))}</p></div>`).join('');
            html += '</div>';
        }
        if (upcoming.length > 0) {
            html += '<div><h3 style="margin-bottom: 1rem; opacity: 0.8; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">🎯 Upcoming Milestones</h3>';
            html += upcoming.map(m => `<div class="milestone-history-item" style="margin-bottom: 0.75rem; opacity: 0.85;"><h4 style="margin-bottom: 0.25rem;">Next: ${m.name}</h4><p style="opacity: 0.7; font-size: 0.9rem;">${m.remainingDays.toLocaleString()} days to go</p></div>`).join('');
            html += '</div>';
        }
        if (reached.length === 0 && upcoming.length === 0) {
            html = '<p style="text-align: center; opacity: 0.7;">Loading milestones...</p>';
        }
        return html;
    }

    async saveMilestoneData() {
        await storage.setMultiple({
            [STORAGE_KEYS.MILESTONE_HISTORY]: this.history.slice(0, MAX_AGES.MAX_MILESTONE_HISTORY),
            [STORAGE_KEYS.CELEBRATED_MILESTONES]: Array.from(this.celebrated)
        });
    }

    onEvent(callback) {
        this.listeners.add(callback);
    }

    offEvent(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in milestone listener:', error);
            }
        });
    }

    async clear() {
        this.history = [];
        this.celebrated.clear();
        await storage.remove([STORAGE_KEYS.MILESTONE_HISTORY, STORAGE_KEYS.CELEBRATED_MILESTONES]);
    }
}
