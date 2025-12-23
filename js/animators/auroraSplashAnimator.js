// auroraSplashAnimator.js
// Aurora theme splash with spiraling glowing orbs
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This animator creates the splash screen for aurora theme.
// Glowing orbs spiral inward with additive blending.
// Features:
// - Screen composite blending for glow
// - Radial gradient particles
// - Spiral convergence animation
// - Radial fade transition
//
// ANIMATION:
// - Duration: 3.2 seconds
// - 50 glowing particles spiral inward
// - Fade overlay appears in last 40%
//
// DEPENDENCIES:
// - Canvas overlay created dynamically

/**
 * Aurora splash screen animator.
 * Glowing orbs spiral to center with additive blending.
 * 
 * @class AuroraSplashAnimator
 */
export class AuroraSplashAnimator {
  /**
   * Creates AuroraSplashAnimator and starts animation.
   * @param {Function} [onComplete] - Callback when splash finishes
   * @constructor
   */
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;

    // canvas overlay
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'splash-canvas';
    Object.assign(this.canvas.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999,
      pointerEvents: 'none', background: 'transparent'
    });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.numParticles = 50;
    this.baseSize = 24;
    this.colors = ['#3affd4', '#34ffc4', '#28ffaa', '#1ef0a0'];

    this.initParticles();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.startTime = performance.now();
    this.duration = 3200; // ms
    requestAnimationFrame((t) => this.animate(t));
  }

  resizeCanvas() {
    const dpr = 1; // draw at 1x to reduce load for splash
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(1,0,0,1,0,0);
    if (dpr !== 1) this.ctx.scale(dpr, dpr);
    this.centerX = window.innerWidth / 2;
    this.centerY = window.innerHeight / 2;
  }

  initParticles() {
    const { innerWidth: w, innerHeight: h } = window;
    const maxRadius = Math.hypot(w, h) * 0.6;
    this.particles = Array.from({ length: this.numParticles }, () => {
      return {
        startRadius: maxRadius * (0.8 + Math.random() * 0.4),
        angle0: Math.random() * Math.PI * 2,
        swirlLoops: 1.5 + Math.random() * 1.0,
        size: this.baseSize * (0.6 + Math.random() * 0.8),
        delay: Math.random() * 0.4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)]
      };
    });
  }

  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  animate(ts) {
    const elapsed = ts - this.startTime;
    const progressGlobal = Math.min(elapsed / this.duration, 1);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalCompositeOperation = 'screen';

    this.particles.forEach(p => {
      let pProg = Math.max(0, progressGlobal - p.delay) / (1 - p.delay);
      if (pProg <= 0) return;
      pProg = this.easeOutCubic(pProg);

      const radius = p.startRadius * (1 - pProg);
      const angle = p.angle0 + p.swirlLoops * pProg * Math.PI * 2;
      const x = this.centerX + radius * Math.cos(angle);
      const y = this.centerY + radius * Math.sin(angle);

      const alpha = pProg < 0.85 ? 0.9 : 0.9 * (1 - (pProg - 0.85) / 0.15);
      ctx.globalAlpha = alpha;
      const rad = p.size * (1 - pProg * 0.3);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';

    // radial fade overlay last 40%
    if (progressGlobal > 0.6) {
      const t = (progressGlobal - 0.6) / 0.4;
      const maxDim = Math.max(window.innerWidth, window.innerHeight);
      const radius = maxDim * (0.15 + 0.85 * t);
      const grd = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, radius);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `rgba(0,0,0,${0.6 * (1 - t)})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    if (progressGlobal < 1) {
      requestAnimationFrame((t) => this.animate(t));
    } else {
      this.canvas.style.transition = 'opacity 0.8s ease';
      this.canvas.style.opacity = '0';
      setTimeout(() => { this.canvas.remove(); this.onComplete(); }, 800);
    }
  }
} 