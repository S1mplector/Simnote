// richEditorManager.js
// Manages rich text editing functionality including formatting and image paste

export class RichEditorManager {
  constructor(panel) {
    this.panel = panel;
    this.editor = panel.querySelector('.rich-editor');
    this.toolbar = panel.querySelector('.editor-toolbar');
    this.imageInput = panel.querySelector('.image-upload-input');
    
    if (this.editor && this.toolbar) {
      this.init();
    }
  }

  init() {
    this.setupToolbar();
    this.setupImagePaste();
    this.setupImageUpload();
    this.setupKeyboardShortcuts();
    this.setupActiveStateTracking();
  }

  setupToolbar() {
    this.toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent losing focus from editor
      });
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        const value = btn.dataset.value || null;
        
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

  execCommand(command, value = null) {
    document.execCommand(command, false, value);
    this.updateToolbarState();
  }

  setupActiveStateTracking() {
    this.editor.addEventListener('keyup', () => this.updateToolbarState());
    this.editor.addEventListener('mouseup', () => this.updateToolbarState());
    this.editor.addEventListener('focus', () => this.updateToolbarState());
  }

  updateToolbarState() {
    this.toolbar.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
      const command = btn.dataset.command;
      
      // Check if command is active
      if (['bold', 'italic', 'underline'].includes(command)) {
        if (document.queryCommandState(command)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

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

  setupImagePaste() {
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
    });

    // Also handle drag and drop
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

  insertImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = file.name || 'Pasted image';
      
      // Compress large images
      if (file.size > 500000) { // 500KB
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

  compressImage(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Max dimensions
      const maxWidth = 800;
      const maxHeight = 600;
      
      let width = img.width;
      let height = img.height;
      
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
      
      callback(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  }

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
      
      // Add line break after image
      const br = document.createElement('br');
      element.after(br);
    } else {
      this.editor.appendChild(element);
    }
  }

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
      const url = input.value.trim();
      if (url) {
        this.editor.focus();
        
        // Restore selection
        if (selectedText) {
          document.execCommand('createLink', false, url);
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.textContent = url;
          link.target = '_blank';
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

  // Get content as HTML
  getContent() {
    return this.editor.innerHTML;
  }

  // Set content from HTML
  setContent(html) {
    this.editor.innerHTML = html || '';
  }

  // Get content as plain text (for word count, etc.)
  getPlainText() {
    return this.editor.innerText || this.editor.textContent || '';
  }

  // Clear the editor
  clear() {
    this.editor.innerHTML = '';
  }

  // Focus the editor
  focus() {
    this.editor.focus();
  }
}

// Initialize rich editors for all panels
export function initRichEditors() {
  const panels = document.querySelectorAll('#new-entry-panel, #edit-entry-panel');
  const editors = new Map();
  
  panels.forEach(panel => {
    const editor = new RichEditorManager(panel);
    editors.set(panel.id, editor);
  });
  
  return editors;
}
