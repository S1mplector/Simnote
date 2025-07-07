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

    // Optimized layered petals for depth (fewer particles for better performance)
    this.layers = {
      background: { count: 8, sizeRange: [20, 30], opacityRange: [0.3, 0.5], speedMultiplier: 0.7 },
      midground: { count: 10, sizeRange: [28, 38], opacityRange: [0.5, 0.7], speedMultiplier: 0.85 },
      foreground: { count: 7, sizeRange: [35, 45], opacityRange: [0.7, 0.9], speedMultiplier: 1.0 }
    };
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
    this.particles = [];

    // Create layered particles for enhanced depth
    Object.entries(this.layers).forEach(([layerName, config]) => {
      for (let i = 0; i < config.count; i++) {
        const img = this.petalImgs[Math.floor(Math.random() * this.petalImgs.length)];
        const delay = Math.random() * 0.8 * config.speedMultiplier; // Layer-based stagger
        const speed = (300 + Math.random() * 180) * config.speedMultiplier; // px / sec
        const amp = (40 + Math.random() * 60) * config.speedMultiplier; // sine vertical amplitude
        const wavelength = 180 + Math.random() * 220; // px
        const phase = Math.random() * Math.PI * 2;
        const rotationSpeed = (Math.random() - 0.5) * 1.5 * config.speedMultiplier; // rad / sec
        const startX = -150 - Math.random() * 100; // Vary start positions
        const startY = Math.random() * (h * 0.8) + h * 0.1;
        const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
        const opacity = config.opacityRange[0] + Math.random() * (config.opacityRange[1] - config.opacityRange[0]);

        this.particles.push({ 
          img, delay, speed, amp, wavelength, phase, rotationSpeed, startX, startY, 
          size, baseOpacity: opacity, layer: layerName, speedMultiplier: config.speedMultiplier,
          layerOrder: layerName === 'background' ? 0 : layerName === 'midground' ? 1 : 2 // Pre-calculate for sorting
        });
      }
    });

    // Sort particles once during initialization instead of every frame
    this.particles.sort((a, b) => a.layerOrder - b.layerOrder);

    // Pre-create gradient for reuse
    this.backgroundGradient = this.ctx.createRadialGradient(
      window.innerWidth / 2, window.innerHeight / 2, 0,
      window.innerWidth / 2, window.innerHeight / 2, Math.max(window.innerWidth, window.innerHeight) / 2
    );
    this.backgroundGradient.addColorStop(0, 'rgba(238,232,255,0.08)');
    this.backgroundGradient.addColorStop(1, 'rgba(238,232,255,0.18)');
  }

  animate(ts) {
    if (!this.startTime) return;
    const elapsed = (ts - this.startTime) / 1000;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let allDone = true;

    // Particles are already sorted - no need to sort every frame
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
      let alpha = p.baseOpacity;
      if (tLocal < 0.3) alpha *= tLocal / 0.3;
      const remainingX = (window.innerWidth + 100) - x;
      const estRemainingTime = remainingX / p.speed;
      if (estRemainingTime < 0.4) alpha *= Math.min(1, estRemainingTime / 0.4);

      const rotate = tLocal * p.rotationSpeed;
      const scale = 0.8 + Math.sin(tLocal * 3) * 0.1;

      ctx.save();
      
      // Simplified depth effect - use alpha instead of expensive blur
      let finalAlpha = alpha;
      if (p.layer === 'background') {
        finalAlpha *= 0.6; // More transparent for depth
      } else if (p.layer === 'midground') {
        finalAlpha *= 0.8; // Slightly transparent
      }
      
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.globalAlpha = finalAlpha;
      const sz = p.size * scale;
      ctx.drawImage(p.img, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }

    // Use pre-created gradient instead of creating new one every frame
    ctx.fillStyle = this.backgroundGradient;
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