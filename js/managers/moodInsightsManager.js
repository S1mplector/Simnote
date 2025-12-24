// moodInsightsManager.js
// Renders mood analytics and insights in the stats panel
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module manages the rendering of mood insights including:
// - Mood overview with score ring
// - Smooth trend line graphs
// - Time of day analysis visualization
// - Day of week patterns
// - Mood drivers (correlations)
// - Volatility meter
// - Dynamic insights cards
//
// DEPENDENCIES:
// - MoodAnalyticsEngine for data processing
// - StorageManager for data access
// - MoodEmojiMapper for emoji display

import { MoodAnalyticsEngine } from '../analytics/moodAnalyticsEngine.js';
import { StorageManager } from './storageManager.js';
import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';

/**
 * Manages mood insights UI rendering.
 * 
 * @class MoodInsightsManager
 */
export class MoodInsightsManager {
  /**
   * Creates MoodInsightsManager instance.
   * @constructor
   */
  constructor() {
    /** @type {MoodAnalyticsEngine} Analytics engine */
    this.analytics = new MoodAnalyticsEngine();
    /** @type {string} Current selected time period */
    this.currentPeriod = 'week';
    /** @type {Object|null} Cached analytics data */
    this.cachedData = null;
    /** @type {boolean} Rendering in progress */
    this.isRendering = false;
    /** @type {Object} Render verification status */
    this.renderStatus = {};
    /** @type {number} Watchdog timeout ID */
    this.watchdogTimer = null;
    /** @type {string|null} Loader template HTML */
    this.loaderTemplate = null;
    
    this.init();
  }

  /**
   * Initializes event listeners for period selector.
   * @private
   */
  init() {
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isRendering) return;
        periodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = btn.dataset.period;
        this.render();
      });
    });
    
    const loader = document.getElementById('stats-loader');
    if (loader) {
      this.loaderTemplate = loader.innerHTML;
    }

    window.moodInsightsManager = this;
  }

  /**
   * Shows the loading overlay.
   */
  showLoader() {
    const loader = document.getElementById('stats-loader');
    if (!loader) return;
    if (this.loaderTemplate) {
      loader.innerHTML = this.loaderTemplate;
    }
    loader.classList.remove('hidden');
  }

  /**
   * Hides the loading overlay.
   */
  hideLoader() {
    const loader = document.getElementById('stats-loader');
    if (loader) loader.classList.add('hidden');
  }

  showErrorOverlay(message) {
    const loader = document.getElementById('stats-loader');
    if (!loader) return;

    loader.innerHTML = `
      <div class="stats-error">
        <div class="stats-error-icon">😕</div>
        <div class="stats-error-title">Mood insights failed to load</div>
        <div class="stats-error-message">${message || 'Unknown error'}</div>
        <button class="stats-retry-btn" type="button">Try Again</button>
      </div>
    `;
    loader.classList.remove('hidden');

    const btn = loader.querySelector('.stats-retry-btn');
    if (btn) {
      btn.addEventListener('click', () => this.retry());
    }
  }

  /**
   * Retry rendering after failure.
   */
  retry() {
    this.render();
  }

  /**
   * Loads data and renders all insights with watchdog verification.
   */
  render() {
    if (this.isRendering) return;
    this.isRendering = true;
    this.showLoader();
    
    // Reset render status
    this.renderStatus = {
      overview: false,
      trends: false,
      insights: false,
      timeOfDay: false,
      dayOfWeek: false,
      drivers: false,
      volatility: false
    };

    // Set watchdog timer (5 seconds max)
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => this.onWatchdogTimeout(), 5000);

    try {
      // Load fresh data
      const days = this.currentPeriod === 'week' ? 7 : 
                   this.currentPeriod === 'month' ? 30 : 90;
      
      this.analytics.loadData(
        (d) => StorageManager.getMoodHistory(d),
        () => StorageManager.getEntries(),
        days
      );

      const data = this.analytics.computeAnalytics();
      this.cachedData = data;

      // Log analytics for debugging
      console.log('[MoodInsights] Analytics computed:', {
        overview: !!data.overview,
        trends: !!data.trends,
        insights: data.insights?.length || 0,
        timeOfDay: !!data.timeOfDay,
        dayOfWeek: !!data.dayOfWeek,
        predictions: !!data.predictions,
        contentAnalysis: !!data.contentAnalysis
      });

      // Render all components with verification
      this.safeRender('overview', () => this.renderOverview(data.overview));
      this.safeRender('trends', () => this.renderTrendGraph(data.trends));
      this.safeRender('insights', () => this.renderInsights(data.insights));
      this.safeRender('timeOfDay', () => this.renderTimeOfDay(data.timeOfDay));
      this.safeRender('dayOfWeek', () => this.renderDayOfWeek(data.dayOfWeek));
      this.safeRender('drivers', () => this.renderDrivers(data.attributeCorrelations));
      this.safeRender('volatility', () => this.renderVolatility(data.volatility));

      // Verify all rendered
      this.verifyRender();
      
    } catch (error) {
      console.error('[MoodInsights] Render error:', error);
      this.onRenderError(error.message);
    }
  }

  /**
   * Safely executes a render function with error handling.
   * @param {string} component - Component name
   * @param {Function} renderFn - Render function
   */
  safeRender(component, renderFn) {
    try {
      renderFn();
      this.renderStatus[component] = true;
    } catch (error) {
      console.error(`[MoodInsights] Failed to render ${component}:`, error);
      this.renderStatus[component] = false;
    }
  }

  /**
   * Verifies all components rendered successfully.
   */
  verifyRender() {
    const failed = Object.entries(this.renderStatus)
      .filter(([_, success]) => !success)
      .map(([name]) => name);

    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    if (failed.length > 0) {
      console.warn('[MoodInsights] Some components failed:', failed);
    } else {
      console.log('[MoodInsights] All components rendered successfully');
    }

    this.isRendering = false;
    this.hideLoader();
  }

  /**
   * Called when watchdog timer expires.
   */
  onWatchdogTimeout() {
    console.error('[MoodInsights] Watchdog timeout - render took too long');
    this.isRendering = false;
    this.showErrorOverlay('Processing took too long. This can happen with very large journals. Please try again.');
  }

  /**
   * Called when render fails with an error.
   * @param {string} message - Error message
   */
  onRenderError(message) {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.isRendering = false;
    console.error('[MoodInsights] Error:', message);
    this.showErrorOverlay(message);
  }

  /**
   * Renders the mood overview card with score ring.
   * @param {Object} overview - Overview data
   */
  renderOverview(overview) {
    const ring = document.getElementById('mood-ring-progress');
    const emoji = document.getElementById('mood-overview-emoji');
    const label = document.getElementById('mood-overview-label');
    const positiveEl = document.getElementById('positive-percent');
    const neutralEl = document.getElementById('neutral-percent');
    const negativeEl = document.getElementById('negative-percent');

    if (!ring) return;

    // Calculate ring progress (score from -1 to 1, normalize to 0-1)
    const normalizedScore = (overview.averageScore + 1) / 2;
    const circumference = 2 * Math.PI * 52; // r=52
    const offset = circumference * (1 - normalizedScore);

    // Animate ring
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = offset;
    });

    // Set emoji based on score
    if (emoji) {
      if (overview.averageScore >= 0.5) emoji.textContent = '😊';
      else if (overview.averageScore >= 0.2) emoji.textContent = '🙂';
      else if (overview.averageScore >= -0.2) emoji.textContent = '😐';
      else if (overview.averageScore >= -0.5) emoji.textContent = '😔';
      else emoji.textContent = '😢';
    }

    if (label) label.textContent = overview.moodLabel;

    // Calculate percentages
    const total = overview.totalMoods || 1;
    const positive = Math.round((overview.categoryCounts.positive / total) * 100);
    const negative = Math.round((overview.categoryCounts.negative / total) * 100);
    const neutral = Math.max(0, 100 - positive - negative);

    if (positiveEl) positiveEl.textContent = `${positive}%`;
    if (neutralEl) neutralEl.textContent = `${neutral}%`;
    if (negativeEl) negativeEl.textContent = `${negative}%`;
  }

  /**
   * Renders the mood trend line graph.
   * @param {Object} trends - Trend data
   */
  renderTrendGraph(trends) {
    const trendLine = document.getElementById('trend-line');
    const trendArea = document.getElementById('trend-area');
    const trendDots = document.getElementById('trend-dots');
    const trendLabels = document.getElementById('trend-labels');
    const indicator = document.getElementById('trend-indicator');
    const avgEl = document.getElementById('trend-avg-value');
    const highEl = document.getElementById('trend-high-value');
    const lowEl = document.getElementById('trend-low-value');

    if (!trendLine) return;

    const periodData = trends[this.currentPeriod];
    const smoothedData = periodData.smoothed || [];
    const validData = smoothedData.filter(d => d.score !== null);

    if (validData.length < 2) {
      trendLine.setAttribute('d', '');
      trendArea.setAttribute('d', '');
      trendDots.innerHTML = '';
      if (trendLabels) trendLabels.innerHTML = '<span>Not enough data</span>';
      return;
    }

    // SVG dimensions
    const width = 400;
    const height = 140;
    const padding = 20;

    // Generate smooth path
    const linePath = this.analytics.generateSmoothPath(validData, width, height, padding);
    const areaPath = this.analytics.generateAreaPath(validData, width, height, padding);

    trendLine.setAttribute('d', linePath);
    trendArea.setAttribute('d', areaPath);

    // Render dots
    trendDots.innerHTML = '';
    const xScale = (width - padding * 2) / (validData.length - 1);
    const yScale = (height - padding * 2) / 2;

    validData.forEach((d, i) => {
      const x = padding + i * xScale;
      const y = height / 2 - d.score * yScale;
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'trend-dot');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '4');
      circle.setAttribute('data-date', d.date);
      circle.setAttribute('data-score', d.score.toFixed(2));
      
      trendDots.appendChild(circle);
    });

    // Render labels
    if (trendLabels) {
      const numLabels = this.currentPeriod === 'week' ? 7 : 
                        this.currentPeriod === 'month' ? 5 : 6;
      const step = Math.floor(validData.length / (numLabels - 1));
      
      trendLabels.innerHTML = '';
      for (let i = 0; i < numLabels; i++) {
        const idx = Math.min(i * step, validData.length - 1);
        const date = new Date(validData[idx]?.date);
        const label = document.createElement('span');
        label.textContent = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        trendLabels.appendChild(label);
      }
    }

    // Update indicator
    if (indicator) {
      const arrow = indicator.querySelector('.trend-arrow');
      const text = indicator.querySelector('.trend-text');
      
      indicator.classList.remove('positive', 'negative', 'neutral');
      
      if (periodData.change > 0.1) {
        indicator.classList.add('positive');
        arrow.textContent = '↑';
        text.textContent = 'Improving';
      } else if (periodData.change < -0.1) {
        indicator.classList.add('negative');
        arrow.textContent = '↓';
        text.textContent = 'Declining';
      } else {
        indicator.classList.add('neutral');
        arrow.textContent = '→';
        text.textContent = 'Stable';
      }
    }

    // Update summary stats
    const scores = validData.map(d => d.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const high = Math.max(...scores);
    const low = Math.min(...scores);

    if (avgEl) avgEl.textContent = this.formatScore(avg);
    if (highEl) highEl.textContent = this.formatScore(high);
    if (lowEl) lowEl.textContent = this.formatScore(low);
  }

  /**
   * Formats a mood score for display.
   * @param {number} score - Score value (-1 to 1)
   * @returns {string} Formatted score
   */
  formatScore(score) {
    if (score >= 0.6) return 'Great';
    if (score >= 0.3) return 'Good';
    if (score >= 0) return 'Okay';
    if (score >= -0.3) return 'Low';
    return 'Poor';
  }

  /**
   * Renders insight cards with priority styling and actions.
   * @param {Array} insights - Array of insight objects
   */
  renderInsights(insights) {
    const grid = document.getElementById('insights-grid');
    if (!grid) return;

    if (!insights || insights.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💭</div>
          <div class="empty-state-title">No insights yet</div>
          <div class="empty-state-description">Keep tracking your mood to discover patterns and insights.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = insights.map(insight => {
      let cardClass = 'insight-card';
      
      // Priority-based styling
      if (insight.priority === 1 || insight.type === 'warning') {
        cardClass += ' warning';
      } else if (insight.type === 'positive' || insight.type === 'positive_drivers') {
        cardClass += ' positive';
      } else if (insight.type === 'prediction') {
        cardClass += ' prediction';
      } else {
        cardClass += ' info';
      }

      // Build action HTML if present
      const actionHtml = insight.actionable && insight.action 
        ? `<div class="insight-action">💡 ${insight.action}</div>` 
        : '';

      // Build confidence badge for predictions
      const confidenceHtml = insight.confidence 
        ? `<span class="insight-confidence">${insight.confidence}% confidence</span>` 
        : '';

      return `
        <div class="${cardClass}" data-priority="${insight.priority || 5}">
          <span class="insight-icon">${insight.icon}</span>
          <div class="insight-content">
            <div class="insight-header">
              <div class="insight-title">${insight.title}</div>
              ${confidenceHtml}
            </div>
            <div class="insight-description">${insight.description}</div>
            ${actionHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Renders time of day analysis.
   * @param {Object} timeData - Time of day analysis data
   */
  renderTimeOfDay(timeData) {
    const periods = ['morning', 'afternoon', 'evening', 'night'];
    
    // Find max score for scaling
    const scores = periods.map(p => timeData[p]?.average || 0);
    const maxAbs = Math.max(...scores.map(Math.abs), 0.5);

    periods.forEach(period => {
      const bar = document.getElementById(`${period}-bar`);
      const scoreEl = document.getElementById(`${period}-score`);
      const container = document.querySelector(`.time-bar[data-period="${period}"]`);
      
      if (!bar) return;

      const data = timeData[period];
      const score = data?.average || 0;
      const count = data?.count || 0;

      // Calculate width (normalize to 0-100)
      const normalizedScore = (score + 1) / 2;
      const width = count > 0 ? normalizedScore * 100 : 0;

      bar.style.width = `${width}%`;
      
      // Set color class
      bar.classList.remove('positive', 'neutral', 'negative', 'accent');
      if (score > 0.2) bar.classList.add('positive');
      else if (score < -0.2) bar.classList.add('negative');
      else bar.classList.add('neutral');

      // Update score display
      if (scoreEl) {
        scoreEl.textContent = count > 0 ? this.formatScore(score) : '--';
      }

      // Mark best/worst
      if (container) {
        container.classList.remove('best-time', 'worst-time');
        if (period === timeData.bestTime && count > 0) {
          container.classList.add('best-time');
        } else if (period === timeData.worstTime && count > 0) {
          container.classList.add('worst-time');
        }
      }
    });
  }

  /**
   * Renders day of week pattern chart.
   * @param {Object} dowData - Day of week analysis data
   */
  renderDayOfWeek(dowData) {
    const chart = document.getElementById('dow-chart');
    const summary = document.getElementById('dow-summary');
    
    if (!chart) return;

    const days = dowData.days || [];
    const maxScore = Math.max(...days.map(d => d.average), 0.1);
    const minScore = Math.min(...days.map(d => d.average), -0.1);
    const range = maxScore - minScore || 1;

    days.forEach((day, i) => {
      const bar = chart.querySelector(`[data-day="${i}"]`);
      if (!bar) return;

      const fill = bar.querySelector('.dow-fill');
      const scoreEl = bar.querySelector('.dow-score');

      // Normalize height (0 to 100%)
      const normalizedScore = (day.average - minScore) / range;
      const height = day.count > 0 ? Math.max(10, normalizedScore * 100) : 10;

      if (fill) {
        fill.style.height = `${height}%`;
      }

      if (scoreEl) {
        scoreEl.textContent = day.count > 0 ? this.formatScore(day.average) : '';
      }

      // Mark best/worst
      bar.classList.remove('best-day', 'worst-day');
      if (day.day === dowData.bestDay && day.count > 0) {
        bar.classList.add('best-day');
      } else if (day.day === dowData.worstDay && day.count > 0) {
        bar.classList.add('worst-day');
      }
    });

    // Update summary
    if (summary && dowData.weekendVsWeekday) {
      const diff = dowData.weekendVsWeekday.difference;
      if (Math.abs(diff) > 0.15) {
        summary.innerHTML = dowData.weekendVsWeekday.betterOnWeekends
          ? '📅 You tend to feel <strong>better on weekends</strong>. Consider what makes those days more positive.'
          : '💼 Interestingly, you feel <strong>better during weekdays</strong>. Work might give you purpose and structure.';
      } else {
        summary.innerHTML = '⚖️ Your mood is fairly <strong>consistent throughout the week</strong>.';
      }
    }
  }

  /**
   * Renders mood drivers section.
   * @param {Object} correlations - Attribute correlation data
   */
  renderDrivers(correlations) {
    const positiveList = document.getElementById('positive-drivers-list');
    const negativeList = document.getElementById('negative-drivers-list');

    if (positiveList) {
      if (correlations.positiveDrivers.length > 0) {
        positiveList.innerHTML = correlations.positiveDrivers.map(driver => {
          const emoji = this.getAttributeEmoji(driver.attribute);
          const impact = Math.round(driver.averageScore * 100);
          return `
            <div class="driver-item">
              <span class="driver-item-emoji">${emoji}</span>
              <span class="driver-item-name">${driver.attribute}</span>
              <span class="driver-item-impact positive">+${impact}%</span>
            </div>
          `;
        }).join('');
      } else {
        positiveList.innerHTML = '<p class="no-data">Keep journaling with mood attributes to discover patterns</p>';
      }
    }

    if (negativeList) {
      if (correlations.negativeDrivers.length > 0) {
        negativeList.innerHTML = correlations.negativeDrivers.map(driver => {
          const emoji = this.getAttributeEmoji(driver.attribute);
          const impact = Math.round(Math.abs(driver.averageScore) * 100);
          return `
            <div class="driver-item">
              <span class="driver-item-emoji">${emoji}</span>
              <span class="driver-item-name">${driver.attribute}</span>
              <span class="driver-item-impact negative">-${impact}%</span>
            </div>
          `;
        }).join('');
      } else {
        negativeList.innerHTML = '<p class="no-data">No stress triggers identified yet</p>';
      }
    }
  }

  /**
   * Gets emoji for a mood attribute.
   * @param {string} attribute - Attribute name
   * @returns {string} Emoji
   */
  getAttributeEmoji(attribute) {
    const emojiMap = {
      work: '💼',
      family: '👨‍👩‍👧',
      health: '🏥',
      exercise: '🏃',
      sleep: '😴',
      food: '🍽️',
      friends: '👥',
      weather: '🌤️',
      music: '🎵',
      money: '💰',
      love: '❤️',
      hobby: '🎨',
      stress: '😰',
      travel: '✈️',
      nature: '🌳'
    };
    return emojiMap[attribute.toLowerCase()] || '📌';
  }

  /**
   * Renders volatility meter.
   * @param {Object} volatility - Volatility data
   */
  renderVolatility(volatility) {
    const fill = document.getElementById('volatility-fill');
    const scoreEl = document.getElementById('volatility-score');
    const labelEl = document.getElementById('volatility-label');

    if (!fill) return;

    const score = volatility.score || 0;
    
    // Position the marker (0-100%)
    const position = Math.min(100, Math.max(0, score));
    fill.style.left = `calc(${position}% - 10px)`;

    if (scoreEl) {
      scoreEl.textContent = score;
    }

    if (labelEl) {
      labelEl.textContent = volatility.label || 'Calculating...';
    }
  }
}

// Export singleton
export const moodInsightsManager = new MoodInsightsManager();
