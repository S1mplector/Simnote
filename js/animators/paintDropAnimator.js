// paintDropAnimator.js
// Paint drop expand animation for panel reveals
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This animator creates a paint-drop expand effect when clicking
// a circular button. The effect expands from the button center.
// Features:
// - Circular overlay expanding from click point
// - CSS custom properties for position
// - Panel reveal after expansion
// - Fade out of overlay
//
// ANIMATION SEQUENCE:
// 1. Click on paint-circle-btn
// 2. Overlay circle expands from button center
// 3. Panel gets 'expand' class
// 4. Overlay fades out and removes itself
//
// DEPENDENCIES:
// - Panel element with .paint-circle-btn child
// - CSS for .paint-drop-overlay animations

/**
 * Paint drop expand animation for panel reveals.
 * Creates circular expansion from button click.
 * 
 * @class PaintDropAnimator
 */
export class PaintDropAnimator {
  /**
   * Creates PaintDropAnimator for a panel.
   * @param {HTMLElement} panelEl - Panel element containing paint button
   * @constructor
   */
  constructor(panelEl) {
    /** @type {HTMLElement} Panel element */
    this.panel = panelEl;
    this.button = panelEl.querySelector('.paint-circle-btn');
    if (this.button) {
      this.button.addEventListener('click', () => this.start());
    }
  }

  start() {
    if (!this.button) return;

    // Get button centre relative to panel
    const btnRect = this.button.getBoundingClientRect();
    const panelRect = this.panel.getBoundingClientRect();
    const cx = btnRect.left - panelRect.left + btnRect.width / 2;
    const cy = btnRect.top - panelRect.top + btnRect.height / 2;

    // Create overlay circle
    const overlay = document.createElement('div');
    overlay.className = 'paint-drop-overlay';
    overlay.style.setProperty('--cx', `${cx}px`);
    overlay.style.setProperty('--cy', `${cy}px`);
    this.panel.appendChild(overlay);

    // Force reflow then trigger animation
    void overlay.offsetWidth;
    overlay.classList.add('expand');

    // Listen for scale transition end (first transition)
    overlay.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'transform') return;

      // reveal contents
      this.panel.classList.add('expand');

      // trigger fade out of overlay
      overlay.classList.add('fade-out');
    }, { once: true });

    // Remove overlay after opacity transition ends
    overlay.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'opacity') {
        overlay.remove();
      }
    });
  }
} 