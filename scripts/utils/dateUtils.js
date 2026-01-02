// ============================================
// DATE UTILITIES MODULE
// ============================================

import { MILLISECONDS } from './constants.js';

export function getNextBirthday(dob) {
    const now = new Date();
    const thisYearBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    return thisYearBirthday > now ? thisYearBirthday : new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
}

export function getDaysSinceLastBirthday(dob) {
    const now = new Date();
    const lastBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (lastBirthday > now) {
        lastBirthday.setFullYear(now.getFullYear() - 1);
    }
    return Math.floor((now - lastBirthday) / MILLISECONDS.DAY);
}

export function getYearProgress(dob) {
    const daysSince = getDaysSinceLastBirthday(dob);
    const percentage = (daysSince / 365.25) * 100;
    return Math.min(percentage, 100).toFixed(1);
}

export function isBirthday(date, dob) {
    return date.getDate() === dob.getDate() && date.getMonth() === dob.getMonth();
}

export function formatOrdinalDate(date) {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';
    return `${day}${suffix} of ${month} ${year}`;
}

export function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatCountdown(daysRemaining) {
    if (daysRemaining <= 0) return 'Today!';
    if (daysRemaining === 1) return '1 day to go';
    return `${daysRemaining.toLocaleString()} days to go`;
}

export function validateDateOfBirth(selectedDate) {
    const now = new Date();
    if (isNaN(selectedDate.getTime())) {
        return { isValid: false, error: 'Invalid date format' };
    }
    if (selectedDate > now) {
        return { isValid: false, error: 'Date cannot be in the future' };
    }
    const maxAgeYears = 150;
    const minDate = new Date(now.getFullYear() - maxAgeYears, now.getMonth(), now.getDate());
    if (selectedDate < minDate) {
        return { isValid: false, error: 'Invalid date of birth' };
    }
    return { isValid: true, error: null };
}

export function getAgeBreakdown(dob) {
    const now = new Date();
    const ageInMilliseconds = now - dob;
    const ageInYears = ageInMilliseconds / MILLISECONDS.YEAR;
    const ageString = ageInYears.toFixed(9);
    const [wholePart, decimalPart] = ageString.split('.');
    return { whole: wholePart, decimal: '.' + decimalPart };
}

export function getAgeStatistics(dob) {
    const now = new Date();
    const ageInMs = now - dob;
    const daysLived = Math.floor(ageInMs / MILLISECONDS.DAY);
    const hoursLived = Math.floor(ageInMs / MILLISECONDS.HOUR);
    const secondsLived = Math.floor(ageInMs / MILLISECONDS.SECOND);
    const nextBirthday = getNextBirthday(dob);
    const timeUntilBirthday = nextBirthday - now;
    const daysUntil = Math.floor(timeUntilBirthday / MILLISECONDS.DAY);
    const hoursUntil = Math.floor((timeUntilBirthday % MILLISECONDS.DAY) / MILLISECONDS.HOUR);
    const daysSinceBirthday = getDaysSinceLastBirthday(dob);
    const yearProgress = getYearProgress(dob);
    return { daysLived, hoursLived, secondsLived, daysUntilBirthday: daysUntil, hoursUntilBirthday: hoursUntil, daysSinceBirthday, yearProgress };
}
