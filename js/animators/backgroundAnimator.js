// backgroundAnimator.js
// Sakura petal particle system for background animation
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This animator creates falling sakura petals as the default
// background animation. Features:
// - Canvas-based particle rendering
// - Mouse attraction effect
// - Wind simulation
// - Petal rotation and fading
// - 9 different petal images
//
// PARTICLE BEHAVIOR:
// - Petals fall with configurable speed and wind
// - Mouse cursor attracts nearby petals
// - Petals fade after passing halfway point
// - Reset to top when fully faded or off-screen
//
// DEPENDENCIES:
// - Canvas element with id 'bg-canvas'
// - Petal images in /img/petal1-9.png

/**
 * Sakura petal particle animator for background.
 * Creates falling petals with mouse interaction.
 * 
 * @class BackgroundAnimator
 */
export class BackgroundAnimator {
  /**
   * Creates BackgroundAnimator and starts animation.
   * @constructor
   */
  constructor() {
    /** @type {HTMLCanvasElement} Background canvas */
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.mouseX = 0;
    this.mouseY = 0;
    this.windX = -0.5;
    this.windY = 0.2;
    this.petals = [];
    this.petalCount = 100;
    this.petalImages = [];
    this.imagesLoaded = 0;

    this.setupCanvas();
    this.loadPetalImages();

    // store handlers so we can remove later
    this._mouseHandler = (e)=>{this.mouseX=e.clientX;this.mouseY=e.clientY;};
    this._resizeHandler = ()=>{this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight;};

    this.addEventListeners();
    this.running = true;
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  loadPetalImages() {
    for (let i = 1; i <= 9; i++) {
      const img = new Image();
      img.src = `img/petal${i}.png`;
      img.onload = () => {
        if(this.destroyed) return;
        this.imagesLoaded++;
        if (this.imagesLoaded === 9 && !this.destroyed) {
          this.createPetals();
          this.animatePetals();
        }
      };
      this.petalImages.push(img);
    }
  }

  createPetals() {
    for (let i = 0; i < this.petalCount; i++) {
      this.petals.push({
        x: Math.random() * this.canvas.width,
        y: -Math.random() * this.canvas.height,
        speedX: Math.random() * 3 - 1.5,
        speedY: Math.random() * 4 + 1,
        size: Math.random() * 25 + 15,
        opacity: 1,
        rotationSpeed: Math.random() * 0.05 + 0.01,
        rotationAngle: 0,
        fadeSpeed: Math.random() * 0.005 + 0.002,
        imageIndex: Math.floor(Math.random() * 9)
      });
    }
  }

  updatePetals() {
    this.petals.forEach(petal => {
      petal.x += petal.speedX + this.windX;
      petal.y += petal.speedY + this.windY;

      // Mouse attraction
      const dx = this.mouseX - petal.x;
      const dy = this.mouseY - petal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 300) {
        const attraction = 0.003;
        petal.x += dx * attraction;
        petal.y += dy * attraction;
      }

      petal.rotationAngle += petal.rotationSpeed;

      // Fade after halfway
      if (petal.y > this.canvas.height / 2) {
        petal.opacity -= petal.fadeSpeed;
      }

      // Reset if gone
      if (petal.opacity <= 0 || petal.y > this.canvas.height) {
        petal.opacity = 1;
        petal.y = -petal.size;
        petal.x = Math.random() * this.canvas.width;
        petal.imageIndex = Math.floor(Math.random() * 9);
      }
    });
  }

  drawPetals() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.petals.forEach(petal => {
      this.ctx.save();
      this.ctx.globalAlpha = petal.opacity;
      this.ctx.translate(petal.x + petal.size / 2, petal.y + petal.size / 2);
      this.ctx.rotate(petal.rotationAngle);
      this.ctx.drawImage(
        this.petalImages[petal.imageIndex],
        -petal.size / 2,
        -petal.size / 2,
        petal.size,
        petal.size
      );
      this.ctx.restore();
    });
  }

  animatePetals() {
    if(!this.running) return;
    this.animationId = requestAnimationFrame(() => this.animatePetals());
    this.updatePetals();
    this.drawPetals();
  }

  addEventListeners() {
    window.addEventListener('mousemove', this._mouseHandler);
    window.addEventListener('resize', this._resizeHandler);
  }

  destroy(){
    this.destroyed = true;
    this.running = false;
    if(this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('mousemove', this._mouseHandler);
    window.removeEventListener('resize', this._resizeHandler);
  }
}
