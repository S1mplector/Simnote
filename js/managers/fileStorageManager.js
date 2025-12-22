// fileStorageManager.js (CommonJS style for Electron)
// Handles .simnote file persistence with full metadata

const fs = require('fs');
const path = require('path');

const SIMNOTE_EXTENSION = '.simnote';
const SIMNOTE_VERSION = 1;

class FileStorageManager {
  constructor(storageDir) {
    this.storageDir = storageDir;
    // Ensure the storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  // Generate a safe filename from entry name and id
  _generateFilename(entry) {
    const safeName = (entry.name || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    return `${safeName}-${entry.id}${SIMNOTE_EXTENSION}`;
  }

  // Convert entry to .simnote file format
  _entryToSimnote(entry) {
    return {
      simnoteVersion: SIMNOTE_VERSION,
      id: entry.id,
      name: entry.name || '',
      content: entry.content || '',
      mood: entry.mood || '',
      tags: entry.tags || [],
      favorite: entry.favorite || false,
      wordCount: entry.wordCount || 0,
      fontFamily: entry.fontFamily || '',
      fontSize: entry.fontSize || '',
      createdAt: entry.createdAt || entry.date || new Date().toISOString(),
      updatedAt: entry.updatedAt || new Date().toISOString(),
      exportedAt: new Date().toISOString()
    };
  }

  // Convert .simnote file content back to entry
  _simnoteToEntry(simnoteData) {
    return {
      id: simnoteData.id,
      name: simnoteData.name || '',
      content: simnoteData.content || '',
      mood: simnoteData.mood || '',
      tags: simnoteData.tags || [],
      favorite: simnoteData.favorite || false,
      wordCount: simnoteData.wordCount || 0,
      fontFamily: simnoteData.fontFamily || '',
      fontSize: simnoteData.fontSize || '',
      createdAt: simnoteData.createdAt,
      updatedAt: simnoteData.updatedAt,
      date: simnoteData.createdAt // backward compatibility
    };
  }

  // Return an array of entry objects read from .simnote files
  getEntries() {
    const entries = [];
    const files = fs.readdirSync(this.storageDir);
    files.forEach((file) => {
      if (path.extname(file) === SIMNOTE_EXTENSION) {
        const filePath = path.join(this.storageDir, file);
        const data = fs.readFileSync(filePath, 'utf8');
        try {
          const simnoteData = JSON.parse(data);
          entries.push(this._simnoteToEntry(simnoteData));
        } catch (err) {
          console.error('[FileStorage] Error parsing:', filePath, err);
        }
      }
    });
    // Sort entries by createdAt descending
    return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get entry by ID
  getEntryById(id) {
    const entries = this.getEntries();
    return entries.find(e => e.id === id) || null;
  }

  // Save a new entry as .simnote file
  saveEntry(entry) {
    const simnoteData = this._entryToSimnote(entry);
    const filename = this._generateFilename(entry);
    const filePath = path.join(this.storageDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(simnoteData, null, 2), 'utf8');
    console.log(`[FileStorage] Saved: ${filename}`);
    return filename;
  }

  // Update an existing entry - find by ID and rewrite
  updateEntry(entry) {
    // First, try to find and delete the old file
    this.deleteEntryById(entry.id);
    // Save with updated content
    return this.saveEntry(entry);
  }

  // Delete entry by ID (finds the file first)
  deleteEntryById(id) {
    const files = fs.readdirSync(this.storageDir);
    for (const file of files) {
      if (path.extname(file) === SIMNOTE_EXTENSION && file.includes(id)) {
        const filePath = path.join(this.storageDir, file);
        fs.unlinkSync(filePath);
        console.log(`[FileStorage] Deleted: ${file}`);
        return true;
      }
    }
    return false;
  }

  // Sync all entries from database to files
  syncAllEntries(entries) {
    let synced = 0;
    for (const entry of entries) {
      try {
        this.saveEntry(entry);
        synced++;
      } catch (err) {
        console.error(`[FileStorage] Failed to sync entry ${entry.id}:`, err);
      }
    }
    console.log(`[FileStorage] Synced ${synced}/${entries.length} entries to disk`);
    return synced;
  }

  // Get storage directory path
  getStorageDir() {
    return this.storageDir;
  }

  // Get list of all .simnote files
  listFiles() {
    const files = fs.readdirSync(this.storageDir);
    return files.filter(f => path.extname(f) === SIMNOTE_EXTENSION);
  }
}

// Export with module.exports
module.exports = { FileStorageManager, SIMNOTE_EXTENSION, SIMNOTE_VERSION };
