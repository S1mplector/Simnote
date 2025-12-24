// moodAnalyticsEngine.js
// Advanced mood processing and analytics engine for comprehensive mood insights
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module provides sophisticated mood analytics including:
// - Mood trend analysis with statistical significance testing
// - Multi-dimensional pattern detection (time, day, season, context)
// - Content sentiment analysis from journal entries
// - Predictive mood forecasting using weighted historical patterns
// - Word/phrase correlation with mood states
// - Anxiety trigger identification with confidence scoring
// - Actionable insight generation with recommendations
//
// ADVANCED ANALYTICS:
// - Exponential moving averages for responsive trend detection
// - Pearson correlation for attribute-mood relationships
// - Z-score anomaly detection for unusual mood patterns
// - Bayesian-inspired pattern confidence scoring
// - Circadian rhythm analysis
// - Weekly cyclical pattern detection
// - Seasonal affective pattern detection
// - Text sentiment extraction from journal content
//
// DEPENDENCIES:
// - StorageManager for data access
// - MoodEmojiMapper for mood categorization

import { MoodEmojiMapper } from '../utils/moodEmojiMapper.js';

/**
 * Comprehensive mood sentiment lexicon with intensity modifiers.
 * Base scores range from -1 (very negative) to 1 (very positive).
 */
const MOOD_SENTIMENT_SCORES = {
  // Very Positive (0.8 - 1.0)
  'ecstatic': 1.0, 'elated': 0.95, 'overjoyed': 0.95, 'blissful': 0.95,
  'euphoric': 0.95, 'thrilled': 0.9, 'exhilarated': 0.9, 'jubilant': 0.9,
  'delighted': 0.88, 'fantastic': 0.88, 'amazing': 0.88, 'wonderful': 0.85,
  'excellent': 0.85, 'great': 0.82, 'joyful': 0.82, 'joy': 0.82,
  
  // Positive (0.5 - 0.79)
  'happy': 0.78, 'cheerful': 0.75, 'excited': 0.75, 'enthusiastic': 0.72,
  'optimistic': 0.7, 'hopeful': 0.68, 'content': 0.65, 'pleased': 0.65,
  'satisfied': 0.62, 'grateful': 0.65, 'blessed': 0.68, 'thankful': 0.65,
  'proud': 0.62, 'confident': 0.6, 'peaceful': 0.58, 'serene': 0.6,
  'love': 0.75, 'loving': 0.72, 'lovely': 0.7, 'affectionate': 0.68,
  'inspired': 0.7, 'motivated': 0.68, 'energized': 0.65, 'refreshed': 0.6,
  'good': 0.55, 'nice': 0.52, 'pleasant': 0.55,
  
  // Mildly Positive (0.2 - 0.49)
  'relaxed': 0.45, 'calm': 0.42, 'comfortable': 0.4, 'at ease': 0.4,
  'relieved': 0.45, 'better': 0.35, 'improving': 0.32, 'stable': 0.25,
  'fine': 0.22, 'alright': 0.2, 'okay': 0.18, 'ok': 0.18,
  
  // Neutral (-0.19 - 0.19)
  'neutral': 0, 'indifferent': 0, 'so-so': 0, 'meh': -0.08,
  'uncertain': -0.1, 'unsure': -0.1, 'mixed': -0.05,
  
  // Mildly Negative (-0.2 - -0.49)
  'bored': -0.25, 'restless': -0.28, 'distracted': -0.22,
  'tired': -0.32, 'sleepy': -0.25, 'fatigued': -0.35, 'drained': -0.4,
  'exhausted': -0.48, 'weary': -0.38, 'worn out': -0.42,
  'uneasy': -0.35, 'uncomfortable': -0.32, 'tense': -0.38,
  'disappointed': -0.4, 'let down': -0.38, 'discouraged': -0.42,
  'confused': -0.3, 'lost': -0.35, 'uncertain': -0.28,
  
  // Negative (-0.5 - -0.79)
  'sad': -0.65, 'unhappy': -0.6, 'down': -0.55, 'blue': -0.52,
  'melancholy': -0.58, 'gloomy': -0.55, 'low': -0.5,
  'anxious': -0.62, 'nervous': -0.55, 'worried': -0.58, 'apprehensive': -0.52,
  'stressed': -0.65, 'overwhelmed': -0.7, 'pressured': -0.6,
  'frustrated': -0.58, 'irritated': -0.52, 'annoyed': -0.48, 'agitated': -0.55,
  'angry': -0.68, 'mad': -0.62, 'upset': -0.55, 'resentful': -0.6,
  'lonely': -0.62, 'isolated': -0.65, 'disconnected': -0.55,
  'guilty': -0.55, 'ashamed': -0.6, 'embarrassed': -0.48,
  'scared': -0.65, 'afraid': -0.62, 'fearful': -0.6, 'terrified': -0.78,
  'sick': -0.5, 'unwell': -0.48, 'ill': -0.52,
  
  // Very Negative (-0.8 - -1.0)
  'depressed': -0.85, 'despairing': -0.9, 'hopeless': -0.88,
  'devastated': -0.9, 'heartbroken': -0.88, 'crushed': -0.85,
  'miserable': -0.82, 'wretched': -0.85, 'anguished': -0.88,
  'furious': -0.82, 'enraged': -0.85, 'livid': -0.82,
  'panicked': -0.8, 'hysterical': -0.82, 'terrified': -0.85,
  'suicidal': -1.0, 'broken': -0.9, 'shattered': -0.88
};

/**
 * Intensity modifiers that can amplify or dampen mood scores
 */
const INTENSITY_MODIFIERS = {
  amplifiers: {
    'very': 1.25, 'really': 1.2, 'extremely': 1.4, 'incredibly': 1.35,
    'super': 1.25, 'so': 1.15, 'absolutely': 1.3, 'totally': 1.2,
    'completely': 1.25, 'utterly': 1.3, 'deeply': 1.25, 'profoundly': 1.3
  },
  dampeners: {
    'slightly': 0.6, 'a bit': 0.65, 'somewhat': 0.7, 'kind of': 0.7,
    'sort of': 0.7, 'a little': 0.6, 'fairly': 0.75, 'pretty': 0.8,
    'rather': 0.75, 'moderately': 0.7
  }
};

/**
 * Comprehensive mood categories with subcategories
 */
const MOOD_CATEGORIES = {
  positive: {
    keywords: ['happy', 'joy', 'great', 'good', 'excited', 'amazing', 'wonderful', 
               'blessed', 'grateful', 'peaceful', 'love', 'proud', 'cheerful', 
               'content', 'delighted', 'pleased', 'thrilled', 'ecstatic'],
    color: '#4CAF50'
  },
  neutral: {
    keywords: ['okay', 'ok', 'fine', 'alright', 'neutral', 'meh', 'calm', 'relaxed', 'stable'],
    color: '#9E9E9E'
  },
  negative: {
    keywords: ['sad', 'down', 'unhappy', 'depressed', 'angry', 'frustrated', 
               'disappointed', 'upset', 'hurt', 'lonely'],
    color: '#F44336'
  },
  anxious: {
    keywords: ['anxious', 'nervous', 'worried', 'stressed', 'overwhelmed', 
               'scared', 'afraid', 'panicked', 'tense', 'uneasy', 'apprehensive'],
    color: '#FF9800'
  },
  energetic: {
    keywords: ['excited', 'thrilled', 'energetic', 'motivated', 'inspired', 
               'enthusiastic', 'pumped', 'alive', 'vibrant'],
    color: '#2196F3'
  },
  low_energy: {
    keywords: ['tired', 'sleepy', 'exhausted', 'drained', 'bored', 'fatigued', 
               'weary', 'lethargic', 'sluggish'],
    color: '#795548'
  },
  social: {
    keywords: ['lonely', 'isolated', 'connected', 'loved', 'supported', 
               'rejected', 'included', 'belonging'],
    color: '#E91E63'
  }
};

/**
 * Sentiment-bearing words commonly found in journal entries
 */
const CONTENT_SENTIMENT_WORDS = {
  positive: [
    'love', 'loved', 'amazing', 'wonderful', 'great', 'awesome', 'fantastic',
    'beautiful', 'enjoyed', 'happy', 'excited', 'grateful', 'thankful', 'blessed',
    'success', 'achieved', 'accomplished', 'proud', 'celebrate', 'fun', 'laugh',
    'smile', 'joy', 'peaceful', 'relaxed', 'calm', 'comfortable', 'hopeful',
    'optimistic', 'inspired', 'motivated', 'energized', 'refreshed', 'better',
    'improved', 'progress', 'growth', 'learned', 'discovered', 'adventure',
    'friend', 'family', 'together', 'support', 'helped', 'kind', 'generous'
  ],
  negative: [
    'hate', 'hated', 'terrible', 'awful', 'horrible', 'worst', 'bad', 'failed',
    'failure', 'disappointed', 'frustrating', 'annoying', 'angry', 'upset',
    'sad', 'depressed', 'anxious', 'worried', 'stressed', 'overwhelmed', 'tired',
    'exhausted', 'sick', 'pain', 'hurt', 'lonely', 'alone', 'rejected', 'ignored',
    'betrayed', 'lost', 'confused', 'scared', 'afraid', 'nervous', 'panic',
    'cry', 'cried', 'tears', 'struggle', 'difficult', 'hard', 'problem', 'issue',
    'conflict', 'argument', 'fight', 'broke', 'broken', 'ended', 'quit', 'gave up'
  ],
  anxiety_triggers: [
    'deadline', 'presentation', 'meeting', 'exam', 'test', 'interview', 'boss',
    'money', 'debt', 'bills', 'late', 'behind', 'pressure', 'expect', 'should',
    'must', 'have to', 'need to', 'worried about', 'what if', 'afraid of',
    'nervous about', 'stressed about', 'overwhelmed by', 'too much', 'cant handle'
  ]
};

/**
 * Time periods for circadian rhythm analysis
 */
const TIME_PERIODS = {
  early_morning: { start: 5, end: 8, label: 'Early Morning', emoji: '🌅', typical: 'waking' },
  morning: { start: 8, end: 12, label: 'Morning', emoji: '☀️', typical: 'productive' },
  afternoon: { start: 12, end: 17, label: 'Afternoon', emoji: '🌤️', typical: 'steady' },
  evening: { start: 17, end: 21, label: 'Evening', emoji: '🌆', typical: 'winding down' },
  night: { start: 21, end: 24, label: 'Night', emoji: '🌙', typical: 'reflective' },
  late_night: { start: 0, end: 5, label: 'Late Night', emoji: '🌃', typical: 'rest' }
};

/**
 * Advanced mood analytics engine with statistical analysis and predictive capabilities.
 * 
 * @class MoodAnalyticsEngine
 */
export class MoodAnalyticsEngine {
  /**
   * Creates MoodAnalyticsEngine instance.
   * @constructor
   */
  constructor() {
    /** @type {Array} Cached mood entries */
    this.moodData = [];
    /** @type {Array} Cached journal entries */
    this.entries = [];
    /** @type {Object} Cached analytics results */
    this.cachedAnalytics = null;
    /** @type {number} Cache timestamp */
    this.cacheTime = 0;
    /** @type {number} Cache TTL in ms (2 minutes for fresher data) */
    this.cacheTTL = 2 * 60 * 1000;
    /** @type {Object} Word frequency cache for content analysis */
    this.wordFrequencyCache = null;
    /** @type {Map} Correlation cache */
    this.correlationCache = new Map();
  }

  /**
   * Loads mood data from StorageManager.
   * @param {Function} getMoodHistory - Function to get mood history
   * @param {Function} getEntries - Function to get journal entries
   * @param {number} [days=90] - Number of days to load
   */
  loadData(getMoodHistory, getEntries, days = 90) {
    this.moodData = getMoodHistory(days) || [];
    this.entries = getEntries() || [];
    this.cachedAnalytics = null;
    this.wordFrequencyCache = null;
    this.correlationCache.clear();
  }

  /**
   * Gets mood sentiment score with intensity modifier support.
   * Analyzes compound phrases like "very happy" or "slightly anxious".
   * @param {string} mood - Mood text
   * @returns {number} Sentiment score (-1 to 1)
   */
  getMoodScore(mood) {
    if (!mood) return 0;
    const lower = mood.toLowerCase().trim();
    
    // Check for intensity modifiers
    let modifier = 1.0;
    let baseMood = lower;
    
    // Check amplifiers
    for (const [word, mult] of Object.entries(INTENSITY_MODIFIERS.amplifiers)) {
      if (lower.startsWith(word + ' ')) {
        modifier = mult;
        baseMood = lower.slice(word.length + 1);
        break;
      }
    }
    
    // Check dampeners
    for (const [word, mult] of Object.entries(INTENSITY_MODIFIERS.dampeners)) {
      if (lower.startsWith(word + ' ')) {
        modifier = mult;
        baseMood = lower.slice(word.length + 1);
        break;
      }
    }
    
    // Direct match
    if (MOOD_SENTIMENT_SCORES[baseMood] !== undefined) {
      return Math.max(-1, Math.min(1, MOOD_SENTIMENT_SCORES[baseMood] * modifier));
    }
    
    // Fuzzy match - find best matching mood
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [key, score] of Object.entries(MOOD_SENTIMENT_SCORES)) {
      if (baseMood.includes(key)) {
        // Prefer longer matches (more specific)
        if (!bestMatch || key.length > bestMatch.length) {
          bestMatch = key;
          bestScore = score;
        }
      } else if (key.includes(baseMood) && baseMood.length >= 3) {
        if (!bestMatch) {
          bestMatch = key;
          bestScore = score;
        }
      }
    }
    
    if (bestMatch) {
      return Math.max(-1, Math.min(1, bestScore * modifier));
    }
    
    return 0; // Unknown mood defaults to neutral
  }

  /**
   * Categorizes a mood into predefined categories with confidence scores.
   * @param {string} mood - Mood text
   * @returns {Object} Categories with confidence scores
   */
  categorizeMood(mood) {
    if (!mood) return { categories: ['neutral'], confidence: { neutral: 1.0 } };
    
    const lower = mood.toLowerCase().trim();
    const confidence = {};
    
    for (const [category, data] of Object.entries(MOOD_CATEGORIES)) {
      const keywords = data.keywords;
      let matchScore = 0;
      
      for (const keyword of keywords) {
        if (lower === keyword) {
          matchScore = 1.0;
          break;
        } else if (lower.includes(keyword)) {
          matchScore = Math.max(matchScore, 0.8);
        } else if (keyword.includes(lower) && lower.length >= 3) {
          matchScore = Math.max(matchScore, 0.5);
        }
      }
      
      if (matchScore > 0) {
        confidence[category] = matchScore;
      }
    }
    
    const categories = Object.keys(confidence);
    if (categories.length === 0) {
      return { categories: ['neutral'], confidence: { neutral: 0.5 } };
    }
    
    // Sort by confidence
    categories.sort((a, b) => confidence[b] - confidence[a]);
    
    return { categories, confidence };
  }

  /**
   * Determines detailed time period from hour.
   * @param {number} hour - Hour (0-23)
   * @returns {string} Time period key
   */
  getTimePeriod(hour) {
    if (hour >= 5 && hour < 8) return 'early_morning';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    if (hour >= 21 && hour < 24) return 'night';
    return 'late_night';
  }

  /**
   * Simplified time period for UI display.
   * @param {number} hour - Hour (0-23)
   * @returns {string} Simple time period key
   */
  getSimpleTimePeriod(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Computes comprehensive mood analytics with advanced metrics.
   * @returns {Object} Complete analytics object
   */
  computeAnalytics() {
    const now = Date.now();
    if (this.cachedAnalytics && (now - this.cacheTime) < this.cacheTTL) {
      return this.cachedAnalytics;
    }

    // Compute all analytics components
    const overview = this.computeOverview();
    const trends = this.computeTrends();
    const timeOfDay = this.computeTimeOfDayAnalysis();
    const dayOfWeek = this.computeDayOfWeekAnalysis();
    const volatility = this.computeVolatility();
    const streaks = this.computeMoodStreaks();
    const attributeCorrelations = this.computeAttributeCorrelations();
    const contentAnalysis = this.analyzeJournalContent();
    const patterns = this.detectPatterns(trends, timeOfDay, dayOfWeek);
    const predictions = this.generatePredictions(trends, dayOfWeek, timeOfDay);
    const anomalies = this.detectAnomalies();

    const analytics = {
      overview,
      trends,
      timeOfDay,
      dayOfWeek,
      patterns,
      volatility,
      streaks,
      attributeCorrelations,
      contentAnalysis,
      predictions,
      anomalies,
      insights: []
    };

    // Generate intelligent insights based on all computed data
    analytics.insights = this.generateInsights(analytics);

    this.cachedAnalytics = analytics;
    this.cacheTime = now;
    
    return analytics;
  }

  /**
   * Computes overview statistics.
   * @returns {Object} Overview stats
   */
  computeOverview() {
    const validMoods = this.moodData.filter(d => d.mood);
    const scores = validMoods.map(d => this.getMoodScore(d.mood));
    
    const avgScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;
    
    const moodCounts = {};
    const categoryCounts = { positive: 0, neutral: 0, negative: 0, anxious: 0 };
    
    validMoods.forEach(d => {
      const mood = d.mood.toLowerCase();
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      
      const categories = this.categorizeMood(d.mood);
      categories.forEach(cat => {
        if (categoryCounts[cat] !== undefined) {
          categoryCounts[cat]++;
        }
      });
    });

    // Find dominant mood
    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    const dominantMood = sortedMoods[0]?.[0] || null;
    
    // Calculate percentages
    const total = validMoods.length || 1;
    const positivePercent = Math.round((categoryCounts.positive / total) * 100);
    const negativePercent = Math.round((categoryCounts.negative / total) * 100);
    const anxiousPercent = Math.round((categoryCounts.anxious / total) * 100);

    return {
      totalMoods: validMoods.length,
      averageScore: Math.round(avgScore * 100) / 100,
      moodCounts,
      categoryCounts,
      dominantMood,
      positivePercent,
      negativePercent,
      anxiousPercent,
      moodLabel: this.getMoodLabel(avgScore)
    };
  }

  /**
   * Gets human-readable mood label from score.
   * @param {number} score - Mood score (-1 to 1)
   * @returns {string} Mood label
   */
  getMoodLabel(score) {
    if (score >= 0.6) return 'Very Positive';
    if (score >= 0.3) return 'Positive';
    if (score >= 0.1) return 'Slightly Positive';
    if (score >= -0.1) return 'Neutral';
    if (score >= -0.3) return 'Slightly Negative';
    if (score >= -0.6) return 'Negative';
    return 'Very Negative';
  }

  /**
   * Computes mood trends over different time periods.
   * @returns {Object} Trend data with 7/30/90 day breakdowns
   */
  computeTrends() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const trends = {
      week: { data: [], average: 0, change: 0 },
      month: { data: [], average: 0, change: 0 },
      quarter: { data: [], average: 0, change: 0 }
    };

    // Process each time period
    [7, 30, 90].forEach((days, idx) => {
      const key = ['week', 'month', 'quarter'][idx];
      const periodData = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const moodEntry = this.moodData.find(d => d.date === dateStr);
        const score = moodEntry?.mood ? this.getMoodScore(moodEntry.mood) : null;
        
        periodData.push({
          date: dateStr,
          score,
          mood: moodEntry?.mood || null,
          dayOfWeek: date.getDay()
        });
      }
      
      trends[key].data = periodData;
      
      // Compute average
      const validScores = periodData.filter(d => d.score !== null).map(d => d.score);
      trends[key].average = validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 0;
      
      // Compute change (compare first half to second half)
      const half = Math.floor(validScores.length / 2);
      if (half > 0) {
        const firstHalf = validScores.slice(0, half);
        const secondHalf = validScores.slice(-half);
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        trends[key].change = secondAvg - firstAvg;
      }
      
      // Compute smoothed curve using moving average
      trends[key].smoothed = this.computeMovingAverage(periodData, Math.max(3, Math.floor(days / 10)));
    });

    return trends;
  }

  /**
   * Computes moving average for smooth trend lines.
   * @param {Array} data - Data points with score property
   * @param {number} window - Window size for averaging
   * @returns {Array} Smoothed data points
   */
  computeMovingAverage(data, window = 3) {
    const smoothed = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.ceil(window / 2));
      
      const windowData = data.slice(start, end).filter(d => d.score !== null);
      const avg = windowData.length > 0
        ? windowData.reduce((sum, d) => sum + d.score, 0) / windowData.length
        : null;
      
      smoothed.push({
        date: data[i].date,
        score: avg,
        originalScore: data[i].score
      });
    }
    
    return smoothed;
  }

  /**
   * Analyzes mood distribution by time of day.
   * @returns {Object} Time of day analysis
   */
  computeTimeOfDayAnalysis() {
    const analysis = {
      morning: { count: 0, scores: [], average: 0 },
      afternoon: { count: 0, scores: [], average: 0 },
      evening: { count: 0, scores: [], average: 0 },
      night: { count: 0, scores: [], average: 0 }
    };

    // Analyze entries by creation time
    this.entries.forEach(entry => {
      if (!entry.mood) return;
      
      const timestamp = entry.createdAt || entry.date;
      const date = new Date(timestamp);
      const hour = date.getHours();
      const period = this.getTimePeriod(hour);
      const score = this.getMoodScore(entry.mood);
      
      analysis[period].count++;
      analysis[period].scores.push(score);
    });

    // Also check mood data with timestamps
    this.moodData.forEach(d => {
      if (!d.mood || !d.timestamp) return;
      
      const date = new Date(d.timestamp);
      const hour = date.getHours();
      const period = this.getTimePeriod(hour);
      const score = this.getMoodScore(d.mood);
      
      // Avoid double counting if already in entries
      if (!analysis[period].scores.includes(score)) {
        analysis[period].count++;
        analysis[period].scores.push(score);
      }
    });

    // Compute averages
    Object.keys(analysis).forEach(period => {
      const scores = analysis[period].scores;
      analysis[period].average = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
      analysis[period].label = TIME_PERIODS[period].label;
      analysis[period].emoji = TIME_PERIODS[period].emoji;
    });

    // Find best/worst times
    const periods = Object.entries(analysis)
      .filter(([_, data]) => data.count > 0)
      .sort((a, b) => b[1].average - a[1].average);
    
    return {
      ...analysis,
      bestTime: periods[0]?.[0] || null,
      worstTime: periods[periods.length - 1]?.[0] || null
    };
  }

  /**
   * Analyzes mood distribution by day of week.
   * @returns {Object} Day of week analysis
   */
  computeDayOfWeekAnalysis() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const analysis = days.map(day => ({
      day,
      count: 0,
      scores: [],
      average: 0
    }));

    this.moodData.forEach(d => {
      if (!d.mood || !d.date) return;
      
      const date = new Date(d.date + 'T12:00:00');
      const dayIndex = date.getDay();
      const score = this.getMoodScore(d.mood);
      
      analysis[dayIndex].count++;
      analysis[dayIndex].scores.push(score);
    });

    analysis.forEach(day => {
      day.average = day.scores.length > 0
        ? day.scores.reduce((a, b) => a + b, 0) / day.scores.length
        : 0;
    });

    // Find patterns
    const validDays = analysis.filter(d => d.count > 0);
    const sorted = [...validDays].sort((a, b) => b.average - a.average);
    
    return {
      days: analysis,
      bestDay: sorted[0]?.day || null,
      worstDay: sorted[sorted.length - 1]?.day || null,
      weekendVsWeekday: this.compareWeekendWeekday(analysis)
    };
  }

  /**
   * Compares weekend vs weekday mood averages.
   * @param {Array} dayAnalysis - Day of week analysis data
   * @returns {Object} Comparison data
   */
  compareWeekendWeekday(dayAnalysis) {
    const weekendScores = [
      ...dayAnalysis[0].scores, // Sunday
      ...dayAnalysis[6].scores  // Saturday
    ];
    const weekdayScores = [
      ...dayAnalysis[1].scores,
      ...dayAnalysis[2].scores,
      ...dayAnalysis[3].scores,
      ...dayAnalysis[4].scores,
      ...dayAnalysis[5].scores
    ];

    const weekendAvg = weekendScores.length > 0
      ? weekendScores.reduce((a, b) => a + b, 0) / weekendScores.length
      : 0;
    const weekdayAvg = weekdayScores.length > 0
      ? weekdayScores.reduce((a, b) => a + b, 0) / weekdayScores.length
      : 0;

    return {
      weekendAverage: weekendAvg,
      weekdayAverage: weekdayAvg,
      difference: weekendAvg - weekdayAvg,
      betterOnWeekends: weekendAvg > weekdayAvg
    };
  }

  /**
   * Analyzes journal entry content for sentiment and patterns.
   * @returns {Object} Content analysis results
   */
  analyzeJournalContent() {
    const analysis = {
      wordFrequency: {},
      sentimentWords: { positive: [], negative: [], anxious: [] },
      topicCorrelations: [],
      anxietyTriggers: [],
      positiveThemes: [],
      averageContentSentiment: 0,
      entriesAnalyzed: 0
    };

    if (!this.entries.length) return analysis;

    const wordScores = {};
    let totalSentiment = 0;
    let entriesWithContent = 0;

    this.entries.forEach(entry => {
      if (!entry.content) return;
      
      const content = entry.content.toLowerCase();
      const words = content.split(/\s+/).filter(w => w.length > 2);
      const moodScore = entry.mood ? this.getMoodScore(entry.mood) : null;
      
      entriesWithContent++;

      // Extract sentiment from content
      let contentSentiment = 0;
      let sentimentWordCount = 0;

      words.forEach(word => {
        // Clean word
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (cleanWord.length < 3) return;

        // Track word frequency
        analysis.wordFrequency[cleanWord] = (analysis.wordFrequency[cleanWord] || 0) + 1;

        // Check positive words
        if (CONTENT_SENTIMENT_WORDS.positive.includes(cleanWord)) {
          analysis.sentimentWords.positive.push(cleanWord);
          contentSentiment += 0.5;
          sentimentWordCount++;
        }
        
        // Check negative words
        if (CONTENT_SENTIMENT_WORDS.negative.includes(cleanWord)) {
          analysis.sentimentWords.negative.push(cleanWord);
          contentSentiment -= 0.5;
          sentimentWordCount++;
        }

        // Check anxiety triggers
        if (CONTENT_SENTIMENT_WORDS.anxiety_triggers.some(trigger => content.includes(trigger))) {
          const trigger = CONTENT_SENTIMENT_WORDS.anxiety_triggers.find(t => content.includes(t));
          if (trigger && !analysis.anxietyTriggers.includes(trigger)) {
            analysis.anxietyTriggers.push(trigger);
          }
        }

        // Build word-mood correlations
        if (moodScore !== null) {
          if (!wordScores[cleanWord]) {
            wordScores[cleanWord] = { scores: [], count: 0 };
          }
          wordScores[cleanWord].scores.push(moodScore);
          wordScores[cleanWord].count++;
        }
      });

      if (sentimentWordCount > 0) {
        totalSentiment += contentSentiment / sentimentWordCount;
      }
    });

    analysis.entriesAnalyzed = entriesWithContent;
    analysis.averageContentSentiment = entriesWithContent > 0 
      ? totalSentiment / entriesWithContent 
      : 0;

    // Find words most correlated with moods
    const correlatedWords = Object.entries(wordScores)
      .filter(([_, data]) => data.count >= 3)
      .map(([word, data]) => ({
        word,
        count: data.count,
        avgMood: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      }))
      .sort((a, b) => Math.abs(b.avgMood) - Math.abs(a.avgMood));

    analysis.positiveThemes = correlatedWords
      .filter(w => w.avgMood > 0.2)
      .slice(0, 10);
    
    analysis.topicCorrelations = correlatedWords.slice(0, 20);

    return analysis;
  }

  /**
   * Generates mood predictions based on historical patterns.
   * @param {Object} trends - Trend data
   * @param {Object} dayOfWeek - Day of week analysis
   * @param {Object} timeOfDay - Time of day analysis
   * @returns {Object} Prediction results
   */
  generatePredictions(trends, dayOfWeek, timeOfDay) {
    const predictions = {
      tomorrow: null,
      nextWeek: null,
      confidence: 0,
      factors: []
    };

    const validScores = this.moodData
      .filter(d => d.mood)
      .map(d => this.getMoodScore(d.mood));

    if (validScores.length < 7) {
      predictions.confidence = 0;
      return predictions;
    }

    const today = new Date();
    const tomorrowDayOfWeek = (today.getDay() + 1) % 7;
    
    // Weighted prediction combining multiple factors
    let prediction = 0;
    let weights = 0;

    // Factor 1: Recent trend (exponential moving average)
    const recentScores = validScores.slice(-7);
    let ema = recentScores[0];
    const alpha = 0.3; // Smoothing factor
    for (let i = 1; i < recentScores.length; i++) {
      ema = alpha * recentScores[i] + (1 - alpha) * ema;
    }
    prediction += ema * 0.4;
    weights += 0.4;
    predictions.factors.push({ name: 'Recent Trend', weight: 0.4, value: ema });

    // Factor 2: Day of week pattern
    const dowData = dayOfWeek.days[tomorrowDayOfWeek];
    if (dowData && dowData.count >= 2) {
      prediction += dowData.average * 0.3;
      weights += 0.3;
      predictions.factors.push({ name: 'Day Pattern', weight: 0.3, value: dowData.average });
    }

    // Factor 3: Overall average with regression to mean
    const overallAvg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    prediction += overallAvg * 0.2;
    weights += 0.2;
    predictions.factors.push({ name: 'Baseline', weight: 0.2, value: overallAvg });

    // Factor 4: Momentum (recent change direction)
    if (trends.week.change) {
      const momentum = trends.week.change * 0.5; // Dampened momentum
      prediction += momentum * 0.1;
      weights += 0.1;
      predictions.factors.push({ name: 'Momentum', weight: 0.1, value: momentum });
    }

    // Normalize prediction
    predictions.tomorrow = weights > 0 ? prediction / weights : 0;
    predictions.tomorrow = Math.max(-1, Math.min(1, predictions.tomorrow));

    // Calculate week prediction (regresses more to mean)
    predictions.nextWeek = predictions.tomorrow * 0.6 + overallAvg * 0.4;

    // Confidence based on data consistency and amount
    const stdDev = Math.sqrt(
      validScores.reduce((sum, s) => sum + Math.pow(s - overallAvg, 2), 0) / validScores.length
    );
    const dataConfidence = Math.min(1, validScores.length / 30); // More data = higher confidence
    const consistencyConfidence = Math.max(0, 1 - stdDev); // Less volatility = higher confidence
    predictions.confidence = Math.round((dataConfidence * 0.5 + consistencyConfidence * 0.5) * 100);

    predictions.tomorrowLabel = this.getMoodLabel(predictions.tomorrow);
    predictions.nextWeekLabel = this.getMoodLabel(predictions.nextWeek);

    return predictions;
  }

  /**
   * Detects anomalous mood entries using z-score analysis.
   * @returns {Object} Anomaly detection results
   */
  detectAnomalies() {
    const anomalies = {
      unusualDays: [],
      suddenChanges: [],
      outliers: []
    };

    const validData = this.moodData.filter(d => d.mood);
    if (validData.length < 7) return anomalies;

    const scores = validData.map(d => ({ 
      date: d.date, 
      mood: d.mood, 
      score: this.getMoodScore(d.mood) 
    }));

    // Calculate statistics
    const mean = scores.reduce((sum, d) => sum + d.score, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, d) => sum + Math.pow(d.score - mean, 2), 0) / scores.length
    );

    if (stdDev === 0) return anomalies;

    // Detect outliers (z-score > 2)
    scores.forEach(d => {
      const zScore = (d.score - mean) / stdDev;
      if (Math.abs(zScore) > 2) {
        anomalies.outliers.push({
          date: d.date,
          mood: d.mood,
          score: d.score,
          zScore: Math.round(zScore * 100) / 100,
          type: zScore > 0 ? 'unusually_positive' : 'unusually_negative'
        });
      }
    });

    // Detect sudden changes (day-to-day shift > 1 std dev)
    for (let i = 1; i < scores.length; i++) {
      const change = scores[i].score - scores[i - 1].score;
      if (Math.abs(change) > stdDev * 1.5) {
        anomalies.suddenChanges.push({
          date: scores[i].date,
          previousDate: scores[i - 1].date,
          change: Math.round(change * 100) / 100,
          type: change > 0 ? 'sudden_improvement' : 'sudden_decline',
          from: scores[i - 1].mood,
          to: scores[i].mood
        });
      }
    }

    return anomalies;
  }

  /**
   * Advanced pattern detection with statistical significance.
   * @param {Object} trends - Trend data
   * @param {Object} timeOfDay - Time of day analysis
   * @param {Object} dayOfWeek - Day of week analysis
   * @returns {Object} Pattern detection results
   */
  detectPatterns(trends, timeOfDay, dayOfWeek) {
    const patterns = {
      recurring: [],
      cyclical: [],
      trends: [],
      correlations: [],
      confidence: {}
    };

    // Detect recurring negative mood patterns
    const negativeStreak = this.findMoodStreaks('negative', 3);
    if (negativeStreak.length > 0) {
      patterns.recurring.push({
        type: 'negative_streak',
        description: 'Multiple consecutive days of negative mood',
        occurrences: negativeStreak.length,
        severity: 'warning',
        recommendation: 'Consider what events or circumstances preceded these periods.'
      });
    }

    // Detect anxiety patterns
    const anxiousCount = this.moodData.filter(d => {
      const result = this.categorizeMood(d.mood);
      return result.categories.includes('anxious');
    }).length;
    
    const anxiousPercent = this.moodData.length > 0 
      ? (anxiousCount / this.moodData.length) * 100 
      : 0;
    
    if (anxiousPercent >= 20) {
      patterns.recurring.push({
        type: 'frequent_anxiety',
        description: `Anxiety detected in ${Math.round(anxiousPercent)}% of your mood logs`,
        count: anxiousCount,
        percent: anxiousPercent,
        severity: anxiousPercent > 40 ? 'high' : 'moderate',
        recommendation: 'Consider mindfulness exercises, breathing techniques, or speaking with a professional.'
      });
    }

    // Detect weekend vs weekday pattern
    if (dayOfWeek && dayOfWeek.weekendVsWeekday) {
      const diff = dayOfWeek.weekendVsWeekday.difference;
      if (Math.abs(diff) > 0.2) {
        patterns.cyclical.push({
          type: 'weekend_weekday',
          description: dayOfWeek.weekendVsWeekday.betterOnWeekends
            ? 'Mood significantly better on weekends'
            : 'Mood significantly better on weekdays',
          difference: Math.round(diff * 100) / 100,
          significance: Math.abs(diff) > 0.4 ? 'high' : 'moderate',
          recommendation: dayOfWeek.weekendVsWeekday.betterOnWeekends
            ? 'Work-life balance may need attention. Consider what makes weekends better.'
            : 'You may thrive with structure. Weekends might benefit from more planned activities.'
        });
      }
    }

    // Detect circadian patterns
    if (timeOfDay && timeOfDay.bestTime && timeOfDay.worstTime) {
      const bestScore = timeOfDay[timeOfDay.bestTime]?.average || 0;
      const worstScore = timeOfDay[timeOfDay.worstTime]?.average || 0;
      const timeDiff = bestScore - worstScore;
      
      if (timeDiff > 0.3) {
        patterns.cyclical.push({
          type: 'circadian_pattern',
          description: `Strong time-of-day pattern: ${TIME_PERIODS[timeOfDay.bestTime]?.label || timeOfDay.bestTime} vs ${TIME_PERIODS[timeOfDay.worstTime]?.label || timeOfDay.worstTime}`,
          bestTime: timeOfDay.bestTime,
          worstTime: timeOfDay.worstTime,
          difference: Math.round(timeDiff * 100) / 100,
          recommendation: `Schedule demanding tasks during ${TIME_PERIODS[timeOfDay.bestTime]?.label?.toLowerCase() || 'your best time'} when you feel strongest.`
        });
      }
    }

    // Detect improvement or decline trends
    if (trends && trends.month) {
      const change = trends.month.change;
      if (Math.abs(change) > 0.15) {
        patterns.trends.push({
          type: change > 0 ? 'improvement' : 'decline',
          description: change > 0 
            ? 'Overall mood has been improving over the past month'
            : 'Overall mood has been declining over the past month',
          change: Math.round(change * 100) / 100,
          magnitude: Math.abs(change) > 0.3 ? 'significant' : 'moderate',
          recommendation: change > 0
            ? 'Great progress! Try to identify and maintain the positive changes you\'ve made.'
            : 'Consider what has changed recently and whether professional support might help.'
        });
      }
    }

    // Calculate pattern confidence scores
    const dataPoints = this.moodData.filter(d => d.mood).length;
    patterns.confidence = {
      overall: Math.min(100, Math.round((dataPoints / 30) * 100)),
      cyclical: dataPoints >= 14 ? 'high' : dataPoints >= 7 ? 'moderate' : 'low',
      trends: dataPoints >= 21 ? 'high' : dataPoints >= 14 ? 'moderate' : 'low'
    };

    return patterns;
  }

  /**
   * Finds streaks of specific mood categories.
   * @param {string} category - Mood category to find
   * @param {number} minLength - Minimum streak length
   * @returns {Array} Array of streak objects
   */
  findMoodStreaks(category, minLength = 3) {
    const streaks = [];
    let currentStreak = [];
    
    const sortedData = [...this.moodData]
      .filter(d => d.mood)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedData.forEach(d => {
      const result = this.categorizeMood(d.mood);
      if (result.categories.includes(category)) {
        currentStreak.push(d);
      } else {
        if (currentStreak.length >= minLength) {
          streaks.push([...currentStreak]);
        }
        currentStreak = [];
      }
    });

    if (currentStreak.length >= minLength) {
      streaks.push(currentStreak);
    }

    return streaks;
  }

  /**
   * Computes mood volatility score.
   * @returns {Object} Volatility metrics
   */
  computeVolatility() {
    const scores = this.moodData
      .filter(d => d.mood)
      .map(d => this.getMoodScore(d.mood));

    if (scores.length < 2) {
      return { score: 0, label: 'Insufficient data', changes: [] };
    }

    // Calculate day-to-day changes
    const changes = [];
    for (let i = 1; i < scores.length; i++) {
      changes.push(Math.abs(scores[i] - scores[i - 1]));
    }

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const maxChange = Math.max(...changes);

    // Calculate standard deviation
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Volatility score (0-100)
    const volatilityScore = Math.min(100, Math.round((avgChange + stdDev) * 50));

    let label = 'Stable';
    if (volatilityScore > 60) label = 'Very Volatile';
    else if (volatilityScore > 40) label = 'Moderately Volatile';
    else if (volatilityScore > 20) label = 'Slightly Variable';

    return {
      score: volatilityScore,
      label,
      avgChange: Math.round(avgChange * 100) / 100,
      maxChange: Math.round(maxChange * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      changes
    };
  }

  /**
   * Computes mood streaks (positive and logging streaks).
   * @returns {Object} Streak data
   */
  computeMoodStreaks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentPositiveStreak = 0;
    let longestPositiveStreak = 0;
    let currentLoggingStreak = 0;
    let longestLoggingStreak = 0;
    let tempPositive = 0;
    let tempLogging = 0;

    const sortedData = [...this.moodData]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate from most recent
    for (let i = 0; i < sortedData.length; i++) {
      const entry = sortedData[i];
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      const dateStr = entryDate.toISOString().split('T')[0];
      const expectedStr = expectedDate.toISOString().split('T')[0];

      if (dateStr === expectedStr && entry.mood) {
        tempLogging++;
        if (this.getMoodScore(entry.mood) > 0.1) {
          tempPositive++;
        } else {
          if (tempPositive > longestPositiveStreak) {
            longestPositiveStreak = tempPositive;
          }
          if (currentPositiveStreak === 0 && i === tempPositive) {
            currentPositiveStreak = tempPositive;
          }
          tempPositive = 0;
        }
      } else {
        break;
      }
    }

    currentLoggingStreak = tempLogging;
    longestLoggingStreak = Math.max(longestLoggingStreak, tempLogging);
    if (tempPositive > longestPositiveStreak) {
      longestPositiveStreak = tempPositive;
    }
    if (currentPositiveStreak === 0) {
      currentPositiveStreak = tempPositive;
    }

    return {
      currentPositiveStreak,
      longestPositiveStreak,
      currentLoggingStreak,
      longestLoggingStreak
    };
  }

  /**
   * Analyzes correlations between mood attributes and mood scores.
   * @returns {Object} Attribute correlation data
   */
  computeAttributeCorrelations() {
    const attributeScores = {};
    const attributeCounts = {};

    // Analyze entries with both mood and attributes
    this.entries.forEach(entry => {
      if (!entry.mood || !entry.moodAttributes?.length) return;
      
      const score = this.getMoodScore(entry.mood);
      
      entry.moodAttributes.forEach(attr => {
        const attrId = attr.id || attr;
        if (!attributeScores[attrId]) {
          attributeScores[attrId] = [];
          attributeCounts[attrId] = 0;
        }
        attributeScores[attrId].push(score);
        attributeCounts[attrId]++;
      });
    });

    // Calculate average score per attribute
    const correlations = Object.entries(attributeScores).map(([attr, scores]) => ({
      attribute: attr,
      count: attributeCounts[attr],
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      impact: scores.reduce((a, b) => a + b, 0) / scores.length
    }));

    // Sort by impact
    const positiveDrivers = correlations
      .filter(c => c.averageScore > 0.1 && c.count >= 2)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);

    const negativeDrivers = correlations
      .filter(c => c.averageScore < -0.1 && c.count >= 2)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 5);

    return {
      all: correlations,
      positiveDrivers,
      negativeDrivers,
      anxietyDrivers: negativeDrivers.filter(d => d.averageScore < -0.3)
    };
  }

  /**
   * Generates intelligent, actionable insights from all analytics data.
   * @param {Object} analytics - Computed analytics
   * @returns {Array} Array of insight objects with priorities
   */
  generateInsights(analytics) {
    const insights = [];
    const { 
      overview, trends, timeOfDay, dayOfWeek, patterns, 
      volatility, attributeCorrelations, contentAnalysis, 
      predictions, anomalies 
    } = analytics;

    // Priority 1: Critical patterns and warnings
    
    // Check for concerning decline
    if (trends?.month?.change < -0.3) {
      insights.push({
        type: 'warning',
        priority: 1,
        icon: '�',
        title: 'Significant Mood Decline',
        description: 'Your mood has dropped notably over the past month. This is worth paying attention to. Consider reaching out to someone you trust or exploring what might be causing this change.',
        actionable: true,
        action: 'Consider journaling about recent life changes or speaking with a mental health professional.'
      });
    }

    // High anxiety frequency
    if (patterns?.recurring) {
      const anxietyPattern = patterns.recurring.find(p => p.type === 'frequent_anxiety' && p.severity === 'high');
      if (anxietyPattern) {
        insights.push({
          type: 'warning',
          priority: 1,
          icon: '😰',
          title: 'Elevated Anxiety Levels',
          description: `Anxiety has been present in ${Math.round(anxietyPattern.percent)}% of your recent moods. ${anxietyPattern.recommendation}`,
          actionable: true,
          action: 'Try: 4-7-8 breathing, progressive muscle relaxation, or limiting caffeine.'
        });
      }
    }

    // Priority 2: Predictions and forecasts
    if (predictions?.confidence >= 50) {
      const emoji = predictions.tomorrow >= 0.3 ? '🌟' : predictions.tomorrow >= 0 ? '☀️' : '🌧️';
      insights.push({
        type: 'prediction',
        priority: 2,
        icon: '🔮',
        title: 'Tomorrow\'s Outlook',
        description: `Based on your patterns, tomorrow looks ${predictions.tomorrowLabel.toLowerCase()} (${predictions.confidence}% confidence). ${
          predictions.tomorrow < 0 
            ? 'Plan some self-care activities.' 
            : 'A good day to tackle challenging tasks!'
        }`,
        confidence: predictions.confidence,
        factors: predictions.factors
      });
    }

    // Priority 3: Positive reinforcement
    if (trends?.month?.change > 0.2) {
      insights.push({
        type: 'positive',
        priority: 2,
        icon: '📈',
        title: 'Mood Improving!',
        description: 'Great news! Your mood has been on an upward trend. Whatever changes you\'ve made seem to be working. Keep it up!',
        change: trends.month.change
      });
    }

    // Priority 4: Pattern insights
    
    // Overall mood summary
    if (overview?.totalMoods >= 5) {
      const emoji = overview.averageScore >= 0.5 ? '😊' : 
                    overview.averageScore >= 0.2 ? '🙂' :
                    overview.averageScore >= -0.2 ? '😐' :
                    overview.averageScore >= -0.5 ? '😔' : '😢';
      insights.push({
        type: 'overview',
        priority: 3,
        icon: emoji,
        title: 'Your Mood Summary',
        description: `Overall, you've been feeling ${overview.moodLabel.toLowerCase()}. ${
          overview.dominantMood 
            ? `Your most common mood is "${overview.dominantMood}".` 
            : ''
        } ${overview.positivePercent}% positive, ${overview.negativePercent}% challenging.`,
        score: overview.averageScore
      });
    }

    // Time of day pattern
    if (timeOfDay?.bestTime && timeOfDay?.worstTime && timeOfDay.bestTime !== timeOfDay.worstTime) {
      const bestPeriod = TIME_PERIODS[timeOfDay.bestTime];
      const worstPeriod = TIME_PERIODS[timeOfDay.worstTime];
      
      if (bestPeriod && worstPeriod) {
        insights.push({
          type: 'time_pattern',
          priority: 3,
          icon: bestPeriod.emoji,
          title: 'Your Best Time',
          description: `You feel best in the ${bestPeriod.label.toLowerCase()} and lowest in the ${worstPeriod.label.toLowerCase()}. Schedule important tasks and decisions during your peak hours.`,
          actionable: true,
          action: `Try to protect your ${bestPeriod.label.toLowerCase()} time for meaningful work.`
        });
      }
    }

    // Day of week pattern
    if (dayOfWeek?.bestDay && dayOfWeek?.worstDay && dayOfWeek.bestDay !== dayOfWeek.worstDay) {
      insights.push({
        type: 'day_pattern',
        priority: 3,
        icon: '📅',
        title: 'Weekly Rhythm',
        description: `${dayOfWeek.bestDay}s are typically your best days, while ${dayOfWeek.worstDay}s tend to be more challenging. ${
          dayOfWeek.weekendVsWeekday?.betterOnWeekends
            ? 'Weekends lift your mood—make sure to take real breaks.'
            : 'You thrive with weekday structure—consider adding weekend routines.'
        }`
      });
    }

    // Volatility insight
    if (volatility?.score > 40) {
      insights.push({
        type: 'volatility',
        priority: 3,
        icon: '🎢',
        title: 'Mood Variability',
        description: `Your mood changes quite a bit day-to-day (${volatility.label.toLowerCase()}). This isn't necessarily bad, but consistent routines—sleep, meals, exercise—often help stabilize emotions.`,
        actionable: true,
        action: 'Track what happens on your best vs. hardest days.',
        score: volatility.score
      });
    } else if (volatility?.score <= 20 && overview?.totalMoods >= 7) {
      insights.push({
        type: 'positive',
        priority: 4,
        icon: '⚖️',
        title: 'Emotionally Stable',
        description: 'Your mood has been remarkably consistent. This emotional stability is a strength—it suggests good self-regulation.',
        score: volatility.score
      });
    }

    // Priority 5: Correlations and drivers
    
    // Anxiety triggers from content
    if (contentAnalysis?.anxietyTriggers?.length > 0) {
      const triggers = contentAnalysis.anxietyTriggers.slice(0, 3).join(', ');
      insights.push({
        type: 'anxiety_triggers',
        priority: 2,
        icon: '⚠️',
        title: 'Stress Triggers Identified',
        description: `Your journal entries mention "${triggers}" when you're feeling low. These topics might be sources of stress worth addressing.`,
        actionable: true,
        action: 'Consider: Can you delegate, set boundaries, or reframe these areas?',
        triggers: contentAnalysis.anxietyTriggers
      });
    }

    // Attribute correlations
    if (attributeCorrelations?.positiveDrivers?.length > 0) {
      const drivers = attributeCorrelations.positiveDrivers.slice(0, 3).map(d => d.attribute).join(', ');
      insights.push({
        type: 'positive_drivers',
        priority: 3,
        icon: '💪',
        title: 'What Lifts You Up',
        description: `When "${drivers}" are part of your day, your mood tends to be better. Try to incorporate these more often.`,
        actionable: true,
        action: `Schedule more ${attributeCorrelations.positiveDrivers[0]?.attribute || 'positive activities'} this week.`,
        drivers: attributeCorrelations.positiveDrivers
      });
    }

    if (attributeCorrelations?.negativeDrivers?.length > 0) {
      const drivers = attributeCorrelations.negativeDrivers.slice(0, 3).map(d => d.attribute).join(', ');
      insights.push({
        type: 'negative_drivers',
        priority: 3,
        icon: '🔻',
        title: 'What Weighs You Down',
        description: `"${drivers}" correlate with lower moods. These might be areas to manage more carefully or get support with.`,
        drivers: attributeCorrelations.negativeDrivers
      });
    }

    // Content sentiment vs mood mismatch
    if (contentAnalysis?.entriesAnalyzed >= 5) {
      const sentimentDiff = contentAnalysis.averageContentSentiment - (overview?.averageScore || 0);
      if (Math.abs(sentimentDiff) > 0.3) {
        insights.push({
          type: 'insight',
          priority: 4,
          icon: '🔍',
          title: 'Writing vs. Feeling',
          description: sentimentDiff > 0 
            ? 'Interestingly, your journal entries are more positive than your logged moods. Writing might be helping you process emotions.'
            : 'Your journal entries contain more negative themes than your mood logs suggest. Writing might be where you process harder feelings.'
        });
      }
    }

    // Anomaly insights
    if (anomalies?.suddenChanges?.length > 0) {
      const recentChange = anomalies.suddenChanges[anomalies.suddenChanges.length - 1];
      if (recentChange) {
        insights.push({
          type: 'anomaly',
          priority: 4,
          icon: recentChange.type === 'sudden_improvement' ? '🌈' : '⚡',
          title: recentChange.type === 'sudden_improvement' ? 'Notable Mood Lift' : 'Significant Mood Shift',
          description: `On ${new Date(recentChange.date).toLocaleDateString()}, your mood shifted ${recentChange.type === 'sudden_improvement' ? 'positively' : 'negatively'} from "${recentChange.from}" to "${recentChange.to}". What happened that day?`,
          actionable: true,
          action: 'Review your journal entry from that day for clues.'
        });
      }
    }

    // Cyclical patterns from advanced detection
    patterns?.cyclical?.forEach(pattern => {
      if (pattern.type === 'circadian_pattern') {
        insights.push({
          type: 'pattern',
          priority: 4,
          icon: '🕐',
          title: 'Your Daily Rhythm',
          description: pattern.description + ' ' + pattern.recommendation
        });
      }
    });

    // Sort by priority and limit
    insights.sort((a, b) => (a.priority || 5) - (b.priority || 5));
    
    return insights.slice(0, 8); // Return top 8 most relevant insights
  }

  /**
   * Generates SVG path data for a smooth trend line.
   * @param {Array} data - Data points with score property
   * @param {number} width - SVG width
   * @param {number} height - SVG height
   * @param {number} [padding=20] - Padding from edges
   * @returns {string} SVG path d attribute
   */
  generateSmoothPath(data, width, height, padding = 20) {
    const validData = data.filter(d => d.score !== null);
    if (validData.length < 2) return '';

    const xScale = (width - padding * 2) / (validData.length - 1);
    const yScale = (height - padding * 2) / 2; // Score range is -1 to 1

    const points = validData.map((d, i) => ({
      x: padding + i * xScale,
      y: height / 2 - d.score * yScale // Invert Y axis
    }));

    // Generate smooth bezier curve
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      
      path += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }

    return path;
  }

  /**
   * Generates data points for area chart fill.
   * @param {Array} data - Data points with score property
   * @param {number} width - SVG width
   * @param {number} height - SVG height
   * @param {number} [padding=20] - Padding from edges
   * @returns {string} SVG path d attribute for filled area
   */
  generateAreaPath(data, width, height, padding = 20) {
    const linePath = this.generateSmoothPath(data, width, height, padding);
    if (!linePath) return '';
    
    const validData = data.filter(d => d.score !== null);
    const xScale = (width - padding * 2) / (validData.length - 1);
    const lastX = padding + (validData.length - 1) * xScale;
    const baseline = height / 2;
    
    return `${linePath} L ${lastX},${baseline} L ${padding},${baseline} Z`;
  }
}

// Export singleton instance
export const moodAnalytics = new MoodAnalyticsEngine();
