// storageManager.js
// Unified storage API that uses SQLite (via DatabaseManager) when available,
// with localStorage fallback for compatibility

import { dbManager } from './databaseManager.js';

const STORAGE_VERSION = 2;
const ENTRIES_KEY = 'entries';
const META_KEY = 'simnote_meta';
const DAILY_MOOD_KEY = 'simnote_daily_mood';
const NATIVE_DB_MIGRATION_KEY = 'simnote_native_db_migrated';
const isElectron = typeof window !== 'undefined' && window.electronAPI?.nativeDb;

// Flag to track if SQLite is ready
let sqliteReady = false;
let sqliteInitPromise = null;
let nativeDbInitPromise = null;

// Initialize SQLite database
async function initSQLite() {
  if (sqliteInitPromise) return sqliteInitPromise;
  
  sqliteInitPromise = dbManager.init().then(success => {
    sqliteReady = success;
    if (success) {
      console.log('[Storage] Using SQLite database');
    } else {
      console.log('[Storage] Falling back to localStorage');
      // Ensure localStorage has data (may need to recover from a previous session)
      const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
      console.log(`[Storage] localStorage has ${entries.length} entries available`);
    }
    return success;
  }).catch(error => {
    console.error('[Storage] SQLite initialization error:', error);
    sqliteReady = false;
    return false;
  });
  
  return sqliteInitPromise;
}

function buildMoodHistory(days, moodMap) {
  const result = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const value = moodMap[dateStr];
    result.push({
      date: dateStr,
      mood: value?.mood || value || null
    });
  }

  return result;
}

async function migrateLocalStorageToNativeDb() {
  if (!isElectron) return false;
  if (localStorage.getItem(NATIVE_DB_MIGRATION_KEY) === 'true') return true;

  const entriesRaw = localStorage.getItem(ENTRIES_KEY);
  const moodsRaw = localStorage.getItem(DAILY_MOOD_KEY);

  let entries = [];
  if (entriesRaw) {
    try {
      entries = JSON.parse(entriesRaw);
    } catch (err) {
      console.warn('[Storage] Failed to parse localStorage entries for migration:', err);
      entries = [];
    }
  }

  try {
    const existingCount = window.electronAPI.nativeDb.getEntryCount();
    if (existingCount > 0) {
      localStorage.setItem(NATIVE_DB_MIGRATION_KEY, 'true');
      return true;
    }
  } catch (err) {
    console.warn('[Storage] Failed to check native DB entry count:', err);
  }

  if (!entries.length && !moodsRaw) {
    localStorage.setItem(NATIVE_DB_MIGRATION_KEY, 'true');
    return true;
  }

  const exportData = {
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    entries
  };

  if (moodsRaw) {
    try {
      exportData.dailyMoods = JSON.parse(moodsRaw);
    } catch (err) {
      console.warn('[Storage] Failed to parse daily moods for migration:', err);
    }
  }

  try {
    await window.electronAPI.nativeDb.importFromJSON(JSON.stringify(exportData));
    localStorage.setItem(NATIVE_DB_MIGRATION_KEY, 'true');
    return true;
  } catch (err) {
    console.warn('[Storage] Native DB migration failed:', err);
    return false;
  }
}

async function initNativeDb() {
  if (nativeDbInitPromise) return nativeDbInitPromise;

  nativeDbInitPromise = window.electronAPI.nativeDb.init()
    .then(() => migrateLocalStorageToNativeDb())
    .catch((error) => {
      console.error('[Storage] Native DB initialization error:', error);
      return false;
    });

  return nativeDbInitPromise;
}

// Auto-initialize on load
if (isElectron) {
  initNativeDb();
} else {
  initSQLite();
}

export class StorageManager {
  // Initialize storage (call this early in app startup)
  static async init() {
    if (isElectron) {
      return initNativeDb();
    }
    return initSQLite();
  }

  // Check if SQLite is ready
  static isUsingSQL() {
    if (isElectron) return true;
    return sqliteReady;
  }

  // Generate unique ID for entries
  static generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get metadata (version, stats, etc.)
  static getMeta() {
    if (isElectron) {
      return window.electronAPI.nativeDb.getMetadata('app_meta') || {
        version: STORAGE_VERSION,
        createdAt: new Date().toISOString()
      };
    }

    if (sqliteReady) {
      return dbManager.getMetadata('app_meta') || {
        version: STORAGE_VERSION,
        createdAt: new Date().toISOString()
      };
    }
    
    const meta = JSON.parse(localStorage.getItem(META_KEY)) || {
      version: 1,
      createdAt: new Date().toISOString(),
      totalEntries: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastEntryDate: null
    };
    return meta;
  }

  static saveMeta(meta) {
    if (isElectron) {
      window.electronAPI.nativeDb.setMetadata('app_meta', meta);
    } else if (sqliteReady) {
      dbManager.setMetadata('app_meta', meta);
    } else {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    }
  }

  // Migrate old entries to new format (localStorage only)
  static migrateIfNeeded() {
    if (sqliteReady || isElectron) return; // SQLite handles its own migration
    
    const meta = StorageManager.getMeta();
    if (meta.version >= STORAGE_VERSION) return;

    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
    const migratedEntries = entries.map((entry, idx) => {
      if (!entry.id) entry.id = StorageManager.generateId();
      if (!entry.tags) entry.tags = [];
      if (entry.favorite === undefined) entry.favorite = false;
      if (!entry.createdAt) entry.createdAt = entry.date || new Date().toISOString();
      if (!entry.updatedAt) entry.updatedAt = entry.date || new Date().toISOString();
      return entry;
    });

    localStorage.setItem(ENTRIES_KEY, JSON.stringify(migratedEntries));
    meta.version = STORAGE_VERSION;
    meta.totalEntries = migratedEntries.length;
    StorageManager.saveMeta(meta);
    console.log(`Migrated ${migratedEntries.length} entries to v${STORAGE_VERSION}`);
  }

  static getEntries() {
    if (isElectron) {
      return window.electronAPI.nativeDb.getEntries() || [];
    }

    if (sqliteReady) {
      return dbManager.getEntries();
    }
    
    StorageManager.migrateIfNeeded();
    return JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
  }

  static getEntryById(id) {
    if (isElectron) {
      return window.electronAPI.nativeDb.getEntryById(id);
    }

    if (sqliteReady) {
      return dbManager.getEntryById(id);
    }
    
    const entries = StorageManager.getEntries();
    return entries.find(e => e.id === id) || null;
  }

  static getEntryIndexById(id) {
    const entries = StorageManager.getEntries();
    return entries.findIndex(e => e.id === id);
  }

  static _resolveEntry(indexOrId) {
    const entries = StorageManager.getEntries();
    if (typeof indexOrId === 'number') {
      return entries[indexOrId] || null;
    }
    return entries.find(e => e.id === indexOrId) || null;
  }

  static saveEntry(name, content, mood = '', fontFamily = '', fontSize = '', tags = []) {
    if (isElectron) {
      return window.electronAPI.nativeDb.saveEntry({
        name,
        content,
        mood,
        fontFamily,
        fontSize,
        tags
      });
    }

    if (sqliteReady) {
      const id = dbManager.saveEntry(name, content, mood, fontFamily, fontSize, tags);
      return dbManager.getEntryById(id);
    }
    
    const entries = StorageManager.getEntries();
    const now = new Date().toISOString();
    const wordCount = StorageManager.countWords(content);
    
    const newEntry = {
      id: StorageManager.generateId(),
      name,
      content,
      mood,
      wordCount,
      fontFamily,
      fontSize,
      tags: Array.isArray(tags) ? tags : [],
      favorite: false,
      createdAt: now,
      updatedAt: now,
      date: now // Keep for backward compatibility
    };
    
    entries.push(newEntry);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    
    // Update streaks
    StorageManager.updateStreaks();
    
    return newEntry;
  }

  static updateEntry(indexOrId, name, content, mood, fontFamily = '', fontSize = '', tags = null) {
    if (isElectron) {
      const id = typeof indexOrId === 'number'
        ? StorageManager.getEntries()[indexOrId]?.id
        : indexOrId;
      if (id) {
        return window.electronAPI.nativeDb.updateEntry({
          id,
          name,
          content,
          mood,
          fontFamily,
          fontSize,
          tags
        });
      }
      return null;
    }

    if (sqliteReady) {
      // For SQLite, indexOrId should be the entry ID
      const id = typeof indexOrId === 'number' 
        ? StorageManager.getEntries()[indexOrId]?.id 
        : indexOrId;
      if (id) {
        dbManager.updateEntry(id, name, content, mood, fontFamily, fontSize, tags || []);
        return dbManager.getEntryById(id);
      }
      return null;
    }
    
    const entries = StorageManager.getEntries();
    let index = typeof indexOrId === 'number' ? indexOrId : StorageManager.getEntryIndexById(indexOrId);
    
    if (index >= 0 && index < entries.length) {
      const existing = entries[index];
      const wordCount = StorageManager.countWords(content);
      const now = new Date().toISOString();
      
      entries[index] = {
        ...existing,
        name,
        content,
        mood: mood !== undefined ? mood : (existing.mood || ''),
        wordCount,
        fontFamily: fontFamily || existing.fontFamily,
        fontSize: fontSize || existing.fontSize,
        tags: tags !== null ? tags : (existing.tags || []),
        updatedAt: now,
        date: now
      };
      
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      return entries[index];
    }
    return null;
  }

  static deleteEntry(indexOrId) {
    if (isElectron) {
      const id = typeof indexOrId === 'number'
        ? StorageManager.getEntries()[indexOrId]?.id
        : indexOrId;
      if (id) {
        return window.electronAPI.nativeDb.deleteEntry(id);
      }
      return false;
    }

    if (sqliteReady) {
      const id = typeof indexOrId === 'number' 
        ? StorageManager.getEntries()[indexOrId]?.id 
        : indexOrId;
      if (id) {
        return dbManager.deleteEntry(id);
      }
      return false;
    }
    
    const entries = StorageManager.getEntries();
    let index = typeof indexOrId === 'number' ? indexOrId : StorageManager.getEntryIndexById(indexOrId);
    
    if (index >= 0 && index < entries.length) {
      entries.splice(index, 1);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      return true;
    }
    return false;
  }

  // Toggle favorite status
  static toggleFavorite(indexOrId) {
    if (isElectron) {
      const id = typeof indexOrId === 'number'
        ? StorageManager.getEntries()[indexOrId]?.id
        : indexOrId;
      if (id) {
        return window.electronAPI.nativeDb.toggleFavorite(id);
      }
      return false;
    }

    if (sqliteReady) {
      const id = typeof indexOrId === 'number' 
        ? StorageManager.getEntries()[indexOrId]?.id 
        : indexOrId;
      if (id) {
        return dbManager.toggleFavorite(id);
      }
      return false;
    }
    
    const entries = StorageManager.getEntries();
    let index = typeof indexOrId === 'number' ? indexOrId : StorageManager.getEntryIndexById(indexOrId);
    
    if (index >= 0 && index < entries.length) {
      entries[index].favorite = !entries[index].favorite;
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      return entries[index].favorite;
    }
    return false;
  }

  // Tag management
  static addTag(indexOrId, tag) {
    if (isElectron) {
      const entry = StorageManager._resolveEntry(indexOrId);
      if (!entry) return [];
      const normalizedTag = tag.toLowerCase().trim();
      const tags = Array.isArray(entry.tags) ? [...entry.tags] : [];
      if (!tags.includes(normalizedTag)) {
        tags.push(normalizedTag);
        window.electronAPI.nativeDb.updateEntry({
          id: entry.id,
          name: entry.name,
          content: entry.content,
          mood: entry.mood,
          fontFamily: entry.fontFamily || '',
          fontSize: entry.fontSize || '',
          tags
        });
      }
      return tags;
    }

    if (sqliteReady) {
      const entry = StorageManager._resolveEntry(indexOrId);
      if (!entry) return [];
      const normalizedTag = tag.toLowerCase().trim();
      const tags = Array.isArray(entry.tags) ? [...entry.tags] : [];
      if (!tags.includes(normalizedTag)) {
        tags.push(normalizedTag);
        dbManager.updateEntry(
          entry.id,
          entry.name,
          entry.content,
          entry.mood,
          entry.fontFamily || '',
          entry.fontSize || '',
          tags
        );
      }
      return tags;
    }

    const entries = StorageManager.getEntries();
    let index = typeof indexOrId === 'number' ? indexOrId : StorageManager.getEntryIndexById(indexOrId);
    
    if (index >= 0 && index < entries.length) {
      if (!entries[index].tags) entries[index].tags = [];
      const normalizedTag = tag.toLowerCase().trim();
      if (!entries[index].tags.includes(normalizedTag)) {
        entries[index].tags.push(normalizedTag);
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      }
      return entries[index].tags;
    }
    return [];
  }

  static removeTag(indexOrId, tag) {
    if (isElectron) {
      const entry = StorageManager._resolveEntry(indexOrId);
      if (!entry) return [];
      const normalizedTag = tag.toLowerCase().trim();
      const existingTags = Array.isArray(entry.tags) ? entry.tags : [];
      const tags = existingTags.filter(t => t !== normalizedTag);
      if (tags.length !== existingTags.length) {
        window.electronAPI.nativeDb.updateEntry({
          id: entry.id,
          name: entry.name,
          content: entry.content,
          mood: entry.mood,
          fontFamily: entry.fontFamily || '',
          fontSize: entry.fontSize || '',
          tags
        });
      }
      return tags;
    }

    if (sqliteReady) {
      const entry = StorageManager._resolveEntry(indexOrId);
      if (!entry) return [];
      const normalizedTag = tag.toLowerCase().trim();
      const existingTags = Array.isArray(entry.tags) ? entry.tags : [];
      const tags = existingTags.filter(t => t !== normalizedTag);
      if (tags.length !== existingTags.length) {
        dbManager.updateEntry(
          entry.id,
          entry.name,
          entry.content,
          entry.mood,
          entry.fontFamily || '',
          entry.fontSize || '',
          tags
        );
      }
      return tags;
    }

    const entries = StorageManager.getEntries();
    let index = typeof indexOrId === 'number' ? indexOrId : StorageManager.getEntryIndexById(indexOrId);
    
    if (index >= 0 && index < entries.length) {
      const normalizedTag = tag.toLowerCase().trim();
      entries[index].tags = (entries[index].tags || []).filter(t => t !== normalizedTag);
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      return entries[index].tags;
    }
    return [];
  }

  // Get all unique tags across all entries
  static getAllTags() {
    const entries = StorageManager.getEntries();
    const tagSet = new Set();
    entries.forEach(e => {
      (e.tags || []).forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }

  // Streak calculation
  static updateStreaks() {
    const meta = StorageManager.getMeta();
    const entries = StorageManager.getEntries();
    const today = new Date().toISOString().split('T')[0];
    
    // Get unique dates with entries
    const entryDates = new Set(entries.map(e => e.createdAt.split('T')[0]));
    const sortedDates = Array.from(entryDates).sort().reverse();
    
    if (sortedDates.length === 0) {
      meta.currentStreak = 0;
      meta.lastEntryDate = null;
    } else {
      // Calculate current streak
      let streak = 0;
      let checkDate = new Date(today);
      
      // If no entry today, start from yesterday
      if (!entryDates.has(today)) {
        const yesterday = new Date(checkDate);
        yesterday.setDate(yesterday.getDate() - 1);
        if (!entryDates.has(yesterday.toISOString().split('T')[0])) {
          streak = 0;
        } else {
          checkDate = yesterday;
        }
      }
      
      if (streak === 0 && entryDates.has(checkDate.toISOString().split('T')[0])) {
        streak = 1;
        let prevDate = new Date(checkDate);
        prevDate.setDate(prevDate.getDate() - 1);
        
        while (entryDates.has(prevDate.toISOString().split('T')[0])) {
          streak++;
          prevDate.setDate(prevDate.getDate() - 1);
        }
      }
      
      meta.currentStreak = streak;
      meta.lastEntryDate = sortedDates[0];
      meta.longestStreak = Math.max(meta.longestStreak || 0, streak);
    }
    
    meta.totalEntries = entries.length;
    StorageManager.saveMeta(meta);
    return meta;
  }

  // Statistics
  static getStats() {
    const entries = StorageManager.getEntries();
    const meta = StorageManager.updateStreaks();
    
    const totalWords = entries.reduce((sum, e) => sum + (e.wordCount || 0), 0);
    const avgWords = entries.length > 0 ? Math.round(totalWords / entries.length) : 0;
    
    // Mood distribution
    const moodCounts = {};
    entries.forEach(e => {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      }
    });
    
    // Entries by month
    const monthlyEntries = {};
    entries.forEach(e => {
      const month = e.createdAt.substring(0, 7); // YYYY-MM
      monthlyEntries[month] = (monthlyEntries[month] || 0) + 1;
    });
    
    return {
      totalEntries: entries.length,
      totalWords,
      avgWords,
      currentStreak: meta.currentStreak,
      longestStreak: meta.longestStreak,
      moodCounts,
      monthlyEntries,
      favoriteCount: entries.filter(e => e.favorite).length
    };
  }

  // Daily mood helpers
  static getTodaysMood() {
    if (isElectron) {
      return window.electronAPI.nativeDb.getTodaysMood();
    }

    if (sqliteReady) {
      return dbManager.getTodaysMood();
    }

    const data = JSON.parse(localStorage.getItem(DAILY_MOOD_KEY) || '{}');
    const today = new Date().toISOString().split('T')[0];
    return data[today]?.mood || null;
  }

  static setTodaysMood(mood) {
    if (isElectron) {
      return window.electronAPI.nativeDb.setTodaysMood(mood);
    }

    if (sqliteReady) {
      dbManager.setTodaysMood(mood);
      return;
    }

    const data = JSON.parse(localStorage.getItem(DAILY_MOOD_KEY) || '{}');
    const today = new Date().toISOString().split('T')[0];
    data[today] = {
      mood,
      timestamp: new Date().toISOString()
    };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    Object.keys(data).forEach(date => {
      if (date < cutoffStr) delete data[date];
    });

    localStorage.setItem(DAILY_MOOD_KEY, JSON.stringify(data));
  }

  static getMoodHistory(days = 30) {
    if (isElectron) {
      const rows = window.electronAPI.nativeDb.getMoodHistory(days) || [];
      const moodMap = {};
      rows.forEach(row => {
        moodMap[row.date] = row;
      });
      return buildMoodHistory(days, moodMap);
    }

    if (sqliteReady) {
      const rows = dbManager.getMoodHistory(days) || [];
      const moodMap = {};
      rows.forEach(row => {
        moodMap[row.date] = row;
      });
      return buildMoodHistory(days, moodMap);
    }

    const data = JSON.parse(localStorage.getItem(DAILY_MOOD_KEY) || '{}');
    return buildMoodHistory(days, data);
  }

  // Export entries to JSON format (v2)
  static generateExportContent(selectedIndices = null) {
    if (isElectron) {
      return window.electronAPI.nativeDb.exportToJSON();
    }

    const entries = StorageManager.getEntries();
    const toExport = (selectedIndices === null)
      ? entries
      : selectedIndices.map(index => entries[index]);

    let dailyMoods = [];
    try {
      const moodData = JSON.parse(localStorage.getItem(DAILY_MOOD_KEY) || '{}');
      dailyMoods = Object.entries(moodData).map(([date, value]) => ({
        date,
        mood: value?.mood || value || '',
        timestamp: value?.timestamp || null
      })).filter(item => item.mood);
    } catch (e) {
      dailyMoods = [];
    }
    
    const exportData = {
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      entries: toExport,
      dailyMoods
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Legacy text export format for backward compatibility
  static generateExportContentLegacy(selectedIndices = null) {
    const entries = StorageManager.getEntries();
    const toExport = (selectedIndices === null)
      ? entries
      : selectedIndices.map(index => entries[index]);
    let content = '';
    toExport.forEach(entry => {
      content += `---ENTRY---\n`;
      content += `ID: ${entry.id}\n`;
      content += `Date: ${entry.createdAt || entry.date}\n`;
      content += `Caption: ${entry.name}\n`;
      content += `Mood: ${entry.mood || ''}\n`;
      content += `Tags: ${(entry.tags || []).join(', ')}\n`;
      content += `Favorite: ${entry.favorite || false}\n`;
      content += `WordCount: ${entry.wordCount || StorageManager.countWords(entry.content)}\n`;
      content += `Content:\n${entry.content}\n`;
      content += `---END ENTRY---\n\n`;
    });
    return content;
  }

  // Import entries from JSON or legacy format
  static async importEntries(fileContent) {
    let importedCount = 0;
    
    // Try JSON format first
    try {
      const data = JSON.parse(fileContent);
      if (data.entries && Array.isArray(data.entries)) {
        if (isElectron) {
          const count = await window.electronAPI.nativeDb.importFromJSON(fileContent);
          StorageManager.updateStreaks();
          return count;
        }

        if (sqliteReady) {
          const count = await dbManager.importFromJSON(fileContent);
          StorageManager.updateStreaks();
          return count;
        }

        data.entries.forEach(entry => {
          StorageManager.addImportedEntry(entry);
          importedCount++;
        });
        if (data.dailyMoods) {
          const moodMap = {};
          if (Array.isArray(data.dailyMoods)) {
            data.dailyMoods.forEach(item => {
              if (!item?.date || !item?.mood) return;
              moodMap[item.date] = {
                mood: item.mood,
                timestamp: item.timestamp || new Date(`${item.date}T00:00:00Z`).toISOString()
              };
            });
          } else if (typeof data.dailyMoods === 'object') {
            Object.entries(data.dailyMoods).forEach(([date, value]) => {
              if (!value) return;
              moodMap[date] = {
                mood: value.mood || value,
                timestamp: value.timestamp || new Date(`${date}T00:00:00Z`).toISOString()
              };
            });
          }
          try {
            localStorage.setItem(DAILY_MOOD_KEY, JSON.stringify(moodMap));
          } catch (e) {
            console.warn('[Storage] Failed to import daily moods:', e);
          }
        }
        StorageManager.updateStreaks();
        return importedCount;
      }
    } catch (e) {
      // Not JSON, try legacy format
    }
    
    // Legacy text format
    const blocks = fileContent.split('---ENTRY---');
    const legacyEntries = [];
    blocks.forEach(block => {
      if (block.includes('---END ENTRY---')) {
        const contentBlock = block.split('---END ENTRY---')[0].trim();
        const lines = contentBlock.split('\n');
        
        const parseField = (prefix) => {
          const line = lines.find(l => l.startsWith(prefix));
          return line ? line.replace(prefix, '').trim() : '';
        };
        
        const contentIdx = lines.findIndex(l => l.trim() === 'Content:');
        const content = contentIdx >= 0 ? lines.slice(contentIdx + 1).join('\n').trim() : '';
        
        if (content) {
          const entry = {
            name: parseField('Caption:'),
            content,
            mood: parseField('Mood:'),
            tags: parseField('Tags:').split(',').map(t => t.trim()).filter(Boolean),
            favorite: parseField('Favorite:') === 'true',
            createdAt: parseField('Date:') || new Date().toISOString()
          };
          legacyEntries.push(entry);
        }
      }
    });

    if (isElectron) {
      const exportData = {
        version: STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        entries: legacyEntries
      };
      const count = await window.electronAPI.nativeDb.importFromJSON(JSON.stringify(exportData));
      StorageManager.updateStreaks();
      return count;
    }

    if (sqliteReady) {
      const exportData = {
        version: STORAGE_VERSION,
        exportedAt: new Date().toISOString(),
        entries: legacyEntries
      };
      const count = await dbManager.importFromJSON(JSON.stringify(exportData));
      StorageManager.updateStreaks();
      return count;
    }

    legacyEntries.forEach(entry => {
      StorageManager.addImportedEntry(entry);
      importedCount++;
    });
    
    StorageManager.updateStreaks();
    return importedCount;
  }

  // Add imported entry with proper format
  static addImportedEntry(entryData) {
    const entries = StorageManager.getEntries();
    const now = new Date().toISOString();
    
    // Handle both object format and legacy parameters
    const entry = typeof entryData === 'object' ? {
      id: entryData.id || StorageManager.generateId(),
      name: entryData.name || entryData.caption || 'Untitled',
      content: entryData.content || '',
      mood: entryData.mood || '',
      wordCount: entryData.wordCount || StorageManager.countWords(entryData.content || ''),
      fontFamily: entryData.fontFamily || '',
      fontSize: entryData.fontSize || '',
      tags: entryData.tags || [],
      favorite: entryData.favorite || false,
      createdAt: entryData.createdAt || entryData.date || now,
      updatedAt: entryData.updatedAt || now,
      date: entryData.date || entryData.createdAt || now
    } : entryData;
    
    // Check for duplicate by ID
    const existingIdx = entries.findIndex(e => e.id === entry.id);
    if (existingIdx >= 0) {
      // Update existing
      entries[existingIdx] = { ...entries[existingIdx], ...entry };
    } else {
      entries.push(entry);
    }
    
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    return entry;
  }

  // Helper to count words in content
  static countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  // Search entries
  static searchEntries(query, options = {}) {
    const entries = StorageManager.getEntries();
    const q = query.toLowerCase();
    
    return entries.filter(entry => {
      const matchesText = !query || 
        (entry.name && entry.name.toLowerCase().includes(q)) ||
        (entry.content && entry.content.toLowerCase().includes(q));
      
      const matchesTags = !options.tags || options.tags.length === 0 ||
        options.tags.some(tag => (entry.tags || []).includes(tag.toLowerCase()));
      
      const matchesMood = !options.mood ||
        (entry.mood && entry.mood.toLowerCase() === options.mood.toLowerCase());
      
      const matchesFavorite = !options.favoritesOnly || entry.favorite;
      
      const entryDate = new Date(entry.createdAt);
      const matchesDateFrom = !options.dateFrom || entryDate >= new Date(options.dateFrom);
      const matchesDateTo = !options.dateTo || entryDate <= new Date(options.dateTo);
      
      return matchesText && matchesTags && matchesMood && matchesFavorite && matchesDateFrom && matchesDateTo;
    });
  }

  // Get storage info
  static async getStorageInfo() {
    if (isElectron) {
      return window.electronAPI.nativeDb.getStorageInfo();
    }

    if (sqliteReady) {
      return dbManager.getStorageInfo();
    }
    
    // localStorage fallback
    const entries = StorageManager.getEntries();
    let totalSize = 0;
    let imagesCount = 0;
    
    // Estimate localStorage size
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length * 2; // UTF-16 chars = 2 bytes each
      }
    }
    
    // Count images in entries
    entries.forEach(entry => {
      const matches = (entry.content || '').match(/data:image\/[^;]+;base64,[^"]+/g);
      if (matches) {
        imagesCount += matches.length;
      }
    });
    
    return {
      entriesCount: entries.length,
      totalSize,
      sizeFormatted: StorageManager.formatBytes(totalSize),
      imagesCount,
      imagesSize: 0
    };
  }

  // Format bytes to human readable
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Clear all data
  static async clearAllData() {
    if (isElectron) {
      await window.electronAPI.nativeDb.clearAllData();
      localStorage.removeItem(ENTRIES_KEY);
      localStorage.removeItem(META_KEY);
      localStorage.removeItem(DAILY_MOOD_KEY);
      localStorage.removeItem(NATIVE_DB_MIGRATION_KEY);
    } else if (sqliteReady) {
      await dbManager.clearAllData();
    } else {
      localStorage.removeItem(ENTRIES_KEY);
      localStorage.removeItem(META_KEY);
      localStorage.removeItem(DAILY_MOOD_KEY);
    }
  }

  // Export to JSON (uses SQLite if available)
  static exportToJSON() {
    if (isElectron) {
      return window.electronAPI.nativeDb.exportToJSON();
    }

    if (sqliteReady) {
      return dbManager.exportToJSON();
    }
    return StorageManager.generateExportContent();
  }

  // Import from JSON (uses SQLite if available)  
  static async importFromJSON(jsonString) {
    if (isElectron) {
      const count = await window.electronAPI.nativeDb.importFromJSON(jsonString);
      StorageManager.updateStreaks();
      return count;
    }

    if (sqliteReady) {
      const count = await dbManager.importFromJSON(jsonString);
      StorageManager.updateStreaks();
      return count;
    }
    const count = await StorageManager.importEntries(jsonString);
    StorageManager.updateStreaks();
    return count;
  }

  // ==================== File Storage (.simnote files) ====================

  // Check if file storage is enabled
  static isFileStorageEnabled() {
    if (isElectron) {
      return true;
    }

    if (sqliteReady) {
      return dbManager.fileStorageEnabled;
    }
    return false;
  }

  // Check if File System Access API is supported (browser only)
  static isFileStorageSupported() {
    return 'showDirectoryPicker' in window || (typeof window !== 'undefined' && window.electronAPI);
  }

  // Enable file storage by selecting a directory (browser) or auto-enable (Electron)
  static async enableFileStorage() {
    if (isElectron) {
      return true;
    }

    if (sqliteReady) {
      return dbManager.selectFileStorageDirectory();
    }
    return false;
  }

  // Get file storage directory name
  static async getFileStorageDirectory() {
    if (typeof window !== 'undefined' && window.electronAPI?.getStorageDir) {
      return window.electronAPI.getStorageDir();
    }
    // For browser, we'd need to access the browserFileStorage
    if (sqliteReady && dbManager.fileStorageEnabled) {
      try {
        const module = await import('./fileStorageBrowser.js');
        return module.browserFileStorage.getDirectoryName();
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Sync all entries to file storage
  static async syncAllToFiles() {
    if (isElectron) {
      const entries = StorageManager.getEntries();
      if (typeof window !== 'undefined' && window.electronAPI?.syncAllEntries) {
        return window.electronAPI.syncAllEntries(entries);
      }
      return 0;
    }

    if (!sqliteReady) return 0;
    
    const entries = StorageManager.getEntries();
    
    if (typeof window !== 'undefined' && window.electronAPI?.syncAllEntries) {
      return window.electronAPI.syncAllEntries(entries);
    }
    
    try {
      const module = await import('./fileStorageBrowser.js');
      if (module.browserFileStorage.isEnabled) {
        return module.browserFileStorage.syncAllEntries(entries);
      }
    } catch (e) {
      console.warn('[Storage] File sync failed:', e);
    }
    return 0;
  }
}
