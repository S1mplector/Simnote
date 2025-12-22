// keyboardManager.js
// Global keyboard shortcuts for Simnote

export class KeyboardManager {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.init();
  }

  init() {
    // Register default shortcuts
    this.registerDefaults();
    
    // Global keyboard listener
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Disable shortcuts when typing in inputs
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('input, textarea, [contenteditable]')) {
        this.enabled = false;
      }
    });
    
    document.addEventListener('focusout', (e) => {
      if (e.target.matches('input, textarea, [contenteditable]')) {
        this.enabled = true;
      }
    });
  }

  registerDefaults() {
    // Navigation shortcuts
    this.register('n', { ctrl: true }, () => {
      const newEntryBtn = document.getElementById('new-entry-btn');
      if (newEntryBtn && this.isMainPanelVisible()) newEntryBtn.click();
    }, 'New Entry');

    this.register('e', { ctrl: true }, () => {
      const loadEntryBtn = document.getElementById('load-entry-btn');
      if (loadEntryBtn && this.isMainPanelVisible()) loadEntryBtn.click();
    }, 'View Entries');

    this.register('i', { ctrl: true }, () => {
      const statsBtn = document.getElementById('stats-btn');
      if (statsBtn && this.isMainPanelVisible()) statsBtn.click();
    }, 'View Insights');

    // Save shortcut
    this.register('s', { ctrl: true }, (e) => {
      e.preventDefault();
      const visiblePanel = document.querySelector('#new-entry-panel:not([style*="display: none"]), #edit-entry-panel:not([style*="display: none"])');
      if (visiblePanel) {
        const saveBtn = visiblePanel.querySelector('.save-btn');
        if (saveBtn) saveBtn.click();
      }
    }, 'Save Entry');

    // Escape to go back
    this.register('Escape', {}, () => {
      const backBtn = document.querySelector(
        '#new-entry-panel:not([style*="display: none"]) .back-btn, ' +
        '#edit-entry-panel:not([style*="display: none"]) .back-btn, ' +
        '#journal-panel:not([style*="display: none"]) .back-to-menu, ' +
        '#stats-panel:not([style*="display: none"]) .stats-back-btn, ' +
        '#chat-panel:not([style*="display: none"]) .chat-back-btn'
      );
      if (backBtn) backBtn.click();
    }, 'Go Back');

    // Search shortcut
    this.register('/', { ctrl: true }, (e) => {
      e.preventDefault();
      const searchBtn = document.getElementById('search-toggle-btn');
      const searchInput = document.getElementById('entry-search');
      if (searchBtn && searchInput) {
        if (searchInput.classList.contains('collapsed')) {
          searchBtn.click();
        }
        searchInput.focus();
      }
    }, 'Search Entries');

    // Toggle theme settings
    this.register(',', { ctrl: true }, (e) => {
      e.preventDefault();
      const themeBtn = document.getElementById('theme-settings-btn');
      if (themeBtn) themeBtn.click();
    }, 'Settings');

    // Keyboard shortcuts help
    this.register('?', { shift: true }, () => {
      this.showShortcutsHelp();
    }, 'Show Shortcuts');
  }

  register(key, modifiers = {}, callback, description = '') {
    const shortcutKey = this.getShortcutKey(key, modifiers);
    this.shortcuts.set(shortcutKey, { callback, description, key, modifiers });
  }

  getShortcutKey(key, modifiers) {
    const parts = [];
    if (modifiers.ctrl) parts.push('ctrl');
    if (modifiers.shift) parts.push('shift');
    if (modifiers.alt) parts.push('alt');
    if (modifiers.meta) parts.push('meta');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }

  handleKeydown(e) {
    // Skip if shortcuts disabled or in input
    if (!this.enabled && !e.key.match(/^(Escape)$/i)) return;
    
    const shortcutKey = this.getShortcutKey(e.key, {
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey
    });

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      shortcut.callback(e);
    }
  }

  isMainPanelVisible() {
    const mainPanel = document.getElementById('main-panel');
    return mainPanel && mainPanel.style.display !== 'none' && 
           mainPanel.style.opacity !== '0';
  }

  showShortcutsHelp() {
    // Check if modal already exists
    let modal = document.getElementById('shortcuts-modal');
    if (modal) {
      modal.remove();
      return;
    }

    modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'shortcuts-modal';
    
    const shortcuts = Array.from(this.shortcuts.entries()).map(([key, data]) => {
      const keyDisplay = this.formatShortcut(data.key, data.modifiers);
      return `<div class="shortcut-row">
        <span class="shortcut-keys">${keyDisplay}</span>
        <span class="shortcut-desc">${data.description}</span>
      </div>`;
    }).join('');

    modal.innerHTML = `
      <div class="shortcuts-content">
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcuts-list">${shortcuts}</div>
        <p class="shortcuts-hint">Press <kbd>Shift</kbd> + <kbd>?</kbd> to toggle this help</p>
        <button class="button-33 shortcuts-close" data-emoji="❌">Close</button>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Animate in
    requestAnimationFrame(() => modal.classList.add('visible'));

    // Close handlers
    modal.querySelector('.shortcuts-close').addEventListener('click', () => {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
      }
    });
  }

  formatShortcut(key, modifiers) {
    const parts = [];
    if (modifiers.ctrl) parts.push('<kbd>Ctrl</kbd>');
    if (modifiers.shift) parts.push('<kbd>Shift</kbd>');
    if (modifiers.alt) parts.push('<kbd>Alt</kbd>');
    if (modifiers.meta) parts.push('<kbd>⌘</kbd>');
    parts.push(`<kbd>${key.toUpperCase()}</kbd>`);
    return parts.join(' + ');
  }
}
