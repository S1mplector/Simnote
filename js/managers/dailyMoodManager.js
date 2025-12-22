// dailyMoodManager.js
// Handles daily mood check-in on app launch

import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';

export class DailyMoodManager {
  constructor() {
    this.storageKey = 'simnote_daily_mood';
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
    const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    const today = new Date().toISOString().split('T')[0];
    return data[today] || null;
  }

  setTodaysMood(mood) {
    const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    const today = new Date().toISOString().split('T')[0];
    data[today] = {
      mood,
      timestamp: new Date().toISOString()
    };
    
    // Keep only last 30 days of mood data
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    
    Object.keys(data).forEach(date => {
      if (date < cutoffStr) delete data[date];
    });
    
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    window.todaysMood = mood; // Make available globally for entries
  }

  getMoodHistory(days = 30) {
    const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    const result = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        mood: data[dateStr]?.mood || null
      });
    }
    
    return result;
  }

  setupMoodPanel() {
    if (!this.moodPanel) return;

    // Wait for splash to complete, then show mood panel
    setTimeout(() => {
      this.showMoodCheckin();
    }, 4500); // After splash animation
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

    // Smooth slide-up + fade + scale entrance animation using CSS classes
    this.mainPanel.style.display = 'none';
    this.moodPanel.classList.remove('panel-entering', 'panel-exiting', 'panel-fade-out');
    this.moodPanel.style.display = 'block';
    
    // Force reflow before adding animation class
    void this.moodPanel.offsetWidth;
    
    // Add entrance animation class
    this.moodPanel.classList.add('panel-entering');
    
    // Start typing animation after entrance completes
    setTimeout(() => {
      this.moodPanel.classList.remove('panel-entering');
      this.animateMoodInput();
    }, 550);
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
    
    // Smooth slide-down + fade + scale exit animation using CSS classes
    this.moodPanel.classList.remove('panel-entering', 'panel-fade-out');
    this.moodPanel.classList.add('panel-exiting');
    
    setTimeout(() => {
      this.moodPanel.style.display = 'none';
      this.moodPanel.classList.remove('panel-exiting');
      
      this.mainPanel.style.display = 'block';
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
      
      // Restore Write button label
      const writeBtn = this.moodPanel.querySelector('.mood-next-btn');
      if (writeBtn) {
        const writeLabel = writeBtn.querySelector('.icon-label') || writeBtn.querySelector('.settings-icon-label');
        if (writeLabel) {
          writeLabel.textContent = 'Write';
        }
      }
      
      // Trigger main panel animation
      if (window.animateMainPanelBack) {
        window.animateMainPanelBack();
      }
    }, 400);
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
  const data = JSON.parse(localStorage.getItem('simnote_daily_mood') || '{}');
  const today = new Date().toISOString().split('T')[0];
  return data[today]?.mood || null;
}
