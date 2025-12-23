// auroraAnimator.js
// Animated aurora (northern lights) background using ribbon-like sine waves
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This animator creates luminous aurora ribbons that wave across the screen.
// Features:
// - Canvas-based sine wave rendering
// - Additive blending for glow effect
// - Dynamic ribbon count (3-6 ribbons)
// - Breathing animation (amplitude pulses)
// - Edge fading to blend with background
//
// RIBBON PROPERTIES:
// - baseAmp/pulseAmp: Wave amplitude with breathing
// - frequency: Wave density
// - speed: Horizontal movement
// - verticalShift: Y position as percentage of height
//
// DEPENDENCIES:
// - Canvas element with id 'bg-canvas'

/**
 * Aurora (northern lights) background animator.
 * Creates glowing ribbon waves with additive blending.
 * 
 * @class AuroraAnimator
 */
export class AuroraAnimator {
  /**
   * Creates AuroraAnimator and starts animation.
   * @constructor
   */
  constructor() {
    /** @type {HTMLCanvasElement} Background canvas */
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.ribbons = [];
    this.running = true;

    // pull body bg colour for seamless fade edges
    this.bgColor = getComputedStyle(document.body).backgroundColor || 'rgb(0,16,32)';

    // timing helpers for ribbon breathing
    this.lastChange = performance.now();
    this.minRibbons = 3;
    this.maxRibbons = 6;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Create ribbon parameters
    const palette = ['#3affd4', '#34ffc4', '#2dffb4', '#28ffaa', '#1ef0a0', '#1ad898', '#17bf90'];
    this.palette = palette;
    for (let i = 0; i < 4; i++) this.addRibbon();

    requestAnimationFrame((t) => this.animate(t));
  }

  addRibbon(){
    const i = Math.floor(Math.random()*this.palette.length);
    this.ribbons.push({
      baseAmp: 50 + Math.random()*70,
      pulseAmp: 20 + Math.random()*20,
      frequency: 0.0008 + Math.random()*0.0007,
      speed: 0.0003 + Math.random()*0.0005,
      phase: Math.random()*Math.PI*2,
      color: this.palette[i],
      verticalShift: 0.25 + Math.random()*0.4,
      pulsePhase: Math.random()*Math.PI*2
    });
  }

  maybeModifyRibbons(now){
    if(now - this.lastChange < 6000) return;
    this.lastChange = now;
    if(Math.random()<0.5 && this.ribbons.length > this.minRibbons){
      // remove oldest
      this.ribbons.shift();
    } else if(this.ribbons.length < this.maxRibbons){
      this.addRibbon();
    }
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate(timestamp) {
    if (!this.running) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // update ribbons array occasionally
    this.maybeModifyRibbons(timestamp);

    // Fade previous frame slightly to create trailing effect (neutral black to avoid blue band)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 4;
    ctx.globalCompositeOperation = 'lighter';

    this.ribbons.forEach(r => {
      r.phase += r.speed * 16; // scale speed by frame
      r.pulsePhase += 0.02;
      const amp = r.baseAmp + Math.sin(r.pulsePhase) * r.pulseAmp;

      const baseY = h * r.verticalShift;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 10) {
        const y = baseY + Math.sin(x * r.frequency + r.phase) * amp;
        ctx.lineTo(x, y);
      }
      const grad = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, r.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';

    // Draw top & bottom fade to blend edges
    const fadeHeight = 200; // px fade region
    // Top fade
    let grad = ctx.createLinearGradient(0, 0, 0, fadeHeight);
    grad.addColorStop(0, this.bgColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, fadeHeight);

    // Bottom fade
    grad = ctx.createLinearGradient(0, h - fadeHeight, 0, h);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, this.bgColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - fadeHeight, w, fadeHeight);

    requestAnimationFrame((t) => this.animate(t));
  }

  destroy() { this.running = false; }
} 