// fileStorageManager.js (CommonJS style for Electron)
// Handles .simnote file persistence with full metadata

const fs = require('fs');
const path = require('path');

const SIMNOTE_EXTENSION = '.simnote';
const SIMNOTE_VERSION = 1;
const AUDIO_DIR_NAME = 'audio';
const AUDIO_DATA_ATTR_REGEX = /data-audio-data=(["'])(data:audio\/[^"']+)\1/g;

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
      exportedAt: new Date().toISOString(),
      audioFiles: entry.audioFiles || []
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
      date: simnoteData.createdAt, // backward compatibility
      audioFiles: Array.isArray(simnoteData.audioFiles) ? simnoteData.audioFiles : []
    };
  }

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

  _clearAudioDir(entryId) {
    if (!entryId) return;
    const audioDir = path.join(this.storageDir, AUDIO_DIR_NAME, entryId);
    if (fs.existsSync(audioDir)) {
      fs.rmSync(audioDir, { recursive: true, force: true });
    }
  }

  _collectAudioFileRefs(content) {
    if (!content) return [];
    const refs = [];
    const regex = /data-audio-file=(["'])([^"']+)\1/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      refs.push({ path: match[2] });
    }
    return refs;
  }

  _extractAudioAssets(entry) {
    if (!entry?.content) {
      return { content: entry?.content || '', audioFiles: [] };
    }

    const matches = [...entry.content.matchAll(AUDIO_DATA_ATTR_REGEX)];
    const hasAudioData = matches.length > 0;
    const hasAudioFiles = /data-audio-file=/.test(entry.content);

    if (!hasAudioData) {
      if (!hasAudioFiles) {
        this._clearAudioDir(entry.id);
        return { content: entry.content, audioFiles: [] };
      }
      return { content: entry.content, audioFiles: this._collectAudioFileRefs(entry.content) };
    }

    this._clearAudioDir(entry.id);
    const audioDir = path.join(this.storageDir, AUDIO_DIR_NAME, entry.id);
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
      const filePath = path.join(audioDir, fileName);
      const buffer = Buffer.from(base64, 'base64');
      fs.writeFileSync(filePath, buffer);
      const relPath = path.join(AUDIO_DIR_NAME, entry.id, fileName).replace(/\\/g, '/');
      audioFiles.push({ path: relPath, mimeType, bytes: buffer.length });
      return `data-audio-file="${relPath}"`;
    });

    return { content: updatedContent, audioFiles };
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
    const audioResult = this._extractAudioAssets(entry);
    const simnoteData = this._entryToSimnote({
      ...entry,
      content: audioResult.content,
      audioFiles: audioResult.audioFiles
    });
    const filename = this._generateFilename(entry);
    const filePath = path.join(this.storageDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(simnoteData, null, 2), 'utf8');
    console.log(`[FileStorage] Saved: ${filename}`);
    return filename;
  }

  // Update an existing entry - find by ID and rewrite
  updateEntry(entry) {
    // Remove the old .simnote file but keep audio assets unless explicitly removed
    this._deleteEntryFileOnly(entry.id);
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
        this._clearAudioDir(id);
        return true;
      }
    }
    return false;
  }

  _deleteEntryFileOnly(id) {
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

  // Delete all .simnote files in the storage directory
  clearAllEntries() {
    const files = fs.readdirSync(this.storageDir);
    let deleted = 0;
    for (const file of files) {
      if (path.extname(file) === SIMNOTE_EXTENSION) {
        const filePath = path.join(this.storageDir, file);
        fs.unlinkSync(filePath);
        deleted++;
      }
    }
    const audioRoot = path.join(this.storageDir, AUDIO_DIR_NAME);
    if (fs.existsSync(audioRoot)) {
      fs.rmSync(audioRoot, { recursive: true, force: true });
    }
    if (deleted > 0) {
      console.log(`[FileStorage] Cleared ${deleted} .simnote files`);
    }
    return deleted;
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
