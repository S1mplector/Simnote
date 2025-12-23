// dailyMoodManager.js
// Handles daily mood check-in on app launch
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module manages the daily mood check-in feature that prompts users
// to log their mood when opening the app. Features include:
// - Conditional display (only if enabled and no mood logged today)
// - Animated typing effect for the prompt
// - Integration with StorageManager for persistence
// - Panel transitions with PanelManager
//
// INTEGRATION POINTS:
// - StorageManager: Daily mood persistence
// - PanelManager: Panel transitions
// - MoodEmojiMapper: Mood to emoji conversion
//
// SETTINGS:
// - simnote_mood_checkin_enabled: localStorage key for feature toggle
//
// DEPENDENCIES:
// - MoodEmojiMapper, StorageManager, PanelManager

import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';
import { StorageManager } from './storageManager.js';
import { PanelManager } from './panelManager.js';

/**
 * Manages daily mood check-in functionality.
 * Prompts user to log mood on app launch if not already logged today.
 * 
 * @class DailyMoodManager
 * @example
 * const moodManager = new DailyMoodManager();
 */
export class DailyMoodManager {
  /**
   * Creates DailyMoodManager and initializes check-in.
   * @constructor
   */
  constructor() {
    /** @type {string} localStorage key for enabled setting */
    this.settingsKey = 'simnote_mood_checkin_enabled';
    /** @type {HTMLElement} Mood panel element */
    this.moodPanel = document.getElementById('mood-panel');
    /** @type {HTMLElement} Main menu panel */
    this.mainPanel = document.getElementById('main-panel');
    /** @type {HTMLElement} Panel heading element */
    this.headingEl = this.moodPanel ? this.moodPanel.querySelector('.mood-panel-title') : null;
    /** @type {string} Original heading text to restore */
    this.originalHeadingText = this.headingEl ? this.headingEl.textContent : '';
    const backBtn = this.moodPanel ? this.moodPanel.querySelector('.back-btn') : null;
    const backLabel = backBtn ? (backBtn.querySelector('.icon-label') || backBtn.querySelector('.settings-icon-label')) : null;
    /** @type {string} Original back button label */
    this.originalBackLabel = backLabel ? backLabel.textContent : '';
    /** @type {string} Original back button emoji */
    this.originalBackEmoji = backBtn ? backBtn.dataset.emoji : '';
    /** @type {Function|null} Skip button click handler */
    this.skipHandler = null;
    /** @type {boolean} Whether check-in has been shown this session */
    this.hasShownCheckin = false;
    /** @type {Function|null} Main menu ready event handler */
    this.readyHandler = null;
    /** @type {number|null} Fallback timer ID */
    this.fallbackTimer = null;
    
    this.init();
  }

  /**
   * Initializes check-in if conditions are met.
   * @private
   */
  init() {
    if (this.shouldShowMoodCheckin()) {
      this.setupMoodPanel();
    }
  }

  /**
   * Checks if mood check-in is enabled.
   * @returns {boolean} Whether feature is enabled (defaults to true)
   */
  isEnabled() {
    const setting = localStorage.getItem(this.settingsKey);
    return setting === null ? true : setting === 'true';
  }

  /**
   * Sets the enabled state for mood check-in.
   * @param {boolean} enabled - Whether to enable
   */
  setEnabled(enabled) {
    localStorage.setItem(this.settingsKey, enabled.toString());
  }

  /**
   * Determines if mood check-in should be shown.
   * @returns {boolean} True if enabled and no mood logged today
   */
  shouldShowMoodCheckin() {
    if (!this.isEnabled()) return false;
    const todaysMood = this.getTodaysMood();
    return !todaysMood;
  }

  /**
   * Gets today's logged mood.
   * @returns {string|null} Today's mood or null
   */
  getTodaysMood() {
    return StorageManager.getTodaysMood();
  }

  /**
   * Sets today's mood.
   * @param {string} mood - Mood to set
   */
  setTodaysMood(mood) {
    StorageManager.setTodaysMood(mood);
    window.todaysMood = mood;
  }

  /**
   * Gets mood history for specified days.
   * @param {number} [days=30] - Number of days
   * @returns {Array} Mood history array
   */
  getMoodHistory(days = 30) {
    return StorageManager.getMoodHistory(days);
  }

  /**
   * Sets up mood panel to show after main menu is ready.
   * @private
   */
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

  /**
   * Shows the mood check-in panel with animations.
   * @private
   */
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

  /**
   * Animates the typing effect for mood prompt.
   * @private
   */
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

  /**
   * Hides the mood check-in panel and restores original state.
   * @private
   */
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

/**
 * Gets mood check-in enabled state (standalone function).
 * @returns {boolean} Whether feature is enabled
 */
export function getMoodCheckinEnabled() {
  const setting = localStorage.getItem('simnote_mood_checkin_enabled');
  return setting === null ? true : setting === 'true';
}

/**
 * Sets mood check-in enabled state (standalone function).
 * @param {boolean} enabled - Whether to enable
 */
export function setMoodCheckinEnabled(enabled) {
  localStorage.setItem('simnote_mood_checkin_enabled', enabled.toString());
}

/**
 * Gets today's mood (standalone function).
 * @returns {string|null} Today's mood or null
 */
export function getTodaysMood() {
  return StorageManager.getTodaysMood();
}
