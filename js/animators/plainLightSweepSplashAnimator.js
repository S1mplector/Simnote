// plainLightSweepSplashAnimator.js
// Light grey gradient sweep splash for light theme
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// Mac-style gradient sweep animation for light theme splash.
// Features:
// - Full-screen white overlay
// - Light grey gradient bar sweep
// - Fade out after sweep completes
//
// ANIMATION:
// - Gradient sweeps left to right (1.4s)
// - Overlay fades out (0.6s)
// - Safety timeout at 3 seconds
//
// DEPENDENCIES:
// - None (self-contained DOM creation)

/**
 * Light gradient sweep splash animator.
 * Mac-style sweep for plain-light theme.
 * 
 * @class PlainLightSweepSplashAnimator
 */
export class PlainLightSweepSplashAnimator {
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;

    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      zIndex: 9999,
      pointerEvents: 'none',
      background: '#ffffff'
    });

    this.sweep = document.createElement('div');
    Object.assign(this.sweep.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '200%',
      height: '100%',
      background: 'linear-gradient(120deg, #f0f0f0 0%, #dcdcdc 50%, #f0f0f0 100%)',
      transform: 'translateX(-100%)',
      transition: 'transform 1.4s ease'
    });

    this.container.appendChild(this.sweep);
    document.body.appendChild(this.container);

    requestAnimationFrame(() => {
      this.sweep.style.transform = 'translateX(0)';
    });

    this.sweep.addEventListener('transitionend', () => {
      this.container.style.transition = 'opacity 0.6s ease';
      this.container.style.opacity = '0';
      setTimeout(() => {
        this.container.remove();
        this.onComplete();
      }, 600);
    }, { once: true });

    setTimeout(() => {
      if (this.container.parentElement) {
        this.container.remove();
        this.onComplete();
      }
    }, 3000);
  }
} 