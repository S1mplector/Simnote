// sepiaSweepSplashAnimator.js
// Warm sepia gradient sweep splash for sepia theme.
export class SepiaSweepSplashAnimator {
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
      background: '#f4ecd8'
    });

    this.sweep = document.createElement('div');
    Object.assign(this.sweep.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '200%',
      height: '100%',
      background: 'linear-gradient(120deg, #e8dcc8 0%, #d4c4a8 50%, #e8dcc8 100%)',
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
