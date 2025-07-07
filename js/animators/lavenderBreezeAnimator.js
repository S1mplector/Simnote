export class LavenderBreezeAnimator {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Optimized layered petal properties (reduced counts for better performance)
    this.layers = {
      background: { count: 15, sizeRange: [8, 15], opacityRange: [0.2, 0.4], speedMultiplier: 0.6 },
      midground: { count: 20, sizeRange: [12, 20], opacityRange: [0.4, 0.7], speedMultiplier: 0.8 },
      foreground: { count: 15, sizeRange: [16, 26], opacityRange: [0.6, 0.9], speedMultiplier: 1.0 }
    };
    this.petals = [];
    this.petalImages = [];
    this.imagesLoaded = 0;

    // Wind parameters – gentle rightward breeze
    this.windX = 0.15;
    this.windY = -0.05; // slightly upward

    // Mouse influence (for slight parallax)
    this.mouseX = 0;
    this.mouseY = 0;

    this.setupCanvas();
    this.loadPetalImages();

    this._mouseHandler = (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };
    this._resizeHandler = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', this._mouseHandler);
    window.addEventListener('resize', this._resizeHandler);

    this.running = true;
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  loadPetalImages() {
    for (let i = 1; i <= 8; i++) {
      const img = new Image();
      img.src = `img/lavender${i}.png`;
      img.onload = () => {
        if (this.destroyed) return;
        this.imagesLoaded++;
        if (this.imagesLoaded === 8 && !this.destroyed) {
          this.createPetals();
          this.animate();
        }
      };
      this.petalImages.push(img);
    }
  }

  createPetals() {
    // Create layered petals for depth effect
    Object.entries(this.layers).forEach(([layerName, config]) => {
      for (let i = 0; i < config.count; i++) {
        const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
        const opacity = config.opacityRange[0] + Math.random() * (config.opacityRange[1] - config.opacityRange[0]);
        
        this.petals.push({
          // Start slightly below bottom so they can drift up
          x: Math.random() * this.canvas.width,
          y: this.canvas.height + Math.random() * this.canvas.height,
          baseVX: (Math.random() - 0.5) * 0.3 * config.speedMultiplier,
          baseVY: -(0.4 + Math.random() * 0.4) * config.speedMultiplier, // upward base
          driftPhase: Math.random() * Math.PI * 2,
          driftSpeed: (0.002 + Math.random() * 0.002) * config.speedMultiplier,
          size: size,
          opacity: opacity,
          baseOpacity: opacity, // Store original opacity for effects
          rotationSpeed: (Math.random() - 0.5) * 0.02 * config.speedMultiplier,
          rotationAngle: Math.random() * Math.PI * 2,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: (0.002 + Math.random() * 0.003) * config.speedMultiplier,
          imageIndex: Math.floor(Math.random() * 8),
          layer: layerName,
          parallaxFactor: config.speedMultiplier, // For mouse parallax effect
          layerOrder: layerName === 'background' ? 0 : layerName === 'midground' ? 1 : 2 // Pre-calculate for sorting
        });
      }
    });

    // Sort petals once during initialization instead of every frame
    this.petals.sort((a, b) => a.layerOrder - b.layerOrder);
  }

  updatePetals() {
    // Cache mouse position for distance calculations
    const mouseX = this.mouseX;
    const mouseY = this.mouseY;
    
    this.petals.forEach(p => {
      // Sway motion (horizontal sine) - affected by layer
      p.swayPhase += p.swaySpeed;
      const swayX = Math.sin(p.swayPhase) * 1.2 * p.parallaxFactor; // Layer-based sway

      // Organic drift variation on velocities
      p.driftPhase += p.driftSpeed;
      const varVX = Math.sin(p.driftPhase) * 0.12;
      const varVY = Math.cos(p.driftPhase * 0.9) * 0.08;

      p.x += p.baseVX + varVX + this.windX * p.parallaxFactor + swayX;
      p.y += p.baseVY + varVY + this.windY * p.parallaxFactor;

      // Optimized mouse repulsion - only calculate if mouse is active
      if (mouseX > 0 && mouseY > 0) {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 90000) { // within 300px
          const repulse = 0.0006 * p.parallaxFactor;
          p.x -= dx * repulse;
          p.y -= dy * repulse;
        }
      }

      p.rotationAngle += p.rotationSpeed;

      // Reset if gone off top or sides
      if (p.y < -p.size || p.x < -p.size || p.x > this.canvas.width + p.size) {
        p.y = this.canvas.height + p.size;
        p.x = Math.random() * this.canvas.width;
        // Maintain layer-specific opacity range
        const layerConfig = this.layers[p.layer];
        p.opacity = layerConfig.opacityRange[0] + Math.random() * (layerConfig.opacityRange[1] - layerConfig.opacityRange[0]);
        p.baseOpacity = p.opacity;
        p.imageIndex = Math.floor(Math.random() * 8);
      }
    });
  }

  drawPetals() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Petals are already sorted - no need to sort every frame
    this.petals.forEach(p => {
      ctx.save();
      
      // Simplified depth effect - use alpha instead of expensive blur
      let finalOpacity = p.opacity;
      if (p.layer === 'background') {
        finalOpacity *= 0.6; // More transparent for depth
      } else if (p.layer === 'midground') {
        finalOpacity *= 0.8; // Slightly transparent
      }
      
      ctx.globalAlpha = finalOpacity;
      ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
      ctx.rotate(p.rotationAngle);
      ctx.drawImage(this.petalImages[p.imageIndex], -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
  }

  animate() {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(() => this.animate());
    this.updatePetals();
    this.drawPetals();
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('mousemove', this._mouseHandler);
    window.removeEventListener('resize', this._resizeHandler);
  }
} 