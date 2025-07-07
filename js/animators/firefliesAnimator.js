// firefliesAnimator.js
// Animated green-yellow "fireflies" that drift slowly and blink.
// Uses additive blending for subtle glow.

export class FirefliesAnimator {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.fireflies = [];
    this.num = 100;
    this.initFireflies();

    this.resizeCanvas();
    this._resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', this._resizeHandler);

    this.running = true;
    this.lastTs = performance.now();
    requestAnimationFrame(ts => this.animate(ts));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Create initial particle array
   */
  initFireflies() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < this.num; i++) {
      this.fireflies.push(this.spawnFirefly(w, h));
    }
  }

  spawnFirefly(w, h) {
    // subtle per-particle variation for a more natural look
    const baseAlpha = 0.25 + Math.random() * 0.25;        // 0.25 – 0.5
    const ampAlpha  = 0.15 + Math.random() * 0.25;        // 0.15 – 0.4
    const hue       = 90 + (Math.random() * 20 - 10);     // 80 – 100° (yellow-green)

    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      size: 1.2 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      blinkSpeed: 0.012 + Math.random() * 0.02, // a bit slower average blink
      baseAlpha,
      ampAlpha,
      hue,
    };
  }

  animate(ts) {
    if (!this.running) return;
    const dt = ts - this.lastTs;
    this.lastTs = ts;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Motion blur / fade previous frame to produce soft trails (lower opacity for subtler glow)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';

    for (const f of this.fireflies) {
      // Update
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.phase += f.blinkSpeed * dt;

      // Wrap around edges
      if (f.x < -20) f.x = w + 20;
      if (f.x > w + 20) f.x = -20;
      if (f.y < -20) f.y = h + 20;
      if (f.y > h + 20) f.y = -20;

      // Brightness using sine blink with individual amplitude / baseline
      const glow = f.baseAlpha + f.ampAlpha * Math.sin(f.phase);

      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 6);
      grad.addColorStop(0, `hsla(${f.hue}, 100%, 70%, ${glow})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    this.animId = requestAnimationFrame(ts2 => this.animate(ts2));
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this._resizeHandler);
  }
} 