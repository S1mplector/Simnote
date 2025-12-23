// dailyMoodManager.js
// Handles daily mood check-in on app launch

import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';
import { StorageManager } from './storageManager.js';
import { PanelManager } from './panelManager.js';

export class DailyMoodManager {
  constructor() {
    this.settingsKey = 'simnote_mood_checkin_enabled';
    this.moodPanel = document.getElementById('mood-panel');
    this.mainPanel = document.getElementById('main-panel');
    this.headingEl = this.moodPanel ? this.moodPanel.querySelector('.mood-panel-title') : null;
    this.originalHeadingText = this.headingEl ? this.headingEl.textContent : '';
    const backBtn = this.moodPanel ? this.moodPanel.querySelector('.back-btn') : null;
    const backLabel = backBtn ? (backBtn.querySelector('.icon-label') || backBtn.querySelector('.settings-icon-label')) : null;
    this.originalBackLabel = backLabel ? backLabel.textContent : '';
    this.originalBackEmoji = backBtn ? backBtn.dataset.emoji : '';
    this.skipHandler = null;
    this.hasShownCheckin = false;
    this.readyHandler = null;
    this.fallbackTimer = null;
    
    this.init();
  }

  init() {
    // Check if we should show mood check-in
    if (this.shouldShowMoodCheckin()) {
      this.setupMoodPanel();
    }
  }

  isEnabled() {
    // Default to true if not set
    const setting = localStorage.getItem(this.settingsKey);
    return setting === null ? true : setting === 'true';
  }

  setEnabled(enabled) {
    localStorage.setItem(this.settingsKey, enabled.toString());
  }

  shouldShowMoodCheckin() {
    if (!this.isEnabled()) return false;
    
    const todaysMood = this.getTodaysMood();
    return !todaysMood; // Show if no mood logged today
  }

  getTodaysMood() {
    return StorageManager.getTodaysMood();
  }

  setTodaysMood(mood) {
    StorageManager.setTodaysMood(mood);
    window.todaysMood = mood; // Make available globally for entries
  }

  getMoodHistory(days = 30) {
    return StorageManager.getMoodHistory(days);
  }

  setupMoodPanel() {
    if (!this.moodPanel) return;

    const showDelayMs = 600;
    const fallbackMs = 8000;

    const scheduleShow = () => {
      if (this.hasShownCheckin) return;
      this.hasShownCheckin = true;
      if (this.readyHandler) {
        window.removeEventListener('mainMenuReady', this.readyHandler);
        this.readyHandler = null;
      }
      if (this.fallbackTimer) {
        clearTimeout(this.fallbackTimer);
        this.fallbackTimer = null;
      }
      setTimeout(() => this.showMoodCheckin(), showDelayMs);
    };

    if (window.__mainMenuReady) {
      scheduleShow();
      return;
    }

    this.readyHandler = () => {
      scheduleShow();
    };
    window.addEventListener('mainMenuReady', this.readyHandler);

    this.fallbackTimer = setTimeout(() => {
      scheduleShow();
    }, fallbackMs);
  }

  showMoodCheckin() {
    if (!this.moodPanel || !this.mainPanel) return;
    
    // Update the mood panel for daily check-in mode
    if (this.headingEl) {
      this.headingEl.textContent = 'How are you feeling today?';
    }
    this.moodPanel.classList.add('daily-checkin');

    // Update back button to skip
    const backBtn = this.moodPanel.querySelector('.back-btn');
    if (backBtn) {
      const backLabel = backBtn.querySelector('.icon-label') || backBtn.querySelector('.settings-icon-label');
      if (backLabel) {
        backLabel.textContent = 'Skip';
      }
      if (this.skipHandler) {
        backBtn.removeEventListener('click', this.skipHandler, true);
      }
      this.skipHandler = (event) => {
        if (!this.moodPanel || !this.moodPanel.classList.contains('daily-checkin')) return;
        event.stopImmediatePropagation();
        this.hideMoodCheckin();
      };
      backBtn.addEventListener('click', this.skipHandler, true);
    }
    
    // Update Write button label to "Done"
    const writeBtn = this.moodPanel.querySelector('.mood-next-btn');
    if (writeBtn) {
      const writeLabel = writeBtn.querySelector('.icon-label') || writeBtn.querySelector('.settings-icon-label');
      if (writeLabel) {
        writeLabel.textContent = 'Done';
      }
    }

    this.moodPanel.classList.remove('panel-entering', 'panel-exiting', 'panel-fade-out');

    if (this.mainPanel && this.mainPanel.style.display !== 'none') {
      PanelManager.smoothEntrance(this.mainPanel, this.moodPanel, {
        fadeDuration: 320
      }).then(() => {
        this.animateMoodInput();
      });
      return;
    }

    this.moodPanel.style.display = 'block';
    this.moodPanel.style.opacity = '0';
    void this.moodPanel.offsetWidth;
    this.moodPanel.style.opacity = '1';
    setTimeout(() => {
      this.animateMoodInput();
    }, 360);
  }

  animateMoodInput() {
    const moodPrompt = document.getElementById('mood-prompt');
    const moodInput = document.getElementById('mood-input');
    
    if (!moodPrompt || !moodInput) return;
    
    // Reset state
    moodPrompt.textContent = '';
    moodPrompt.style.borderRight = '2px solid var(--accent)';
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
        
        requestAnimationFrame(() => {
          moodInput.classList.add('slide-in');
          moodInput.focus();
        });
      }
    }, 80);
  }

  hideMoodCheckin() {
    if (!this.moodPanel || !this.mainPanel) return;

    this.moodPanel.classList.remove('panel-entering', 'panel-fade-out');
    this.moodPanel.classList.add('panel-exiting');

    const resetPanel = () => {
      this.moodPanel.style.display = 'none';
      this.moodPanel.classList.remove('panel-exiting');
      this.moodPanel.classList.remove('daily-checkin');
      if (this.headingEl && this.originalHeadingText) {
        this.headingEl.textContent = this.originalHeadingText;
      }
      const backBtn = this.moodPanel.querySelector('.back-btn');
      if (backBtn) {
        if (this.skipHandler) {
          backBtn.removeEventListener('click', this.skipHandler, true);
        }
        const backLabel = backBtn.querySelector('.icon-label') || backBtn.querySelector('.settings-icon-label');
        if (backLabel) {
          backLabel.textContent = this.originalBackLabel || 'Menu';
        }
        if (this.originalBackEmoji) {
          backBtn.dataset.emoji = this.originalBackEmoji;
        }
      }

      const writeBtn = this.moodPanel.querySelector('.mood-next-btn');
      if (writeBtn) {
        const writeLabel = writeBtn.querySelector('.icon-label') || writeBtn.querySelector('.settings-icon-label');
        if (writeLabel) {
          writeLabel.textContent = 'Write';
        }
      }

      if (window.animateMainPanelBack) {
        window.animateMainPanelBack();
      }
    };

    if (this.moodPanel.style.display !== 'none') {
      PanelManager.smoothExit(this.moodPanel, this.mainPanel, {
        fadeDuration: 320
      }).then(() => {
        resetPanel();
      });
      return;
    }

    resetPanel();
  }
}

// Export for use in settings
export function getMoodCheckinEnabled() {
  const setting = localStorage.getItem('simnote_mood_checkin_enabled');
  return setting === null ? true : setting === 'true';
}

export function setMoodCheckinEnabled(enabled) {
  localStorage.setItem('simnote_mood_checkin_enabled', enabled.toString());
}

export function getTodaysMood() {
  return StorageManager.getTodaysMood();
}
