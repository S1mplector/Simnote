// plainDarkBallSplashAnimator.js
// Bouncing ball splash for plain-dark theme.
// Ball starts from top, bounces realistically with squash/stretch, then expands to fill screen.
export class PlainDarkBallSplashAnimator {
  /**
   * @param {Function} onComplete Called when splash finishes.
   */
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;
    this.dpr = window.devicePixelRatio || 1;

    // Overlay canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'splash-canvas';
    Object.assign(this.canvas.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999,
      pointerEvents: 'none', background: 'transparent'
    });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Ball starts near upper-left outside the viewport
    const startX = window.innerWidth * 0.1;
    const startY = -80;

    // We'll aim roughly for the centre in ~1.8 s so it feels natural
    const timeToCentre = 1.8;
    this.centerX = window.innerWidth / 2;
    this.centerY = window.innerHeight / 2;

    const dx = this.centerX - startX;

    this.gravity = 1200; // define gravity before velocity calculation
    // Compute initial vy so that y(t)=centerY when falling under gravity
    const desiredVy = (this.centerY - startY - 0.5 * this.gravity * Math.pow(timeToCentre,2)) / timeToCentre;

    this.ball = {
      x: startX,
      y: startY,
      vx: dx / timeToCentre, // constant horizontal speed toward centre
      vy: desiredVy,
      radius: 40,
      color: '#888'
    };

    this.phase = 'fall'; // later becomes 'expand'
    this.startTime = null;
    this.lastTime = null;
    requestAnimationFrame((t) => this.animate(t));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth * this.dpr;
    this.canvas.height = window.innerHeight * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.centerX = window.innerWidth / 2;
    this.centerY = window.innerHeight / 2;
  }

  animate(timestamp) {
    if (!this.startTime) { this.startTime = timestamp; this.lastTime = timestamp; }
    const dt = (timestamp - this.lastTime) / 1000; // seconds
    this.lastTime = timestamp;

    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (this.phase === 'fall') {
      this.updatePhysics(dt);
      this.drawBall();

      const nearCenter = Math.hypot(this.ball.x - this.centerX, this.ball.y - this.centerY) < 40;
      if (nearCenter) {
        this.phase = 'expand';
        this.expandRadius = this.ball.radius;
      }
      // Safety: if more than 3s elapsed in fall, start expand anyway
      if (timestamp - this.startTime > 3000 && this.phase === 'fall') {
        this.phase = 'expand';
        this.expandRadius = this.ball.radius;
      }
    } else if (this.phase === 'expand') {
      this.expandRadius += window.innerWidth * dt * 1.8; // expand quickly
      this.ctx.fillStyle = '#2b2b2b'; // theme background colour
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, this.expandRadius, 0, Math.PI * 2);
      this.ctx.fill();
      if (this.expandRadius >= Math.hypot(window.innerWidth, window.innerHeight)) {
        // Finish
        this.canvas.remove();
        this.onComplete();
        return;
      }
    }

    requestAnimationFrame((t) => this.animate(t));
  }

  updatePhysics(dt) {
    // Update velocities
    this.ball.vy += this.gravity * dt;
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // No ground bounce – just simple fall
    // Horizontal: stop once past centre to prevent overshoot
    if (this.ball.vx > 0 && this.ball.x > this.centerX) {
      this.ball.vx = 0;
    }
  }

  drawBall() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.ball.x, this.ball.y);

    ctx.beginPath();
    ctx.arc(0, 0, this.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.ball.color;
    ctx.fill();
    ctx.restore();
  }
} 