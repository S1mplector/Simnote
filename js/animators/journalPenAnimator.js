// journalPenAnimator.js
// Animated pen icon for new entry button
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This animator replaces the new entry button icon with an animated
// pen that writes on hover. Features:
// - Paper with lines element
// - Pen with tip and body
// - Ink dots appearing during writing
// - Auto-stop after timeout
//
// STATES:
// - idle: Pen resting, no animation
// - writing: Pen moving, ink dots appearing
//
// DEPENDENCIES:
// - New entry button with id 'new-entry-btn'
// - CSS animations for writing effect

/**
 * Animated pen icon for new entry button.
 * Shows writing animation on hover.
 * 
 * @class JournalPenAnimator
 */
export class JournalPenAnimator {
  /**
   * Creates JournalPenAnimator and replaces icon.
   * @constructor
   */
  constructor() {
    /** @type {HTMLElement} Journal button element */
    this.journalBtn = document.getElementById('new-entry-btn');
    if (!this.journalBtn) return;

    this.state = 'idle';
    this.writeTimeout = null;
    
    this.replacePenIcon();
    this.attachEventListeners();
  }

  replacePenIcon() {
    const svg = this.journalBtn.querySelector('.nav-icon-svg');
    if (!svg) return;

    const penContainer = document.createElement('div');
    penContainer.className = 'journal-pen idle';
    penContainer.innerHTML = `
      <div class="journal-pen-paper"></div>
      <div class="journal-pen-line"></div>
      <div class="journal-pen-line"></div>
      <div class="journal-pen-line"></div>
      <div class="journal-pen-ink"></div>
      <div class="journal-pen-ink"></div>
      <div class="journal-pen-ink"></div>
      <div class="journal-pen-body"></div>
      <div class="journal-pen-tip"></div>
    `;

    svg.replaceWith(penContainer);
    this.pen = penContainer;
  }

  attachEventListeners() {
    this.journalBtn.addEventListener('mouseenter', () => this.onHover());
    this.journalBtn.addEventListener('mouseleave', () => this.onLeave());
  }

  onHover() {
    if (this.state === 'idle') {
      this.startWriting();
    }
    
    clearTimeout(this.writeTimeout);
  }

  onLeave() {
    clearTimeout(this.writeTimeout);
    
    if (this.state === 'writing') {
      this.writeTimeout = setTimeout(() => {
        this.stopWriting();
      }, 2000);
    }
  }

  startWriting() {
    this.state = 'writing';
    this.pen.classList.remove('idle');
    this.pen.classList.add('writing');
    
    this.writeTimeout = setTimeout(() => {
      this.stopWriting();
    }, 4000);
  }

  stopWriting() {
    this.state = 'idle';
    this.pen.classList.remove('writing');
    this.pen.classList.add('idle');
  }

  destroy() {
    clearTimeout(this.writeTimeout);
  }
}
