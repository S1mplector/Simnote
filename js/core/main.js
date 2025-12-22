// main.js

import { PanelManager } from '../managers/panelManager.js';
import { EditorManager } from '../managers/editorManager.js';
import { BackgroundAnimator } from '../animators/backgroundAnimator.js';
import { SakuraSwirlAnimator } from '../animators/sakuraSwirlAnimator.js';
import { AuroraAnimator } from '../animators/auroraAnimator.js';
import { AuroraSplashAnimator } from '../animators/auroraSplashAnimator.js';
import { StorageManager } from '../managers/storageManager.js';
import { initThemeSelector } from './themeSelector.js';
import { TEMPLATES } from './templates.js';
import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';
import { PlainSplashAnimator } from '../animators/plainSplashAnimator.js';
import { PlainDarkSweepSplashAnimator } from '../animators/plainDarkSweepSplashAnimator.js';
import { PlainLightSweepSplashAnimator } from '../animators/plainLightSweepSplashAnimator.js';
import { DateHeaderAnimator } from '../animators/dateHeaderAnimator.js';
import { FirefliesAnimator } from '../animators/firefliesAnimator.js';
import { FirefliesSplashAnimator } from '../animators/firefliesSplashAnimator.js';
import { LavenderBreezeAnimator } from '../animators/lavenderBreezeAnimator.js';
import { LavenderSplashAnimator } from '../animators/lavenderSplashAnimator.js';
import { GuidedPromptManager } from '../managers/guidedPromptManager.js';
import { StatsManager } from '../managers/statsManager.js';
import { KeyboardManager } from '../managers/keyboardManager.js';
import { OnboardingManager } from '../managers/onboardingManager.js';

// Grab key panels from the DOM
const mainPanel = document.getElementById('main-panel');
const journalPanel = document.getElementById('journal-panel');
const newEntryPanel = document.getElementById('new-entry-panel');
const moodPanel = document.getElementById('mood-panel');
const templatePanel = document.getElementById('template-panel');
const moodSlider = document.getElementById('mood-slider');
const moodTextEl = document.getElementById('mood-text');
const moodInput = document.getElementById('mood-input');
const moodPrompt = document.getElementById('mood-prompt');
let currentMood = '';

// Initialize the editor logic immediately (it doesn't interfere with the splash)
const editorManager = new EditorManager();

// DOM elements used for main panel animations
const blurOverlay = document.querySelector('.blur-overlay');
const simnoteLogo = document.querySelector('.simnote-logo');
const navButtons = document.querySelector('.nav-buttons');
const logoTextEl = document.querySelector('.logo-text');

// Buttons
const manualBtn = document.getElementById('manual-btn');
const themeSettingsBtn = document.getElementById('theme-settings-btn');
// Hide utility buttons until splash completes
manualBtn.style.display = 'none';
themeSettingsBtn.style.display = 'none';

// Hold off on starting the background animation & intro until the splash finishes

function startIntroAnimation() {
  // Kick-off the blur + logo + buttons sequence
  blurOverlay.style.opacity = 1;
  setTimeout(() => {
    simnoteLogo.style.opacity = 1;
    simnoteLogo.style.transform = 'translateY(0)';

    // Start handwriting animation after logo becomes visible
    if (logoTextEl) {
      logoTextEl.classList.add('animate-draw');
    }

    setTimeout(() => {
      navButtons.classList.add('visible');
      // Reveal utility buttons together with the main menu
      manualBtn.style.display = 'block';
      themeSettingsBtn.style.display = 'block';
    }, 300);
  }, 1000);
}

// Helper to launch appropriate splash animation
function launchSplash(theme) {
  if (theme === 'aurora') {
    new AuroraSplashAnimator(startMainApp);
  } else if (theme === 'fireflies') {
    new FirefliesSplashAnimator(startMainApp);
  } else if (theme === 'plain-dark') {
    new PlainDarkSweepSplashAnimator(startMainApp);
  } else if (theme === 'plain-light') {
    new PlainLightSweepSplashAnimator(startMainApp);
  } else if (theme === 'lavender-breeze') {
    new LavenderSplashAnimator(startMainApp);
  } else {
    new SakuraSwirlAnimator(startMainApp);
  }
}

// --- Background animator management ---
let currentBgAnimator = null;
function startBgAnimator(theme) {
  if (currentBgAnimator && currentBgAnimator.destroy) {
    currentBgAnimator.destroy();
  }
  if (theme === 'aurora') {
    currentBgAnimator = new AuroraAnimator();
  } else if (theme === 'fireflies') {
    currentBgAnimator = new FirefliesAnimator();
  } else if (theme === 'lavender-breeze') {
    currentBgAnimator = new LavenderBreezeAnimator();
  } else {
    currentBgAnimator = new BackgroundAnimator();
  }
}

function startMainApp() {
  // Start appropriate background animation
  const theme = document.body.getAttribute('data-theme');
  startBgAnimator(theme);
  startIntroAnimation();
}

// Respond to runtime theme changes
window.addEventListener('themeChanged', (e)=>{
  const newTheme = e.detail;
  // Update background animator
  startBgAnimator(newTheme);

  // Create blur overlay indicating restart
  if(!document.getElementById('restart-overlay')){
    const ov=document.createElement('div');
    ov.id='restart-overlay';
    Object.assign(ov.style,{
      position:'fixed',top:0,left:0,width:'100%',height:'100%',
      background:'rgba(0,0,0,0.35)',backdropFilter:'blur(8px)',
      WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:10000,opacity:'0',transform:'scale(1.05)',
      transition:'opacity 0.45s cubic-bezier(0.33,1,0.68,1), transform 0.45s cubic-bezier(0.33,1,0.68,1)'
    });

    // --- Content wrapper ---
    const wrap=document.createElement('div');
    wrap.style.display='flex';wrap.style.flexDirection='column';wrap.style.alignItems='center';wrap.style.gap='16px';

    // spinner
    const spinner=document.createElement('div');
    Object.assign(spinner.style,{
      width:'40px',height:'40px',border:'4px solid rgba(255,255,255,0.3)',
      borderTopColor:'var(--accent,#fcd8ff)',borderRadius:'50%',
      animation:'spin 1s linear infinite'
    });
    // add keyframes once
    if(!document.getElementById('spinner-kf')){
      const styleEl=document.createElement('style');styleEl.id='spinner-kf';
      styleEl.textContent='@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}';
      document.head.appendChild(styleEl);
    }

    const txt=document.createElement('span');
    txt.textContent='Applying theme...';
    txt.style.color='#fff';txt.style.fontSize='1.2rem';

    wrap.appendChild(spinner);wrap.appendChild(txt);
    ov.appendChild(wrap);
    document.body.appendChild(ov);
    requestAnimationFrame(()=>{ov.style.opacity='1';ov.style.transform='scale(1)';});
    setTimeout(()=>{
      ov.style.opacity='0';ov.style.transform='scale(0.98)';
      setTimeout(()=>{ location.reload(); },450);
    },450);
  }
});

/* -------------------------------------
   Panel Navigation: Main -> New / Load
-------------------------------------- */
const newEntryBtn = document.getElementById('new-entry-btn');
const loadEntryBtn = document.getElementById('load-entry-btn');

// Helper to refresh greeting + date strip in mood panel
function refreshDateHeader(){
  const greetingEl = document.getElementById('greeting-text');
  const dateEl = document.getElementById('current-date');
  const stripEl = document.getElementById('date-strip');
  if(!greetingEl || !dateEl || !stripEl) return;

  // Greeting based on hour
  const hour = new Date().getHours();
  let greeting = 'Hello';
  let emoji = '👋';
  if(hour >= 5 && hour < 12){ greeting='Good Morning'; emoji='☀️'; }
  else if(hour >= 12 && hour < 18){ greeting='Good Afternoon'; emoji='🌤️'; }
  else if(hour >= 18 && hour < 22){ greeting='Good Evening'; emoji='🌙'; }
  else { greeting='Good Night'; emoji='🌙'; }
  greetingEl.textContent = `${emoji}  ${greeting}.`;

  // Current date formatted
  const now = new Date();
  const options = { month:'long', day:'numeric' };
  dateEl.textContent = now.toLocaleDateString(undefined, options);

  // Build date strip ±6 days
  stripEl.innerHTML = '';
  const dowShort = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  for(let offset=-6; offset<=6; offset++){
    const d = new Date(now);
    d.setDate(now.getDate()+offset);
    const cell = document.createElement('div');
    cell.className='date-cell'+(offset===0?' selected':'');
    cell.innerHTML = `<span class="dow">${dowShort[d.getDay()]}</span><span class="num">${d.getDate()}</span>`;
    stripEl.appendChild(cell);
  }

  // (Re)generate animated background so it stays in sync with the greeting
  const hdr = document.getElementById('mood-date-header');
  if(!hdr) return;

  if(!window._dateHeaderAnim){
    // First time – create animator
    window._dateHeaderAnim = new DateHeaderAnimator(hdr);
  } else {
    // Subsequent calls – clear old elements & re-initialise so the slot matches the latest hour
    if(window._dateHeaderAnim.bg){
      window._dateHeaderAnim.bg.innerHTML = '';
    }
    window._dateHeaderAnim.init();
  }
}

// Helper to animate "I'm feeling..." typing and slide-in
function startMoodPanelAnimation() {
  if (!moodPrompt || !moodInput) return;

  refreshDateHeader();

  // Reset state each time panel opens
  moodPrompt.textContent = '';
  moodPrompt.style.borderRight = '2px solid #fcd8ff';
  moodInput.classList.remove('slide-in');
  moodInput.value = '';

  const fullText = "I'm feeling...";
  let idx = 0;

  const typeInterval = setInterval(() => {
    moodPrompt.textContent += fullText[idx];
    idx++;

    if (idx === fullText.length) {
      clearInterval(typeInterval);
      moodPrompt.style.borderRight = 'none';

      // Next frame => slide-in the input + focus it
      requestAnimationFrame(() => {
        moodInput.classList.add('slide-in');
        moodInput.focus();
      });
    }
  }, 80);
}

// Override the original handler so we can kick off the animation
newEntryBtn.addEventListener('click', () => {
  manualBtn.style.display = 'none';
  themeSettingsBtn.style.display = 'none';
  PanelManager.transitionPanels(mainPanel, templatePanel).then(() => {
    blurOverlay.style.opacity = 0;
  });
});

loadEntryBtn.addEventListener('click', () => {
  manualBtn.style.display = 'none';
  themeSettingsBtn.style.display = 'none';
  document.body.classList.add('journal-open');
  PanelManager.transitionPanels(mainPanel, journalPanel).then(() => {
    blurOverlay.style.opacity = 0;
    const entriesPane = document.querySelector('.entries-pane');
    if (entriesPane) entriesPane.style.display = 'block';
    window.dispatchEvent(new Event('loadEntries'));
  });
});

// Called when returning to the main panel
function animateMainPanelBack() {
  blurOverlay.style.opacity = 1;
  simnoteLogo.style.opacity = 1;
  simnoteLogo.style.transform = 'translateY(0)';
  navButtons.classList.add('visible');
  manualBtn.style.display = 'block';
  themeSettingsBtn.style.display = 'block';
  document.body.classList.remove('journal-open');
}
window.animateMainPanelBack = animateMainPanelBack;

/* -------------------------------------
   Settings Panel (Font Family / Size)
-------------------------------------- */
const settingsPanel = document.getElementById('settings-panel');
const settingsCloseBtn = document.getElementById('settings-close-btn');

// Attach toggle behaviour to every settings gear in the editor panels
document.querySelectorAll('.settings-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    settingsPanel.classList.toggle('visible');
  });
});

if (settingsCloseBtn) {
  settingsCloseBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('visible');
  });
}

const fontSizeSlider = document.getElementById('font-size-slider');
fontSizeSlider.addEventListener('input', (e) => {
  const newSize = e.target.value + 'px';
  document.querySelectorAll('.entry-content').forEach((el) => {
    el.style.fontSize = newSize;
  });
});

const dropdownSelected = document.getElementById('font-dropdown-selected');
const dropdownList = document.getElementById('font-dropdown-list');

dropdownSelected.addEventListener('click', () => {
  dropdownList.classList.toggle('open');
});

dropdownList.querySelectorAll('li').forEach(item => {
  item.addEventListener('click', () => {
    const newFont = item.getAttribute('data-value');
    dropdownSelected.textContent = item.textContent;
    document.querySelectorAll('.entry-content').forEach(el => {
      el.style.fontFamily = newFont;
    });
    dropdownList.classList.remove('open');
  });
});

document.addEventListener('click', (e) => {
  if (!dropdownSelected.contains(e.target) && !dropdownList.contains(e.target)) {
    dropdownList.classList.remove('open');
  }
});

/* -------------------------------------
   Theme Settings Panel
-------------------------------------- */
const themeSettingsPopup = document.getElementById('theme-settings-popup');
const themeSettingsCloseBtn = document.getElementById('theme-settings-close-btn');

themeSettingsBtn.addEventListener('click', () => {
  themeSettingsPopup.classList.add('visible');
});

themeSettingsCloseBtn.addEventListener('click', () => {
  themeSettingsPopup.classList.remove('visible');
});

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('selectedTheme') || 'default';
  document.body.setAttribute('data-theme', savedTheme);
  initThemeSelector();
  launchSplash(savedTheme);

  // Initialize date header immediately to avoid placeholder flicker
  initDateHeader();

  // Initialize stats manager
  new StatsManager();

  // Initialize keyboard shortcuts
  new KeyboardManager();

  // Initialize onboarding for first-time users
  const onboarding = new OnboardingManager();
  onboarding.start();

  /* --- Build Template Cards --- */
  const grid = document.querySelector('.template-grid');
  if(grid){
    Object.entries(TEMPLATES).forEach(([key, tpl])=>{
      const card=document.createElement('div');
      card.className='template-card';
      card.dataset.key=key;
      card.innerHTML=`<span class=\"icon\">${tpl.icon}</span><span>${tpl.name}</span>`;
      grid.appendChild(card);

      // Hover listeners for info panel
      const infoEl = document.getElementById('template-info');
      card.addEventListener('mouseenter', ()=>{
        if(!infoEl) return;
        infoEl.textContent = TEMPLATES[key].desc || '';
        infoEl.classList.add('show');
      });
      card.addEventListener('mouseleave', ()=>{
        if(!infoEl) return;
        infoEl.classList.remove('show');
      });
    });
  }

  if(templatePanel){
    templatePanel.addEventListener('click', (e)=>{
      const card = e.target.closest('.template-card');
      if(!card) return;
      window.selectedTemplate = TEMPLATES[card.dataset.key];
      window.selectedTemplateBackup = TEMPLATES[card.dataset.key];
      PanelManager.transitionPanels(templatePanel, moodPanel).then(()=>{
        startMoodPanelAnimation();
      });
    });

    // Back button to main menu
    const tplBackBtn = templatePanel.querySelector('.tpl-back-btn');
    if(tplBackBtn){
      tplBackBtn.addEventListener('click', ()=>{
        PanelManager.transitionPanels(templatePanel, mainPanel).then(()=>{
          blurOverlay.style.opacity = 1;
          manualBtn.style.display = 'block';
          themeSettingsBtn.style.display = 'block';
        });
      });
    }
  }
});

// Initialise header on app load
function initDateHeader(){
  const hdr=document.getElementById('mood-date-header');
  if(!hdr) return;
  refreshDateHeader();
  if(!window._dateHeaderAnim){
    window._dateHeaderAnim=new DateHeaderAnimator(hdr);
  }
}

/* -------------------------------------
   Saving Entries (via Preload API)
-------------------------------------- */
const saveBtn = newEntryPanel.querySelector('.save-btn');
saveBtn.addEventListener('click', async () => {
  const entryName = newEntryPanel.querySelector('input.entry-name').value;
  const entryContent = newEntryPanel.querySelector('textarea.entry-content').value;
  try {
    const result = await window.electronAPI.saveEntry(entryName, entryContent);
    showPopup(result);
    newEntryPanel.querySelector('input.entry-name').value = '';
    newEntryPanel.querySelector('textarea.entry-content').value = '';
  } catch (error) {
    console.error("Error saving entry:", error);
  }
});

function showPopup(message) {
  const popup = document.getElementById('custom-popup');
  popup.textContent = message;
  popup.classList.add('visible');
  setTimeout(() => {
    popup.classList.remove('visible');
  }, 2000);
}

/* -------------------------------------
   Manual Popup
-------------------------------------- */
const manualPopup = document.getElementById('manual-popup');
const manualCloseBtn = document.getElementById('manual-close-btn');

manualBtn.addEventListener('click', () => {
  manualPopup.classList.add('visible');
});

manualCloseBtn.addEventListener('click', () => {
  manualPopup.classList.remove('visible');
});

/* -------------------------------------
   NEW: Export/Import Functionality
-------------------------------------- */
const exportImportBtn = document.getElementById('export-import-btn');
const exportImportPopup = document.getElementById('export-import-popup');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const exportImportCloseBtn = document.getElementById('export-import-close-btn');

exportImportBtn.addEventListener('click', () => {
  const rect = exportImportBtn.getBoundingClientRect();
  exportImportPopup.style.top = `${rect.top}px`;
  exportImportPopup.style.left = `${rect.right + 20}px`;
  exportImportPopup.style.display = 'block';
  // ensure starting state
  exportImportPopup.classList.remove('visible');
  void exportImportPopup.offsetWidth;
  exportImportPopup.classList.add('side-visible');
});

exportImportCloseBtn.addEventListener('click', () => {
  exportImportPopup.classList.remove('side-visible');
  setTimeout(() => { exportImportPopup.style.display = 'none'; }, 300);
});

exportBtn.addEventListener('click', () => {
  // Export all entries
  const content = StorageManager.generateExportContent();
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simnote-entries.mynote';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showPopup('Entries exported successfully!');
});

importBtn.addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.mynote,.txt';
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target.result;
      const importedCount = StorageManager.importEntries(fileContent);
      showPopup(`${importedCount} entries imported!`);
      window.dispatchEvent(new Event('loadEntries'));
    };
    reader.readAsText(file);
  };
  fileInput.click();
});

const moodNextBtn = document.querySelector('.mood-next-btn');
if (moodNextBtn) {
  moodNextBtn.addEventListener('click', () => {
    currentMood = moodInput.value.trim();
    PanelManager.transitionPanels(moodPanel, newEntryPanel).then(() => {
      newEntryPanel.dataset.mood = currentMood;

      const meta = newEntryPanel.querySelector('.entry-meta');
      if (meta) {
        const moodEl = meta.querySelector('.mood-badge');
        const dateEl = meta.querySelector('.date-stamp');
        if (moodEl) {
          if (currentMood) {
            const emoji = MoodEmojiMapper.getEmoji(currentMood);
            moodEl.textContent = emoji ? `${emoji} ${currentMood}` : currentMood;
            moodEl.style.display = 'inline-block';
          } else {
            moodEl.style.display = 'none';
          }
        }
        if (dateEl) {
          dateEl.textContent = new Date().toLocaleString();
        }
      }
      // Guarantee the panel is expanded and content visible on every open
      if (!newEntryPanel.classList.contains('expand')) {
        newEntryPanel.classList.add('expand');
      }
      const titleInput = newEntryPanel.querySelector('input.entry-name');
      const contentArea = newEntryPanel.querySelector('textarea.entry-content');
      if(window.selectedTemplate){
        titleInput.value = window.selectedTemplate.name;
        contentArea.value = window.selectedTemplate.content || '';
        window.selectedTemplate = null;
        // Start guided prompts if template has them
        if(window._guidedPromptMgr){window._guidedPromptMgr.destroy();}
        if(window.selectedTemplateBackup && window.selectedTemplateBackup.prompts){
           window._guidedPromptMgr = new GuidedPromptManager(newEntryPanel, window.selectedTemplateBackup);
        }
      } else {
        titleInput.value = '';
        contentArea.value = '';
      }
    });
  });
}

const moodBackBtn = moodPanel.querySelector('.back-btn');
if (moodBackBtn) {
  moodBackBtn.addEventListener('click', () => {
    PanelManager.transitionPanels(moodPanel, mainPanel).then(() => {
      blurOverlay.style.opacity = 1;
      manualBtn.style.display = 'block';
      themeSettingsBtn.style.display = 'block';
    });
  });
}

let typingTimers = [];

// Auto-resize mood input width based on content
function autoResizeMoodInput() {
  // Reset to minimal width to measure scrollWidth accurately
  moodInput.style.width = 'auto';
  const newWidth = Math.min(Math.max(moodInput.scrollWidth + 20, 120), 350);
  moodInput.style.width = newWidth + 'px';
}

moodInput.addEventListener('input', autoResizeMoodInput);

/* -------------------------------------
   Autosave Settings
-------------------------------------- */
const autosaveEnabledCheckbox = document.getElementById('autosave-enabled');

function loadAutosaveSettings(){
  const enabled = JSON.parse(localStorage.getItem('autosaveEnabled') || 'false');
  if(autosaveEnabledCheckbox) autosaveEnabledCheckbox.checked = enabled;
}

function saveAutosaveSettings(){
  localStorage.setItem('autosaveEnabled', autosaveEnabledCheckbox.checked);
  window.dispatchEvent(new Event('autosaveSettingsChanged'));
}

if(autosaveEnabledCheckbox){
  autosaveEnabledCheckbox.addEventListener('change', saveAutosaveSettings);
}

document.addEventListener('DOMContentLoaded', loadAutosaveSettings);

window.selectedTemplate = null;
