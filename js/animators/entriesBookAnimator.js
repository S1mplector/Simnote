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
      <div class="entries-book-cover-right"></div>
      <div class="entries-book-pages">
        <div class="entries-book-page-line"></div>
        <div class="entries-book-page-line"></div>
        <div class="entries-book-page-line"></div>
        <div class="entries-book-page-line"></div>
        <div class="entries-book-page-line"></div>
        <div class="entries-book-page-line"></div>
      </div>
    `;

    svg.replaceWith(bookContainer);
    this.book = bookContainer;
  }

  attachEventListeners() {
    this.entriesBtn.addEventListener('mouseenter', () => this.onHover());
    this.entriesBtn.addEventListener('mouseleave', () => this.onLeave());
  }

  onHover() {
    this.state = 'opening';
    this.book.classList.remove('idle');
    this.book.classList.add('opening');
  }

  onLeave() {
    this.state = 'idle';
    this.book.classList.remove('opening');
    this.book.classList.add('idle');
  }

  destroy() {
    clearTimeout(this.flipTimeout);
  }
}
