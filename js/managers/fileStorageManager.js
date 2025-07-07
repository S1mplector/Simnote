// fileStorageManager.js (CommonJS style)

const fs = require('fs');
const path = require('path');
// If you actually need the dialog in the main process:
const { dialog } = require('electron'); 

class FileStorageManager {
  constructor(storageDir) {
    this.storageDir = storageDir;
    // Ensure the storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  // Return an array of entry objects read from each .json file in storageDir
  getEntries() {
    const entries = [];
    const files = fs.readdirSync(this.storageDir);
    files.forEach((file) => {
      if (path.extname(file) === '.json') {
        const filePath = path.join(this.storageDir, file);
        const data = fs.readFileSync(filePath, 'utf8');
        try {
          const entry = JSON.parse(data);
          entries.push(entry);
        } catch (err) {
          console.error('Error parsing entry file:', filePath, err);
        }
      }
    });
    // Sort entries by date descending
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Save a new entry as JSON, using a timestamp-based filename
  saveEntry(name, content) {
    const entry = {
      name,
      content,
      date: new Date().toISOString()
    };
    const filename = `entry-${Date.now()}.json`;
    const filePath = path.join(this.storageDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
  }

  // Update an existing entry by overwriting its file
  updateEntry(filename, name, content) {
    const filePath = path.join(this.storageDir, filename);
    if (fs.existsSync(filePath)) {
      const entry = {
        name,
        content,
        date: new Date().toISOString()
      };
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
    }
  }

  // Delete an entry by filename
  deleteEntry(filename) {
    const filePath = path.join(this.storageDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Export with module.exports
module.exports = { FileStorageManager };
