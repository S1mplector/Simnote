// fileStorageManager.js (CommonJS style for Electron)
// Handles .simnote file persistence with full metadata
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module provides file-based storage for Electron desktop app.
// Uses Node.js fs module for direct file system access. Features:
// - .simnote JSON file format for entries
// - Audio asset extraction and external file storage
// - Automatic directory creation
// - Batch sync operations
//
// FILE FORMAT:
// - Extension: .simnote
// - Content: JSON with entry data, metadata, and audio file references
// - Filename: sanitized-name-entryid.simnote
//
// AUDIO HANDLING:
// - Base64 audio data in content is extracted to separate files
// - Audio stored in audio/{entryId}/ subdirectory
// - Content updated to reference external files
//
// DEPENDENCIES:
// - Node.js fs module
// - Node.js path module

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/** @constant {string} File extension for simnote files */
const SIMNOTE_EXTENSION = '.simnote';
/** @constant {number} Current file format version */
const SIMNOTE_VERSION = 1;
/** @constant {string} Subdirectory name for audio files */
const AUDIO_DIR_NAME = 'audio';
/** @constant {RegExp} Pattern to match inline base64 audio data */
const AUDIO_DATA_ATTR_REGEX = /data-audio-data=(["'])(data:audio\/[^"']+)\1/g;

/**
 * File-based storage manager for Electron desktop app.
 * Stores entries as .simnote JSON files with external audio assets.
 * 
 * @class FileStorageManager
 */
class FileStorageManager {
  /**
   * Creates FileStorageManager for specified directory.
   * 
   * @param {string} storageDir - Path to storage directory
   * @constructor
   */
  constructor(storageDir) {
    /** @type {string} Storage directory path */
    this.storageDir = storageDir;
    this.storageRoot = path.resolve(storageDir);
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Generates a fallback entry ID when missing.
   * @returns {string}
   * @private
   */
  _generateFallbackId() {
    return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Ensures the entry has an ID.
   * @param {Object} entry - Entry object
   * @returns {string} Entry ID
   * @private
   */
  _ensureEntryId(entry) {
    if (!entry || (!entry.id && entry.id !== 0)) {
      const fallbackId = this._generateFallbackId();
      if (entry) entry.id = fallbackId;
      return fallbackId;
    }
    return String(entry.id);
  }

  /**
   * Normalizes an entry ID for safe filenames.
   * @param {string|number} entryId - Entry ID
   * @returns {string} Safe filename component
   * @private
   */
  _normalizeEntryId(entryId) {
    const raw = String(entryId || '').trim();
    if (!raw) return this._generateFallbackId();
    return encodeURIComponent(raw);
  }

  /**
   * Normalizes entry names for filenames.
   * @param {string} entryName - Entry name
   * @returns {string} Safe filename component
   * @private
   */
  _normalizeEntryName(entryName) {
    const safeName = String(entryName || 'entry')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    return safeName || 'entry';
  }

  /**
   * Ensures a path stays inside the storage directory.
   * @param {string} targetPath - Path to validate
   * @returns {string} Resolved path
   * @private
   */
  _assertWithinStorageDir(targetPath) {
    const resolved = path.resolve(targetPath);
    if (resolved !== this.storageRoot && !resolved.startsWith(this.storageRoot + path.sep)) {
      throw new Error('Path escapes storage directory');
    }
    return resolved;
  }

  /**
   * Resolves a path within the storage directory.
   * @param {...string} segments - Path segments
   * @returns {string} Resolved path
   * @private
   */
  _resolveStoragePath(...segments) {
    const targetPath = path.resolve(this.storageRoot, ...segments);
    return this._assertWithinStorageDir(targetPath);
  }

  /**
   * Writes a file atomically to reduce corruption risk.
   * @param {string} filePath - Target path
   * @param {string|Buffer} data - File contents
   * @param {string} [encoding] - Encoding for string data
   * @private
   */
  _writeFileAtomic(filePath, data, encoding = 'utf8') {
    const dir = path.dirname(filePath);
    this._assertWithinStorageDir(dir);
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    if (typeof data === 'string') {
      fs.writeFileSync(tempPath, data, encoding);
    } else {
      fs.writeFileSync(tempPath, data);
    }
    fs.renameSync(tempPath, filePath);
  }

  /**
   * Validates relative audio paths for safety.
   * @param {string} audioPath - Relative audio path
   * @param {string} [entryId] - Optional entry ID for scoping
   * @returns {boolean}
   * @private
   */
  _isSafeAudioPath(audioPath, entryId = null) {
    if (!audioPath || typeof audioPath !== 'string') return false;
    const normalized = audioPath.replace(/\\/g, '/');
    if (normalized.includes('..')) return false;
    if (normalized.startsWith('/')) return false;
    if (/^[a-zA-Z]:/.test(normalized)) return false;
    if (!normalized.startsWith(`${AUDIO_DIR_NAME}/`)) return false;
    if (entryId) {
      const safeId = this._normalizeEntryId(entryId);
      return normalized.startsWith(`${AUDIO_DIR_NAME}/${safeId}/`);
    }
    return true;
  }

  /**
   * Generates safe filename from entry name and ID.
   * 
   * @param {Object} entry - Entry object
   * @returns {string} Safe filename
   * @private
   */
  _generateFilename(entry) {
    const safeName = this._normalizeEntryName(entry?.name);
    const safeId = this._normalizeEntryId(entry?.id);
    return `${safeName}-${safeId}${SIMNOTE_EXTENSION}`;
  }

  /**
   * Converts entry to .simnote file format.
   * 
   * @param {Object} entry - Entry object
   * @returns {Object} Simnote format object
   * @private
   */
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
      exportedAt: new Date().toISOString(),
      audioFiles: entry.audioFiles || []
    };
  }

  /**
   * Converts .simnote content back to entry object.
   * 
   * @param {Object} simnoteData - Parsed simnote data
   * @returns {Object} Entry object
   * @private
   */
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
      date: simnoteData.createdAt, // backward compatibility
      audioFiles: Array.isArray(simnoteData.audioFiles) ? simnoteData.audioFiles : []
    };
  }

  /**
   * Gets file extension for audio MIME type.
   * 
   * @param {string} mimeType - Audio MIME type
   * @returns {string} File extension with dot
   * @private
   */
  _getAudioExtension(mimeType) {
    switch (mimeType) {
      case 'audio/wav':
        return '.wav';
      case 'audio/mpeg':
        return '.mp3';
      case 'audio/ogg':
        return '.ogg';
      case 'audio/mp4':
        return '.m4a';
      case 'audio/webm':
      default:
        return '.webm';
    }
  }

  /**
   * Clears audio directory for an entry.
   * 
   * @param {string} entryId - Entry ID
   * @private
   */
  _clearAudioDir(entryId) {
    if (!entryId) return;
    const safeId = this._normalizeEntryId(entryId);
    const audioDir = this._resolveStoragePath(AUDIO_DIR_NAME, safeId);
    if (fs.existsSync(audioDir)) {
      fs.rmSync(audioDir, { recursive: true, force: true });
    }
  }

  /**
   * Collects audio file references from content.
   * 
   * @param {string} content - Entry content
   * @returns {Array<{path: string}>} Audio file references
   * @private
   */
  _collectAudioFileRefs(content, entryId = null) {
    if (!content) return [];
    const refs = [];
    const regex = /data-audio-file=(["'])([^"']+)\1/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const audioPath = match[2];
      if (this._isSafeAudioPath(audioPath, entryId)) {
        refs.push({ path: audioPath });
      }
    }
    return refs;
  }

  /**
   * Extracts base64 audio from content to external files.
   * 
   * @param {Object} entry - Entry object
   * @returns {{content: string, audioFiles: Array}} Updated content and file list
   * @private
   */
  _extractAudioAssets(entry) {
    if (!entry?.content) {
      return { content: entry?.content || '', audioFiles: [] };
    }

    const entryId = this._ensureEntryId(entry);
    const safeId = this._normalizeEntryId(entryId);
    const matches = [...entry.content.matchAll(AUDIO_DATA_ATTR_REGEX)];
    const hasAudioData = matches.length > 0;
    const hasAudioFiles = /data-audio-file=/.test(entry.content);

    if (!hasAudioData) {
      if (!hasAudioFiles) {
        this._clearAudioDir(entryId);
        return { content: entry.content, audioFiles: [] };
      }
      return { content: entry.content, audioFiles: this._collectAudioFileRefs(entry.content, entryId) };
    }

    this._clearAudioDir(entryId);
    const audioDir = this._resolveStoragePath(AUDIO_DIR_NAME, safeId);
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    let clipIndex = 0;
    const audioFiles = [];
    const updatedContent = entry.content.replace(AUDIO_DATA_ATTR_REGEX, (_match, _quote, dataUrl) => {
      const [header, base64] = dataUrl.split(',');
      if (!base64) return _match;
      const mimeMatch = header.match(/^data:([^;]+)(?:;[^,]+)?;base64/i);
      const mimeType = mimeMatch ? mimeMatch[1] : 'audio/webm';
      clipIndex += 1;
      const extension = this._getAudioExtension(mimeType);
      const fileName = `clip-${clipIndex}${extension}`;
      const filePath = this._resolveStoragePath(AUDIO_DIR_NAME, safeId, fileName);
      const buffer = Buffer.from(base64, 'base64');
      fs.writeFileSync(filePath, buffer);
      const relPath = path.posix.join(AUDIO_DIR_NAME, safeId, fileName);
      audioFiles.push({ path: relPath, mimeType, bytes: buffer.length });
      return `data-audio-file="${relPath}"`;
    });

    return { content: updatedContent, audioFiles };
  }

  /**
   * Gets all entries from .simnote files.
   * 
   * @returns {Object[]} Array of entry objects, sorted by date
   */
  getEntries() {
    const entries = [];
    const files = fs.readdirSync(this.storageDir);
    files.forEach((file) => {
      if (path.extname(file) === SIMNOTE_EXTENSION) {
        const filePath = this._resolveStoragePath(file);
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

  /**
   * Gets entry by ID.
   * 
   * @param {string} id - Entry ID
   * @returns {Object|null} Entry object or null
   */
  getEntryById(id) {
    const entries = this.getEntries();
    return entries.find(e => e.id === id) || null;
  }

  /**
   * Saves entry as .simnote file.
   * Extracts audio assets to external files.
   * 
   * @param {Object} entry - Entry to save
   * @returns {string} Saved filename
   */
  saveEntry(entry) {
    const normalizedEntry = { ...entry };
    normalizedEntry.id = this._ensureEntryId(normalizedEntry);
    const audioResult = this._extractAudioAssets(normalizedEntry);
    const simnoteData = this._entryToSimnote({
      ...normalizedEntry,
      content: audioResult.content,
      audioFiles: audioResult.audioFiles
    });
    const filename = this._generateFilename(normalizedEntry);
    const filePath = this._resolveStoragePath(filename);
    this._writeFileAtomic(filePath, JSON.stringify(simnoteData, null, 2), 'utf8');
    console.log(`[FileStorage] Saved: ${filename}`);
    return filename;
  }

  /**
   * Updates existing entry file.
   * 
   * @param {Object} entry - Entry to update
   * @returns {string} Saved filename
   */
  updateEntry(entry) {
    this._deleteEntryFileOnly(entry.id);
    return this.saveEntry(entry);
  }

  /**
   * Deletes entry and its audio files by ID.
   * 
   * @param {string} id - Entry ID
   * @returns {boolean} Whether deletion succeeded
   */
  deleteEntryById(id) {
    const files = fs.readdirSync(this.storageDir);
    const safeId = this._normalizeEntryId(id);
    const targetSuffix = `-${safeId}${SIMNOTE_EXTENSION}`;
    for (const file of files) {
      if (path.extname(file) === SIMNOTE_EXTENSION && file.endsWith(targetSuffix)) {
        const filePath = this._resolveStoragePath(file);
        fs.unlinkSync(filePath);
        console.log(`[FileStorage] Deleted: ${file}`);
        this._clearAudioDir(id);
        return true;
      }
    }
    return false;
  }

  /**
   * Deletes only the .simnote file (keeps audio).
   * 
   * @param {string} id - Entry ID
   * @returns {boolean} Whether deletion succeeded
   * @private
   */
  _deleteEntryFileOnly(id) {
    const files = fs.readdirSync(this.storageDir);
    const safeId = this._normalizeEntryId(id);
    const targetSuffix = `-${safeId}${SIMNOTE_EXTENSION}`;
    for (const file of files) {
      if (path.extname(file) === SIMNOTE_EXTENSION && file.endsWith(targetSuffix)) {
        const filePath = this._resolveStoragePath(file);
        fs.unlinkSync(filePath);
        console.log(`[FileStorage] Deleted: ${file}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Syncs all entries from database to files.
   * 
   * @param {Object[]} entries - Entries to sync
   * @returns {number} Count of synced entries
   */
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

  /**
   * Deletes all .simnote files and audio directory.
   * 
   * @returns {number} Count of deleted files
   */
  clearAllEntries() {
    const files = fs.readdirSync(this.storageDir);
    let deleted = 0;
    for (const file of files) {
      if (path.extname(file) === SIMNOTE_EXTENSION) {
        const filePath = this._resolveStoragePath(file);
        fs.unlinkSync(filePath);
        deleted++;
      }
    }
    const audioRoot = this._resolveStoragePath(AUDIO_DIR_NAME);
    if (fs.existsSync(audioRoot)) {
      fs.rmSync(audioRoot, { recursive: true, force: true });
    }
    if (deleted > 0) {
      console.log(`[FileStorage] Cleared ${deleted} .simnote files`);
    }
    return deleted;
  }

  /**
   * Gets storage directory path.
   * @returns {string} Storage directory path
   */
  getStorageDir() {
    return this.storageDir;
  }

  /**
   * Lists all .simnote files in storage directory.
   * @returns {string[]} Array of filenames
   */
  listFiles() {
    const files = fs.readdirSync(this.storageDir);
    return files.filter(f => path.extname(f) === SIMNOTE_EXTENSION);
  }
}

module.exports = { FileStorageManager, SIMNOTE_EXTENSION, SIMNOTE_VERSION };
