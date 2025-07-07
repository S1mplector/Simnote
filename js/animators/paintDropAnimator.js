// paintDropAnimator.js
export class PaintDropAnimator {
  constructor(panelEl) {
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