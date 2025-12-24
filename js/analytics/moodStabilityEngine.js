/**
 * MoodStabilityEngine - Comprehensive mood stability analysis
 * 
 * This engine evaluates mood stability patterns, identifies causes of instability,
 * provides day-by-day stability assessments, and generates actionable recommendations.
 * 
 * Features:
 * - Mood volatility calculation using standard deviation and variance
 * - Day-by-day stability scoring
 * - Pattern detection for stable/unstable periods
 * - Identification of potential instability causes
 * - Situational recommendations based on patterns
 * - Weekly and monthly stability trends
 * 
 * @module MoodStabilityEngine
 */

export class MoodStabilityEngine {
  /**
   * Mood value mappings for numerical analysis
   * @private
   */
  static #MOOD_VALUES = {
    // Very positive
    'ecstatic': 10, 'elated': 9.5, 'thrilled': 9.5, 'overjoyed': 9.5,
    'amazing': 9, 'fantastic': 9, 'excellent': 9, 'wonderful': 9,
    
    // Positive
    'happy': 8, 'joyful': 8, 'great': 8, 'excited': 8,
    'good': 7, 'cheerful': 7, 'content': 7, 'pleased': 7,
    'positive': 7, 'upbeat': 7, 'optimistic': 7,
    
    // Slightly positive
    'fine': 6, 'okay': 5.5, 'ok': 5.5, 'alright': 5.5,
    'decent': 5.5, 'not bad': 5.5,
    
    // Neutral
    'neutral': 5, 'meh': 5, 'so-so': 5, 'indifferent': 5,
    
    // Slightly negative
    'tired': 4, 'bored': 4, 'restless': 4, 'uneasy': 4,
    'low': 3.5, 'down': 3.5, 'off': 3.5,
    
    // Negative
    'sad': 3, 'unhappy': 3, 'disappointed': 3, 'frustrated': 3,
    'anxious': 3, 'worried': 3, 'stressed': 3, 'nervous': 3,
    'irritated': 2.5, 'annoyed': 2.5, 'upset': 2.5,
    
    // Very negative
    'angry': 2, 'furious': 1.5, 'depressed': 2, 'miserable': 1.5,
    'devastated': 1, 'hopeless': 1, 'awful': 1, 'terrible': 1
  };

  /**
   * Instability cause patterns
   * @private
   */
  static #INSTABILITY_PATTERNS = {
    rapid_swings: {
      name: 'Rapid Mood Swings',
      icon: '🎢',
      description: 'Your mood changes significantly within short periods',
      causes: [
        'Sleep irregularity',
        'Blood sugar fluctuations',
        'Caffeine or stimulant intake',
        'Hormonal changes',
        'Stress accumulation'
      ],
      recommendations: [
        'Maintain consistent sleep schedule',
        'Eat regular, balanced meals',
        'Limit caffeine, especially after noon',
        'Practice grounding techniques when mood shifts',
        'Track potential triggers in your journal'
      ]
    },
    weekend_dip: {
      name: 'Weekend Mood Dip',
      icon: '📅',
      description: 'Your mood tends to drop on weekends',
      causes: [
        'Lack of structure',
        'Social isolation',
        'Rumination time',
        'Disrupted routine'
      ],
      recommendations: [
        'Plan engaging weekend activities',
        'Maintain some routine elements',
        'Schedule social interactions',
        'Limit excessive downtime'
      ]
    },
    weekday_stress: {
      name: 'Weekday Stress Pattern',
      icon: '💼',
      description: 'Work/school days show more mood instability',
      causes: [
        'Work-related stress',
        'Commute fatigue',
        'Meeting/deadline pressure',
        'Insufficient breaks'
      ],
      recommendations: [
        'Build micro-breaks into your day',
        'Set boundaries on work hours',
        'Practice stress-relief during lunch',
        'Identify and address specific work stressors'
      ]
    },
    evening_decline: {
      name: 'Evening Mood Decline',
      icon: '🌙',
      description: 'Your mood tends to worsen as the day progresses',
      causes: [
        'Decision fatigue',
        'Accumulated stress',
        'Physical tiredness',
        'Unprocessed emotions from the day'
      ],
      recommendations: [
        'Schedule important tasks earlier',
        'Build in decompression time',
        'Practice evening journaling',
        'Create a calming evening routine'
      ]
    },
    morning_difficulty: {
      name: 'Morning Mood Difficulty',
      icon: '🌅',
      description: 'Mornings tend to be emotionally challenging',
      causes: [
        'Poor sleep quality',
        'Anticipatory anxiety',
        'Blood sugar levels',
        'Circadian rhythm issues'
      ],
      recommendations: [
        'Prepare the night before',
        'Allow extra morning time',
        'Expose yourself to natural light',
        'Have a protein-rich breakfast'
      ]
    },
    persistent_low: {
      name: 'Persistently Low Mood',
      icon: '📉',
      description: 'Your baseline mood has been consistently low',
      causes: [
        'Chronic stress',
        'Underlying health issues',
        'Seasonal changes',
        'Life circumstances'
      ],
      recommendations: [
        'Consider speaking with a professional',
        'Increase physical activity',
        'Strengthen social connections',
        'Assess major life stressors'
      ]
    },
    high_variability: {
      name: 'High Day-to-Day Variability',
      icon: '📊',
      description: 'Your mood varies significantly from day to day',
      causes: [
        'External circumstances',
        'Reactive emotional patterns',
        'Inconsistent self-care',
        'Environmental factors'
      ],
      recommendations: [
        'Establish consistent daily routines',
        'Practice mindfulness',
        'Identify and minimize triggers',
        'Build emotional resilience practices'
      ]
    }
  };

  constructor() {
    /** @type {Array} Mood history data */
    this.moodData = [];
    /** @type {Array} Journal entries */
    this.entries = [];
    /** @type {Object|null} Cached analysis */
    this.cachedAnalysis = null;
  }

  /**
   * Load data for analysis
   * @param {Array} moodData - Array of mood records
   * @param {Array} entries - Array of journal entries
   */
  loadData(moodData = [], entries = []) {
    this.moodData = moodData.filter(d => d && d.mood);
    this.entries = entries.filter(e => e && e.mood);
    this.cachedAnalysis = null;
  }

  /**
   * Run comprehensive stability analysis
   * @returns {Object} Complete stability analysis
   */
  analyze() {
    if (this.cachedAnalysis) return this.cachedAnalysis;

    const moodValues = this.#convertToValues();
    const overallStability = this.#calculateOverallStability(moodValues);
    const dailyStability = this.#analyzeDailyStability(moodValues);
    const weeklyPatterns = this.#analyzeWeeklyPatterns(moodValues);
    const temporalPatterns = this.#analyzeTemporalPatterns();
    const instabilityCauses = this.#identifyInstabilityCauses(overallStability, weeklyPatterns, temporalPatterns);
    const recommendations = this.#generateRecommendations(instabilityCauses, overallStability);
    const trends = this.#analyzeStabilityTrends(moodValues);

    this.cachedAnalysis = {
      overall: overallStability,
      daily: dailyStability,
      weekly: weeklyPatterns,
      temporal: temporalPatterns,
      causes: instabilityCauses,
      recommendations,
      trends,
      metadata: {
        dataPoints: moodValues.length,
        dateRange: this.#getDateRange(),
        analysisDate: new Date().toISOString()
      }
    };

    return this.cachedAnalysis;
  }

  /**
   * Convert mood strings to numerical values
   * @private
   */
  #convertToValues() {
    const values = [];
    
    // Process mood data
    this.moodData.forEach(d => {
      const value = this.#getMoodValue(d.mood);
      if (value !== null) {
        values.push({
          date: d.date,
          timestamp: d.timestamp,
          mood: d.mood,
          value,
          source: 'daily_mood'
        });
      }
    });

    // Process entries
    this.entries.forEach(e => {
      const value = this.#getMoodValue(e.mood);
      const date = e.date || e.createdAt?.split('T')[0];
      if (value !== null && date) {
        values.push({
          date,
          timestamp: e.createdAt,
          mood: e.mood,
          value,
          source: 'entry'
        });
      }
    });

    // Sort by date
    return values.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Get numerical value for a mood string
   * @private
   */
  #getMoodValue(mood) {
    if (!mood) return null;
    const lower = mood.toLowerCase().trim();
    
    // Direct match
    if (MoodStabilityEngine.#MOOD_VALUES[lower] !== undefined) {
      return MoodStabilityEngine.#MOOD_VALUES[lower];
    }
    
    // Partial match
    for (const [key, value] of Object.entries(MoodStabilityEngine.#MOOD_VALUES)) {
      if (lower.includes(key) || key.includes(lower)) {
        return value;
      }
    }
    
    // Default to neutral
    return 5;
  }

  /**
   * Calculate overall stability metrics
   * @private
   */
  #calculateOverallStability(moodValues) {
    if (moodValues.length < 2) {
      return {
        score: 100,
        level: 'insufficient_data',
        description: 'Not enough data to assess stability',
        metrics: {}
      };
    }

    const values = moodValues.map(m => m.value);
    
    // Calculate statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const range = Math.max(...values) - Math.min(...values);
    
    // Calculate consecutive changes
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(Math.abs(values[i] - values[i - 1]));
    }
    const avgChange = changes.length > 0 
      ? changes.reduce((a, b) => a + b, 0) / changes.length 
      : 0;
    
    // Calculate stability score (0-100, higher = more stable)
    // Lower std dev and avg change = higher stability
    const volatilityScore = (stdDev / 3) * 50 + (avgChange / 3) * 50; // Max ~100 for very unstable
    const stabilityScore = Math.max(0, Math.min(100, 100 - volatilityScore));
    
    // Determine level
    let level, description;
    if (stabilityScore >= 80) {
      level = 'very_stable';
      description = 'Your mood has been remarkably consistent';
    } else if (stabilityScore >= 60) {
      level = 'stable';
      description = 'Your mood shows healthy stability with normal variation';
    } else if (stabilityScore >= 40) {
      level = 'moderate';
      description = 'Your mood shows moderate variability';
    } else if (stabilityScore >= 20) {
      level = 'unstable';
      description = 'Your mood has been quite variable';
    } else {
      level = 'very_unstable';
      description = 'Your mood shows significant instability';
    }

    return {
      score: Math.round(stabilityScore),
      level,
      description,
      metrics: {
        mean: Math.round(mean * 10) / 10,
        stdDev: Math.round(stdDev * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        range,
        avgDailyChange: Math.round(avgChange * 100) / 100,
        dataPoints: values.length
      }
    };
  }

  /**
   * Analyze stability for each day
   * @private
   */
  #analyzeDailyStability(moodValues) {
    const byDate = {};
    
    moodValues.forEach(m => {
      if (!byDate[m.date]) {
        byDate[m.date] = [];
      }
      byDate[m.date].push(m);
    });

    const dailyAnalysis = Object.entries(byDate).map(([date, moods]) => {
      const values = moods.map(m => m.value);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      // Intra-day stability (if multiple entries)
      let intraDayStability = 'single_entry';
      if (values.length > 1) {
        const range = Math.max(...values) - Math.min(...values);
        intraDayStability = range <= 1 ? 'stable' : range <= 2 ? 'moderate' : 'variable';
      }

      return {
        date,
        averageMood: Math.round(avg * 10) / 10,
        moodLevel: this.#getMoodLevel(avg),
        entryCount: moods.length,
        intraDayStability,
        moods: moods.map(m => m.mood)
      };
    });

    // Add day-to-day stability markers
    for (let i = 1; i < dailyAnalysis.length; i++) {
      const change = Math.abs(dailyAnalysis[i].averageMood - dailyAnalysis[i - 1].averageMood);
      dailyAnalysis[i].changeFromPrevious = Math.round(change * 10) / 10;
      dailyAnalysis[i].transitionType = change <= 0.5 ? 'stable' : 
                                         change <= 1.5 ? 'gradual' : 
                                         change <= 2.5 ? 'moderate_shift' : 'significant_shift';
    }

    // Identify stable and unstable periods
    const stableDays = dailyAnalysis.filter(d => 
      d.transitionType === 'stable' || d.transitionType === 'gradual'
    );
    const unstableDays = dailyAnalysis.filter(d => 
      d.transitionType === 'moderate_shift' || d.transitionType === 'significant_shift'
    );

    return {
      days: dailyAnalysis.sort((a, b) => new Date(b.date) - new Date(a.date)),
      stableDays: stableDays.map(d => d.date),
      unstableDays: unstableDays.map(d => ({
        date: d.date,
        change: d.changeFromPrevious,
        type: d.transitionType
      })),
      stablePercentage: dailyAnalysis.length > 1 
        ? Math.round((stableDays.length / (dailyAnalysis.length - 1)) * 100) 
        : 100
    };
  }

  /**
   * Get mood level label from value
   * @private
   */
  #getMoodLevel(value) {
    if (value >= 8) return 'great';
    if (value >= 6.5) return 'good';
    if (value >= 5) return 'okay';
    if (value >= 3.5) return 'low';
    return 'difficult';
  }

  /**
   * Analyze weekly patterns
   * @private
   */
  #analyzeWeeklyPatterns(moodValues) {
    const byDayOfWeek = {
      0: { name: 'Sunday', values: [], isWeekend: true },
      1: { name: 'Monday', values: [], isWeekend: false },
      2: { name: 'Tuesday', values: [], isWeekend: false },
      3: { name: 'Wednesday', values: [], isWeekend: false },
      4: { name: 'Thursday', values: [], isWeekend: false },
      5: { name: 'Friday', values: [], isWeekend: false },
      6: { name: 'Saturday', values: [], isWeekend: true }
    };

    moodValues.forEach(m => {
      const day = new Date(m.date).getDay();
      byDayOfWeek[day].values.push(m.value);
    });

    // Calculate stats for each day
    const dayStats = Object.entries(byDayOfWeek).map(([day, data]) => {
      if (data.values.length === 0) {
        return { day: parseInt(day), ...data, avg: null, stability: null };
      }
      
      const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
      const variance = data.values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / data.values.length;
      const stability = Math.max(0, 100 - (Math.sqrt(variance) * 20));

      return {
        day: parseInt(day),
        name: data.name,
        isWeekend: data.isWeekend,
        avg: Math.round(avg * 10) / 10,
        stability: Math.round(stability),
        dataPoints: data.values.length,
        level: this.#getMoodLevel(avg)
      };
    });

    // Find best/worst days
    const daysWithData = dayStats.filter(d => d.avg !== null);
    const bestDay = daysWithData.length > 0 
      ? daysWithData.reduce((a, b) => a.avg > b.avg ? a : b) 
      : null;
    const worstDay = daysWithData.length > 0 
      ? daysWithData.reduce((a, b) => a.avg < b.avg ? a : b) 
      : null;
    const mostStable = daysWithData.length > 0 
      ? daysWithData.reduce((a, b) => a.stability > b.stability ? a : b) 
      : null;
    const leastStable = daysWithData.length > 0 
      ? daysWithData.reduce((a, b) => a.stability < b.stability ? a : b) 
      : null;

    // Weekend vs weekday comparison
    const weekdayValues = daysWithData.filter(d => !d.isWeekend);
    const weekendValues = daysWithData.filter(d => d.isWeekend);
    
    const weekdayAvg = weekdayValues.length > 0 
      ? weekdayValues.reduce((sum, d) => sum + d.avg, 0) / weekdayValues.length 
      : null;
    const weekendAvg = weekendValues.length > 0 
      ? weekendValues.reduce((sum, d) => sum + d.avg, 0) / weekendValues.length 
      : null;

    return {
      byDay: dayStats,
      bestDay,
      worstDay,
      mostStableDay: mostStable,
      leastStableDay: leastStable,
      weekdayAvg: weekdayAvg ? Math.round(weekdayAvg * 10) / 10 : null,
      weekendAvg: weekendAvg ? Math.round(weekendAvg * 10) / 10 : null,
      weekdayVsWeekend: weekdayAvg && weekendAvg 
        ? (weekdayAvg > weekendAvg ? 'weekday_better' : 
           weekendAvg > weekdayAvg ? 'weekend_better' : 'equal')
        : null
    };
  }

  /**
   * Analyze temporal patterns (time of day)
   * @private
   */
  #analyzeTemporalPatterns() {
    const byPeriod = {
      morning: { name: 'Morning (5am-12pm)', values: [], hours: [5, 12] },
      afternoon: { name: 'Afternoon (12pm-5pm)', values: [], hours: [12, 17] },
      evening: { name: 'Evening (5pm-9pm)', values: [], hours: [17, 21] },
      night: { name: 'Night (9pm-5am)', values: [], hours: [21, 5] }
    };

    // Process entries with timestamps
    this.entries.forEach(e => {
      if (!e.createdAt || !e.mood) return;
      
      const hour = new Date(e.createdAt).getHours();
      const value = this.#getMoodValue(e.mood);
      if (value === null) return;

      let period;
      if (hour >= 5 && hour < 12) period = 'morning';
      else if (hour >= 12 && hour < 17) period = 'afternoon';
      else if (hour >= 17 && hour < 21) period = 'evening';
      else period = 'night';

      byPeriod[period].values.push(value);
    });

    // Process mood data with timestamps
    this.moodData.forEach(m => {
      if (!m.timestamp || !m.mood) return;
      
      const hour = new Date(m.timestamp).getHours();
      const value = this.#getMoodValue(m.mood);
      if (value === null) return;

      let period;
      if (hour >= 5 && hour < 12) period = 'morning';
      else if (hour >= 12 && hour < 17) period = 'afternoon';
      else if (hour >= 17 && hour < 21) period = 'evening';
      else period = 'night';

      byPeriod[period].values.push(value);
    });

    // Calculate stats
    const periodStats = Object.entries(byPeriod).map(([key, data]) => {
      if (data.values.length === 0) {
        return { period: key, name: data.name, avg: null, stability: null };
      }

      const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
      const variance = data.values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / data.values.length;
      const stability = Math.max(0, 100 - (Math.sqrt(variance) * 20));

      return {
        period: key,
        name: data.name,
        avg: Math.round(avg * 10) / 10,
        stability: Math.round(stability),
        dataPoints: data.values.length,
        level: this.#getMoodLevel(avg)
      };
    });

    const periodsWithData = periodStats.filter(p => p.avg !== null);
    const bestPeriod = periodsWithData.length > 0 
      ? periodsWithData.reduce((a, b) => a.avg > b.avg ? a : b) 
      : null;
    const worstPeriod = periodsWithData.length > 0 
      ? periodsWithData.reduce((a, b) => a.avg < b.avg ? a : b) 
      : null;

    return {
      byPeriod: periodStats,
      bestPeriod,
      worstPeriod,
      hasTemporalData: periodsWithData.length > 0
    };
  }

  /**
   * Identify potential causes of instability
   * @private
   */
  #identifyInstabilityCauses(overall, weekly, temporal) {
    const causes = [];

    if (overall.level === 'insufficient_data') {
      return causes;
    }

    // Check for high variability
    if (overall.level === 'unstable' || overall.level === 'very_unstable') {
      if (overall.metrics.avgDailyChange > 2) {
        causes.push({
          ...MoodStabilityEngine.#INSTABILITY_PATTERNS.rapid_swings,
          severity: 'high',
          evidence: `Average daily mood change of ${overall.metrics.avgDailyChange}`
        });
      } else {
        causes.push({
          ...MoodStabilityEngine.#INSTABILITY_PATTERNS.high_variability,
          severity: overall.level === 'very_unstable' ? 'high' : 'moderate',
          evidence: `Stability score of ${overall.score}%`
        });
      }
    }

    // Check for low baseline
    if (overall.metrics.mean < 4) {
      causes.push({
        ...MoodStabilityEngine.#INSTABILITY_PATTERNS.persistent_low,
        severity: overall.metrics.mean < 3 ? 'high' : 'moderate',
        evidence: `Average mood level of ${overall.metrics.mean}/10`
      });
    }

    // Check weekend vs weekday patterns
    if (weekly.weekdayVsWeekend === 'weekday_better' && weekly.weekendAvg < 5) {
      causes.push({
        ...MoodStabilityEngine.#INSTABILITY_PATTERNS.weekend_dip,
        severity: weekly.weekendAvg < 4 ? 'high' : 'moderate',
        evidence: `Weekend average ${weekly.weekendAvg} vs weekday ${weekly.weekdayAvg}`
      });
    } else if (weekly.weekdayVsWeekend === 'weekend_better' && weekly.weekdayAvg < 5) {
      causes.push({
        ...MoodStabilityEngine.#INSTABILITY_PATTERNS.weekday_stress,
        severity: weekly.weekdayAvg < 4 ? 'high' : 'moderate',
        evidence: `Weekday average ${weekly.weekdayAvg} vs weekend ${weekly.weekendAvg}`
      });
    }

    // Check temporal patterns
    if (temporal.hasTemporalData && temporal.worstPeriod) {
      if (temporal.worstPeriod.period === 'evening' || temporal.worstPeriod.period === 'night') {
        if (temporal.worstPeriod.avg < temporal.bestPeriod?.avg - 1.5) {
          causes.push({
            ...MoodStabilityEngine.#INSTABILITY_PATTERNS.evening_decline,
            severity: 'moderate',
            evidence: `${temporal.worstPeriod.name} mood avg ${temporal.worstPeriod.avg}`
          });
        }
      } else if (temporal.worstPeriod.period === 'morning') {
        if (temporal.worstPeriod.avg < temporal.bestPeriod?.avg - 1.5) {
          causes.push({
            ...MoodStabilityEngine.#INSTABILITY_PATTERNS.morning_difficulty,
            severity: 'moderate',
            evidence: `Morning mood avg ${temporal.worstPeriod.avg}`
          });
        }
      }
    }

    // Sort by severity
    const severityOrder = { high: 0, moderate: 1, low: 2 };
    return causes.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Generate actionable recommendations
   * @private
   */
  #generateRecommendations(causes, overall) {
    const recommendations = [];
    const addedTypes = new Set();

    // Add recommendations from identified causes
    causes.forEach(cause => {
      cause.recommendations.forEach((rec, index) => {
        if (index < 2 && !addedTypes.has(rec)) { // Top 2 from each cause
          recommendations.push({
            text: rec,
            source: cause.name,
            priority: cause.severity === 'high' ? 'high' : 'medium'
          });
          addedTypes.add(rec);
        }
      });
    });

    // Add general recommendations based on overall stability
    if (overall.level === 'very_stable' || overall.level === 'stable') {
      recommendations.push({
        text: 'Continue your current routines—they\'re working well',
        source: 'General',
        priority: 'low'
      });
    }

    if (overall.metrics.mean >= 7) {
      recommendations.push({
        text: 'Your mood baseline is healthy. Focus on maintaining consistency.',
        source: 'General',
        priority: 'low'
      });
    }

    return recommendations.slice(0, 5); // Limit to 5
  }

  /**
   * Analyze stability trends over time
   * @private
   */
  #analyzeStabilityTrends(moodValues) {
    if (moodValues.length < 7) {
      return {
        direction: 'insufficient_data',
        description: 'Need at least a week of data for trend analysis'
      };
    }

    // Group by week
    const byWeek = {};
    moodValues.forEach(m => {
      const date = new Date(m.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!byWeek[weekKey]) byWeek[weekKey] = [];
      byWeek[weekKey].push(m.value);
    });

    // Calculate weekly stability
    const weeklyStability = Object.entries(byWeek)
      .map(([week, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
        return {
          week,
          stability: Math.max(0, 100 - (Math.sqrt(variance) * 20)),
          avgMood: avg,
          dataPoints: values.length
        };
      })
      .sort((a, b) => new Date(a.week) - new Date(b.week));

    if (weeklyStability.length < 2) {
      return {
        direction: 'insufficient_data',
        description: 'Need multiple weeks for trend analysis'
      };
    }

    // Compare recent to older
    const recentWeeks = weeklyStability.slice(-2);
    const olderWeeks = weeklyStability.slice(0, -2);

    const recentAvgStability = recentWeeks.reduce((sum, w) => sum + w.stability, 0) / recentWeeks.length;
    const olderAvgStability = olderWeeks.length > 0
      ? olderWeeks.reduce((sum, w) => sum + w.stability, 0) / olderWeeks.length
      : recentAvgStability;

    const change = recentAvgStability - olderAvgStability;

    let direction, description;
    if (change > 10) {
      direction = 'improving';
      description = 'Your mood stability is improving';
    } else if (change < -10) {
      direction = 'declining';
      description = 'Your mood stability has decreased recently';
    } else {
      direction = 'stable';
      description = 'Your mood stability has been consistent';
    }

    return {
      direction,
      description,
      change: Math.round(change),
      weeklyData: weeklyStability
    };
  }

  /**
   * Get date range of data
   * @private
   */
  #getDateRange() {
    const dates = [
      ...this.moodData.map(m => m.date),
      ...this.entries.map(e => e.date || e.createdAt?.split('T')[0])
    ].filter(Boolean).sort();

    return {
      start: dates[0] || null,
      end: dates[dates.length - 1] || null
    };
  }

  /**
   * Get quick summary for UI display
   * @returns {Object} Simplified summary
   */
  getQuickSummary() {
    const analysis = this.analyze();

    return {
      hasData: analysis.metadata.dataPoints >= 2,
      stabilityScore: analysis.overall.score,
      stabilityLevel: analysis.overall.level,
      description: analysis.overall.description,
      bestDay: analysis.weekly.bestDay,
      worstDay: analysis.weekly.worstDay,
      primaryCause: analysis.causes[0] || null,
      topRecommendation: analysis.recommendations[0] || null,
      trend: analysis.trends.direction
    };
  }

  /**
   * Get stability badge info for display
   * @returns {Object} Badge display info
   */
  getStabilityBadge() {
    const analysis = this.analyze();
    
    const badges = {
      very_stable: { icon: '🎯', label: 'Very Stable', color: '#4ade80' },
      stable: { icon: '→', label: 'Stable', color: '#86efac' },
      moderate: { icon: '↔', label: 'Variable', color: '#fbbf24' },
      unstable: { icon: '↕', label: 'Unstable', color: '#fb923c' },
      very_unstable: { icon: '🎢', label: 'Very Unstable', color: '#f87171' },
      insufficient_data: { icon: '?', label: 'Gathering Data', color: '#9ca3af' }
    };

    return badges[analysis.overall.level] || badges.insufficient_data;
  }
}
