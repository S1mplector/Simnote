// editorManager.js
import { StorageManager } from './storageManager.js';
import { PanelManager } from './panelManager.js';
import { PaintDropAnimator } from '../animators/paintDropAnimator.js';
import { typeText } from '../utils/typingEffect.js';
import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';
import { RichEditorManager } from './richEditorManager.js';

export class EditorManager {
  constructor() {
    // Panels
    this.journalPanel = document.getElementById('journal-panel');
    this.mainPanel = document.getElementById('main-panel');
    this.newEntryPanel = document.getElementById('new-entry-panel');
    this.editEntryPanel = document.getElementById('edit-entry-panel');
    this.entriesListDiv = document.querySelector('.entry-list');

    // Track current entry by ID (not index)
    this.currentEntryId = null;
    this.currentEntryIndex = null; // Keep for backward compatibility
    this.filterDate = null; // YYYY-MM-DD string
    this.filterTags = []; // Array of tag strings
    this.showFavoritesOnly = false;

    // Global search filter
    this.searchQuery = '';

    // Sorting mode
    this.sortMode = localStorage.getItem('sortMode') || 'newest';

    // Autosave timer reference
    this.autosaveTimer = null;
    this.liveAutosaveTimers = new Map();
    this.lastAutosaveState = new Map();
    this.newEntryDraftId = null;

    // Current entry tags (for editing)
    this.currentTags = [];

    // Rich text editors
    this.richEditors = new Map();

    this.initializeUI();
  }

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

  setupNewEntryAnimation() {
    // Skip paint-drop interaction: immediately show panel contents
    const intro = document.querySelector('#new-entry-panel .new-entry-intro');
    const panel = document.getElementById('new-entry-panel');
    if (intro) intro.style.display = 'none';
    if (panel) panel.classList.add('expand');
  }

  handleBackButton(btn) {
    const panel = btn.closest('#journal-panel, #new-entry-panel, #edit-entry-panel');
    if (!panel) return;

    if (panel.id === 'new-entry-panel' || panel.id === 'edit-entry-panel') {
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
      : PanelManager.transitionPanels(panel, this.mainPanel);

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
  

  // Removed handleDeleteButton since deletion is now only handled from the entries list

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
      entries = entries.filter(entry =>
        (entry.name && entry.name.toLowerCase().includes(q)) ||
        (entry.content && entry.content.toLowerCase().includes(q)) ||
        (entry.tags && entry.tags.some(t => t.toLowerCase().includes(q)))
      );
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
          html += `<li class="entry-group">${currentGroup || 'No Mood'}</li>`;
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

  // Render a single entry item HTML
  renderEntryItem(entry) {
    const formattedDate = new Date(entry.createdAt || entry.date).toLocaleString();
    const tagsHtml = (entry.tags || []).length > 0 
      ? `<span class="entry-tags">${entry.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</span>` 
      : '';
    const favoriteClass = entry.favorite ? 'active' : '';
    const favoriteIcon = entry.favorite ? '⭐' : '☆';
    
    return `
      <li data-id="${entry.id}" data-index="${entry.__index}" class="entry-item ${entry.favorite ? 'is-favorite' : ''}">
        <div class="entry-item-main">
          <span class="entry-name-display">${entry.name}</span>
          ${tagsHtml}
        </div>
        <div class="entry-item-meta">
          <span class="entry-date-display">${formattedDate}</span>
          <span class="entry-word-count">${entry.wordCount || 0} words</span>
        </div>
        <div class="entry-item-actions">
          <button class="favorite-btn ${favoriteClass}" data-id="${entry.id}" data-index="${entry.__index}">${favoriteIcon}</button>
          <button class="delete-entry" data-id="${entry.id}" data-index="${entry.__index}">🗑️</button>
        </div>
      </li>`;
  }

  // Helper method to show custom popup

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

  setupAutosave() {
    if(this.autosaveTimer){ clearInterval(this.autosaveTimer); this.autosaveTimer=null; }
    const intervalSec = parseInt(localStorage.getItem('autosaveInterval') || '30');
    if(isNaN(intervalSec) || intervalSec<=0) return;
    this.autosaveTimer = setInterval(()=> this.performAutosave(), intervalSec*1000);
  }

  performAutosave(){
    // Only autosave in edit-entry-panel for simplicity
    if(!this.editEntryPanel || this.editEntryPanel.style.display==='none') return;
    this.performLiveAutosave(this.editEntryPanel);
  }

  // Setup tag input functionality
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
        
        suggestions.innerHTML = matches.map(t => 
          `<div class="tag-suggestion" data-tag="${t}">${t}</div>`
        ).join('');
        
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

  // Render tags in a panel
  renderTagsUI(panel, { autosave = true } = {}) {
    if (!panel) return;
    const tagsList = panel.querySelector('.tags-list');
    if (!tagsList) return;
    
    tagsList.innerHTML = this.currentTags.map(tag => 
      `<span class="tag-pill editable">
        ${tag}
        <button class="tag-remove" data-tag="${tag}">×</button>
      </span>`
    ).join('');
    
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

  // Setup favorites filter toggle
  setupFavoritesFilter() {
    const header = document.querySelector('.entries-header');
    if (!header || header.querySelector('.favorites-filter-btn')) return;
    
    const btn = document.createElement('button');
    btn.className = 'favorites-filter-btn';
    btn.innerHTML = '☆';
    btn.title = 'Show favorites only';
    
    btn.addEventListener('click', () => {
      this.showFavoritesOnly = !this.showFavoritesOnly;
      btn.classList.toggle('active', this.showFavoritesOnly);
      btn.innerHTML = this.showFavoritesOnly ? '⭐' : '☆';
      this.displayEntries();
    });
    
    // Insert before search toggle
    const searchBtn = header.querySelector('#search-toggle-btn');
    if (searchBtn) {
      header.insertBefore(btn, searchBtn);
    } else {
      header.appendChild(btn);
    }
  }

  // Clear all filters
  clearFilters() {
    this.filterDate = null;
    this.filterTags = [];
    this.showFavoritesOnly = false;
    this.searchQuery = '';
    
    const searchInput = document.getElementById('entry-search');
    if (searchInput) searchInput.value = '';
    
    const favBtn = document.querySelector('.favorites-filter-btn');
    if (favBtn) {
      favBtn.classList.remove('active');
      favBtn.innerHTML = '☆';
    }
    
    this.displayEntries();
  }

  // Initialize rich text editors for new and edit panels
  initRichEditors() {
    const panels = [this.newEntryPanel, this.editEntryPanel];
    
    panels.forEach(panel => {
      if (panel && panel.querySelector('.rich-editor')) {
        const editor = new RichEditorManager(panel);
        this.richEditors.set(panel.id, editor);
      }
    });
  }

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

  scheduleAutosave(panel) {
    if (!panel || !this.isAutosaveEnabled()) return;
    const panelId = panel.id;
    if (!panelId) return;
    const existing = this.liveAutosaveTimers.get(panelId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.performLiveAutosave(panel), 300);
    this.liveAutosaveTimers.set(panelId, timer);
  }

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

    if (panelId === 'edit-entry-panel') {
      const entryId = this.currentEntryId ?? this.currentEntryIndex;
      if (entryId !== null && entryId !== undefined) {
        StorageManager.updateEntry(entryId, name || 'Untitled', content, mood, fontFamily, fontSize, tags);
      }
    } else {
      if (!this.newEntryDraftId) {
        const saved = StorageManager.saveEntry(name || 'Untitled', content, mood, fontFamily, fontSize, tags);
        this.newEntryDraftId = saved?.id || null;
      } else {
        StorageManager.updateEntry(this.newEntryDraftId, name || 'Untitled', content, mood, fontFamily, fontSize, tags);
      }
    }

    this.lastAutosaveState.set(panelId, snapshot);
  }

  clearAutosaveState(panelId) {
    if (!panelId) return;
    const timer = this.liveAutosaveTimers.get(panelId);
    if (timer) clearTimeout(timer);
    this.liveAutosaveTimers.delete(panelId);
    this.lastAutosaveState.delete(panelId);
    if (panelId === 'new-entry-panel') {
      this.newEntryDraftId = null;
    }
  }

  showExitOverlay() {
    if (document.getElementById('panel-exit-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'panel-exit-overlay';
    overlay.className = 'panel-exit-overlay';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  hideExitOverlay() {
    const overlay = document.getElementById('panel-exit-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  }

  isAutosaveEnabled() {
    return true;
  }
}
