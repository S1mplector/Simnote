export class JournalPenAnimator {
  constructor() {
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
