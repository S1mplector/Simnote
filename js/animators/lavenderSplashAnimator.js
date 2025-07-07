// lavenderSplashAnimator.js
// Wind-sweep splash: lavender petals rush in from the left like a real gust

export class LavenderSplashAnimator {
  /**
   * @param {Function} onComplete Callback fired after splash complete
   */
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;

    // Canvas overlay
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'splash-canvas';
    Object.assign(this.canvas.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 9999,
      pointerEvents: 'none',
      background: 'transparent'
    });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // petals
    this.numPetals = 32;
    this.petalSize = 34;
    this.petalImgs = [];
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 8) {
        this.initParticles();
        this.startTime = performance.now();
        requestAnimationFrame((t) => this.animate(t));
      }
    };
    for (let i = 1; i <= 8; i++) {
      const img = new Image();
      img.src = `img/lavender${i}.png`;
      img.onload = onLoad;
      this.petalImgs.push(img);
    }

    // hi-dpi
    this.resizeCanvas();
    this._resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', this._resizeHandler);
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  initParticles() {
    const { innerWidth: w, innerHeight: h } = window;

    this.particles = Array.from({ length: this.numPetals }, () => {
      const img = this.petalImgs[Math.floor(Math.random() * this.petalImgs.length)];
      const delay = Math.random() * 0.5; // stagger gust
      const speed = 300 + Math.random() * 180; // px / sec
      const amp = 40 + Math.random() * 60; // sine vertical amplitude
      const wavelength = 180 + Math.random() * 220; // px
      const phase = Math.random() * Math.PI * 2;
      const rotationSpeed = (Math.random() - 0.5) * 1.5; // rad / sec
      const startX = -100 - Math.random() * 150;
      const startY = Math.random() * (h * 0.8) + h * 0.1;

      return { img, delay, speed, amp, wavelength, phase, rotationSpeed, startX, startY };
    });
  }

  animate(ts) {
    if (!this.startTime) return;
    const elapsed = (ts - this.startTime) / 1000;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let allDone = true;

    for (const p of this.particles) {
      const tLocal = elapsed - p.delay;
      if (tLocal < 0) {
        allDone = false;
        continue; // not yet started
      }

      const x = p.startX + p.speed * tLocal;
      const y = p.startY + Math.sin((x + p.phase) / p.wavelength) * p.amp;

      if (x > window.innerWidth + 100) {
        continue; // off-screen right; particle finished
      } else {
        allDone = false; // at least one particle still active
      }

      // Alpha: fade in first 0.3s, fade out last 0.4s of travel
      let alpha = 1;
      if (tLocal < 0.3) alpha = tLocal / 0.3;
      const remainingX = (window.innerWidth + 100) - x;
      const estRemainingTime = remainingX / p.speed;
      if (estRemainingTime < 0.4) alpha = Math.min(alpha, estRemainingTime / 0.4);

      const rotate = tLocal * p.rotationSpeed;
      const scale = 0.8 + Math.sin(tLocal * 3) * 0.1;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.globalAlpha = alpha;
      const sz = this.petalSize * scale;
      ctx.drawImage(p.img, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }

    // Slight lavender haze overlay to soften background
    ctx.fillStyle = 'rgba(238,232,255,0.15)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    if (!allDone) {
      requestAnimationFrame((t) => this.animate(t));
    } else {
      this.destroy();
      this.onComplete();
    }
  }

  easeOutQuad(t) {
    return t * (2 - t);
  }

  destroy() {
    this.canvas.remove();
    window.removeEventListener('resize', this._resizeHandler);
  }
} 