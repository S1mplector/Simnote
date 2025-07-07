// firefliesSplashAnimator.js
// Simple splash where glowing dots converge toward the centre then fade.
export class FirefliesSplashAnimator {
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'splash-canvas';
    Object.assign(this.canvas.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999,
      pointerEvents: 'none', background: 'transparent'
    });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.num = 60;
    this.duration = 3000; // ms
    this.startTime = performance.now();

    this.initParticles();
    this.resizeCanvas();
    this._resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', this._resizeHandler);

    requestAnimationFrame(t => this.animate(t));
  }

  resizeCanvas() {
    const dpr = 1; // Keep low res for splash
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(1,0,0,1,0,0);
    if (dpr !== 1) this.ctx.scale(dpr, dpr);
    this.cx = window.innerWidth / 2;
    this.cy = window.innerHeight / 2;
  }

  initParticles() {
    const maxR = Math.hypot(window.innerWidth, window.innerHeight) * 0.6;
    const palette = ['#b4ff4d', '#c8ff66', '#ddff7f'];
    this.particles = Array.from({ length: this.num }, () => {
      return {
        startR: maxR * (0.8 + Math.random() * 0.4),
        angle0: Math.random() * Math.PI * 2,
        delay: Math.random() * 0.4,
        size: 10 + Math.random() * 14,
        color: palette[Math.floor(Math.random() * palette.length)],
      };
    });
  }

  easeOutQuad(t) {
    return t * (2 - t);
  }

  animate(ts) {
    const elapsed = ts - this.startTime;
    const pg = Math.min(elapsed / this.duration, 1);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.globalCompositeOperation = 'lighter';

    this.particles.forEach(p => {
      let pp = Math.max(0, pg - p.delay) / (1 - p.delay);
      if (pp <= 0) return;
      pp = this.easeOutQuad(pp);
      const radius = p.startR * (1 - pp);
      const angle = p.angle0;
      const x = this.cx + radius * Math.cos(angle);
      const y = this.cy + radius * Math.sin(angle);

      const alpha = pp < 0.9 ? 1 : 1 - (pp - 0.9) / 0.1;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size);
      grad.addColorStop(0, `${p.color}`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';

    // dark radial fade overlay
    if (pg > 0.7) {
      const t = (pg - 0.7) / 0.3;
      const radius = Math.max(window.innerWidth, window.innerHeight) * (0.2 + 0.8 * t);
      const grd = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, radius);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `rgba(0,0,0,${0.6 * (1 - t)})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    if (pg < 1) {
      requestAnimationFrame(t2 => this.animate(t2));
    } else {
      this.finish();
    }
  }

  finish() {
    this.canvas.style.transition = 'opacity 0.8s ease';
    this.canvas.style.opacity = '0';
    setTimeout(() => {
      this.canvas.remove();
      window.removeEventListener('resize', this._resizeHandler);
      this.onComplete();
    }, 800);
  }
} 