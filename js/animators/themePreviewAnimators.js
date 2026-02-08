// themePreviewAnimators.js
// Lightweight preview animations for theme selector dropdown
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module contains mini-versions of theme animators for the
// theme selector dropdown previews. Each animator runs on a small
// canvas and shows a simplified version of the theme's animation.
//
// CLASSES:
// - FirefliesPreviewAnimator: Blinking dots for fireflies theme
// - AuroraPreviewAnimator: Wavy ribbons for aurora theme
// - SakuraPreviewAnimator: Falling petals for sakura theme
// - LavenderPreviewAnimator: Rising petals for lavender theme
//
// OPTIMIZATION:
// - Reduced particle counts for performance
// - Simplified rendering logic
// - Each animator has destroy() for cleanup
//
// DEPENDENCIES:
// - Canvas elements from theme selector UI
// - Petal images for sakura/lavender previews

/**
 * Fireflies preview animator for theme selector.
 * Simplified blinking dots effect.
 * 
 * @class FirefliesPreviewAnimator
 */
export class FirefliesPreviewAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    this.w = canvas.width;
    this.h = canvas.height;

    const count = 18;
    this.flies = Array.from({ length: count }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 0.04 * dpr,
      vy: (Math.random() - 0.5) * 0.04 * dpr,
      phase: Math.random() * Math.PI * 2,
      speed: 0.012 + Math.random() * 0.02,
      base: 0.2 + Math.random() * 0.2,
      amp: 0.12 + Math.random() * 0.18,
      size: (0.8 + Math.random() * 1.2) * dpr,
      hue: 90 + (Math.random() * 20 - 10)
    }));

    this.running = true;
    this.frame();
  }

  frame() {
    if (!this.running) return;
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';

    this.flies.forEach(f => {
      f.x += f.vx;
      f.y += f.vy;
      f.phase += f.speed;

      if (f.x < 0) f.x = this.w;
      if (f.x > this.w) f.x = 0;
      if (f.y < 0) f.y = this.h;
      if (f.y > this.h) f.y = 0;

      const alpha = f.base + f.amp * Math.sin(f.phase);
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 5);
      grad.addColorStop(0, `hsla(${f.hue},100%,70%,${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';

    this.handle = requestAnimationFrame(() => this.frame());
  }

  destroy() {
    this.running = false;
    if (this.handle) cancelAnimationFrame(this.handle);
  }
}

export class AuroraPreviewAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = canvas.width;
    this.h = canvas.height;
    this.ribbons = Array.from({ length: 3 }, () => ({
      amp: 8 + Math.random() * 10,
      freq: 0.005 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.02,
      color: `hsl(${160 + Math.random() * 40},100%,70%)`
    }));
    this.running = true;
    this.frame();
  }

  frame() {
    if (!this.running) return;
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.lineWidth = 2;
    ctx.globalCompositeOperation = 'lighter';

    this.ribbons.forEach(r => {
      r.phase += r.speed;
      ctx.beginPath();
      ctx.moveTo(0, this.h * 0.5);
      for (let x = 0; x <= this.w; x += 4) {
        const y = this.h * 0.5 + Math.sin(x * r.freq + r.phase) * r.amp;
        ctx.lineTo(x, y);
      }
      const grad = ctx.createLinearGradient(0, this.h * 0.45, 0, this.h * 0.55);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, r.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';

    this.handle = requestAnimationFrame(() => this.frame());
  }

  destroy() {
    this.running = false;
    if (this.handle) cancelAnimationFrame(this.handle);
  }
}

export class SakuraPreviewAnimator {
  constructor(canvas, light = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = canvas.width;
    this.h = canvas.height;
    this.light = light;
    this.petals = Array.from({ length: 12 }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vy: 0.1 + Math.random() * 0.1,
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.02,
      size: 2 + Math.random() * 3
    }));
    this.img = new Image();
    this.img.src = 'resources/img/themes/sakura/petal1.png';
    this.running = true;
    this.img.onload = () => this.frame();
  }

  frame() {
    if (!this.running) return;
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(${this.light ? 255 : 0},${this.light ? 255 : 0},${this.light ? 255 : 0},0.1)`;
    ctx.fillRect(0, 0, this.w, this.h);

    this.petals.forEach(p => {
      p.y += p.vy;
      p.rot += p.rotSpd;
      if (p.y > this.h) p.y = -10;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.8;
      ctx.drawImage(this.img, -p.size * 5, -p.size * 5, p.size * 10, p.size * 10);
      ctx.restore();
    });
    requestAnimationFrame(() => this.frame());
  }

  destroy() {
    this.running = false;
  }
}

export class LavenderPreviewAnimator {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = canvas.width;
    this.h = canvas.height;
    this.petals = Array.from({ length: 10 }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      baseVY: -0.06 - Math.random() * 0.04,
      baseVX: (Math.random() - 0.5) * 0.06,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.01 + Math.random() * 0.01,
      size: 2 + Math.random() * 3
    }));
    this.img = new Image();
    this.img.src = 'resources/img/themes/lavender/lavender1.png';
    this.running = true;
    this.img.onload = () => this.frame();
  }

  frame(){
    if(!this.running) return;
    const ctx=this.ctx;
    ctx.fillStyle='rgba(255,255,255,0.1)';
    ctx.fillRect(0,0,this.w,this.h);

    this.petals.forEach(p=>{
      p.driftPhase += p.driftSpeed;
      const varVX = Math.sin(p.driftPhase) * 0.04;
      const varVY = Math.cos(p.driftPhase*0.8) * 0.04;

      p.x += p.baseVX + varVX;
      p.y += p.baseVY + varVY;

      if(p.y < -10) p.y = this.h + 10;
      if(p.x < -10) p.x = this.w + 10;
      if(p.x > this.w + 10) p.x = -10;

      ctx.save();
      ctx.globalAlpha=0.9;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.driftPhase);
      ctx.drawImage(this.img, -p.size*5,-p.size*5,p.size*10,p.size*10);
      ctx.restore();
    });
    requestAnimationFrame(()=>this.frame());
  }

  destroy(){this.running=false;}
} 