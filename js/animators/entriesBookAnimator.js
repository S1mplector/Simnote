export class EntriesBookAnimator {
  constructor() {
    this.entriesBtn = document.getElementById('load-entry-btn');
    if (!this.entriesBtn) return;

    this.state = 'idle';
    this.flipTimeout = null;
    
    this.replaceBookIcon();
    this.attachEventListeners();
  }

  replaceBookIcon() {
    const svg = this.entriesBtn.querySelector('.nav-icon-svg');
    if (!svg) return;

    const bookContainer = document.createElement('div');
    bookContainer.className = 'entries-book idle';
    bookContainer.innerHTML = `
      <div class="entries-book-cover-left"></div>
      <div class="entries-book-spine"></div>
      <div class="entries-book-cover-right"></div>
      <div class="entries-book-page"></div>
      <div class="entries-book-page"></div>
      <div class="entries-book-page"></div>
      <div class="entries-book-bookmark"></div>
    `;

    svg.replaceWith(bookContainer);
    this.book = bookContainer;
  }

  attachEventListeners() {
    this.entriesBtn.addEventListener('mouseenter', () => this.onHover());
    this.entriesBtn.addEventListener('mouseleave', () => this.onLeave());
  }

  onHover() {
    if (this.state === 'idle') {
      this.startFlipping();
    }
    
    clearTimeout(this.flipTimeout);
  }

  onLeave() {
    clearTimeout(this.flipTimeout);
    
    if (this.state === 'flipping') {
      this.flipTimeout = setTimeout(() => {
        this.stopFlipping();
      }, 2000);
    }
  }

  startFlipping() {
    this.state = 'flipping';
    this.book.classList.remove('idle');
    this.book.classList.add('flipping');
    
    this.flipTimeout = setTimeout(() => {
      this.stopFlipping();
    }, 4000);
  }

  stopFlipping() {
    this.state = 'idle';
    this.book.classList.remove('flipping');
    this.book.classList.add('idle');
  }

  destroy() {
    clearTimeout(this.flipTimeout);
  }
}
