// nativeDbManager.js
// Native SQLite persistence for Electron main process

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_FILENAME = 'simnote.db';
const DB_VERSION = 1;

const ENTRY_SELECT = `
  SELECT
    id,
    name,
    content,
    mood,
    tags,
    favorite,
    word_count AS wordCount,
    font_family AS fontFamily,
    font_size AS fontSize,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM entries
`;

class NativeDbManager {
  constructor(storageDir) {
    this.storageDir = storageDir;
    this.dbPath = path.join(storageDir, DB_FILENAME);
    this.db = null;
    this._open();
  }

  _open() {
    if (this.db) return;

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this._createTables();
    this._ensureVersion();
  }

  _createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT,
        mood TEXT,
        tags TEXT,
        favorite INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        font_family TEXT,
        font_size TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_moods (
        date TEXT PRIMARY KEY,
        mood TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);
  }

  _ensureVersion() {
    this.setMetadata('version', DB_VERSION);
  }

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _countWords(text) {
    if (!text) return 0;
    const plainText = text.replace(/<[^>]*>/g, ' ');
    return plainText.trim().split(/\s+/).filter(Boolean).length;
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  _normalizeTags(tags) {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }
    return [];
  }

  _hydrateEntry(row) {
    if (!row) return null;
    const entry = { ...row };
    try {
      entry.tags = JSON.parse(entry.tags || '[]');
    } catch {
      entry.tags = [];
    }
    entry.favorite = !!entry.favorite;
    entry.wordCount = Number(entry.wordCount) || 0;
    entry.fontFamily = entry.fontFamily || '';
    entry.fontSize = entry.fontSize || '';
    entry.date = entry.createdAt;
    return entry;
  }

  getEntryCount() {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM entries').get();
    return row?.count || 0;
  }

  getEntries() {
    const rows = this.db.prepare(`${ENTRY_SELECT} ORDER BY created_at DESC`).all();
    return rows.map((row) => this._hydrateEntry(row));
  }

  getEntryById(id) {
    if (!id) return null;
    const row = this.db.prepare(`${ENTRY_SELECT} WHERE id = ?`).get(id);
    return this._hydrateEntry(row);
  }

  saveEntry(entry) {
    const now = new Date().toISOString();
    const id = this._generateId();
    const content = entry?.content || '';
    const tags = this._normalizeTags(entry?.tags);

    const newEntry = {
      id,
      name: entry?.name || 'Untitled',
      content,
      mood: entry?.mood || '',
      tags,
      favorite: false,
      wordCount: entry?.wordCount ?? this._countWords(content),
      fontFamily: entry?.fontFamily || '',
      fontSize: entry?.fontSize || '',
      createdAt: now,
      updatedAt: now,
      date: now
    };

    this.db.prepare(`
      INSERT INTO entries
        (id, name, content, mood, tags, favorite, word_count, font_family, font_size, created_at, updated_at)
      VALUES
        (@id, @name, @content, @mood, @tags, @favorite, @wordCount, @fontFamily, @fontSize, @createdAt, @updatedAt)
    `).run({
      ...newEntry,
      tags: JSON.stringify(newEntry.tags),
      favorite: newEntry.favorite ? 1 : 0
    });

    return newEntry;
  }

  updateEntry(entry) {
    if (!entry?.id) return null;

    const existing = this.getEntryById(entry.id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const content = entry.content ?? existing.content;
    const tags = entry.tags !== null && entry.tags !== undefined
      ? this._normalizeTags(entry.tags)
      : (existing.tags || []);

    const updatedEntry = {
      id: entry.id,
      name: entry.name ?? existing.name,
      content,
      mood: entry.mood !== undefined ? entry.mood : existing.mood,
      tags,
      favorite: existing.favorite,
      wordCount: this._countWords(content),
      fontFamily: entry.fontFamily || existing.fontFamily || '',
      fontSize: entry.fontSize || existing.fontSize || '',
      createdAt: existing.createdAt,
      updatedAt: now,
      date: existing.createdAt
    };

    this.db.prepare(`
      UPDATE entries SET
        name = @name,
        content = @content,
        mood = @mood,
        tags = @tags,
        word_count = @wordCount,
        font_family = @fontFamily,
        font_size = @fontSize,
        updated_at = @updatedAt
      WHERE id = @id
    `).run({
      ...updatedEntry,
      tags: JSON.stringify(updatedEntry.tags)
    });

    return updatedEntry;
  }

  deleteEntry(id) {
    if (!id) return false;
    const result = this.db.prepare('DELETE FROM entries WHERE id = ?').run(id);
    return result.changes > 0;
  }

  toggleFavorite(id) {
    if (!id) return false;
    const entry = this.getEntryById(id);
    if (!entry) return false;

    const newFavorite = entry.favorite ? 0 : 1;
    this.db.prepare('UPDATE entries SET favorite = ? WHERE id = ?').run(newFavorite, id);
    return newFavorite === 1;
  }

  getMetadata(key) {
    const row = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(key);
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  setMetadata(key, value) {
    this.db.prepare(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
    ).run(key, JSON.stringify(value));
  }

  getTodaysMood() {
    const today = new Date().toISOString().split('T')[0];
    const row = this.db.prepare('SELECT mood FROM daily_moods WHERE date = ?').get(today);
    return row?.mood || null;
  }

  setTodaysMood(mood) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT OR REPLACE INTO daily_moods (date, mood, timestamp) VALUES (?, ?, ?)'
    ).run(today, mood, now);
    return true;
  }

  getMoodHistory(days = 30) {
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const startDate = start.toISOString().split('T')[0];

    return this.db.prepare(
      'SELECT date, mood, timestamp FROM daily_moods WHERE date >= ? ORDER BY date DESC'
    ).all(startDate);
  }

  getStorageInfo() {
    const info = {
      entriesCount: 0,
      totalSize: 0,
      sizeFormatted: '0 KB',
      imagesCount: 0,
      imagesSize: 0
    };

    info.entriesCount = this.getEntryCount();

    if (fs.existsSync(this.dbPath)) {
      const stats = fs.statSync(this.dbPath);
      info.totalSize = stats.size;
      info.sizeFormatted = this._formatBytes(stats.size);
    }

    const entries = this.getEntries();
    entries.forEach((entry) => {
      const matches = (entry.content || '').match(/data:image\/[^;]+;base64,[^"]+/g);
      if (matches) {
        info.imagesCount += matches.length;
        matches.forEach((m) => {
          info.imagesSize += m.length * 0.75;
        });
      }
    });

    return info;
  }

  exportToJSON() {
    const entries = this.getEntries();
    const dailyMoods = this.db
      .prepare('SELECT date, mood, timestamp FROM daily_moods')
      .all();

    return JSON.stringify({
      version: 2,
      exportDate: new Date().toISOString(),
      entries,
      dailyMoods
    }, null, 2);
  }

  importFromJSON(jsonString) {
    const data = JSON.parse(jsonString);
    const entries = Array.isArray(data.entries) ? data.entries : [];
    let count = 0;

    const upsertEntry = this.db.prepare(`
      INSERT INTO entries
        (id, name, content, mood, tags, favorite, word_count, font_family, font_size, created_at, updated_at)
      VALUES
        (@id, @name, @content, @mood, @tags, @favorite, @wordCount, @fontFamily, @fontSize, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        content = excluded.content,
        mood = excluded.mood,
        tags = excluded.tags,
        favorite = excluded.favorite,
        word_count = excluded.word_count,
        font_family = excluded.font_family,
        font_size = excluded.font_size,
        updated_at = excluded.updated_at
    `);

    const selectExisting = this.db.prepare(
      'SELECT updated_at AS updatedAt, created_at AS createdAt FROM entries WHERE id = ?'
    );

    const upsertMood = this.db.prepare(
      'INSERT OR REPLACE INTO daily_moods (date, mood, timestamp) VALUES (?, ?, ?)'
    );

    const tx = this.db.transaction(() => {
      entries.forEach((entry) => {
        const id = entry.id || this._generateId();
        const existing = selectExisting.get(id);
        const existingUpdatedAt = existing?.updatedAt ? Date.parse(existing.updatedAt) : NaN;
        const incomingUpdatedAt = entry?.updatedAt ? Date.parse(entry.updatedAt) : NaN;
        const hasIncomingDate = Number.isFinite(incomingUpdatedAt);
        const hasExistingDate = Number.isFinite(existingUpdatedAt);
        const shouldUpsert = !existing || (hasIncomingDate && (!hasExistingDate || incomingUpdatedAt > existingUpdatedAt));

        if (!shouldUpsert) return;

        const now = new Date().toISOString();
        const createdAt = existing?.createdAt || entry.createdAt || entry.date || now;
        const updatedAt = entry.updatedAt || entry.date || entry.createdAt || now;
        const content = entry.content || '';
        const tags = this._normalizeTags(entry.tags);
        const favorite = entry.favorite === true || entry.favorite === 'true' ? 1 : 0;
        const wordCount = entry.wordCount ?? this._countWords(content);

        upsertEntry.run({
          id,
          name: entry.name || entry.caption || 'Untitled',
          content,
          mood: entry.mood || '',
          tags: JSON.stringify(tags),
          favorite,
          wordCount,
          fontFamily: entry.fontFamily || '',
          fontSize: entry.fontSize || '',
          createdAt,
          updatedAt
        });

        count++;
      });

      if (data.dailyMoods) {
        let dailyMoods = [];
        if (Array.isArray(data.dailyMoods)) {
          dailyMoods = data.dailyMoods;
        } else if (typeof data.dailyMoods === 'object') {
          dailyMoods = Object.entries(data.dailyMoods).map(([date, value]) => ({
            date,
            mood: value?.mood || value || '',
            timestamp: value?.timestamp || null
          }));
        }

        dailyMoods.forEach((item) => {
          if (!item?.date || !item?.mood) return;
          const timestamp = item.timestamp || new Date(`${item.date}T00:00:00Z`).toISOString();
          upsertMood.run(item.date, item.mood, timestamp);
        });
      }
    });

    tx();
    return count;
  }

  clearAllData() {
    this.db.exec(`
      DELETE FROM entries;
      DELETE FROM daily_moods;
      DELETE FROM metadata WHERE key != 'version';
    `);
  }
}

module.exports = { NativeDbManager, DB_FILENAME };
