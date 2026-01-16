// richEditorManager.js
// Manages rich text editing functionality including formatting and image paste
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module provides WYSIWYG editing capabilities for journal entries.
// It wraps a contenteditable div and adds formatting toolbar, image handling,
// keyboard shortcuts, and audio recording integration.
//
// INTEGRATION POINTS:
// - Instantiated by EditorManager for new-entry-panel and edit-entry-panel
// - Works with AudioRecorderManager for embedded audio recordings
// - Content is saved/loaded as HTML via StorageManager
//
// FEATURES:
// - Rich text formatting (bold, italic, underline, headings, quotes, lists)
// - Image paste from clipboard and drag-drop support
// - Image compression for files > 500KB
// - Link insertion with dialog
// - Keyboard shortcuts (Ctrl+B/I/U)
// - Toolbar state tracking (active button highlighting)
//
// DEPENDENCIES:
// - AudioRecorderManager for audio recording feature
// - DOM APIs: Selection, Range, execCommand, FileReader

import { AudioRecorderManager } from './audioRecorderManager.js';

/**
 * Manages a rich text editor instance with formatting toolbar and media support.
 * Each instance is bound to a specific editor panel containing a .rich-editor element.
 * 
 * @class RichEditorManager
 * @example
 * // Create editor for a panel:
 * const editor = new RichEditorManager(document.getElementById('new-entry-panel'));
 * 
 * // Get/set content:
 * const html = editor.getContent();
 * editor.setContent('<p>Hello world</p>');
 */
export class RichEditorManager {
  /**
   * Creates a RichEditorManager for the given panel.
   * 
   * @constructor
   * @param {HTMLElement} panel - The editor panel element containing:
   *                              - .rich-editor (contenteditable div)
   *                              - .editor-toolbar (formatting buttons)
   *                              - .image-upload-input (hidden file input)
   */
  constructor(panel) {
    /** @type {HTMLElement} The parent panel element */
    this.panel = panel;
    
    /** @type {HTMLElement|null} The contenteditable editor element */
    this.editor = panel.querySelector('.rich-editor');
    
    /** @type {HTMLElement|null} The formatting toolbar element */
    this.toolbar = panel.querySelector('.editor-toolbar');
    
    /** @type {HTMLInputElement|null} Hidden file input for image uploads */
    this.imageInput = panel.querySelector('.image-upload-input');
    
    if (this.editor && this.toolbar) {
      this.init();
    }
  }

  /**
   * Initializes all editor features.
   * Called automatically from constructor if required elements exist.
   * 
   * @private
   */
  init() {
    this.setupToolbar();
    this.setupImagePaste();
    this.setupImageUpload();
    this.setupKeyboardShortcuts();
    this.setupActiveStateTracking();
    this.setupAudioRecorder();
  }

  /**
   * Sanitizes HTML using the global sanitizer if available.
   * @param {string} html - Raw HTML
   * @returns {string} Sanitized HTML
   * @private
   */
  _sanitizeHtml(html) {
    if (typeof window !== 'undefined' && window.Sanitizer?.sanitizeHtml) {
      return window.Sanitizer.sanitizeHtml(html || '');
    }
    return html || '';
  }

  /**
   * Validates link URLs using the global sanitizer if available.
   * @param {string} url - URL to validate
   * @returns {string|null} Safe URL or null
   * @private
   */
  _sanitizeLinkUrl(url) {
    const trimmed = typeof url === 'string' ? url.trim() : '';
    if (!trimmed) return null;
    if (typeof window !== 'undefined' && window.Sanitizer?.isAllowedUrl) {
      return window.Sanitizer.isAllowedUrl(trimmed, 'a', 'href') ? trimmed : null;
    }
    return trimmed;
  }

  /**
   * Applies security attributes to all links in the editor.
   * @private
   */
  _enforceLinkSecurity() {
    this.editor.querySelectorAll('a[href]').forEach((link) => {
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('target', '_blank');
    });
  }

  /**
   * Initializes the audio recorder integration.
   * Creates an AudioRecorderManager instance bound to this panel.
   * 
   * @private
   */
  setupAudioRecorder() {
    /** @type {AudioRecorderManager} Audio recording handler */
    this.audioRecorder = new AudioRecorderManager(this.panel);
  }

  /**
   * Sets up click handlers for all toolbar buttons.
   * Maps data-command attributes to execCommand calls or custom handlers.
   * 
   * Button types handled:
   * - data-command="bold|italic|underline|etc" → execCommand
   * - data-command="createLink" → insertLink() dialog
   * - .insert-image-btn → triggers file input
   * - .audio-recorder-btn → skipped (has own handler)
   * 
   * @private
   */
  setupToolbar() {
    this.toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
      // Skip buttons with their own handlers
      if (btn.classList.contains('audio-recorder-btn')) return;
      if (btn.classList.contains('zen-mode-btn')) return;
      
      // Prevent mousedown from stealing focus from editor
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        const value = btn.dataset.value || null;
        
        // Route to appropriate handler based on button type
        if (command === 'createLink') {
          this.insertLink();
        } else if (btn.classList.contains('insert-image-btn')) {
          this.imageInput.click();
        } else {
          this.execCommand(command, value);
        }
        
        this.editor.focus();
      });
    });
  }

  /**
   * Executes a document editing command on the current selection.
   * Wraps document.execCommand and updates toolbar state after.
   * 
   * @param {string} command - The command to execute (e.g., 'bold', 'formatBlock')
   * @param {string|null} [value=null] - Optional value for the command (e.g., 'h2' for formatBlock)
   * @private
   */
  execCommand(command, value = null) {
    document.execCommand(command, false, value);
    this.updateToolbarState();
  }

  /**
   * Sets up listeners to track and update toolbar button active states.
   * Updates occur on keyup, mouseup, and focus to reflect current formatting.
   * 
   * @private
   */
  setupActiveStateTracking() {
    this.editor.addEventListener('keyup', () => this.updateToolbarState());
    this.editor.addEventListener('mouseup', () => this.updateToolbarState());
    this.editor.addEventListener('focus', () => this.updateToolbarState());
  }

  /**
   * Updates toolbar button active states based on current selection formatting.
   * Uses queryCommandState to check if bold/italic/underline are active.
   * 
   * @private
   */
  updateToolbarState() {
    this.toolbar.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
      const command = btn.dataset.command;
      
      // Only track state for toggle commands
      if (['bold', 'italic', 'underline'].includes(command)) {
        if (document.queryCommandState(command)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

  /**
   * Sets up keyboard shortcuts for common formatting commands.
   * 
   * Shortcuts:
   * - Ctrl/Cmd + B → Bold
   * - Ctrl/Cmd + I → Italic
   * - Ctrl/Cmd + U → Underline
   * 
   * @private
   */
  setupKeyboardShortcuts() {
    this.editor.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            this.execCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            this.execCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            this.execCommand('underline');
            break;
        }
      }
    });
  }

  /**
   * Sets up image paste and drag-drop handling.
   * Intercepts paste/drop events containing images and inserts them.
   * 
   * @private
   */
  setupImagePaste() {
    // Handle paste from clipboard
    this.editor.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          this.insertImage(file);
          return;
        }
      }

      const html = e.clipboardData.getData('text/html');
      if (html) {
        e.preventDefault();
        const sanitized = this._sanitizeHtml(html);
        document.execCommand('insertHTML', false, sanitized);
        return;
      }

      const text = e.clipboardData.getData('text/plain');
      if (text) {
        e.preventDefault();
        document.execCommand('insertText', false, text);
      }
    });

    // Handle drag and drop
    this.editor.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.editor.classList.add('drag-over');
    });

    this.editor.addEventListener('dragleave', () => {
      this.editor.classList.remove('drag-over');
    });

    this.editor.addEventListener('drop', (e) => {
      e.preventDefault();
      this.editor.classList.remove('drag-over');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        for (let file of files) {
          if (file.type.startsWith('image/')) {
            this.insertImage(file);
          }
        }
      }
    });
  }

  /**
   * Sets up the hidden file input for image uploads via toolbar button.
   * 
   * @private
   */
  setupImageUpload() {
    if (this.imageInput) {
      this.imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          this.insertImage(file);
        }
        this.imageInput.value = ''; // Reset for next upload
      });
    }
  }

  /**
   * Inserts an image file into the editor at the current cursor position.
   * Automatically compresses images larger than 500KB.
   * 
   * @param {File} file - The image file to insert
   * @private
   */
  insertImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = file.name || 'Pasted image';
      
      // Compress images larger than 500KB to save storage space
      if (file.size > 500000) {
        this.compressImage(e.target.result, (compressedSrc) => {
          img.src = compressedSrc;
          this.insertAtCursor(img);
        });
      } else {
        this.insertAtCursor(img);
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Compresses an image by resizing and reducing quality.
   * Max dimensions: 800x600, output quality: 70% JPEG.
   * 
   * @param {string} dataUrl - The image as a data URL
   * @param {function(string): void} callback - Called with compressed data URL
   * @private
   */
  compressImage(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Max dimensions for compressed output
      const maxWidth = 800;
      const maxHeight = 600;
      
      let width = img.width;
      let height = img.height;
      
      // Scale down maintaining aspect ratio
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Output as JPEG at 70% quality
      callback(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  }

  /**
   * Inserts a DOM element at the current cursor position.
   * If no selection exists, appends to end of editor.
   * Adds a line break after the element for better UX.
   * 
   * @param {HTMLElement} element - The element to insert
   * @private
   */
  insertAtCursor(element) {
    this.editor.focus();
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(element);
      
      // Move cursor after the inserted element
      range.setStartAfter(element);
      range.setEndAfter(element);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Add line break after element for easier continued typing
      const br = document.createElement('br');
      element.after(br);
    } else {
      // Fallback: append to end if no cursor position
      this.editor.appendChild(element);
    }
  }

  /**
   * Opens a dialog to insert a hyperlink.
   * If text is selected, wraps it in the link. Otherwise inserts URL as link text.
   * 
   * @private
   */
  insertLink() {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    // Create dialog
    const overlay = document.createElement('div');
    overlay.className = 'link-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'link-dialog';
    dialog.innerHTML = `
      <h4>Insert Link</h4>
      <input type="url" placeholder="https://example.com" value="" />
      <div class="link-dialog-buttons">
        <button class="cancel-btn">Cancel</button>
        <button class="confirm-btn">Insert</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    const input = dialog.querySelector('input');
    input.focus();
    
    const close = () => {
      overlay.remove();
      dialog.remove();
      this.editor.focus();
    };
    
    overlay.addEventListener('click', close);
    dialog.querySelector('.cancel-btn').addEventListener('click', close);
    
    dialog.querySelector('.confirm-btn').addEventListener('click', () => {
      const safeUrl = this._sanitizeLinkUrl(input.value);
      if (safeUrl) {
        this.editor.focus();
        
        // Restore selection
        if (selectedText) {
          document.execCommand('createLink', false, safeUrl);
          this._enforceLinkSecurity();
        } else {
          const link = document.createElement('a');
          link.href = safeUrl;
          link.textContent = safeUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          this.insertAtCursor(link);
        }
      }
      close();
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        dialog.querySelector('.confirm-btn').click();
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  /**
   * Gets the editor content as HTML string.
   * 
   * @returns {string} The editor's innerHTML
   * @public
   */
  getContent() {
    const raw = this.editor.innerHTML;
    const sanitized = this._sanitizeHtml(raw);
    if (sanitized !== raw) {
      this.editor.innerHTML = sanitized;
      AudioRecorderManager.restoreAudioPlayers(this.editor);
      this._enforceLinkSecurity();
    }
    return sanitized;
  }

  /**
   * Sets the editor content from an HTML string.
   * Also restores any embedded audio players from saved data attributes.
   * 
   * @param {string} html - The HTML content to set
   * @public
   */
  setContent(html) {
    const sanitized = this._sanitizeHtml(html || '');
    this.editor.innerHTML = sanitized;
    // Restore audio players from saved data attributes
    AudioRecorderManager.restoreAudioPlayers(this.editor);
    this._enforceLinkSecurity();
    if (typeof window !== 'undefined' && typeof window.updateEntryWordCount === 'function') {
      window.updateEntryWordCount(this.editor);
    }
  }

  /**
   * Gets the editor content as plain text (strips HTML).
   * Useful for word count, search indexing, etc.
   * 
   * @returns {string} The editor's text content
   * @public
   */
  getPlainText() {
    return this.editor.innerText || this.editor.textContent || '';
  }

  /**
   * Clears all content from the editor.
   * 
   * @public
   */
  clear() {
    this.editor.innerHTML = '';
  }

  /**
   * Focuses the editor element.
   * 
   * @public
   */
  focus() {
    this.editor.focus();
  }
}

/**
 * Factory function to initialize rich editors for all entry panels.
 * Creates RichEditorManager instances for new-entry-panel and edit-entry-panel.
 * 
 * @returns {Map<string, RichEditorManager>} Map of panel IDs to editor instances
 * @example
 * const editors = initRichEditors();
 * const newEditor = editors.get('new-entry-panel');
 */
export function initRichEditors() {
  const panels = document.querySelectorAll('#new-entry-panel, #edit-entry-panel');
  const editors = new Map();
  
  panels.forEach(panel => {
    const editor = new RichEditorManager(panel);
    editors.set(panel.id, editor);
  });
  
  return editors;
}
