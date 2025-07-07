// storageManager.js
export class StorageManager {
  static getEntries() {
    return JSON.parse(localStorage.getItem('entries')) || [];
  }

  static saveEntry(name, content, mood = '', fontFamily = '', fontSize = '') {
    const entries = StorageManager.getEntries();
    const wordCount = StorageManager.countWords(content);
    entries.push({
      name,
      content,
      mood,
      wordCount,
      fontFamily,
      fontSize,
      date: new Date().toISOString()
    });
    localStorage.setItem('entries', JSON.stringify(entries));
  }

  static updateEntry(index, name, content, mood, fontFamily = '', fontSize = '') {
    const entries = StorageManager.getEntries();
    if (index >= 0 && index < entries.length) {
      const existingMood = entries[index].mood || '';
      const wordCount = StorageManager.countWords(content);
      entries[index] = {
        name,
        content,
        mood: mood !== undefined ? mood : existingMood,
        wordCount,
        fontFamily,
        fontSize,
        date: new Date().toISOString()
      };
      localStorage.setItem('entries', JSON.stringify(entries));
    }
  }

  static deleteEntry(index) {
    const entries = StorageManager.getEntries();
    if (index >= 0 && index < entries.length) {
      entries.splice(index, 1);
      localStorage.setItem('entries', JSON.stringify(entries));
    }
  }

  // NEW: Generate export content from all (or selected) entries.
  static generateExportContent(selectedIndices = null) {
    const entries = StorageManager.getEntries();
    const toExport = (selectedIndices === null)
      ? entries
      : selectedIndices.map(index => entries[index]);
    let content = '';
    toExport.forEach(entry => {
      content += `---ENTRY---\n`;
      content += `Date: ${entry.date}\n`;
      content += `Caption: ${entry.name}\n`;
      content += `Mood: ${entry.mood || ''}\n`;
      content += `WordCount: ${entry.wordCount || StorageManager.countWords(entry.content)}\n`;
      content += `Font: ${entry.fontFamily || ''}\n`;
      content += `FontSize: ${entry.fontSize || ''}\n`;
      content += `Content:\n${entry.content}\n`;
      content += `---END ENTRY---\n\n`;
    });
    return content;
  }

  // NEW: Helper to add an imported entry while preserving its date.
  static addImportedEntry(name, content, date, mood = '', fontFamily = '', fontSize = '', wordCount = StorageManager.countWords(content)) {
    const entries = StorageManager.getEntries();
    entries.push({ name, content, date, mood, fontFamily, fontSize, wordCount });
    localStorage.setItem('entries', JSON.stringify(entries));
  }

  // NEW: Import entries from a custom-formatted .txt file content.
  static importEntries(fileContent) {
    let importedCount = 0;
    const blocks = fileContent.split('---ENTRY---');
    blocks.forEach(block => {
      if (block.includes('---END ENTRY---')) {
        const contentBlock = block.split('---END ENTRY---')[0].trim();
        const lines = contentBlock.split('\n').filter(line => line.trim() !== '');
        if (lines.length >= 4) {
          const dateLine = lines[0];
          const captionLine = lines[1];
          let moodLine = '';
          let wordLine = '';
          let fontLine = '';
          let sizeLine = '';
          let contentStartIdx = 2;

          // Parse optional metadata lines if present in any order after Caption
          for (let i = 2; i < lines.length; i++) {
            const l = lines[i];
            if (l.startsWith('Mood:')) {
              moodLine = l;
            } else if (l.startsWith('WordCount:')) {
              wordLine = l;
            } else if (l.startsWith('Font:')) {
              fontLine = l;
            } else if (l.startsWith('FontSize:')) {
              sizeLine = l;
            } else if (l.trim() === 'Content:') {
              contentStartIdx = i;
              break;
            }
          }

          const date = dateLine.replace('Date:', '').trim();
          const caption = captionLine.replace('Caption:', '').trim();
          const mood = moodLine ? moodLine.replace('Mood:', '').trim() : '';
          const font = fontLine ? fontLine.replace('Font:', '').trim() : '';
          const fontSize = sizeLine ? sizeLine.replace('FontSize:', '').trim() : '';
          const content = lines.slice(contentStartIdx + 1).join('\n').trim();
          StorageManager.addImportedEntry(caption, content, date, mood, font, fontSize);
          importedCount++;
        }
      }
    });
    return importedCount;
  }

  // Helper to count words in content
  static countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}
