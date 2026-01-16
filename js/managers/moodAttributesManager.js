// moodAttributesManager.js
// Manages mood attributes (reasons/tags for how user feels) with iOS-style interactions
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module provides an iOS-style grid of selectable mood attributes
// (reasons why user feels a certain way). Features include:
// - Selectable attribute grid with emoji icons
// - Long-press to enter edit mode (iOS-style jiggle)
// - Drag-and-drop reordering
// - Add/delete custom attributes
// - Persistent storage in localStorage
//
// INTERACTIONS:
// - Tap: Toggle selection
// - Long press (500ms): Enter edit mode
// - Drag in edit mode: Reorder attributes
// - Delete badge (edit mode): Remove attribute
//
// DEPENDENCIES:
// - localStorage for persistence

/**
 * Escapes HTML special characters for safe innerHTML usage.
 * @param {string} value - Raw text value
 * @returns {string}
 * @private
 */
function escapeHtml(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Manages mood attributes grid with iOS-style interactions.
 * Supports selection, editing, drag-drop reordering, and custom attributes.
 * 
 * @class MoodAttributesManager
 */
export class MoodAttributesManager {
  /**
   * Creates MoodAttributesManager and initializes UI.
   * @constructor
   */
  constructor() {
    /** @type {string} localStorage key for attributes */
    this.storageKey = 'simnote_mood_attributes';
    /** @type {HTMLElement} Attributes panel element */
    this.panel = document.getElementById('mood-attributes-panel');
    /** @type {HTMLElement} Grid container for attribute items */
    this.grid = this.panel?.querySelector('.attributes-grid');
    /** @type {HTMLElement} Add attribute button */
    this.addBtn = this.panel?.querySelector('.add-attribute-btn');
    /** @type {HTMLElement} Next/continue button */
    this.nextBtn = this.panel?.querySelector('.attributes-next-btn');
    /** @type {HTMLElement} Back button */
    this.backBtn = this.panel?.querySelector('.attributes-back-btn');
    
    /** @type {Array} Array of attribute objects */
    this.attributes = this.loadAttributes();
    /** @type {string[]} IDs of currently selected attributes */
    this.selectedAttributes = [];
    /** @type {boolean} Whether in edit/reorder mode */
    this.editMode = false;
    /** @type {HTMLElement|null} Currently dragged element */
    this.draggedEl = null;
    /** @type {number|null} Long press timer ID */
    this.longPressTimer = null;
    /** @type {number} Milliseconds for long press detection */
    this.longPressDelay = 500;
    
    this.init();
  }

  /**
   * Returns default attribute set.
   * @returns {Array<{id: string, name: string, emoji: string, order: number}>}
   */
  getDefaultAttributes() {
    return [
      { id: 'work', name: 'Work', emoji: '💼', order: 0 },
      { id: 'family', name: 'Family', emoji: '👨‍👩‍👧', order: 1 },
      { id: 'health', name: 'Health', emoji: '🏥', order: 2 },
      { id: 'exercise', name: 'Exercise', emoji: '🏃', order: 3 },
      { id: 'sleep', name: 'Sleep', emoji: '😴', order: 4 },
      { id: 'food', name: 'Food', emoji: '🍽️', order: 5 },
      { id: 'friends', name: 'Friends', emoji: '👥', order: 6 },
      { id: 'weather', name: 'Weather', emoji: '🌤️', order: 7 },
      { id: 'music', name: 'Music', emoji: '🎵', order: 8 },
      { id: 'money', name: 'Money', emoji: '💰', order: 9 },
      { id: 'love', name: 'Love', emoji: '❤️', order: 10 },
      { id: 'hobby', name: 'Hobby', emoji: '🎨', order: 11 },
    ];
  }

  /**
   * Loads attributes from localStorage or returns defaults.
   * @returns {Array} Attribute objects
   */
  loadAttributes() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse mood attributes:', e);
      }
    }
    // Return defaults if nothing stored
    const defaults = this.getDefaultAttributes();
    this.saveAttributes(defaults);
    return defaults;
  }

  /**
   * Saves attributes to localStorage.
   * @param {Array} [attrs=this.attributes] - Attributes to save
   */
  saveAttributes(attrs = this.attributes) {
    localStorage.setItem(this.storageKey, JSON.stringify(attrs));
  }

  /**
   * Initializes the grid and event bindings.
   * @private
   */
  init() {
    if (!this.panel || !this.grid) return;
    
    this.renderGrid();
    this.bindEvents();
  }

  /**
   * Renders the attribute grid with all items.
   * @private
   */
  renderGrid() {
    if (!this.grid) return;
    
    // Sort by order
    const sorted = [...this.attributes].sort((a, b) => a.order - b.order);
    
    this.grid.innerHTML = '';
    
    sorted.forEach(attr => {
      const item = this.createAttributeElement(attr);
      this.grid.appendChild(item);
    });
    
    // Add the "+" button at the end
    const addItem = document.createElement('div');
    addItem.className = 'attribute-item add-new';
    addItem.innerHTML = `
      <div class="attribute-icon">➕</div>
      <div class="attribute-name">Add</div>
    `;
    addItem.addEventListener('click', () => this.showAddDialog());
    this.grid.appendChild(addItem);
  }

  /**
   * Creates a DOM element for an attribute.
   * @param {Object} attr - Attribute object
   * @returns {HTMLElement} Attribute element
   * @private
   */
  createAttributeElement(attr) {
    const item = document.createElement('div');
    item.className = 'attribute-item';
    item.dataset.id = attr.id;
    if (this.selectedAttributes.includes(attr.id)) {
      item.classList.add('selected');
    }
    
    const safeEmoji = escapeHtml(String(attr.emoji || ''));
    const safeName = escapeHtml(String(attr.name || ''));
    item.innerHTML = `
      <div class="attribute-icon">${safeEmoji}</div>
      <div class="attribute-name">${safeName}</div>
      <button class="delete-badge" aria-label="Delete ${safeName}">×</button>
    `;
    
    // Bind interactions
    this.bindItemEvents(item, attr);
    
    return item;
  }

  /**
   * Binds touch/mouse events to an attribute item.
   * @param {HTMLElement} item - The item element
   * @param {Object} attr - The attribute data
   * @private
   */
  bindItemEvents(item, attr) {
    const deleteBadge = item.querySelector('.delete-badge');
    
    // Delete button (only visible in edit mode)
    deleteBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAttribute(attr.id);
    });
    
    // Touch/mouse events for long press and drag
    let startX, startY, isDragging = false;
    
    const onStart = (e) => {
      if (this.editMode) {
        // In edit mode, start drag immediately
        this.startDrag(item, e);
        return;
      }
      
      // Start long press timer
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      
      this.longPressTimer = setTimeout(() => {
        this.enterEditMode();
      }, this.longPressDelay);
    };
    
    const onMove = (e) => {
      if (this.editMode && this.draggedEl) {
        this.onDrag(e);
        return;
      }
      
      // Cancel long press if moved too much
      const touch = e.touches ? e.touches[0] : e;
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(this.longPressTimer);
      }
    };
    
    const onEnd = (e) => {
      clearTimeout(this.longPressTimer);
      
      if (this.editMode && this.draggedEl) {
        this.endDrag();
        return;
      }
      
      // Normal tap - toggle selection (only if not in edit mode)
      if (!this.editMode) {
        this.toggleSelection(attr.id);
      }
    };
    
    // Mouse events
    item.addEventListener('mousedown', onStart);
    item.addEventListener('mousemove', onMove);
    item.addEventListener('mouseup', onEnd);
    item.addEventListener('mouseleave', () => {
      clearTimeout(this.longPressTimer);
      if (this.draggedEl) this.endDrag();
    });
    
    // Touch events
    item.addEventListener('touchstart', onStart, { passive: true });
    item.addEventListener('touchmove', onMove, { passive: false });
    item.addEventListener('touchend', onEnd);
    item.addEventListener('touchcancel', () => {
      clearTimeout(this.longPressTimer);
      if (this.draggedEl) this.endDrag();
    });
  }

  /**
   * Toggles selection state of an attribute.
   * @param {string} id - Attribute ID
   */
  toggleSelection(id) {
    const idx = this.selectedAttributes.indexOf(id);
    if (idx === -1) {
      this.selectedAttributes.push(id);
    } else {
      this.selectedAttributes.splice(idx, 1);
    }
    
    // Update UI
    const item = this.grid.querySelector(`[data-id="${id}"]`);
    if (item) {
      item.classList.toggle('selected', this.selectedAttributes.includes(id));
    }
  }

  /**
   * Enters edit mode with haptic feedback.
   */
  enterEditMode() {
    this.editMode = true;
    this.panel.classList.add('edit-mode');
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  /**
   * Exits edit mode.
   */
  exitEditMode() {
    this.editMode = false;
    this.panel.classList.remove('edit-mode');
    this.draggedEl = null;
  }

  /**
   * Starts drag operation on an item.
   * @param {HTMLElement} item - Item to drag
   * @param {Event} e - Mouse/touch event
   * @private
   */
  startDrag(item, e) {
    if (item.classList.contains('add-new')) return;
    
    this.draggedEl = item;
    item.classList.add('dragging');
    
    const touch = e.touches ? e.touches[0] : e;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  /**
   * Handles drag movement.
   * @param {Event} e - Mouse/touch event
   * @private
   */
  onDrag(e) {
    if (!this.draggedEl) return;
    
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    
    this.dragOffsetX = touch.clientX - this.dragStartX;
    this.dragOffsetY = touch.clientY - this.dragStartY;
    
    this.draggedEl.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(1.1)`;
    
    // Check for swap with other items
    this.checkSwap(touch.clientX, touch.clientY);
  }

  /**
   * Checks if dragged item should swap with another.
   * @param {number} x - Current X position
   * @param {number} y - Current Y position
   * @private
   */
  checkSwap(x, y) {
    const items = this.grid.querySelectorAll('.attribute-item:not(.add-new):not(.dragging)');
    
    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (dist < 40) {
        // Swap positions
        this.swapAttributes(this.draggedEl.dataset.id, item.dataset.id);
      }
    });
  }

  /**
   * Swaps order of two attributes.
   * @param {string} id1 - First attribute ID
   * @param {string} id2 - Second attribute ID
   * @private
   */
  swapAttributes(id1, id2) {
    const attr1 = this.attributes.find(a => a.id === id1);
    const attr2 = this.attributes.find(a => a.id === id2);
    
    if (!attr1 || !attr2) return;
    
    // Swap order values
    const tempOrder = attr1.order;
    attr1.order = attr2.order;
    attr2.order = tempOrder;
    
    this.saveAttributes();
    
    // Re-render without losing edit mode
    const wasEditMode = this.editMode;
    this.renderGrid();
    if (wasEditMode) {
      this.panel.classList.add('edit-mode');
      this.editMode = true;
    }
  }

  /**
   * Ends drag operation.
   * @private
   */
  endDrag() {
    if (this.draggedEl) {
      this.draggedEl.style.transform = '';
      this.draggedEl.classList.remove('dragging');
      this.draggedEl = null;
    }
  }

  /**
   * Deletes an attribute by ID.
   * @param {string} id - Attribute ID to delete
   */
  deleteAttribute(id) {
    const attr = this.attributes.find(a => a.id === id);
    if (!attr) return;
    
    // Remove from attributes
    this.attributes = this.attributes.filter(a => a.id !== id);
    
    // Remove from selection if selected
    this.selectedAttributes = this.selectedAttributes.filter(sid => sid !== id);
    
    // Re-order remaining
    this.attributes.sort((a, b) => a.order - b.order).forEach((a, i) => {
      a.order = i;
    });
    
    this.saveAttributes();
    this.renderGrid();
    
    // Stay in edit mode
    if (this.editMode) {
      this.panel.classList.add('edit-mode');
    }
  }

  /**
   * Adds a new custom attribute.
   * @param {string} name - Attribute name
   * @param {string} emoji - Emoji icon
   */
  addAttribute(name, emoji) {
    const id = 'custom_' + Date.now();
    const maxOrder = Math.max(...this.attributes.map(a => a.order), -1);
    
    const newAttr = {
      id,
      name: name.trim(),
      emoji: emoji || '📌',
      order: maxOrder + 1
    };
    
    this.attributes.push(newAttr);
    this.saveAttributes();
    this.renderGrid();
    
    // Stay in edit mode if we were in it
    if (this.editMode) {
      this.panel.classList.add('edit-mode');
    }
  }

  /**
   * Shows dialog for adding a new attribute.
   */
  showAddDialog() {
    this.exitEditMode();
    
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'attribute-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'attribute-dialog';
    dialog.innerHTML = `
      <h3>Add Attribute</h3>
      <div class="dialog-field">
        <label>Emoji</label>
        <input type="text" class="emoji-input" maxlength="2" placeholder="😊" />
      </div>
      <div class="dialog-field">
        <label>Name</label>
        <input type="text" class="name-input" maxlength="20" placeholder="e.g. Travel" />
      </div>
      <div class="dialog-buttons">
        <button class="cancel-btn">Cancel</button>
        <button class="save-btn">Add</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus name input
    setTimeout(() => dialog.querySelector('.name-input').focus(), 100);
    
    // Bind events
    const emojiInput = dialog.querySelector('.emoji-input');
    const nameInput = dialog.querySelector('.name-input');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const saveBtn = dialog.querySelector('.save-btn');
    
    const close = () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 200);
    };
    
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const emoji = emojiInput.value.trim() || '📌';
      
      if (!name) {
        nameInput.focus();
        nameInput.style.borderColor = '#f66';
        return;
      }
      
      this.addAttribute(name, emoji);
      close();
    });
    
    // Enter key to save
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveBtn.click();
    });
  }

  /**
   * Binds global event listeners.
   * @private
   */
  bindEvents() {
    // Click outside grid to exit edit mode
    document.addEventListener('click', (e) => {
      if (this.editMode && !this.grid.contains(e.target)) {
        this.exitEditMode();
      }
    });
    
    // Next button
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.exitEditMode();
        // Dispatch event with selected attributes
        window.dispatchEvent(new CustomEvent('moodAttributesSelected', {
          detail: { attributes: this.getSelectedAttributeObjects() }
        }));
      });
    }
    
    // Back button
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => {
        this.exitEditMode();
        window.dispatchEvent(new CustomEvent('moodAttributesBack'));
      });
    }
    
    // Escape key to exit edit mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.editMode) {
        this.exitEditMode();
      }
    });
  }

  /**
   * Gets full objects for selected attributes.
   * @returns {Array} Selected attribute objects
   */
  getSelectedAttributeObjects() {
    return this.attributes.filter(a => this.selectedAttributes.includes(a.id));
  }

  /**
   * Gets names of selected attributes.
   * @returns {string[]} Array of selected attribute names
   */
  getSelectedAttributeNames() {
    return this.getSelectedAttributeObjects().map(a => a.name);
  }

  /**
   * Resets selection and edit mode.
   */
  reset() {
    this.selectedAttributes = [];
    this.exitEditMode();
    this.renderGrid();
  }

  /**
   * Shows the attributes panel.
   */
  show() {
    this.reset();
    this.panel.style.display = 'block';
  }

  /**
   * Hides the attributes panel.
   */
  hide() {
    this.exitEditMode();
    this.panel.style.display = 'none';
  }
}
