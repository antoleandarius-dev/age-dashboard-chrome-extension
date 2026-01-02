// ============================================
// ANIMATION MANAGER MODULE
// ============================================

import { CONFETTI_COLORS } from '../utils/constants.js';

export class AnimationManager {
    constructor() {
        this.activeAnimations = new Set();
        this.activeTimeouts = new Set();
    }

    startConfetti(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Canvas element not found:', canvasId);
            return () => {};
        }
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const confetti = [];
        for (let i = 0; i < 150; i++) {
            confetti.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                r: Math.random() * 6 + 4,
                d: Math.random() * 10 + 5,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                tilt: Math.random() * 10 - 10,
                tiltAngleIncremental: Math.random() * 0.07 + 0.05,
                tiltAngle: 0
            });
        }
        let animationId;
        const draw = () => {
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
                this.activeAnimations.add(animationId);
            } else {
                this.activeAnimations.delete(animationId);
            }
        };
        draw();
        const timeoutId = setTimeout(() => {
            if (animationId) {
                cancelAnimationFrame(animationId);
                this.activeAnimations.delete(animationId);
            }
            this.activeTimeouts.delete(timeoutId);
        }, 5000);
        this.activeTimeouts.add(timeoutId);
        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (timeoutId) clearTimeout(timeoutId);
            this.activeAnimations.delete(animationId);
            this.activeTimeouts.delete(timeoutId);
        };
    }

    initStarfield(canvasId = 'starfield') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Canvas element not found:', canvasId);
            return { stop: () => {} };
        }
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const stars = [];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        for (let i = 0; i < 300; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 1000;
            stars.push({
                angle,
                distance,
                speed: Math.random() * 2 + 1,
                size: Math.random() * 1.5 + 0.5
            });
        }
        let isRunning = true;
        let animationId;
        const animate = () => {
            if (!isRunning) return;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const maxDistance = Math.max(canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            stars.forEach(star => {
                star.distance += star.speed;
                if (star.distance > maxDistance * 1.5) {
                    star.distance = 0;
                    star.angle = Math.random() * Math.PI * 2;
                }
                const x = centerX + Math.cos(star.angle) * star.distance;
                const y = centerY + Math.sin(star.angle) * star.distance;
                const progress = star.distance / (maxDistance * 1.5);
                const size = star.size * (0.5 + progress * 2);
                const opacity = Math.min(1, progress * 2) * (1 - progress * 0.5);
                if (opacity > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                    if (progress > 0.3) {
                        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.1})`;
                        ctx.beginPath();
                        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });
            animationId = requestAnimationFrame(animate);
            this.activeAnimations.add(animationId);
        };
        animate();
        const resizeHandler = () => {
            if (canvas && isRunning) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', resizeHandler);
        const stop = () => {
            isRunning = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                this.activeAnimations.delete(animationId);
            }
            window.removeEventListener('resize', resizeHandler);
        };
        return { stop, isRunning: () => isRunning };
    }

    stopAll() {
        this.activeAnimations.forEach(animId => {
            cancelAnimationFrame(animId);
        });
        this.activeAnimations.clear();
        this.activeTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.activeTimeouts.clear();
    }

    getActiveCount() {
        return this.activeAnimations.size + this.activeTimeouts.size;
    }
}

export const animationManager = new AnimationManager();
