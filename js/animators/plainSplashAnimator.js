// plainSplashAnimator.js
// Minimal fade-in/out splash for plain themes (dark / light). It simply shows an overlay with the app name then fades.
export class PlainSplashAnimator {
  /**
   * @param {Function} onComplete Callback executed when the splash has finished and disappeared.
   */
  constructor(onComplete = () => {}) {
    this.onComplete = onComplete;

    this.overlay = document.createElement('div');
    this.overlay.id = 'plain-splash-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '3rem',
      fontFamily: 'Space Grotesk, sans-serif',
      letterSpacing: '2px',
      zIndex: 9999,
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.8s ease'
    });
    this.overlay.textContent = 'Simnote';
    document.body.appendChild(this.overlay);

    // Fade in quickly
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
    });

    // Hold for a short moment, then fade out and finish
    setTimeout(() => {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        this.overlay.remove();
        this.onComplete();
      }, 800);
    }, 1200);
  }
} 
