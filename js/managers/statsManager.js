// statsManager.js
import { StorageManager } from './storageManager.js';
import { PanelManager } from './panelManager.js';
import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';

export class StatsManager {
  constructor() {
    this.statsPanel = document.getElementById('stats-panel');
    this.mainPanel = document.getElementById('main-panel');
    this.statsBtn = document.getElementById('stats-btn');
    this.backBtn = document.querySelector('.stats-back-btn');
    
    this.init();
  }

  init() {
    if (this.statsBtn) {
      this.statsBtn.addEventListener('click', () => this.showStats());
    }
    
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => this.hideStats());
    }
  }

  showStats() {
    // Hide utility buttons
    const manualBtn = document.getElementById('manual-btn');
    const themeSettingsBtn = document.getElementById('theme-settings-btn');
    if (manualBtn) manualBtn.style.display = 'none';
    if (themeSettingsBtn) themeSettingsBtn.style.display = 'none';
    document.body.classList.remove('main-menu-active');

    PanelManager.transitionPanels(this.mainPanel, this.statsPanel).then(() => {
      this.renderStats();
    });
  }

  hideStats() {
    PanelManager.transitionPanels(this.statsPanel, this.mainPanel).then(() => {
      if (window.animateMainPanelBack) {
        window.animateMainPanelBack();
      }
    });
  }

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
    this.renderMoodChart(stats.moodCounts);
    this.renderTopTags(entries);
  }

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

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

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

  getHeatLevel(count) {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
  }

  renderMoodChart(moodCounts) {
    const chart = document.getElementById('mood-chart');
    if (!chart) return;
    
    chart.innerHTML = '';
    
    const moods = Object.entries(moodCounts);
    if (moods.length === 0) {
      chart.innerHTML = '<p class="no-data">No mood data yet. Start journaling to see your mood trends!</p>';
      return;
    }
    
    // Sort by count descending
    moods.sort((a, b) => b[1] - a[1]);
    
    const total = moods.reduce((sum, [_, count]) => sum + count, 0);
    const maxCount = Math.max(...moods.map(([_, count]) => count));
    
    moods.forEach(([mood, count]) => {
      const percentage = Math.round((count / total) * 100);
      const barWidth = (count / maxCount) * 100;
      const emoji = MoodEmojiMapper.getEmoji(mood) || '😐';
      
      const row = document.createElement('div');
      row.className = 'mood-row';
      row.innerHTML = `
        <div class="mood-label">
          <span class="mood-emoji">${emoji}</span>
          <span class="mood-name">${mood}</span>
        </div>
        <div class="mood-bar-container">
          <div class="mood-bar" style="width: 0%"></div>
        </div>
        <div class="mood-count">${count} (${percentage}%)</div>
      `;
      chart.appendChild(row);
      
      // Animate bar
      requestAnimationFrame(() => {
        const bar = row.querySelector('.mood-bar');
        bar.style.width = `${barWidth}%`;
      });
    });
  }

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
