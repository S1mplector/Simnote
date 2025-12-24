// statsManager.js
// Statistics panel manager for journal analytics
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module manages the statistics panel displaying:
// - Entry counts and word statistics
// - Writing streak tracking
// - GitHub-style activity heatmap (365 days)
// - Mood distribution chart
// - Top tags analysis
//
// VISUALIZATION COMPONENTS:
// - Heatmap: Calendar grid showing entry activity by day
// - Mood Chart: Horizontal bar chart of mood distribution
// - Stat Cards: Animated number counters
//
// INTEGRATION POINTS:
// - StorageManager: Data retrieval
// - PanelManager: Panel transitions
// - MoodEmojiMapper: Emoji display for moods
//
// DEPENDENCIES:
// - StorageManager, PanelManager, MoodEmojiMapper

import { StorageManager } from './storageManager.js';
import { PanelManager } from './panelManager.js';
import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';
import { moodInsightsManager } from './moodInsightsManager.js';

/**
 * Manages the statistics panel with journal analytics.
 * Displays entry counts, streaks, heatmap, mood chart, and tag analysis.
 * 
 * @class StatsManager
 */
export class StatsManager {
  /**
   * Creates StatsManager and initializes event listeners.
   * @constructor
   */
  constructor() {
    /** @type {HTMLElement} Stats panel element */
    this.statsPanel = document.getElementById('stats-panel');
    /** @type {HTMLElement} Main menu panel */
    this.mainPanel = document.getElementById('main-panel');
    /** @type {HTMLElement} Stats button in main menu */
    this.statsBtn = document.getElementById('stats-btn');
    /** @type {HTMLElement} Back button in stats panel */
    this.backBtn = document.querySelector('.stats-back-btn');
    
    this.init();
  }

  /**
   * Initializes button event listeners.
   * @private
   */
  init() {
    if (this.statsBtn) {
      this.statsBtn.addEventListener('click', () => this.animateAndShow());
    }
    
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => this.hideStats());
    }
  }

  /**
   * Animates drawer opening and shows stats panel.
   */
  animateAndShow() {
    const drawer = this.statsBtn.closest('.chest__drawer');
    if (drawer) {
      drawer.classList.add('drawer-open');
      // Play drawer opening sound
      if (window.playSfx && window.drawerOpenSound) {
        window.playSfx(window.drawerOpenSound);
      }
      setTimeout(() => {
        this.showStats();
        setTimeout(() => drawer.classList.remove('drawer-open'), 400);
      }, 250);
    } else {
      this.showStats();
    }
  }

  /**
   * Shows the stats panel and renders statistics.
   */
  showStats() {
    // Hide utility buttons
    const manualBtn = document.getElementById('manual-btn');
    const themeSettingsBtn = document.getElementById('theme-settings-btn');
    if (manualBtn) manualBtn.style.display = 'none';
    if (themeSettingsBtn) themeSettingsBtn.style.display = 'none';
    document.body.classList.remove('main-menu-active');

    // Hide drawer navigation and other main menu elements
    const drawerNav = document.getElementById('drawer-nav');
    const simnoteLogo = document.querySelector('.simnote-logo');
    const plantScene = document.querySelector('.plant-scene');
    if (drawerNav) drawerNav.classList.remove('visible');
    if (simnoteLogo) simnoteLogo.style.opacity = '0';
    if (plantScene) plantScene.classList.remove('visible');

    PanelManager.transitionPanels(this.mainPanel, this.statsPanel).then(() => {
      this.renderStats();
    });
  }

  /**
   * Hides stats panel and returns to main menu.
   */
  hideStats() {
    PanelManager.transitionPanels(this.statsPanel, this.mainPanel).then(() => {
      if (window.animateMainPanelBack) {
        window.animateMainPanelBack();
      }
    });
  }

  /**
   * Renders all statistics components.
   */
  renderStats() {
    const stats = StorageManager.getStats();
    const entries = StorageManager.getEntries();
    
    // Update stat cards with animation
    this.animateValue('current-streak', stats.currentStreak);
    this.animateValue('longest-streak', stats.longestStreak);
    this.animateValue('total-entries', stats.totalEntries);
    this.animateValue('total-words', stats.totalWords);
    this.animateValue('avg-words', stats.avgWords);
    this.animateValue('favorite-count', stats.favoriteCount);
    
    // Render components
    this.renderHeatmap(entries);
    this.renderTopTags(entries);
    
    // Render mood insights (new comprehensive analytics)
    moodInsightsManager.render();
  }

  /**
   * Animates a number counter from 0 to target value.
   * 
   * @param {string} elementId - DOM element ID
   * @param {number} targetValue - Target number to animate to
   */
  animateValue(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const duration = 1000;
    const startValue = 0;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
      
      el.textContent = this.formatNumber(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Formats large numbers with K/M suffix.
   * 
   * @param {number} num - Number to format
   * @returns {string} Formatted string
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Renders the GitHub-style activity heatmap.
   * Shows entry activity for the last 365 days.
   * 
   * @param {Object[]} entries - Array of entry objects
   */
  renderHeatmap(entries) {
    const grid = document.getElementById('heatmap-grid');
    const monthsContainer = document.getElementById('heatmap-months');
    if (!grid || !monthsContainer) return;
    
    grid.innerHTML = '';
    monthsContainer.innerHTML = '';
    
    // Get entry counts by date
    const dateCounts = {};
    entries.forEach(entry => {
      const date = (entry.createdAt || entry.date).split('T')[0];
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    
    // Generate last 365 days
    const today = new Date();
    const days = [];
    const monthLabels = new Map();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = dateCounts[dateStr] || 0;
      
      // Track months for labels
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const weekIndex = Math.floor((364 - i) / 7);
      if (!monthLabels.has(monthKey) || monthLabels.get(monthKey) > weekIndex) {
        monthLabels.set(monthKey, weekIndex);
      }
      
      days.push({
        date: dateStr,
        count,
        dayOfWeek: date.getDay()
      });
    }
    
    const style = getComputedStyle(grid);
    const cellSize = parseInt(style.getPropertyValue('--heatmap-cell')) || 12;
    const gap = parseInt(style.getPropertyValue('--heatmap-gap')) || 3;
    const step = cellSize + gap;
    const minLabelSpacing = Math.max(step * 2, 28);

    // Render month labels with spacing guard
    const sortedMonths = [...monthLabels.entries()].sort((a, b) => a[1] - b[1]);
    let lastLabelLeft = -Infinity;
    sortedMonths.forEach(([month, weekIndex]) => {
      const left = weekIndex * step;
      if (left - lastLabelLeft < minLabelSpacing) {
        return;
      }
      const label = document.createElement('span');
      label.className = 'month-label';
      label.textContent = month;
      label.style.left = `${left}px`;
      monthsContainer.appendChild(label);
      lastLabelLeft = left;
    });
    
    // Render grid cells
    // Add day labels column
    const dayLabels = document.createElement('div');
    dayLabels.className = 'day-labels';
    ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach(day => {
      const label = document.createElement('span');
      label.textContent = day;
      dayLabels.appendChild(label);
    });
    grid.appendChild(dayLabels);
    
    // Group by weeks
    let currentWeek = null;
    days.forEach((day, index) => {
      const weekIndex = Math.floor(index / 7);
      
      if (weekIndex !== currentWeek) {
        currentWeek = weekIndex;
        const weekCol = document.createElement('div');
        weekCol.className = 'week-column';
        weekCol.dataset.week = weekIndex;
        grid.appendChild(weekCol);
      }
      
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.dataset.date = day.date;
      cell.dataset.count = day.count;
      cell.dataset.level = this.getHeatLevel(day.count);
      cell.title = `${day.date}: ${day.count} ${day.count === 1 ? 'entry' : 'entries'}`;
      
      const weekCol = grid.querySelector(`[data-week="${weekIndex}"]`);
      if (weekCol) weekCol.appendChild(cell);
    });
  }

  /**
   * Determines heat level (0-4) based on entry count.
   * 
   * @param {number} count - Number of entries on a day
   * @returns {number} Heat level 0-4
   */
  getHeatLevel(count) {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
  }

  /**
   * Renders the top 3 most used tags.
   * 
   * @param {Object[]} entries - Array of entry objects
   */
  renderTopTags(entries) {
    const topTagsEl = document.getElementById('top-tags');
    if (!topTagsEl) return;
    
    // Count tags
    const tagCounts = {};
    entries.forEach(entry => {
      (entry.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
    
    if (sortedTags.length === 0) {
      topTagsEl.textContent = 'No tags yet';
    } else {
      topTagsEl.textContent = sortedTags.join(', ');
    }
  }
}
