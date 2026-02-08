// splashAnimator.js
// Single petal drop splash animation
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// Simple splash showing a single petal dropping and swaying.
// Features:
// - Canvas overlay for animation
// - Single petal with sway motion
// - Rotation for natural feel
// - Fade out at end
// - Hi-DPI support
//
// ANIMATION:
// - Duration: 3.5 seconds
// - Petal drops from top to center
// - Sine wave sway motion
// - Fades during last 20%
//
// DEPENDENCIES:
// - Petal image at /resources/img/themes/sakura/petal1.png

/**
 * Single petal drop splash animator.
 * Shows one petal swaying down then fading.
 * 
 * @class SplashAnimator
 */
export class SplashAnimator {
  /**
   * @param {Function} onComplete Callback fired once the splash is done.
   */
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;

    // Create a full-screen canvas overlay
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'splash-canvas';
    Object.assign(this.canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '9999', // sit above everything
      pointerEvents: 'none',
      background: 'transparent'
    });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Desired rendered dimension for the splash petal (matches background petals)
    this.petalSize = 35; // px

    // Load one of the petal images already in the project
    this.petalImg = new Image();
    this.petalImg.src = 'resources/img/themes/sakura/petal1.png';
    this.petalImg.onload = () => {
      this.startTime = performance.now();
      requestAnimationFrame((t) => this.animate(t));
    };
  }

  resizeCanvas() {
    // Handle Hi-DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  animate(timestamp) {
    const elapsed = (timestamp - this.startTime) / 1000; // seconds
    const duration = 3.5; // total time for the splash
    const progress = Math.min(elapsed / duration, 1);

    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Compute petal position
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;
    const amplitude = canvasW * 0.1; // sway amplitude (10% of width)
    const sway = Math.sin(progress * Math.PI * 2) * amplitude; // full sine wave
    const x = canvasW / 2 + sway - this.petalSize / 2;
    const startY = -this.petalSize;
    const endY = canvasH * 0.5 - this.petalSize / 2;
    const y = startY + (endY - startY) * progress;

    // Fade out during the last 20% of animation
    let opacity = 1;
    if (progress > 0.8) {
      opacity = 1 - (progress - 0.8) / 0.2;
    }

    // Slight rotation for a more natural feel
    const rotation = Math.sin(progress * Math.PI * 4) * 0.3; // radians

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.translate(x + this.petalSize / 2, y + this.petalSize / 2);
    this.ctx.rotate(rotation);
    this.ctx.drawImage(this.petalImg, -this.petalSize / 2, -this.petalSize / 2, this.petalSize, this.petalSize);
    this.ctx.restore();

    if (progress < 1) {
      requestAnimationFrame((t) => this.animate(t));
    } else {
      // Clean up and start main app
      this.canvas.remove();
      this.onComplete();
    }
  }
} 