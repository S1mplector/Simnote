// plainDarkSweepSplashAnimator.js
// Minimal mac-style grey gradient sweep for plain-dark theme.
export class PlainDarkSweepSplashAnimator {
  /**
   * @param {Function} onComplete Callback fired once the sweep finishes.
   */
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;

    // Outer overlay covers the viewport
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
      background: '#2b2b2b' // plain-dark background colour
    });

    // Sweeping gradient bar (double width so we can translate fully)
    this.sweep = document.createElement('div');
    Object.assign(this.sweep.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '200%',
      height: '100%',
      background: 'linear-gradient(120deg, #1e1e1e 0%, #3a3a3a 50%, #1e1e1e 100%)',
      transform: 'translateX(-100%)',
      transition: 'transform 1.4s ease'
    });

    this.container.appendChild(this.sweep);
    document.body.appendChild(this.container);

    // Trigger the sweep on the next frame
    requestAnimationFrame(() => {
      this.sweep.style.transform = 'translateX(0)';
    });

    // Cleanup after transition ends
    this.sweep.addEventListener('transitionend', () => {
      // Fade out overlay quickly
      this.container.style.transition = 'opacity 0.6s ease';
      this.container.style.opacity = '0';
      setTimeout(() => {
        this.container.remove();
        this.onComplete();
      }, 600);
    }, { once: true });

    // Fallback safety removal after 3s
    setTimeout(() => {
      if (this.container.parentElement) {
        this.container.remove();
        this.onComplete();
      }
    }, 3000);
  }
} 