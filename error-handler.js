// ============================================
// CRASH LOGGING & ERROR HANDLING MODULE
// ============================================

const CRASH_LOG_KEY = 'crashLogs';
const MAX_CRASH_LOGS = 50;

// Log crash to Chrome storage
function logCrash(error, context = 'Unknown') {
    const crashEntry = {
        timestamp: new Date().toISOString(),
        context: context,
        message: error.message || String(error),
        stack: error.stack || 'No stack trace',
        userAgent: navigator.userAgent,
        url: window.location.href
    };

    try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get([CRASH_LOG_KEY], (data) => {
                if (chrome.runtime.lastError) {
                    console.error('Failed to get crash logs:', chrome.runtime.lastError);
                    return;
                }
                
                let logs = data[CRASH_LOG_KEY] || [];
                logs.unshift(crashEntry);
                logs = logs.slice(0, MAX_CRASH_LOGS); // Keep only last 50 logs

                chrome.storage.local.set({ [CRASH_LOG_KEY]: logs }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to save crash log:', chrome.runtime.lastError);
                    } else {
                        console.error('Crash logged:', crashEntry);
                    }
                });
            });
        } else {
            console.error('Chrome storage not available, crash not logged:', crashEntry);
        }
    } catch (storageError) {
        console.error('Failed to log crash:', storageError);
    }
}

// Emergency cleanup - kills all tracked intervals and animations
function emergencyCleanup() {
    console.warn('Emergency cleanup triggered');

    try {
        // Clear all tracked intervals
        if (window.ageUpdateInterval) {
            clearInterval(window.ageUpdateInterval);
            window.ageUpdateInterval = null;
        }
        if (window.clockUpdateInterval) {
            clearInterval(window.clockUpdateInterval);
            window.clockUpdateInterval = null;
        }

        // Clear tracked timeouts
        if (window.trackedTimeouts && window.trackedTimeouts.size > 0) {
            window.trackedTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            window.trackedTimeouts.clear();
        }

        // Stop starfield animation
        if (typeof stopStarfield === 'function') {
            stopStarfield();
        } else if (window.starfieldRunning) {
            window.starfieldRunning = false;
            if (window.starfieldAnimationId) {
                cancelAnimationFrame(window.starfieldAnimationId);
                window.starfieldAnimationId = null;
            }
        }

        // Clear tracked confetti animations
        if (window.confettiAnimations && window.confettiAnimations.size > 0) {
            window.confettiAnimations.forEach(animId => cancelAnimationFrame(animId));
            window.confettiAnimations.clear();
        }

        console.log('Emergency cleanup completed');
    } catch (e) {
        console.error('Error during emergency cleanup:', e);
    }
}

// Show critical error overlay
function showCriticalError(message, autoReload = true) {
    const errorOverlay = document.createElement('div');
    errorOverlay.id = 'critical-error-overlay';
    errorOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        font-family: system-ui, -apple-system, sans-serif;
    `;

    const reloadMessage = autoReload
        ? '<p style="font-size: 0.9rem; opacity: 0.7; margin-top: 1rem;">Reloading in 3 seconds...</p>'
        : '';

    errorOverlay.innerHTML = `
        <div style="text-align: center; padding: 2rem; max-width: 500px;">
            <h1 style="font-size: 3rem; margin-bottom: 1rem;">⚠️</h1>
            <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Critical Error</h2>
            <p style="font-size: 1.1rem; margin-bottom: 1rem; opacity: 0.9;">${message}</p>
            <div style="font-size: 0.9rem; opacity: 0.7;">
                <p>Error logs have been saved for debugging.</p>
                <p>Check the console (F12) for details.</p>
            </div>
            ${reloadMessage}
            <button id="manualReload" style="
                margin-top: 1.5rem;
                padding: 0.75rem 1.5rem;
                background: #4ecdc4;
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.3s;
            ">Reload Now</button>
        </div>
    `;

    document.body.appendChild(errorOverlay);

    // Add click handler for manual reload button
    document.getElementById('manualReload').onclick = () => {
        window.location.reload();
    };

    // Auto-reload after 3 seconds if enabled
    if (autoReload) {
        setTimeout(() => window.location.reload(), 3000);
    }
}

// Check if we're in a crash loop (too many crashes in short time)
function isInCrashLoop() {
    const crashLoopKey = 'crashLoopDetection';
    const crashLoopWindow = 60000; // 1 minute
    const maxCrashesInWindow = 5;

    try {
        const now = Date.now();
        let crashTimes = JSON.parse(sessionStorage.getItem(crashLoopKey) || '[]');

        // Filter out old crash times
        crashTimes = crashTimes.filter(time => now - time < crashLoopWindow);

        // Add current crash time
        crashTimes.push(now);
        sessionStorage.setItem(crashLoopKey, JSON.stringify(crashTimes));

        return crashTimes.length >= maxCrashesInWindow;
    } catch (e) {
        console.error('Error checking crash loop:', e);
        return false;
    }
}

// Initialize error handlers
function initializeErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
        const error = event.error || new Error(event.message);
        logCrash(error, 'Global Error Handler');
        emergencyCleanup();

        if (isInCrashLoop()) {
            showCriticalError('Multiple crashes detected. Please reload manually after checking console logs.', false);
        } else {
            showCriticalError('An unexpected error occurred. The page will reload in 3 seconds.');
        }

        event.preventDefault();
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        logCrash(error, 'Unhandled Promise Rejection');
        emergencyCleanup();

        if (isInCrashLoop()) {
            showCriticalError('Multiple crashes detected. Please reload manually after checking console logs.', false);
        } else {
            showCriticalError('A critical error occurred. The page will reload in 3 seconds.');
        }

        event.preventDefault();
    });

    console.log('Error handling initialized');
}

// Retrieve crash logs (for display in settings)
function getCrashLogs(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([CRASH_LOG_KEY], (data) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to get crash logs:', chrome.runtime.lastError);
                callback([]);
            } else {
                callback(data[CRASH_LOG_KEY] || []);
            }
        });
    } else {
        callback([]);
    }
}

// Clear crash logs
function clearCrashLogs(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [CRASH_LOG_KEY]: [] }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to clear crash logs:', chrome.runtime.lastError);
                if (callback) callback(false);
            } else {
                console.log('Crash logs cleared');
                if (callback) callback(true);
            }
        });
    } else {
        if (callback) callback(false);
    }
}

// Export functions
window.ErrorHandler = {
    initialize: initializeErrorHandling,
    logCrash: logCrash,
    emergencyCleanup: emergencyCleanup,
    showCriticalError: showCriticalError,
    getCrashLogs: getCrashLogs,
    clearCrashLogs: clearCrashLogs,
    isInCrashLoop: isInCrashLoop
};
