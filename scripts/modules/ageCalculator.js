// ============================================
// AGE CALCULATOR MODULE
// ============================================

import { MILLISECONDS } from '../utils/constants.js';
import { getAgeBreakdown, getAgeStatistics } from '../utils/dateUtils.js';

export class AgeCalculator {
    constructor(dateOfBirth) {
        this.dob = dateOfBirth;
    }

    getAgeInYears() {
        const now = new Date();
        const ageInMilliseconds = now - this.dob;
        return ageInMilliseconds / MILLISECONDS.YEAR;
    }

    getAgeBreakdown() {
        return getAgeBreakdown(this.dob);
    }

    getStatistics() {
        return getAgeStatistics(this.dob);
    }

    getDaysLived() {
        const now = new Date();
        const ageInMs = now - this.dob;
        return Math.floor(ageInMs / MILLISECONDS.DAY);
    }

    getHoursLived() {
        const now = new Date();
        const ageInMs = now - this.dob;
        return Math.floor(ageInMs / MILLISECONDS.HOUR);
    }

    getSecondsLived() {
        const now = new Date();
        const ageInMs = now - this.dob;
        return Math.floor(ageInMs / MILLISECONDS.SECOND);
    }

    getTimeUntilBirthday() {
        const stats = this.getStatistics();
        return { daysUntil: stats.daysUntilBirthday, hoursUntil: stats.hoursUntilBirthday };
    }

    getDaysAtCurrentAge() {
        return this.getStatistics().daysSinceBirthday;
    }

    getYearProgress() {
        return parseFloat(this.getStatistics().yearProgress);
    }

    isMilestoneReached(value, unit) {
        let current = 0;
        if (unit === 'days') current = this.getDaysLived();
        else if (unit === 'hours') current = this.getHoursLived();
        else if (unit === 'seconds') current = this.getSecondsLived();
        return current >= value;
    }

    getMilestoneProgress(value, unit) {
        let current = 0;
        if (unit === 'days') current = this.getDaysLived();
        else if (unit === 'hours') current = this.getHoursLived();
        else if (unit === 'seconds') current = this.getSecondsLived();
        if (current >= value) {
            return { remaining: 0, remainingDays: 0 };
        }
        const remaining = value - current;
        let remainingDays = 0;
        if (unit === 'days') remainingDays = remaining;
        else if (unit === 'hours') remainingDays = Math.floor(remaining / 24);
        else if (unit === 'seconds') remainingDays = Math.floor(remaining / (24 * 3600));
        return { remaining, remainingDays };
    }

    calculateMilestoneDate(value, unit) {
        let millisecondsToAdd = 0;
        if (unit === 'days') millisecondsToAdd = value * MILLISECONDS.DAY;
        else if (unit === 'hours') millisecondsToAdd = value * MILLISECONDS.HOUR;
        else if (unit === 'seconds') millisecondsToAdd = value * MILLISECONDS.SECOND;
        return new Date(this.dob.getTime() + millisecondsToAdd);
    }
}
