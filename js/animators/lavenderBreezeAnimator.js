export class LavenderBreezeAnimator {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Petal properties
    this.petalCount = 80;
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
    for (let i = 0; i < this.petalCount; i++) {
      this.petals.push({
        // Start slightly below bottom so they can drift up
        x: Math.random() * this.canvas.width,
        y: this.canvas.height + Math.random() * this.canvas.height,
        baseVX: (Math.random() - 0.5) * 0.3,
        baseVY: -(0.4 + Math.random() * 0.4), // upward base
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.002 + Math.random() * 0.002,
        size: 12 + Math.random() * 18,
        opacity: 0.5 + Math.random() * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        rotationAngle: Math.random() * Math.PI * 2,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.002 + Math.random() * 0.003,
        imageIndex: Math.floor(Math.random() * 8)
      });
    }
  }

  updatePetals() {
    this.petals.forEach(p => {
      // Sway motion (horizontal sine)
      p.swayPhase += p.swaySpeed;
      const swayX = Math.sin(p.swayPhase) * 1.2; // 1-2 px sway

      // Organic drift variation on velocities
      p.driftPhase += p.driftSpeed;
      const varVX = Math.sin(p.driftPhase) * 0.12;
      const varVY = Math.cos(p.driftPhase * 0.9) * 0.08;

      p.x += p.baseVX + varVX + this.windX + swayX;
      p.y += p.baseVY + varVY + this.windY;

      // Mouse gentle repulsion (keeps centre clear)
      const dx = this.mouseX - p.x;
      const dy = this.mouseY - p.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < 90000) { // within 300px
        const repulse = 0.0006;
        p.x -= dx * repulse;
        p.y -= dy * repulse;
      }

      p.rotationAngle += p.rotationSpeed;

      // Reset if gone off top or sides
      if (p.y < -p.size || p.x < -p.size || p.x > this.canvas.width + p.size) {
        p.y = this.canvas.height + p.size;
        p.x = Math.random() * this.canvas.width;
        p.opacity = 0.5 + Math.random() * 0.5;
        p.imageIndex = Math.floor(Math.random() * 8);
      }
    });
  }

  drawPetals() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.petals.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
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