// editorManager.js
// Central manager for journal entry editing, display, and navigation
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This is the main controller for the journal functionality. It orchestrates:
// - Entry creation, editing, and deletion workflows
// - Panel navigation between journal list, new entry, and edit entry views
// - Entry list display with filtering, sorting, and search
// - Autosave functionality with debouncing
// - Tag management for entries
// - Calendar date picker for filtering
//
// INTEGRATION POINTS:
// - StorageManager: Persistence layer for entries
// - PanelManager: Panel transition animations
// - RichEditorManager: Rich text editing in entry panels
// - MoodEmojiMapper: Mood display formatting
// - PaintDropAnimator: Entry panel expansion animation
//
// STATE MANAGEMENT:
// - currentEntryId/Index: Currently selected entry for editing
// - filterDate/filterTags/showFavoritesOnly: Active filters
// - searchQuery: Text search filter
// - sortMode: Entry list sorting (newest/oldest/az/mood)
// - currentTags: Tags for the entry being edited
// - richEditors: Map of panel IDs to RichEditorManager instances
//
// AUTOSAVE:
// - Live autosave triggers on input with 300ms debounce
// - Interval-based autosave configurable via settings
// - State snapshots prevent redundant saves
//
// DEPENDENCIES:
// - StorageManager, PanelManager, RichEditorManager
// - PaintDropAnimator, MoodEmojiMapper, typeText utility

import { StorageManager } from './storageManager.js';
import { PanelManager } from './panelManager.js';
import { PaintDropAnimator } from '../animators/paintDropAnimator.js';
import { typeText } from '../utils/typingEffect.js';
import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';
import { RichEditorManager } from './richEditorManager.js';

// ==================== EDITOR WATCHDOG SYSTEM ====================

/**
 * Editor watchdog configuration for data loss prevention
 * @private
 */
const EDITOR_WATCHDOG_CONFIG = {
  /** localStorage key for draft backup */
  draftBackupKey: 'simnote_draft_backup',
  /** Draft backup interval in ms (10 seconds) */
  draftBackupInterval: 10000,
  /** Maximum autosave retries on failure */
  maxAutosaveRetries: 3,
  /** Delay between autosave retries in ms */
  autosaveRetryDelay: 500,
  /** Enable beforeunload warning for unsaved changes */
  warnOnUnsavedChanges: true
};

/**
 * Escapes HTML special characters for safe insertion into innerHTML.
 * @param {string} value - Raw text value
 * @returns {string} Escaped string
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
 * Saves draft content to localStorage as emergency backup.
 * @param {string} panelId - The panel ID
 * @param {Object} draft - Draft content object
 * @private
 */
function saveDraftBackup(panelId, draft) {
  try {
    const backups = JSON.parse(localStorage.getItem(EDITOR_WATCHDOG_CONFIG.draftBackupKey) || '{}');
    backups[panelId] = {
      ...draft,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(EDITOR_WATCHDOG_CONFIG.draftBackupKey, JSON.stringify(backups));
  } catch (e) {
    console.warn('[Editor Watchdog] Failed to save draft backup:', e.message);
  }
}

/**
 * Retrieves draft backup from localStorage.
 * @param {string} panelId - The panel ID
 * @returns {Object|null} Draft backup or null
 * @private
 */
function getDraftBackup(panelId) {
  try {
    const backups = JSON.parse(localStorage.getItem(EDITOR_WATCHDOG_CONFIG.draftBackupKey) || '{}');
    return backups[panelId] || null;
  } catch (e) {
    return null;
  }
}

/**
 * Clears draft backup for a panel.
 * @param {string} panelId - The panel ID
 * @private
 */
function clearDraftBackup(panelId) {
  try {
    const backups = JSON.parse(localStorage.getItem(EDITOR_WATCHDOG_CONFIG.draftBackupKey) || '{}');
    delete backups[panelId];
    localStorage.setItem(EDITOR_WATCHDOG_CONFIG.draftBackupKey, JSON.stringify(backups));
  } catch (e) {
    // Ignore
  }
}

/**
 * Central manager for journal entry operations and UI coordination.
 * Handles entry CRUD, filtering, sorting, autosave, and panel navigation.
 * 
 * @class EditorManager
 * @example
 * // Instantiated once in main.js:
 * window.editorManager = new EditorManager();
 */
export class EditorManager {
  /**
   * Creates the EditorManager and initializes all UI components.
   * Automatically called on instantiation.
   * 
   * @constructor
   */
  constructor() {
    // Panel element references
    /** @type {HTMLElement} The journal entries list panel */
    this.journalPanel = document.getElementById('journal-panel');
    /** @type {HTMLElement} The main menu panel */
    this.mainPanel = document.getElementById('main-panel');
    /** @type {HTMLElement} The new entry creation panel */
    this.newEntryPanel = document.getElementById('new-entry-panel');
    /** @type {HTMLElement} The entry editing panel */
    this.editEntryPanel = document.getElementById('edit-entry-panel');
    /** @type {HTMLElement} Container for entry list items */
    this.entriesListDiv = document.querySelector('.entry-list');

    // Current entry tracking
    /** @type {string|null} ID of the entry currently being edited */
    this.currentEntryId = null;
    /** @type {number|null} Index of current entry (legacy compatibility) */
    this.currentEntryIndex = null;
    
    // Filter state
    /** @type {string|null} Date filter in YYYY-MM-DD format */
    this.filterDate = null;
    /** @type {string[]} Active tag filters */
    this.filterTags = [];
    /** @type {boolean} Whether to show only favorited entries */
    this.showFavoritesOnly = false;
    /** @type {string} Current search query text */
    this.searchQuery = '';

    // Sorting
    /** @type {string} Sort mode: 'newest'|'oldest'|'az'|'mood' */
    this.sortMode = localStorage.getItem('sortMode') || 'newest';

    // Autosave state
    /** @type {number|null} Interval timer ID for periodic autosave */
    this.autosaveTimer = null;
    /** @type {Map<string, number>} Panel ID to debounce timer ID */
    this.liveAutosaveTimers = new Map();
    /** @type {Map<string, string>} Panel ID to last saved state snapshot */
    this.lastAutosaveState = new Map();
    /** @type {string|null} ID of draft entry in new-entry-panel */
    this.newEntryDraftId = null;

    // Tag editing
    /** @type {string[]} Tags for the entry currently being edited */
    this.currentTags = [];

    // Rich text editors
    /** @type {Map<string, RichEditorManager>} Panel ID to editor instance */
    this.richEditors = new Map();

    // Watchdog state
    /** @type {boolean} Whether there are unsaved changes */
    this.hasUnsavedChanges = false;
    /** @type {number} Autosave retry counter */
    this.autosaveRetryCount = 0;
    /** @type {number|null} Draft backup interval ID */
    this.draftBackupInterval = null;

    this.initializeUI();
    this._setupWatchdog();
  }

  /**
   * Watchdog: Sets up data loss prevention mechanisms.
   * @private
   */
  _setupWatchdog() {
    // Setup beforeunload warning
    if (EDITOR_WATCHDOG_CONFIG.warnOnUnsavedChanges) {
      window.addEventListener('beforeunload', (e) => {
        if (this.hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
          return e.returnValue;
        }
      });
    }

    // Setup periodic draft backup
    this.draftBackupInterval = setInterval(() => {
      this._backupCurrentDrafts();
    }, EDITOR_WATCHDOG_CONFIG.draftBackupInterval);

    // Check for recovered drafts on startup
    setTimeout(() => this._checkForRecoveredDrafts(), 1000);
  }

  /**
   * Watchdog: Backs up current draft content to localStorage.
   * @private
   */
  _backupCurrentDrafts() {
    [this.newEntryPanel, this.editEntryPanel].forEach(panel => {
      if (!panel || panel.style.display === 'none') return;
      
      const nameInput = panel.querySelector('input.entry-name');
      const name = nameInput ? nameInput.value.trim() : '';
      const richEditor = this.richEditors.get(panel.id);
      const content = richEditor ? richEditor.getContent() : '';
      const plainText = richEditor ? richEditor.getPlainText().trim() : '';
      
      // Only backup if there's actual content
      if (name || plainText) {
        saveDraftBackup(panel.id, {
          name,
          content,
          mood: panel.dataset.mood || '',
          tags: this.currentTags,
          entryId: panel.id === 'edit-entry-panel' ? this.currentEntryId : this.newEntryDraftId
        });
      }
    });
  }

  /**
   * Watchdog: Checks for and offers to recover unsaved drafts.
   * @private
   */
  _checkForRecoveredDrafts() {
    const newDraft = getDraftBackup('new-entry-panel');
    const editDraft = getDraftBackup('edit-entry-panel');
    
    if (newDraft && newDraft.content && !newDraft.entryId) {
      // There's an unsaved new entry draft
      const age = Date.now() - new Date(newDraft.timestamp).getTime();
      const ageMinutes = Math.round(age / 60000);
      
      // Only offer recovery for drafts less than 24 hours old
      if (age < 24 * 60 * 60 * 1000) {
        console.log(`[Editor Watchdog] Found unsaved draft from ${ageMinutes} minutes ago`);
        // Could show a notification here offering to recover
      }
    }
  }

  /**
   * Initializes all UI event listeners and components.
   * Called automatically from constructor.
   * 
   * Sets up:
   * - Back/save button handlers
   * - Tag input system
   * - Favorites filter
   * - Rich text editors
   * - Autosave listeners
   * - Search and sort controls
   * - Calendar date picker
   * 
   * @private
   */
  initializeUI() {
    // Back buttons in new/edit panel
    document.querySelectorAll('.back-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleBackButton(btn);
      });
    });

    // Save entry (new or edit)
    document.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleSaveButton(btn);
      });
    });

    // Setup tag input handlers
    this.setupTagInput();

    // Setup favorites filter button
    this.setupFavoritesFilter();

    // Initialize rich text editors
    this.initRichEditors();

    // Set up live autosave as the user types
    this.setupLiveAutosave();

    // Remove delete button listener from edit panel:
    // (This was previously registered with querySelectorAll('.delete-btn') and handled in handleDeleteButton)

    // Back to menu from journal panel
    const backToMenuBtn = document.querySelector('.back-to-menu');
    if (backToMenuBtn) {
      backToMenuBtn.addEventListener('click', () => {
        PanelManager.transitionPanels(this.journalPanel, this.mainPanel)
          .then(() => {
            if (window.animateMainPanelBack) {
              window.animateMainPanelBack();
            }
          });
      });
    }

    // Whenever we need to "loadEntries" from outside:
    window.addEventListener('loadEntries', () => {
      this.displayEntries();
    });

    // Make displayEntries accessible if needed
    window.displayEntries = () => this.displayEntries();

    // Set up the paint-drop expansion for the new-entry panel
    this.setupNewEntryAnimation();

    // Auto-resize title fields
    document.querySelectorAll('input.entry-name').forEach(input => {
      const resize = () => {
        const tmp = document.createElement('span');
        tmp.style.position = 'absolute';
        tmp.style.visibility = 'hidden';
        tmp.style.whiteSpace = 'pre';
        tmp.style.fontSize = window.getComputedStyle(input).fontSize;
        tmp.style.fontFamily = window.getComputedStyle(input).fontFamily;
        tmp.textContent = input.value || input.placeholder || '';
        document.body.appendChild(tmp);
        const newWidth = tmp.offsetWidth + 20; // add small padding
        tmp.remove();
        input.style.width = `${Math.max(120, Math.min(newWidth, 600))}px`;
      };
      resize();
      input.addEventListener('input', resize);
    });

    this.initCustomCalendar();

    // Initialise autosave timer according to settings
    this.setupAutosave();
    window.addEventListener('autosaveSettingsChanged', ()=> this.setupAutosave());

    // Set up search input listener
    const searchInput = document.getElementById('entry-search');
    const toggleBtn = document.getElementById('search-toggle-btn');
    // Sort dropdown setup
    const sortDropdownSel = document.getElementById('sort-selected');
    const sortList = document.getElementById('sort-list');
    if(sortDropdownSel && sortList){
      // Set initial text
      const initialItem = sortList.querySelector(`li[data-value="${this.sortMode}"]`);
      if(initialItem){ sortDropdownSel.textContent = initialItem.textContent; }

      sortDropdownSel.addEventListener('click', ()=>{
        sortList.classList.toggle('open');
      });
      sortList.querySelectorAll('li').forEach(item=>{
        item.addEventListener('click', ()=>{
          const val = item.getAttribute('data-value');
          this.sortMode = val;
          localStorage.setItem('sortMode', val);
          sortDropdownSel.textContent = item.textContent;
          sortList.classList.remove('open');
          this.displayEntries();
        });
      });

      // close when clicking outside
      document.addEventListener('click', (e)=>{
        if(!sortDropdownSel.contains(e.target) && !sortList.contains(e.target)){
          sortList.classList.remove('open');
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value.trim();
        this.displayEntries();
      });

      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          const isCollapsed = searchInput.classList.contains('collapsed');
          if (isCollapsed) {
            searchInput.classList.remove('collapsed');
            searchInput.focus();
          } else {
            searchInput.classList.add('collapsed');
            searchInput.value = '';
            this.searchQuery = '';
            this.displayEntries();
          }
        });
      }
    }
  }

  /**
   * Builds a serialized snapshot of the current panel state.
   * @param {HTMLElement} panel - The entry panel
   * @returns {string|null} Snapshot string
   * @private
   */
  _getPanelSnapshot(panel) {
    if (!panel) return null;
    const panelId = panel.id;
    if (!panelId) return null;
    const nameInput = panel.querySelector('input.entry-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const richEditor = this.richEditors.get(panelId);
    const content = richEditor ? richEditor.getContent() : '';
    const mood = panel.dataset.mood || '';
    const tags = Array.isArray(this.currentTags) ? this.currentTags : [];

    return JSON.stringify({
      name: name || 'Untitled',
      content,
      mood,
      tags
    });
  }

  /**
   * Caches the current panel snapshot as the last saved state.
   * @param {HTMLElement} panel - The entry panel
   * @private
   */
  _cachePanelSnapshot(panel) {
    const snapshot = this._getPanelSnapshot(panel);
    if (snapshot && panel?.id) {
      this.lastAutosaveState.set(panel.id, snapshot);
      this.hasUnsavedChanges = false;
    }
  }

  /**
   * Returns to the entries list from the edit panel.
   * @param {HTMLElement} panel - The edit entry panel
   * @public
   */
  returnToEntriesPanel(panel) {
    if (!panel || panel.id !== 'edit-entry-panel') return;

    if (this.isAutosaveEnabled()) {
      this.performLiveAutosave(panel);
    }

    // Reset edit panel state
    panel.classList.remove('expand');
    this.currentEntryId = null;
    this.currentEntryIndex = null;
    this.currentTags = [];
    this.renderTagsUI(panel, { autosave: false });
    this.clearAutosaveState(panel.id);

    PanelManager.transitionPanels(panel, this.journalPanel).then(() => {
      this.displayEntries();
    });
  }

  /**
   * Configures the new entry panel animation.
   * Currently skips paint-drop and immediately expands panel.
   * 
   * @private
   */
  setupNewEntryAnimation() {
    // Skip paint-drop interaction: immediately show panel contents
    const intro = document.querySelector('#new-entry-panel .new-entry-intro');
    const panel = document.getElementById('new-entry-panel');
    if (intro) intro.style.display = 'none';
    if (panel) panel.classList.add('expand');
  }

  /**
   * Handles back button clicks to navigate away from current panel.
   * Clears form state, shows exit feedback if content exists, transitions to main panel.
   * 
   * @param {HTMLElement} btn - The clicked back button element
   * @private
   */
  handleBackButton(btn) {
    const panel = btn.closest('#journal-panel, #new-entry-panel, #edit-entry-panel');
    if (!panel) return;

    if (this.shouldShowExitFeedback(panel)) {
      this.showExitOverlay();
    }

    // Clear text fields if leaving new/edit panel
    const nameInput = panel.querySelector('input.entry-name');
    if (nameInput) nameInput.value = '';
    
    // Clear rich editor content
    const richEditor = this.richEditors.get(panel.id);
    if (richEditor) richEditor.clear();

    // Clear tags
    this.currentTags = [];
    this.renderTagsUI(panel, { autosave: false });

    this.currentEntryId = null;
    this.currentEntryIndex = null;
    this.clearAutosaveState(panel.id);

    // Use smooth exit for journal panel, regular transition for others
    const transitionMethod = panel.id === 'journal-panel' 
      ? PanelManager.smoothExit(panel, this.mainPanel, {
          direction: 'down',
          distance: 40,
          scale: 0.97,
          hideDuration: 400,
          showDuration: 350
        })
      : PanelManager.smoothExit(panel, this.mainPanel, {
          fadeDuration: 1000
        });

    transitionMethod.then(() => {
      this.hideExitOverlay();
      if (panel.id === 'journal-panel') {
        // Make sure the entries pane is shown if needed
        const entriesPane = document.querySelector('.entries-pane');
        if (entriesPane) entriesPane.style.display = 'block';
        document.body.classList.remove('journal-open');
      }

      // Reset expand state for edit-entry-panel when navigating away so it animates properly next time
      if (panel.id === 'edit-entry-panel') {
        panel.classList.remove('expand');
      }

      if (window.animateMainPanelBack) {
        window.animateMainPanelBack();
      }
    });
  }

  /**
   * Handles save button clicks to persist entry changes.
   * Creates new entry or updates existing based on panel context.
   * 
   * @param {HTMLElement} btn - The clicked save button element
   * @private
   */
  handleSaveButton(btn) {
    const panel = btn.closest('#new-entry-panel, #edit-entry-panel');
    if (!panel) return;
  
    const nameInput = panel.querySelector('input.entry-name');
    const name = nameInput.value.trim();
    
    // Get content from rich editor or textarea
    const richEditor = this.richEditors.get(panel.id);
    const content = richEditor ? richEditor.getContent() : '';
    const plainText = richEditor ? richEditor.getPlainText().trim() : '';
  
    const contentArea = panel.querySelector('.rich-editor') || panel.querySelector('.entry-content');
    const fontStyle = window.getComputedStyle(contentArea);
    const fontFamily = fontStyle.fontFamily;
    const fontSize = fontStyle.fontSize;
  
    const mood = panel.dataset.mood || '';
    if (panel.id === 'edit-entry-panel') {
      const entryId = this.currentEntryId ?? this.currentEntryIndex;
      if (entryId !== null && entryId !== undefined) {
        StorageManager.updateEntry(entryId, name || 'Untitled', content, mood, fontFamily, fontSize, this.currentTags);
        this.showPopup("Entry saved!");
        this.lastAutosaveState.delete(panel.id);
      }
    } else {
      const hasContent = name || plainText;
      if (!hasContent) {
        this.showPopup("Nothing to save yet.");
        return;
      }
      if (!this.newEntryDraftId) {
        const saved = StorageManager.saveEntry(name || 'Untitled', content, mood, fontFamily, fontSize, this.currentTags);
        this.newEntryDraftId = saved?.id || null;
      } else {
        StorageManager.updateEntry(this.newEntryDraftId, name || 'Untitled', content, mood, fontFamily, fontSize, this.currentTags);
      }
      this.showPopup("Entry saved!");
      this.lastAutosaveState.delete(panel.id);
    }
  }
  

  /**
   * Renders the entry list with current filters, sorting, and search applied.
   * Binds click handlers for entry selection, favorites, and deletion.
   * 
   * Filter/sort order:
   * 1. Favorites filter (if enabled)
   * 2. Date filter (if set)
   * 3. Tag filter (if tags selected)
   * 4. Text search (name, content, tags)
   * 5. Sort by mode (newest/oldest/az/mood)
   * 6. Favorites always sorted to top
   * 
   * @public
   */
  displayEntries() {
    let entries = StorageManager.getEntries().map((e,i)=>({...e,__index:i}));

    // Favorites filter
    if (this.showFavoritesOnly) {
      entries = entries.filter(entry => entry.favorite);
    }

    // Date filter (if active)
    if (this.filterDate) {
      entries = entries.filter(entry => (entry.createdAt || entry.date).startsWith(this.filterDate));
    }

    // Tag filter
    if (this.filterTags && this.filterTags.length > 0) {
      entries = entries.filter(entry => 
        this.filterTags.some(tag => (entry.tags || []).includes(tag))
      );
    }

    // Text search filter (case-insensitive; match name, content, or tags)
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      const queryTokens = this._tokenizeSearchQuery(q);
      entries = entries.filter(entry => this._matchesSearchQuery(entry, q, queryTokens));
    }

    // Apply sorting / grouping
    if(this.sortMode === 'newest'){
      entries.sort((a,b)=> new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    } else if(this.sortMode === 'oldest'){
      entries.sort((a,b)=> new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
    } else if(this.sortMode === 'az'){
      entries.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
    } else if(this.sortMode === 'mood'){
      entries.sort((a,b)=> (a.mood||'').localeCompare(b.mood||''));
    }

    // Always show favorites first within sort order
    entries.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));

    if (entries.length === 0) {
      this.entriesListDiv.innerHTML = "<p id=\"no-entries-msg\"></p>";
      const msg = (this.filterDate || this.searchQuery || this.showFavoritesOnly || this.filterTags.length) 
        ? 'No matching entries.' 
        : 'No entries saved.';
      typeText('no-entries-msg', msg, 45, true);
      return;
    }

    let html = "<ul>";

    if(this.sortMode === 'mood'){
      let currentGroup = null;
      entries.forEach((entry) => {
        if(entry.mood !== currentGroup){
          currentGroup = entry.mood;
          html += `<li class="entry-group">${escapeHtml(currentGroup || 'No Mood')}</li>`;
        }
        html += this.renderEntryItem(entry);
      });
    } else {
      entries.forEach((entry) => {
        html += this.renderEntryItem(entry);
      });
    }
    html += "</ul>";
    this.entriesListDiv.innerHTML = html;

    // Clicking a list item loads it into the edit panel
    document.querySelectorAll('.entry-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Skip if clicking action buttons
        if (e.target.classList.contains('delete-entry') || 
            e.target.classList.contains('favorite-btn')) return;

        const entryId = item.getAttribute('data-id');
        const idx = parseInt(item.getAttribute('data-index'));
        const loadedEntry = entryId ? StorageManager.getEntryById(entryId) : StorageManager.getEntries()[idx];
        
        this.currentEntryId = loadedEntry.id;
        this.currentEntryIndex = idx;
        this.currentTags = loadedEntry.tags || [];

        // Load that entry into edit panel
        const nameInput = this.editEntryPanel.querySelector('input.entry-name');
        nameInput.value = loadedEntry.name;
        
        // Load content into rich editor
        const richEditor = this.richEditors.get('edit-entry-panel');
        if (richEditor) {
          richEditor.setContent(loadedEntry.content);
        }
        
        // store mood for possible editing
        this.editEntryPanel.dataset.mood = loadedEntry.mood || '';

        // Populate meta info in edit panel
        const meta = this.editEntryPanel.querySelector('.entry-meta');
        if (meta) {
          const moodEl = meta.querySelector('.mood-badge');
          const dateEl = meta.querySelector('.date-stamp');
          if (moodEl) {
            if (loadedEntry.mood) {
              const emoji = MoodEmojiMapper.getEmoji(loadedEntry.mood);
              moodEl.textContent = emoji ? `${emoji} ${loadedEntry.mood}` : loadedEntry.mood;
              moodEl.style.display = 'inline-block';
            } else {
              moodEl.style.display = 'none';
            }
          }
          if (dateEl) {
            dateEl.textContent = new Date(loadedEntry.createdAt || loadedEntry.date).toLocaleString();
          }
        }

        // Render tags in edit panel
      this.renderTagsUI(this.editEntryPanel, { autosave: false });
      this._cachePanelSnapshot(this.editEntryPanel);

        // Ensure edit panel shows its contents immediately, mirroring new-entry-panel behaviour
        this.editEntryPanel.classList.add('expand');

        PanelManager.transitionPanels(this.journalPanel, this.editEntryPanel);
      });
    });

    // Favorite buttons
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entryId = btn.getAttribute('data-id');
        const idx = parseInt(btn.getAttribute('data-index'));
        const newState = StorageManager.toggleFavorite(entryId || idx);
        btn.textContent = newState ? '⭐' : '☆';
        btn.classList.toggle('active', newState);
      });
    });

    // Delete buttons for each entry in the list
    document.querySelectorAll('.delete-entry').forEach(deleteBtn => {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entryId = deleteBtn.getAttribute('data-id');
        const idx = parseInt(deleteBtn.getAttribute('data-index'));
        const listItem = deleteBtn.closest('.entry-item');

        // Animate removal
        listItem.classList.add('removing');
        listItem.addEventListener('animationend', () => {
          StorageManager.deleteEntry(entryId || idx);
          this.displayEntries();
        }, { once: true });
      });
    });
  }

  /**
   * Generates HTML for a single entry list item.
   * 
   * @param {Object} entry - The entry object to render
   * @param {string} entry.id - Entry unique ID
   * @param {string} entry.name - Entry title
   * @param {string[]} [entry.tags] - Entry tags
   * @param {boolean} [entry.favorite] - Whether entry is favorited
   * @param {string} entry.createdAt - ISO date string
   * @param {number} [entry.wordCount] - Word count
   * @returns {string} HTML string for the entry list item
   * @private
   */
  renderEntryItem(entry) {
    const formattedDate = new Date(entry.createdAt || entry.date).toLocaleString();
    const safeId = escapeHtml(String(entry.id || ''));
    const safeName = escapeHtml(entry.name || 'Untitled');
    const tagsHtml = (entry.tags || []).length > 0 
      ? `<span class="entry-tags">${entry.tags.map(t => `<span class="tag-pill">${escapeHtml(String(t))}</span>`).join('')}</span>` 
      : '';
    const favoriteClass = entry.favorite ? 'active' : '';
    const favoriteIcon = entry.favorite ? '⭐' : '☆';
    
    return `
      <li data-id="${safeId}" data-index="${entry.__index}" class="entry-item ${entry.favorite ? 'is-favorite' : ''}">
        <div class="entry-item-main">
          <span class="entry-name-display">${safeName}</span>
          ${tagsHtml}
        </div>
        <div class="entry-item-meta">
          <span class="entry-date-display">${formattedDate}</span>
          <span class="entry-word-count">${entry.wordCount || 0} words</span>
        </div>
        <div class="entry-item-actions">
          <button class="favorite-btn ${favoriteClass}" data-id="${safeId}" data-index="${entry.__index}">${favoriteIcon}</button>
          <button class="delete-entry" data-id="${safeId}" data-index="${entry.__index}">🗑️</button>
        </div>
      </li>`;
  }

  /**
   * Tokenizes a search query for faster matching.
   * @param {string} query - Raw query
   * @returns {string[]} Tokens
   * @private
   */
  _tokenizeSearchQuery(query) {
    if (!query) return [];
    return query
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map(token => token.trim())
      .filter(Boolean);
  }

  /**
   * Checks if an entry matches the search query.
   * Uses native tokens when available to avoid scanning large content.
   * @param {Object} entry - Entry data
   * @param {string} query - Lowercased query string
   * @param {string[]} queryTokens - Tokenized query
   * @returns {boolean}
   * @private
   */
  _matchesSearchQuery(entry, query, queryTokens) {
    if (!entry || !query) return false;

    if (Array.isArray(entry.searchTokens) && queryTokens.length > 1) {
      const tokenSet = new Set(entry.searchTokens);
      const hasAllTokens = queryTokens.every(token => tokenSet.has(token));
      if (!hasAllTokens) {
        return false;
      }
    }

    const name = entry.name ? entry.name.toLowerCase() : '';
    const content = entry.content ? entry.content.toLowerCase() : '';
    const tags = Array.isArray(entry.tags) ? entry.tags : [];

    return (
      (name && name.includes(query)) ||
      (content && content.includes(query)) ||
      (tags && tags.some(t => String(t).toLowerCase().includes(query)))
    );
  }

  /**
   * Displays a temporary popup notification message.
   * Auto-hides after 2 seconds with slide animation.
   * 
   * @param {string} message - The message to display
   * @public
   */
  showPopup(message) {
    const popup = document.getElementById('custom-popup');
    popup.textContent = message;
    
    // Remove any existing animation classes
    popup.classList.remove('hide');
    
    // Trigger slide in
    popup.classList.add('show');
    
    // After 2 seconds, slide out
    setTimeout(() => {
      popup.classList.remove('show');
      popup.classList.add('hide');
    }, 2000);
  }
  
  /**
   * Initializes the custom calendar date picker for filtering entries.
   * Creates month navigation and day selection grid.
   * 
   * @private
   */
  initCustomCalendar() {
    const btn = document.getElementById('date-picker-btn');
    const pop = document.getElementById('custom-calendar');
    if (!btn || !pop) return;

    let current = new Date();

    const render = () => {
      pop.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'calendar-header';
      const prev = document.createElement('button');
      prev.className = 'calendar-nav';
      prev.textContent = '◀';
      const next = document.createElement('button');
      next.className = 'calendar-nav';
      next.textContent = '▶';
      const title = document.createElement('span');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      title.textContent = `${monthNames[current.getMonth()]} ${current.getFullYear()}`;
      header.appendChild(prev); header.appendChild(title); header.appendChild(next);
      pop.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'calendar-grid';
      const dow = ['M','T','W','T','F','S','S'];
      dow.forEach(d=>{const c=document.createElement('div');c.className='calendar-cell header';c.textContent=d;grid.appendChild(c);});

      const firstDay = new Date(current.getFullYear(), current.getMonth(),1);
      const startIdx = (firstDay.getDay()+6)%7; // Monday=0
      for(let i=0;i<startIdx;i++){const blank=document.createElement('div');blank.className='calendar-cell';grid.appendChild(blank);} 
      const daysInMonth=new Date(current.getFullYear(), current.getMonth()+1,0).getDate();
      for(let d=1; d<=daysInMonth; d++){
        const cell=document.createElement('div');cell.className='calendar-cell';cell.textContent=d;
        const iso=`${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        if(this.filterDate===iso){cell.classList.add('selected');}
        cell.addEventListener('click',()=>{
          this.filterDate=iso;
          this.displayEntries();
          pop.style.display='none';
        });
        grid.appendChild(cell);
      }
      pop.appendChild(grid);

      prev.onclick=(ev)=>{ev.stopPropagation(); current.setMonth(current.getMonth()-1);render();};
      next.onclick=(ev)=>{ev.stopPropagation(); current.setMonth(current.getMonth()+1);render();};
    };

    const showPopup = ()=>{
      render();
      pop.style.display='block';
      // allow CSS transition
      requestAnimationFrame(()=>pop.classList.add('open'));
    };

    const hidePopup = ()=>{
      pop.classList.remove('open');
      pop.addEventListener('transitionend', ()=>{
        pop.style.display='none';
      }, { once:true});
    };

    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(pop.style.display==='block') hidePopup(); else showPopup();
    });

    document.addEventListener('click',(e)=>{
      if(pop.style.display==='block' && !pop.contains(e.target) && e.target!==btn){hidePopup();}
    });
  }

  /**
   * Configures the interval-based autosave timer from settings.
   * Clears existing timer and creates new one based on autosaveInterval setting.
   * 
   * @private
   */
  setupAutosave() {
    if(this.autosaveTimer){ clearInterval(this.autosaveTimer); this.autosaveTimer=null; }
    const intervalSec = parseInt(localStorage.getItem('autosaveInterval') || '30');
    if(isNaN(intervalSec) || intervalSec<=0) return;
    this.autosaveTimer = setInterval(()=> this.performAutosave(), intervalSec*1000);
  }

  /**
   * Performs interval-triggered autosave for the edit panel.
   * Only saves if edit panel is visible.
   * 
   * @private
   */
  performAutosave(){
    if(!this.editEntryPanel || this.editEntryPanel.style.display==='none') return;
    this.performLiveAutosave(this.editEntryPanel);
  }

  /**
   * Sets up tag input UI and autocomplete for entry panels.
   * Creates tag input field, suggestion dropdown, and handles tag add/remove.
   * 
   * @private
   */
  setupTagInput() {
    // Add tag input to both new and edit panels
    [this.newEntryPanel, this.editEntryPanel].forEach(panel => {
      if (!panel) return;
      
      const meta = panel.querySelector('.entry-meta');
      if (!meta || meta.querySelector('.tags-container')) return;
      
      // Create tags container
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'tags-container';
      tagsContainer.innerHTML = `
        <div class="tags-list"></div>
        <div class="tag-input-wrapper">
          <input type="text" class="tag-input" placeholder="Add tag..." />
          <div class="tag-suggestions"></div>
        </div>
      `;
      meta.appendChild(tagsContainer);
      
      const tagInput = tagsContainer.querySelector('.tag-input');
      const suggestions = tagsContainer.querySelector('.tag-suggestions');
      
      // Handle tag input
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const tag = tagInput.value.trim().toLowerCase();
          if (tag && !this.currentTags.includes(tag)) {
            this.currentTags.push(tag);
            this.renderTagsUI(panel);
          }
          tagInput.value = '';
          suggestions.innerHTML = '';
        }
      });
      
      // Show suggestions
      tagInput.addEventListener('input', () => {
        const val = tagInput.value.trim().toLowerCase();
        if (!val) {
          suggestions.innerHTML = '';
          return;
        }
        
        const allTags = StorageManager.getAllTags();
        const matches = allTags.filter(t => 
          t.includes(val) && !this.currentTags.includes(t)
        ).slice(0, 5);
        
        suggestions.innerHTML = matches.map(t => {
          const safeTag = escapeHtml(String(t));
          return `<div class="tag-suggestion" data-tag="${safeTag}">${safeTag}</div>`;
        }).join('');
        
        suggestions.querySelectorAll('.tag-suggestion').forEach(el => {
          el.addEventListener('click', () => {
            const tag = el.getAttribute('data-tag');
            if (!this.currentTags.includes(tag)) {
              this.currentTags.push(tag);
            this.renderTagsUI(panel);
            }
            tagInput.value = '';
            suggestions.innerHTML = '';
          });
        });
      });
      
      // Close suggestions on outside click
      document.addEventListener('click', (e) => {
        if (!tagsContainer.contains(e.target)) {
          suggestions.innerHTML = '';
        }
      });
    });
  }

  /**
   * Renders the current tags as pills in the specified panel.
   * 
   * @param {HTMLElement} panel - The panel containing the tags list
   * @param {Object} [options] - Render options
   * @param {boolean} [options.autosave=true] - Whether to trigger autosave after render
   * @private
   */
  renderTagsUI(panel, { autosave = true } = {}) {
    if (!panel) return;
    const tagsList = panel.querySelector('.tags-list');
    if (!tagsList) return;
    
    tagsList.innerHTML = this.currentTags.map(tag => {
      const safeTag = escapeHtml(String(tag));
      return `<span class="tag-pill editable">
        ${safeTag}
        <button class="tag-remove" data-tag="${safeTag}">×</button>
      </span>`;
    }).join('');
    
    // Add remove handlers
    tagsList.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = btn.getAttribute('data-tag');
        this.currentTags = this.currentTags.filter(t => t !== tag);
        this.renderTagsUI(panel);
      });
    });

    if (autosave) {
      this.scheduleAutosave(panel);
    }
  }

  /**
   * Creates and configures the favorites filter toggle button.
   * Adds button to entries header if not already present.
   * 
   * @private
   */
  setupFavoritesFilter() {
    const btn = document.getElementById('favorites-filter-btn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
      this.showFavoritesOnly = !this.showFavoritesOnly;
      btn.classList.toggle('active', this.showFavoritesOnly);
      btn.innerHTML = this.showFavoritesOnly ? '⭐' : '☆';
      this.displayEntries();
    });
  }

  /**
   * Resets all active filters and refreshes the entry list.
   * Clears: date, tags, favorites, and search query.
   * 
   * @public
   */
  clearFilters() {
    this.filterDate = null;
    this.filterTags = [];
    this.showFavoritesOnly = false;
    this.searchQuery = '';
    
    const searchInput = document.getElementById('entry-search');
    if (searchInput) searchInput.value = '';
    
    const favBtn = document.getElementById('favorites-filter-btn');
    if (favBtn) {
      favBtn.classList.remove('active');
      favBtn.innerHTML = '☆';
    }
    
    this.displayEntries();
  }

  /**
   * Creates RichEditorManager instances for new and edit entry panels.
   * Stores references in this.richEditors map.
   * 
   * @private
   */
  initRichEditors() {
    const panels = [this.newEntryPanel, this.editEntryPanel];
    
    panels.forEach(panel => {
      if (panel && panel.querySelector('.rich-editor')) {
        const editor = new RichEditorManager(panel);
        this.richEditors.set(panel.id, editor);
      }
    });
  }

  /**
   * Sets up input listeners for live (debounced) autosave.
   * Triggers autosave on title input, editor input/keyup/paste.
   * 
   * @private
   */
  setupLiveAutosave() {
    const panels = [this.newEntryPanel, this.editEntryPanel];
    panels.forEach(panel => {
      if (!panel) return;
      const nameInput = panel.querySelector('input.entry-name');
      const richEditor = panel.querySelector('.rich-editor');
      const schedule = () => this.scheduleAutosave(panel);

      nameInput?.addEventListener('input', schedule);
      richEditor?.addEventListener('input', schedule);
      richEditor?.addEventListener('keyup', schedule);
      richEditor?.addEventListener('paste', schedule);
    });
  }

  /**
   * Schedules a debounced autosave for the given panel.
   * Cancels any pending save and schedules new one in 300ms.
   * 
   * @param {HTMLElement} panel - The panel to autosave
   * @private
   */
  scheduleAutosave(panel) {
    if (!panel || !this.isAutosaveEnabled()) return;
    const panelId = panel.id;
    if (!panelId) return;
    const existing = this.liveAutosaveTimers.get(panelId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.performLiveAutosave(panel), 300);
    this.liveAutosaveTimers.set(panelId, timer);
  }

  /**
   * Executes the actual autosave operation for a panel.
   * Compares current state to last saved state to avoid redundant writes.
   * 
   * @param {HTMLElement} panel - The panel to save
   * @private
   */
  performLiveAutosave(panel) {
    if (!panel || !this.isAutosaveEnabled()) return;
    const panelId = panel.id;
    if (!panelId) return;

    const nameInput = panel.querySelector('input.entry-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const richEditor = this.richEditors.get(panelId);
    const content = richEditor ? richEditor.getContent() : '';
    const plainText = richEditor ? richEditor.getPlainText().trim() : '';
    const mood = panel.dataset.mood || '';
    const tags = Array.isArray(this.currentTags) ? this.currentTags : [];

    if (panelId === 'new-entry-panel' && !name && !plainText) return;

    const snapshot = JSON.stringify({
      name: name || 'Untitled',
      content,
      mood,
      tags
    });
    if (this.lastAutosaveState.get(panelId) === snapshot) return;

    const contentArea = panel.querySelector('.rich-editor') || panel.querySelector('.entry-content');
    const fontStyle = contentArea ? window.getComputedStyle(contentArea) : null;
    const fontFamily = fontStyle ? fontStyle.fontFamily : '';
    const fontSize = fontStyle ? fontStyle.fontSize : '';

    // Watchdog: Mark as having unsaved changes
    this.hasUnsavedChanges = true;

    try {
      if (panelId === 'edit-entry-panel') {
        const entryId = this.currentEntryId ?? this.currentEntryIndex;
        if (entryId !== null && entryId !== undefined) {
          const result = StorageManager.updateEntry(entryId, name || 'Untitled', content, mood, fontFamily, fontSize, tags);
          
          // Watchdog: Check if save succeeded
          if (result === null) {
            this._handleAutosaveFailure(panel, { name, content, mood, fontFamily, fontSize, tags });
            return;
          }
        }
      } else {
        if (!this.newEntryDraftId) {
          const saved = StorageManager.saveEntry(name || 'Untitled', content, mood, fontFamily, fontSize, tags);
          
          // Watchdog: Check if save succeeded
          if (!saved) {
            this._handleAutosaveFailure(panel, { name, content, mood, fontFamily, fontSize, tags });
            return;
          }
          this.newEntryDraftId = saved.id || null;
        } else {
          const result = StorageManager.updateEntry(this.newEntryDraftId, name || 'Untitled', content, mood, fontFamily, fontSize, tags);
          
          if (result === null) {
            this._handleAutosaveFailure(panel, { name, content, mood, fontFamily, fontSize, tags });
            return;
          }
        }
      }

      // Watchdog: Save succeeded, reset retry counter and clear unsaved flag
      this.autosaveRetryCount = 0;
      this.hasUnsavedChanges = false;
      clearDraftBackup(panelId);
      
    } catch (e) {
      console.error('[Editor Watchdog] Autosave exception:', e);
      this._handleAutosaveFailure(panel, { name, content, mood, fontFamily, fontSize, tags });
      return;
    }

    this.lastAutosaveState.set(panelId, snapshot);
  }

  /**
   * Watchdog: Handles autosave failures with retry logic.
   * @private
   * @param {HTMLElement} panel - The panel that failed to save
   * @param {Object} data - The data that failed to save
   */
  _handleAutosaveFailure(panel, data) {
    this.autosaveRetryCount++;
    
    // Save to backup storage immediately
    saveDraftBackup(panel.id, {
      ...data,
      tags: this.currentTags,
      entryId: panel.id === 'edit-entry-panel' ? this.currentEntryId : this.newEntryDraftId
    });
    
    if (this.autosaveRetryCount < EDITOR_WATCHDOG_CONFIG.maxAutosaveRetries) {
      console.warn(`[Editor Watchdog] Autosave failed, retrying (${this.autosaveRetryCount}/${EDITOR_WATCHDOG_CONFIG.maxAutosaveRetries})...`);
      
      // Schedule retry
      setTimeout(() => {
        this.performLiveAutosave(panel);
      }, EDITOR_WATCHDOG_CONFIG.autosaveRetryDelay);
    } else {
      console.error('[Editor Watchdog] Autosave failed after max retries. Draft backed up to localStorage.');
      // Could show a user notification here
      this.showPopup('⚠️ Autosave failed. Your work is backed up.');
      this.autosaveRetryCount = 0;
    }
  }

  /**
   * Clears autosave state for a panel when navigating away.
   * Cancels pending timers and clears state snapshot.
   * 
   * @param {string} panelId - The panel ID to clear state for
   * @private
   */
  clearAutosaveState(panelId) {
    if (!panelId) return;
    const timer = this.liveAutosaveTimers.get(panelId);
    if (timer) clearTimeout(timer);
    this.liveAutosaveTimers.delete(panelId);
    this.lastAutosaveState.delete(panelId);
    
    // Watchdog: Clear draft backup and unsaved flag
    clearDraftBackup(panelId);
    this.hasUnsavedChanges = false;
    this.autosaveRetryCount = 0;
    
    if (panelId === 'new-entry-panel') {
      this.newEntryDraftId = null;
    }
  }

  /**
   * Shows a brief overlay animation when exiting an entry panel.
   * Displays a checkmark to indicate content was saved.
   * 
   * @private
   */
  showExitOverlay() {
    if (document.getElementById('panel-exit-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'panel-exit-overlay';
    overlay.className = 'panel-exit-overlay';
    const content = document.createElement('div');
    content.className = 'panel-exit-overlay-content';
    content.innerHTML = `
      <svg class="exit-check" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12l5 5 11-12"></path>
      </svg>
    `;
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    this.exitOverlayShownAt = Date.now();
    requestAnimationFrame(() => overlay.classList.add('visible'));
    
    // Play saved sound effect
    if (window.playSfx) {
      const savedSound = new Audio('resources/saved.mp3');
      window.playSfx(savedSound);
    }
  }

  /**
   * Hides the exit overlay with fade animation.
   * Ensures minimum visible time of 650ms for user feedback.
   * 
   * @private
   */
  hideExitOverlay() {
    const overlay = document.getElementById('panel-exit-overlay');
    if (!overlay) return;
    const minVisibleMs = 650;
    const elapsed = this.exitOverlayShownAt ? Date.now() - this.exitOverlayShownAt : minVisibleMs;
    const delay = Math.max(0, minVisibleMs - elapsed);
    setTimeout(() => {
      overlay.classList.remove('visible');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    }, delay);
  }

  /**
   * Determines if exit feedback overlay should be shown.
   * Returns true if panel has content (title or body text).
   * 
   * @param {HTMLElement} panel - The panel being exited
   * @returns {boolean} Whether to show exit feedback
   * @private
   */
  shouldShowExitFeedback(panel) {
    if (!panel || (panel.id !== 'new-entry-panel' && panel.id !== 'edit-entry-panel')) {
      return false;
    }
    const nameInput = panel.querySelector('input.entry-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const richEditor = this.richEditors.get(panel.id);
    const plainText = richEditor ? richEditor.getPlainText().trim() : '';
    return Boolean(name || plainText);
  }

  /**
   * Checks if autosave is currently enabled.
   * Currently always returns true; could be extended to check settings.
   * 
   * @returns {boolean} Whether autosave is enabled
   * @private
   */
  isAutosaveEnabled() {
    return true;
  }
}
