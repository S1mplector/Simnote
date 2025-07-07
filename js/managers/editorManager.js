// editorManager.js
import { StorageManager } from './storageManager.js';
import { PanelManager } from './panelManager.js';
import { PaintDropAnimator } from '../animators/paintDropAnimator.js';
import { typeText } from '../utils/typingEffect.js';
import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';

export class EditorManager {
  constructor() {
    // Panels
    this.journalPanel = document.getElementById('journal-panel');
    this.mainPanel = document.getElementById('main-panel');
    this.newEntryPanel = document.getElementById('new-entry-panel');
    this.editEntryPanel = document.getElementById('edit-entry-panel');
    this.entriesListDiv = document.querySelector('.entry-list');

    // Track current entry index
    this.currentEntryIndex = null;
    this.filterDate = null; // YYYY-MM-DD string

    // Global search filter
    this.searchQuery = '';

    // Sorting mode
    this.sortMode = localStorage.getItem('sortMode') || 'newest';

    // Autosave timer reference
    this.autosaveTimer = null;

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

    // Clear text fields if leaving new/edit panel
    const nameInput = panel.querySelector('input.entry-name');
    const contentArea = panel.querySelector('textarea.entry-content');
    if (nameInput) nameInput.value = '';
    if (contentArea) contentArea.value = '';

    this.currentEntryIndex = null;

    PanelManager.transitionPanels(panel, this.mainPanel).then(() => {
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
    const contentArea = panel.querySelector('textarea.entry-content');
    const name = nameInput.value.trim();
    const content = contentArea.value.trim();
  
    if (!name || !content) {
      this.showPopup("Please enter both a name and content.");
      return;
    }
  
    if (panel.id === 'edit-entry-panel' && this.currentEntryIndex !== null) {
      // Editing existing entry
      const mood = this.editEntryPanel.dataset.mood;
      const fontStyle = window.getComputedStyle(contentArea);
      const fontFamily = fontStyle.fontFamily;
      const fontSize = fontStyle.fontSize;
      StorageManager.updateEntry(this.currentEntryIndex, name, content, mood, fontFamily, fontSize);
      this.showPopup("Entry updated!");
    } else {
      // Creating new entry
      const mood = this.newEntryPanel.dataset.mood || '';
      const fontStyle = window.getComputedStyle(contentArea);
      const fontFamily = fontStyle.fontFamily;
      const fontSize = fontStyle.fontSize;
      StorageManager.saveEntry(name, content, mood, fontFamily, fontSize);
      this.showPopup("Entry saved!");
    }
    this.displayEntries();
  }
  

  // Removed handleDeleteButton since deletion is now only handled from the entries list

  displayEntries() {
    let entries = StorageManager.getEntries().map((e,i)=>({...e,__index:i}));

    // Date filter (if active)
    if (this.filterDate) {
      entries = entries.filter(entry => entry.date.startsWith(this.filterDate));
    }

    // Text search filter (case-insensitive; match name or content)
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      entries = entries.filter(entry =>
        (entry.name && entry.name.toLowerCase().includes(q)) ||
        (entry.content && entry.content.toLowerCase().includes(q))
      );
    }

    // Apply sorting / grouping
    if(this.sortMode === 'newest'){
      entries.sort((a,b)=> new Date(b.date) - new Date(a.date));
    } else if(this.sortMode === 'oldest'){
      entries.sort((a,b)=> new Date(a.date) - new Date(b.date));
    } else if(this.sortMode === 'az'){
      entries.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
    } else if(this.sortMode === 'mood'){
      entries.sort((a,b)=> (a.mood||'').localeCompare(b.mood||''));
    }

    if (entries.length === 0) {
      this.entriesListDiv.innerHTML = "<p id=\"no-entries-msg\"></p>";
      const msg = (this.filterDate || this.searchQuery) ? 'No matching entries.' : 'No entries saved.';
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
        const formattedDate = new Date(entry.date).toLocaleString();
        html += `
          <li data-index="${entry.__index}" class="entry-item">
            <span class="entry-name-display">${entry.name}</span>
            <span class="entry-date-display">${formattedDate}</span>
            <button class="delete-entry" data-index="${entry.__index}">🗑️</button>
          </li>`;
      });
    } else {
      entries.forEach((entry) => {
      const formattedDate = new Date(entry.date).toLocaleString();
      html += `
          <li data-index="${entry.__index}" class="entry-item">
          <span class="entry-name-display">${entry.name}</span>
          <span class="entry-date-display">${formattedDate}</span>
            <button class="delete-entry" data-index="${entry.__index}">🗑️</button>
        </li>`;
    });
    }
    html += "</ul>";
    this.entriesListDiv.innerHTML = html;

    // Clicking a list item loads it into the edit panel
    document.querySelectorAll('.entry-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-entry')) return; // skip if it's the delete button

        const idx = parseInt(item.getAttribute('data-index'));
        const loadedEntry = StorageManager.getEntries()[idx];
        this.currentEntryIndex = idx;

        // Load that entry into edit panel
        const nameInput = this.editEntryPanel.querySelector('input.entry-name');
        const contentArea = this.editEntryPanel.querySelector('textarea.entry-content');
        nameInput.value = loadedEntry.name;
        contentArea.value = loadedEntry.content;
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
            dateEl.textContent = new Date(loadedEntry.date).toLocaleString();
          }
        }

        // Ensure edit panel shows its contents immediately, mirroring new-entry-panel behaviour
        this.editEntryPanel.classList.add('expand');

        PanelManager.transitionPanels(this.journalPanel, this.editEntryPanel);
      });
    });

    // Delete buttons for each entry in the list remain unchanged
    document.querySelectorAll('.delete-entry').forEach(deleteBtn => {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // so it doesn't trigger opening the edit panel
        const idx = parseInt(deleteBtn.getAttribute('data-index'));
        const listItem = deleteBtn.parentElement;

        // Animate removal
        listItem.classList.add('removing');
        listItem.addEventListener('animationend', () => {
          StorageManager.deleteEntry(idx);
          this.displayEntries();
        }, { once: true });
      });
    });
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
    const enabled = JSON.parse(localStorage.getItem('autosaveEnabled') || 'false');
    if(!enabled) return;
    const intervalSec = parseInt(localStorage.getItem('autosaveInterval') || '30');
    if(isNaN(intervalSec) || intervalSec<=0) return;
    this.autosaveTimer = setInterval(()=> this.performAutosave(), intervalSec*1000);
  }

  performAutosave(){
    // Only autosave in edit-entry-panel for simplicity
    if(!this.editEntryPanel || this.editEntryPanel.style.display==='none') return;
    const nameInput = this.editEntryPanel.querySelector('input.entry-name');
    const contentArea = this.editEntryPanel.querySelector('textarea.entry-content');
    if(!nameInput || !contentArea) return;
    const name = nameInput.value.trim();
    const content = contentArea.value.trim();
    if(!name || !content) return;
    if(this.currentEntryIndex !== null){
      const mood = this.editEntryPanel.dataset.mood;
      const fontStyle = window.getComputedStyle(contentArea);
      StorageManager.updateEntry(this.currentEntryIndex, name, content, mood, fontStyle.fontFamily, fontStyle.fontSize);
      console.log('Autosaved entry');
    }
  }
}
