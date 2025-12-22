// dailyMoodManager.js
// Handles daily mood check-in on app launch

import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';

export class DailyMoodManager {
  constructor() {
    this.storageKey = 'simnote_daily_mood';
    this.settingsKey = 'simnote_mood_checkin_enabled';
    this.moodPanel = document.getElementById('mood-panel');
    this.mainPanel = document.getElementById('main-panel');
    
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
    const heading = this.moodPanel.querySelector('h2');
    if (heading) {
      heading.textContent = 'How are you feeling today?';
    }

    // Change the "Start Writing" button to "Continue"
    const nextBtn = this.moodPanel.querySelector('.mood-next-btn');
    if (nextBtn) {
      nextBtn.textContent = 'Continue';
      nextBtn.dataset.emoji = '✨';
      
      // Remove old listeners and add new one
      const newBtn = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newBtn, nextBtn);
      
      newBtn.addEventListener('click', () => {
        const moodInput = document.getElementById('mood-input');
        const mood = moodInput ? moodInput.value.trim() : '';
        
        if (mood) {
          this.setTodaysMood(mood);
        }
        
        this.hideMoodCheckin();
      });
    }

    // Update back button to skip
    const backBtn = this.moodPanel.querySelector('.back-btn');
    if (backBtn) {
      backBtn.textContent = 'Skip';
      backBtn.dataset.emoji = '⏭️';
      
      const newBackBtn = backBtn.cloneNode(true);
      backBtn.parentNode.replaceChild(newBackBtn, backBtn);
      
      newBackBtn.addEventListener('click', () => {
        this.hideMoodCheckin();
      });
    }

    // Show the mood panel
    this.mainPanel.style.display = 'none';
    this.moodPanel.style.display = 'flex';
    this.moodPanel.classList.add('fade-in');
    
    // Trigger the mood input animation
    this.animateMoodInput();
  }

  animateMoodInput() {
    const moodPrompt = document.getElementById('mood-prompt');
    const moodInput = document.getElementById('mood-input');
    
    if (!moodPrompt || !moodInput) return;
    
    // Reset state
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
        
        requestAnimationFrame(() => {
          moodInput.classList.add('slide-in');
          moodInput.focus();
        });
      }
    }, 80);
  }

  hideMoodCheckin() {
    if (!this.moodPanel || !this.mainPanel) return;
    
    this.moodPanel.classList.remove('fade-in');
    this.moodPanel.style.display = 'none';
    this.mainPanel.style.display = 'block';
    
    // Trigger main panel animation
    if (window.animateMainPanelBack) {
      window.animateMainPanelBack();
    }
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
