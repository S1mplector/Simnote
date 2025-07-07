// sakuraSwirlAnimator.js
// High-quality splash animation: multiple sakura petals spiral toward the centre, then fade.

export class SakuraSwirlAnimator {
  /**
   * @param {Function} onComplete Callback fired once the splash finishes.
   */
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;

    // Create overlay canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'splash-canvas';
    Object.assign(this.canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '9999',
      pointerEvents: 'none',
      background: 'transparent'
    });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Petal parameters
    this.numPetals = 32;
    this.petalSize = 38; // px base size

    // Load petal images (1-9)
    this.petalImgs = [];
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 9) {
        this.initParticles();
        this.startTime = performance.now();
        requestAnimationFrame((t) => this.animate(t));
      }
    };
    for (let i = 1; i <= 9; i++) {
      const img = new Image();
      img.src = `img/petal${i}.png`;
      img.onload = onLoad;
      this.petalImgs.push(img);
    }

    // Handle hi-dpi
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Create particle objects positioned around the screen edge.
   */
  initParticles() {
    const { innerWidth: w, innerHeight: h } = window;
    const maxRadius = Math.hypot(w, h) * 0.6; // start slightly off-screen
    this.centerX = w / 2;
    this.centerY = h / 2;

    this.particles = Array.from({ length: this.numPetals }, () => {
      const angle0 = Math.random() * Math.PI * 2; // starting polar angle around the centre
      const startRadius = maxRadius * (0.8 + 0.4 * Math.random());
      const swirlLoops = 1.5 + Math.random() * 1.5; // between 1.5 and 3 loops
      const rotationSpeed = (Math.random() * 1.5 - 0.75); // radians per progress
      const img = this.petalImgs[Math.floor(Math.random() * this.petalImgs.length)];
      const delay = Math.random() * 0.4; // stagger start for subtle randomness
      return { angle0, startRadius, swirlLoops, rotationSpeed, img, delay };
    });
  }

  animate(timestamp) {
    if (!this.startTime) return; // Wait until ready
    const elapsed = (timestamp - this.startTime) / 1000; // seconds
    const duration = 3.6; // total time of splash
    const progressGlobal = Math.min(elapsed / duration, 1);

    // Clear
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of this.particles) {
      const progress = Math.max(0, progressGlobal - p.delay) / (1 - p.delay);
      if (progress <= 0) continue;
      const eased = this.easeOutCubic(progress);

      // Polar coordinates
      const radius = p.startRadius * (1 - eased);
      const angle = p.angle0 + p.swirlLoops * eased * Math.PI * 2;
      const x = this.centerX + radius * Math.cos(angle);
      const y = this.centerY + radius * Math.sin(angle);

      // Scale / rotate / fade
      const scale = 0.5 + 0.8 * (1 - eased); // shrink as it approaches centre
      const alpha = eased < 0.85 ? 1 : 1 - (eased - 0.85) / 0.15; // fade last 15%
      const rotate = angle + elapsed * p.rotationSpeed; // slight spinning

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(rotate);
      this.ctx.globalAlpha = alpha;
      const size = this.petalSize * scale;
      this.ctx.drawImage(p.img, -size / 2, -size / 2, size, size);
      this.ctx.restore();
    }

    // --- Radial fade-to-logo overlay ---
    if (progressGlobal > 0.6) {
      const overlayT = (progressGlobal - 0.6) / 0.4; // 0 → 1 during last 40% of anim
      const maxDim = Math.max(window.innerWidth, window.innerHeight);
      const radius = maxDim * (0.15 + 0.85 * overlayT);

      const grd = this.ctx.createRadialGradient(
        this.centerX,
        this.centerY,
        0,
        this.centerX,
        this.centerY,
        radius
      );
      grd.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grd.addColorStop(1, `rgba(0, 0, 0, ${0.6 * (1 - overlayT)})`);

      this.ctx.fillStyle = grd;
      this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    if (progressGlobal < 1) {
      requestAnimationFrame((t) => this.animate(t));
    } else {
      this.canvas.remove();
      this.onComplete();
    }
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
} 