/**
 * StressTriggerEngine - Comprehensive stress trigger analysis
 * 
 * This engine analyzes journal entries and mood data to identify, categorize,
 * and provide actionable insights about stress triggers.
 * 
 * Features:
 * - Text analysis for stress-related keywords and phrases
 * - Temporal pattern detection (when stress occurs)
 * - Correlation with mood data
 * - Categorization of trigger types (work, relationships, health, etc.)
 * - Severity scoring and trend analysis
 * - Actionable recommendations
 * 
 * @module StressTriggerEngine
 */

export class StressTriggerEngine {
  /**
   * Stress trigger category definitions with keywords and weight
   * @private
   */
  static #TRIGGER_CATEGORIES = {
    work: {
      name: 'Work & Career',
      icon: '💼',
      keywords: [
        'work', 'job', 'boss', 'coworker', 'deadline', 'project', 'meeting',
        'presentation', 'performance', 'promotion', 'fired', 'layoff', 'office',
        'colleague', 'manager', 'client', 'workload', 'overtime', 'career',
        'interview', 'salary', 'raise', 'review', 'feedback', 'task', 'assignment'
      ],
      phrases: [
        'too much work', 'work stress', 'hate my job', 'busy at work',
        'work deadline', 'job interview', 'got fired', 'work pressure'
      ]
    },
    academic: {
      name: 'Academic & Studies',
      icon: '📚',
      keywords: [
        'exam', 'test', 'study', 'homework', 'assignment', 'grade', 'school',
        'university', 'college', 'class', 'professor', 'teacher', 'lecture',
        'thesis', 'dissertation', 'research', 'paper', 'essay', 'finals',
        'midterm', 'quiz', 'gpa', 'fail', 'passed', 'course', 'semester'
      ],
      phrases: [
        'failed exam', 'too much homework', 'need to study', 'school stress',
        'bad grade', 'upcoming exam', 'thesis deadline'
      ]
    },
    relationships: {
      name: 'Relationships',
      icon: '💔',
      keywords: [
        'fight', 'argument', 'breakup', 'divorce', 'partner', 'boyfriend',
        'girlfriend', 'husband', 'wife', 'spouse', 'relationship', 'dating',
        'family', 'parents', 'mother', 'father', 'sibling', 'friend', 'betrayed',
        'trust', 'cheated', 'lonely', 'abandoned', 'rejected', 'conflict'
      ],
      phrases: [
        'broke up', 'had a fight', 'not talking', 'feeling lonely',
        'relationship problems', 'family issues', 'trust issues'
      ]
    },
    health: {
      name: 'Health & Wellness',
      icon: '🏥',
      keywords: [
        'sick', 'pain', 'doctor', 'hospital', 'surgery', 'diagnosis', 'illness',
        'disease', 'medication', 'symptoms', 'headache', 'migraine', 'insomnia',
        'sleep', 'tired', 'exhausted', 'fatigue', 'anxiety', 'depression',
        'therapy', 'mental', 'chronic', 'injury', 'accident', 'health'
      ],
      phrases: [
        'cant sleep', "can't sleep", 'feeling sick', 'health issues',
        'mental health', 'panic attack', 'so tired', 'no energy'
      ]
    },
    financial: {
      name: 'Financial',
      icon: '💰',
      keywords: [
        'money', 'debt', 'bills', 'rent', 'mortgage', 'loan', 'payment',
        'expense', 'budget', 'savings', 'broke', 'poor', 'afford', 'cost',
        'price', 'financial', 'credit', 'bank', 'investment', 'tax', 'income'
      ],
      phrases: [
        'no money', 'cant afford', "can't afford", 'in debt', 'money problems',
        'financial stress', 'pay bills', 'running low'
      ]
    },
    social: {
      name: 'Social & Self',
      icon: '👥',
      keywords: [
        'embarrassed', 'ashamed', 'awkward', 'judged', 'criticized', 'pressure',
        'expectations', 'compare', 'comparison', 'failure', 'impostor', 'inadequate',
        'worthless', 'stupid', 'ugly', 'fat', 'insecure', 'confidence', 'self-esteem',
        'social', 'party', 'event', 'public', 'speaking', 'presentation'
      ],
      phrases: [
        'feel like a failure', 'not good enough', 'everyone else', 'compared to',
        'social anxiety', 'feel judged', 'what others think'
      ]
    },
    lifestyle: {
      name: 'Lifestyle & Daily',
      icon: '🏠',
      keywords: [
        'moving', 'move', 'traffic', 'commute', 'chores', 'cleaning', 'cooking',
        'errands', 'busy', 'overwhelmed', 'schedule', 'time', 'routine', 'chaos',
        'disorganized', 'mess', 'clutter', 'noise', 'neighbors', 'housing'
      ],
      phrases: [
        'too much to do', 'no time', 'so busy', 'running around',
        'never enough time', 'overwhelming day'
      ]
    },
    uncertainty: {
      name: 'Uncertainty & Future',
      icon: '❓',
      keywords: [
        'worried', 'worry', 'uncertain', 'unknown', 'future', 'change', 'decision',
        'choice', 'scared', 'afraid', 'fear', 'nervous', 'anxious', 'what if',
        'maybe', 'unsure', 'doubt', 'confused', 'lost', 'direction', 'purpose'
      ],
      phrases: [
        'dont know what', "don't know what", 'worried about', 'scared of',
        'uncertain future', 'big decision', 'life changing'
      ]
    }
  };

  /**
   * Stress intensity indicators
   * @private
   */
  static #INTENSITY_MARKERS = {
    high: {
      words: ['extremely', 'incredibly', 'unbearable', 'overwhelming', 'crushing', 
              'devastating', 'terrible', 'horrible', 'worst', 'impossible', 'crisis'],
      multiplier: 1.5
    },
    moderate: {
      words: ['very', 'really', 'quite', 'fairly', 'pretty', 'somewhat', 'rather'],
      multiplier: 1.2
    },
    low: {
      words: ['slightly', 'little', 'bit', 'minor', 'small', 'manageable'],
      multiplier: 0.8
    }
  };

  /**
   * Negative mood indicators that suggest stress context
   * @private
   */
  static #STRESS_MOOD_INDICATORS = [
    'stressed', 'anxious', 'worried', 'overwhelmed', 'frustrated', 'angry',
    'irritated', 'upset', 'sad', 'depressed', 'exhausted', 'tired', 'drained',
    'burnt out', 'burned out', 'tense', 'nervous', 'panicked', 'scared'
  ];

  constructor() {
    /** @type {Array} Mood history data */
    this.moodData = [];
    /** @type {Array} Journal entries */
    this.entries = [];
    /** @type {Object|null} Cached analysis results */
    this.cachedAnalysis = null;
  }

  /**
   * Load data for analysis
   * @param {Array} moodData - Array of mood records with date, mood, timestamp
   * @param {Array} entries - Array of journal entries with content, mood, date
   */
  loadData(moodData = [], entries = []) {
    this.moodData = moodData.filter(d => d && d.mood);
    this.entries = entries.filter(e => e && (e.content || e.mood));
    this.cachedAnalysis = null;
  }

  /**
   * Run comprehensive stress trigger analysis
   * @returns {Object} Complete analysis results
   */
  analyze() {
    if (this.cachedAnalysis) return this.cachedAnalysis;

    const triggers = this.#extractTriggers();
    const temporal = this.#analyzeTemporalPatterns(triggers);
    const categories = this.#categorizeTriggers(triggers);
    const severity = this.#assessSeverity(triggers);
    const trends = this.#analyzeTrends(triggers);
    const recommendations = this.#generateRecommendations(categories, severity, temporal);
    const summary = this.#generateSummary(triggers, categories, severity);

    this.cachedAnalysis = {
      triggers,
      categories,
      temporal,
      severity,
      trends,
      recommendations,
      summary,
      metadata: {
        analyzedEntries: this.entries.length,
        analyzedMoods: this.moodData.length,
        analysisDate: new Date().toISOString()
      }
    };

    return this.cachedAnalysis;
  }

  /**
   * Extract stress triggers from all data sources
   * @private
   * @returns {Array} Array of trigger objects
   */
  #extractTriggers() {
    const triggers = [];

    // Analyze journal entries
    this.entries.forEach(entry => {
      const entryTriggers = this.#analyzeEntryForTriggers(entry);
      triggers.push(...entryTriggers);
    });

    // Analyze mood data for stress indicators
    this.moodData.forEach(mood => {
      if (this.#isStressMood(mood.mood)) {
        triggers.push({
          source: 'mood',
          date: mood.date,
          timestamp: mood.timestamp,
          mood: mood.mood,
          category: 'general',
          intensity: this.#getMoodIntensity(mood.mood),
          keywords: [mood.mood.toLowerCase()]
        });
      }
    });

    return triggers.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Analyze a single entry for stress triggers
   * @private
   * @param {Object} entry - Journal entry
   * @returns {Array} Triggers found in entry
   */
  #analyzeEntryForTriggers(entry) {
    const triggers = [];
    const content = (entry.content || '').toLowerCase();
    const mood = (entry.mood || '').toLowerCase();
    const date = entry.date || entry.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];

    // Check if this is a stress-context entry
    const isStressContext = this.#isStressMood(mood) || 
                            this.#containsStressIndicators(content);

    if (!isStressContext && !this.#hasAnyTriggerKeywords(content)) {
      return triggers;
    }

    // Analyze against each category
    Object.entries(StressTriggerEngine.#TRIGGER_CATEGORIES).forEach(([catKey, category]) => {
      const matches = this.#findCategoryMatches(content, category);
      
      if (matches.keywords.length > 0 || matches.phrases.length > 0) {
        const intensity = this.#calculateIntensity(content, matches);
        
        triggers.push({
          source: 'entry',
          date,
          entryId: entry.id,
          mood: entry.mood,
          category: catKey,
          categoryName: category.name,
          icon: category.icon,
          keywords: matches.keywords,
          phrases: matches.phrases,
          intensity,
          context: this.#extractContext(entry.content, matches),
          isStressContext
        });
      }
    });

    return triggers;
  }

  /**
   * Find matching keywords and phrases in content for a category
   * @private
   */
  #findCategoryMatches(content, category) {
    const keywords = [];
    const phrases = [];

    category.keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      if (regex.test(content)) {
        keywords.push(kw);
      }
    });

    category.phrases.forEach(phrase => {
      if (content.includes(phrase.toLowerCase())) {
        phrases.push(phrase);
      }
    });

    return { keywords, phrases };
  }

  /**
   * Calculate intensity score for a trigger
   * @private
   */
  #calculateIntensity(content, matches) {
    let baseScore = matches.keywords.length * 0.3 + matches.phrases.length * 0.5;
    let multiplier = 1;

    // Check intensity markers
    Object.entries(StressTriggerEngine.#INTENSITY_MARKERS).forEach(([level, data]) => {
      data.words.forEach(word => {
        if (content.includes(word)) {
          multiplier = Math.max(multiplier, data.multiplier);
        }
      });
    });

    const score = Math.min(1, baseScore * multiplier);
    
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'moderate';
    return 'low';
  }

  /**
   * Extract context snippet around trigger keywords
   * @private
   */
  #extractContext(content, matches) {
    if (!content) return '';
    
    const allMatches = [...matches.keywords, ...matches.phrases];
    if (allMatches.length === 0) return '';

    const lowerContent = content.toLowerCase();
    const firstMatch = allMatches[0];
    const index = lowerContent.indexOf(firstMatch.toLowerCase());
    
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + firstMatch.length + 50);
    let context = content.substring(start, end).trim();
    
    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';
    
    return context;
  }

  /**
   * Check if mood indicates stress
   * @private
   */
  #isStressMood(mood) {
    if (!mood) return false;
    const lower = mood.toLowerCase();
    return StressTriggerEngine.#STRESS_MOOD_INDICATORS.some(indicator => 
      lower.includes(indicator)
    );
  }

  /**
   * Get intensity from mood text
   * @private
   */
  #getMoodIntensity(mood) {
    const lower = mood.toLowerCase();
    if (lower.includes('extremely') || lower.includes('very') || lower.includes('so ')) {
      return 'high';
    }
    if (lower.includes('slightly') || lower.includes('bit') || lower.includes('little')) {
      return 'low';
    }
    return 'moderate';
  }

  /**
   * Check if content contains stress indicators
   * @private
   */
  #containsStressIndicators(content) {
    return StressTriggerEngine.#STRESS_MOOD_INDICATORS.some(indicator =>
      content.includes(indicator)
    );
  }

  /**
   * Check if content has any trigger keywords
   * @private
   */
  #hasAnyTriggerKeywords(content) {
    return Object.values(StressTriggerEngine.#TRIGGER_CATEGORIES).some(category =>
      category.keywords.some(kw => content.includes(kw)) ||
      category.phrases.some(phrase => content.includes(phrase))
    );
  }

  /**
   * Analyze temporal patterns in triggers
   * @private
   */
  #analyzeTemporalPatterns(triggers) {
    const byDayOfWeek = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const byTimeOfDay = { morning: [], afternoon: [], evening: [], night: [] };
    const byMonth = {};

    triggers.forEach(trigger => {
      const date = new Date(trigger.date);
      const dayOfWeek = date.getDay();
      byDayOfWeek[dayOfWeek].push(trigger);

      // Time of day from timestamp if available
      if (trigger.timestamp) {
        const hour = new Date(trigger.timestamp).getHours();
        const period = this.#getTimePeriod(hour);
        byTimeOfDay[period].push(trigger);
      }

      // Monthly tracking
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(trigger);
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const worstDay = Object.entries(byDayOfWeek)
      .map(([day, triggers]) => ({ day: parseInt(day), count: triggers.length, name: dayNames[day] }))
      .sort((a, b) => b.count - a.count)[0];

    const worstTime = Object.entries(byTimeOfDay)
      .map(([period, triggers]) => ({ period, count: triggers.length }))
      .sort((a, b) => b.count - a.count)[0];

    return {
      byDayOfWeek,
      byTimeOfDay,
      byMonth,
      worstDay: worstDay?.count > 0 ? worstDay : null,
      worstTime: worstTime?.count > 0 ? worstTime : null,
      patterns: this.#identifyTemporalPatterns(byDayOfWeek, byTimeOfDay)
    };
  }

  /**
   * Get time period from hour
   * @private
   */
  #getTimePeriod(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Identify temporal patterns
   * @private
   */
  #identifyTemporalPatterns(byDayOfWeek, byTimeOfDay) {
    const patterns = [];

    // Weekday vs weekend
    const weekdayCount = [1, 2, 3, 4, 5].reduce((sum, d) => sum + byDayOfWeek[d].length, 0);
    const weekendCount = byDayOfWeek[0].length + byDayOfWeek[6].length;
    
    if (weekdayCount > weekendCount * 2.5) {
      patterns.push({
        type: 'weekday_stress',
        description: 'Stress triggers are significantly more common during weekdays',
        recommendation: 'Consider work-life balance strategies'
      });
    } else if (weekendCount > weekdayCount) {
      patterns.push({
        type: 'weekend_stress',
        description: 'Stress triggers occur more on weekends',
        recommendation: 'Weekends might need more structure or relaxation'
      });
    }

    // Morning vs evening
    const morningCount = byTimeOfDay.morning.length;
    const eveningCount = byTimeOfDay.evening.length + byTimeOfDay.night.length;
    
    if (morningCount > eveningCount * 1.5) {
      patterns.push({
        type: 'morning_stress',
        description: 'Mornings tend to be more stressful',
        recommendation: 'Try a calming morning routine'
      });
    } else if (eveningCount > morningCount * 1.5) {
      patterns.push({
        type: 'evening_stress',
        description: 'Stress accumulates toward evening',
        recommendation: 'Build in decompression time after work'
      });
    }

    return patterns;
  }

  /**
   * Categorize and rank triggers by category
   * @private
   */
  #categorizeTriggers(triggers) {
    const categories = {};
    
    Object.keys(StressTriggerEngine.#TRIGGER_CATEGORIES).forEach(key => {
      categories[key] = {
        ...StressTriggerEngine.#TRIGGER_CATEGORIES[key],
        triggers: [],
        count: 0,
        severity: 0
      };
    });

    // Add general category for mood-only triggers
    categories.general = {
      name: 'General Stress',
      icon: '😰',
      triggers: [],
      count: 0,
      severity: 0
    };

    triggers.forEach(trigger => {
      const cat = trigger.category || 'general';
      if (categories[cat]) {
        categories[cat].triggers.push(trigger);
        categories[cat].count++;
        categories[cat].severity += trigger.intensity === 'high' ? 3 : 
                                    trigger.intensity === 'moderate' ? 2 : 1;
      }
    });

    // Calculate average severity and rank
    const ranked = Object.entries(categories)
      .map(([key, data]) => ({
        key,
        ...data,
        avgSeverity: data.count > 0 ? data.severity / data.count : 0
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.severity - a.severity);

    return {
      all: categories,
      ranked,
      primary: ranked[0] || null,
      secondary: ranked[1] || null
    };
  }

  /**
   * Assess overall stress severity
   * @private
   */
  #assessSeverity(triggers) {
    if (triggers.length === 0) {
      return {
        level: 'low',
        score: 0,
        description: 'No significant stress triggers detected',
        highCount: 0,
        moderateCount: 0,
        lowCount: 0
      };
    }

    const highCount = triggers.filter(t => t.intensity === 'high').length;
    const moderateCount = triggers.filter(t => t.intensity === 'moderate').length;
    const lowCount = triggers.filter(t => t.intensity === 'low').length;

    const score = (highCount * 3 + moderateCount * 2 + lowCount) / triggers.length;
    
    let level, description;
    if (score >= 2.5 || highCount >= 3) {
      level = 'high';
      description = 'Multiple high-intensity stress triggers detected. Consider seeking support.';
    } else if (score >= 1.5 || highCount >= 1) {
      level = 'moderate';
      description = 'Moderate stress levels with some concerning triggers.';
    } else {
      level = 'low';
      description = 'Generally manageable stress levels.';
    }

    return {
      level,
      score: Math.round(score * 100) / 100,
      description,
      highCount,
      moderateCount,
      lowCount,
      total: triggers.length
    };
  }

  /**
   * Analyze stress trends over time
   * @private
   */
  #analyzeTrends(triggers) {
    if (triggers.length < 3) {
      return {
        direction: 'insufficient_data',
        description: 'Not enough data to determine trends'
      };
    }

    // Group by week
    const byWeek = {};
    triggers.forEach(trigger => {
      const date = new Date(trigger.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!byWeek[weekKey]) byWeek[weekKey] = [];
      byWeek[weekKey].push(trigger);
    });

    const weeks = Object.entries(byWeek)
      .map(([week, triggers]) => ({
        week,
        count: triggers.length,
        severity: triggers.reduce((sum, t) => 
          sum + (t.intensity === 'high' ? 3 : t.intensity === 'moderate' ? 2 : 1), 0
        )
      }))
      .sort((a, b) => new Date(a.week) - new Date(b.week));

    if (weeks.length < 2) {
      return {
        direction: 'insufficient_data',
        description: 'Not enough weeks of data'
      };
    }

    // Compare recent to past
    const recentWeeks = weeks.slice(-2);
    const olderWeeks = weeks.slice(0, -2);
    
    const recentAvg = recentWeeks.reduce((sum, w) => sum + w.severity, 0) / recentWeeks.length;
    const olderAvg = olderWeeks.length > 0 
      ? olderWeeks.reduce((sum, w) => sum + w.severity, 0) / olderWeeks.length 
      : recentAvg;

    const change = ((recentAvg - olderAvg) / Math.max(olderAvg, 1)) * 100;

    let direction, description;
    if (change > 20) {
      direction = 'increasing';
      description = 'Stress triggers are becoming more frequent or intense';
    } else if (change < -20) {
      direction = 'decreasing';
      description = 'Stress levels appear to be improving';
    } else {
      direction = 'stable';
      description = 'Stress patterns remain relatively consistent';
    }

    return {
      direction,
      description,
      change: Math.round(change),
      weeklyData: weeks
    };
  }

  /**
   * Generate actionable recommendations
   * @private
   */
  #generateRecommendations(categories, severity, temporal) {
    const recommendations = [];

    // Category-specific recommendations
    if (categories.primary) {
      const primaryRecs = this.#getCategoryRecommendations(categories.primary.key);
      recommendations.push(...primaryRecs.map(r => ({ ...r, priority: 'high' })));
    }

    if (categories.secondary) {
      const secondaryRecs = this.#getCategoryRecommendations(categories.secondary.key);
      recommendations.push(...secondaryRecs.slice(0, 2).map(r => ({ ...r, priority: 'medium' })));
    }

    // Temporal recommendations
    temporal.patterns.forEach(pattern => {
      recommendations.push({
        type: 'temporal',
        title: pattern.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: pattern.recommendation,
        priority: 'medium'
      });
    });

    // Severity-based recommendations
    if (severity.level === 'high') {
      recommendations.unshift({
        type: 'severity',
        title: 'Consider Professional Support',
        description: 'High stress levels detected. Speaking with a counselor or therapist could be beneficial.',
        priority: 'high'
      });
    }

    return recommendations.slice(0, 5); // Limit to top 5
  }

  /**
   * Get category-specific recommendations
   * @private
   */
  #getCategoryRecommendations(category) {
    const recommendations = {
      work: [
        { type: 'work', title: 'Set Boundaries', description: 'Establish clear work hours and stick to them' },
        { type: 'work', title: 'Prioritize Tasks', description: 'Focus on high-impact tasks first' },
        { type: 'work', title: 'Take Breaks', description: 'Regular short breaks can improve focus and reduce stress' }
      ],
      academic: [
        { type: 'academic', title: 'Break It Down', description: 'Divide large assignments into smaller, manageable chunks' },
        { type: 'academic', title: 'Study Schedule', description: 'Create a consistent study routine' },
        { type: 'academic', title: 'Seek Help', description: 'Don\'t hesitate to ask professors or tutors for assistance' }
      ],
      relationships: [
        { type: 'relationships', title: 'Open Communication', description: 'Express your feelings calmly and honestly' },
        { type: 'relationships', title: 'Set Boundaries', description: 'It\'s okay to say no and protect your energy' },
        { type: 'relationships', title: 'Quality Time', description: 'Dedicate uninterrupted time for important relationships' }
      ],
      health: [
        { type: 'health', title: 'Prioritize Sleep', description: 'Aim for 7-9 hours of quality sleep' },
        { type: 'health', title: 'Move Your Body', description: 'Regular exercise can significantly reduce stress' },
        { type: 'health', title: 'Seek Medical Advice', description: 'Consult healthcare providers for persistent concerns' }
      ],
      financial: [
        { type: 'financial', title: 'Track Spending', description: 'Understanding where money goes is the first step' },
        { type: 'financial', title: 'Build Emergency Fund', description: 'Even small savings provide security' },
        { type: 'financial', title: 'Seek Advice', description: 'Financial counselors can help create a plan' }
      ],
      social: [
        { type: 'social', title: 'Practice Self-Compassion', description: 'Treat yourself as you would a good friend' },
        { type: 'social', title: 'Limit Comparisons', description: 'Focus on your own journey, not others\'' },
        { type: 'social', title: 'Build Confidence', description: 'Small wins add up to big confidence' }
      ],
      lifestyle: [
        { type: 'lifestyle', title: 'Simplify', description: 'Identify what can be delegated or eliminated' },
        { type: 'lifestyle', title: 'Create Routines', description: 'Predictable routines reduce decision fatigue' },
        { type: 'lifestyle', title: 'Plan Ahead', description: 'Weekly planning can prevent daily chaos' }
      ],
      uncertainty: [
        { type: 'uncertainty', title: 'Focus on Controllables', description: 'Direct energy toward what you can influence' },
        { type: 'uncertainty', title: 'Accept Uncertainty', description: 'Some things are unknowable, and that\'s okay' },
        { type: 'uncertainty', title: 'Take Small Steps', description: 'Action reduces anxiety about the future' }
      ],
      general: [
        { type: 'general', title: 'Deep Breathing', description: 'Practice 4-7-8 breathing when stressed' },
        { type: 'general', title: 'Journaling', description: 'Writing helps process and release stress' },
        { type: 'general', title: 'Connect', description: 'Reach out to someone you trust' }
      ]
    };

    return recommendations[category] || recommendations.general;
  }

  /**
   * Generate summary of analysis
   * @private
   */
  #generateSummary(triggers, categories, severity) {
    if (triggers.length === 0) {
      return {
        headline: 'No Stress Triggers Detected',
        description: 'Your recent entries and moods don\'t show significant stress triggers. Keep it up!',
        topTriggers: [],
        actionableInsight: 'Continue journaling to maintain awareness of your mental state.'
      };
    }

    const topTriggers = categories.ranked.slice(0, 3).map(c => ({
      name: c.name,
      icon: c.icon,
      count: c.count
    }));

    const primaryName = categories.primary?.name || 'General stress';
    const severityText = severity.level === 'high' ? 'significant' : 
                         severity.level === 'moderate' ? 'moderate' : 'some';

    return {
      headline: `${primaryName} Triggers Identified`,
      description: `Your entries show ${severityText} stress related to ${primaryName.toLowerCase()}${
        categories.secondary ? ` and ${categories.secondary.name.toLowerCase()}` : ''
      }.`,
      topTriggers,
      actionableInsight: categories.ranked[0] 
        ? `Consider addressing ${categories.ranked[0].name.toLowerCase()} triggers first.`
        : 'Keep journaling to identify patterns.'
    };
  }

  /**
   * Get quick stress trigger summary for UI display
   * @returns {Object} Simplified summary for quick display
   */
  getQuickSummary() {
    const analysis = this.analyze();
    
    return {
      hasData: analysis.triggers.length > 0,
      severityLevel: analysis.severity.level,
      primaryTrigger: analysis.categories.primary ? {
        name: analysis.categories.primary.name,
        icon: analysis.categories.primary.icon,
        count: analysis.categories.primary.count
      } : null,
      topKeywords: this.#getTopKeywords(analysis.triggers, 5),
      recommendation: analysis.recommendations[0] || null,
      trend: analysis.trends.direction
    };
  }

  /**
   * Get most frequent trigger keywords
   * @private
   */
  #getTopKeywords(triggers, limit) {
    const keywordCounts = {};
    
    triggers.forEach(trigger => {
      (trigger.keywords || []).forEach(kw => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      });
    });

    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }));
  }
}
