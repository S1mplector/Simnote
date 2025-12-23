// main-electron.js (CommonJS style)

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Load .env (project root) so GUI launches also see the key
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (_) {
  /* dotenv not installed or .env missing – silently continue */
}

const { FileStorageManager } = require('../managers/fileStorageManager.js');
const { NativeDbManager } = require('./nativeDbManager.js');

let fileStorageManager = null;
let nativeDb = null;
let storageDirPath = null;

function getStorageDirPath() {
  if (!storageDirPath) {
    storageDirPath = path.join(app.getPath('home'), 'Documents', 'Simnote');
  }
  return storageDirPath;
}

function ensureFileStorage() {
  if (!fileStorageManager) {
    fileStorageManager = new FileStorageManager(getStorageDirPath());
  }
  return fileStorageManager;
}

function ensureNativeDb() {
  if (!nativeDb) {
    nativeDb = new NativeDbManager(getStorageDirPath());
  }
  return nativeDb;
}

function createWindow() {
  // Store entries in ~/Documents/Simnote for easy access and cloud sync
  const storageDir = getStorageDirPath();
  ensureFileStorage();
  ensureNativeDb();
  console.log(`[Electron] Storage directory: ${storageDir}`);

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,  // Keep disabled for security
      contextIsolation: true,
      preload: path.join(__dirname, '../core/preload.js') // If you use a preload script
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  // Optionally open DevTools:
  // mainWindow.webContents.openDevTools();
}

// Standard Electron app events
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle IPC calls from the renderer to save entries (legacy)
ipcMain.handle('save-entry', (event, { entryName, entryContent }) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  fileStorageManager.saveEntry({ name: entryName, content: entryContent, id: `${Date.now()}` });
  return "Entry saved successfully!";
});

// Save entry as .simnote file (new hybrid storage)
ipcMain.handle('save-entry-file', (event, entry) => {
  console.log('[Electron] save-entry-file called with:', entry?.id, entry?.name);
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  const filename = fileStorageManager.saveEntry(entry);
  console.log('[Electron] Saved .simnote file:', filename);
  return filename;
});

// Update entry .simnote file
ipcMain.handle('update-entry-file', (event, entry) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  return fileStorageManager.updateEntry(entry);
});

// Delete entry .simnote file
ipcMain.handle('delete-entry-file', (event, id) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  return fileStorageManager.deleteEntryById(id);
});

// Get all entries from .simnote files
ipcMain.handle('get-file-entries', () => {
  if (!ensureFileStorage()) {
    return [];
  }
  return fileStorageManager.getEntries();
});

// Sync all entries to .simnote files
ipcMain.handle('sync-all-entries', (event, entries) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  return fileStorageManager.syncAllEntries(entries);
});

// Get storage directory path
ipcMain.handle('get-storage-dir', () => {
  if (!ensureFileStorage()) return null;
  return fileStorageManager.getStorageDir();
});

// Open storage folder in Finder
ipcMain.handle('open-storage-folder', () => {
  if (!ensureFileStorage()) return false;
  const storageDir = fileStorageManager.getStorageDir();
  if (storageDir && fs.existsSync(storageDir)) {
    shell.openPath(storageDir);
    return true;
  }
  return false;
});

// ==================== Native SQLite IPC ====================
ipcMain.handle('native-db-init', () => {
  ensureNativeDb();
  return true;
});

ipcMain.on('native-db-get-entry-count', (event) => {
  try {
    event.returnValue = ensureNativeDb().getEntryCount();
  } catch (err) {
    console.error('[Electron] native-db-get-entry-count failed:', err);
    event.returnValue = 0;
  }
});

ipcMain.on('native-db-get-entries', (event) => {
  try {
    event.returnValue = ensureNativeDb().getEntries();
  } catch (err) {
    console.error('[Electron] native-db-get-entries failed:', err);
    event.returnValue = [];
  }
});

ipcMain.on('native-db-get-entry', (event, id) => {
  try {
    event.returnValue = ensureNativeDb().getEntryById(id);
  } catch (err) {
    console.error('[Electron] native-db-get-entry failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-save-entry', (event, entry) => {
  try {
    const saved = ensureNativeDb().saveEntry(entry);
    ensureFileStorage()?.saveEntry(saved);
    event.returnValue = saved;
  } catch (err) {
    console.error('[Electron] native-db-save-entry failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-update-entry', (event, entry) => {
  try {
    const updated = ensureNativeDb().updateEntry(entry);
    if (updated) {
      ensureFileStorage()?.updateEntry(updated);
    }
    event.returnValue = updated;
  } catch (err) {
    console.error('[Electron] native-db-update-entry failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-delete-entry', (event, id) => {
  try {
    const deleted = ensureNativeDb().deleteEntry(id);
    if (deleted) {
      ensureFileStorage()?.deleteEntryById(id);
    }
    event.returnValue = deleted;
  } catch (err) {
    console.error('[Electron] native-db-delete-entry failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-toggle-favorite', (event, id) => {
  try {
    const updated = ensureNativeDb().toggleFavorite(id);
    const entry = ensureNativeDb().getEntryById(id);
    if (entry) {
      ensureFileStorage()?.updateEntry(entry);
    }
    event.returnValue = updated;
  } catch (err) {
    console.error('[Electron] native-db-toggle-favorite failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-get-metadata', (event, key) => {
  try {
    event.returnValue = ensureNativeDb().getMetadata(key);
  } catch (err) {
    console.error('[Electron] native-db-get-metadata failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-set-metadata', (event, payload) => {
  try {
    ensureNativeDb().setMetadata(payload?.key, payload?.value);
    event.returnValue = true;
  } catch (err) {
    console.error('[Electron] native-db-set-metadata failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-get-todays-mood', (event) => {
  try {
    event.returnValue = ensureNativeDb().getTodaysMood();
  } catch (err) {
    console.error('[Electron] native-db-get-todays-mood failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-set-todays-mood', (event, mood) => {
  try {
    ensureNativeDb().setTodaysMood(mood);
    event.returnValue = true;
  } catch (err) {
    console.error('[Electron] native-db-set-todays-mood failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-get-mood-history', (event, days) => {
  try {
    event.returnValue = ensureNativeDb().getMoodHistory(days);
  } catch (err) {
    console.error('[Electron] native-db-get-mood-history failed:', err);
    event.returnValue = [];
  }
});

ipcMain.on('native-db-export', (event) => {
  try {
    event.returnValue = ensureNativeDb().exportToJSON();
  } catch (err) {
    console.error('[Electron] native-db-export failed:', err);
    event.returnValue = null;
  }
});

ipcMain.handle('native-db-import', (event, jsonString) => {
  try {
    const count = ensureNativeDb().importFromJSON(jsonString);
    ensureFileStorage()?.syncAllEntries(ensureNativeDb().getEntries());
    return count;
  } catch (err) {
    console.error('[Electron] native-db-import failed:', err);
    return 0;
  }
});

ipcMain.handle('native-db-get-storage-info', () => {
  try {
    return ensureNativeDb().getStorageInfo();
  } catch (err) {
    console.error('[Electron] native-db-get-storage-info failed:', err);
    return {
      entriesCount: 0,
      totalSize: 0,
      sizeFormatted: '0 KB',
      imagesCount: 0,
      imagesSize: 0
    };
  }
});

ipcMain.handle('native-db-clear', () => {
  try {
    ensureNativeDb().clearAllData();
    ensureFileStorage()?.clearAllEntries?.();
    return true;
  } catch (err) {
    console.error('[Electron] native-db-clear failed:', err);
    return false;
  }
});

// Chat IPC handler – routes prompts to OpenAI Chat Completion API
ipcMain.handle('chat', async (event, { history }) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set.');
    }

    // Construct messages with system prompt first
    const systemPrompt = {
      role: 'system',
      content: `You are Serenity – the user's caring friend. Talk like a real person: warm, relaxed, and informal. Use contractions, plain words, and at most ONE emoji if it feels natural. Keep replies to 2–3 short paragraphs (≈4–6 concise sentences). Offer gentle CBT reflections, mindfulness tips, and practical next steps. Avoid filler phrases like "I'm here to listen". End with one thoughtful follow-up question. If the user requests a breathing exercise—or you feel one would truly help—reply with ONLY the token [BREATH]. Optionally suggest an ambient color shift by appending [COLOR:#ffbb55] at the very end.`
    };

    const messages = [systemPrompt, ...history];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 256
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${txt}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content.trim();
    return reply;
  } catch (err) {
    console.error(err);
    return 'Sorry, I could not process your request.';
  }
});

// Streaming chat handler
ipcMain.handle('chat-stream', async (event,{history})=>{
  try{
    const apiKey = process.env.OPENAI_API_KEY;
    if(!apiKey){throw new Error('OPENAI_API_KEY environment variable not set.');}

    const systemPrompt={role:'system',content:`You are Serenity – the user's caring friend. Talk like a real person: warm, relaxed, and informal. Use contractions ("I'm, you're"), plain words, and at most ONE emoji if it feels natural. Write 2–3 SHORT paragraphs (≈4–6 concise sentences). Offer gentle CBT-style reflections and practical suggestions. Avoid filler phrases like "I'm here to listen...". End with ONE thoughtful follow-up question. If the user explicitly asks for a breathing exercise—or you believe one would help—reply with ONLY the exact token [BREATH] and nothing else. You can also suggest an ambient color shift by appending a token like [COLOR:#4e8cff] (hex or common color name). Place it at the END of your reply.`};

    const messages=[systemPrompt,...history];

    const response=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
      body:JSON.stringify({model:'gpt-3.5-turbo',messages,temperature:0.7,stream:true})
    });

    if(!response.ok){
      const txt=await response.text();
      throw new Error(`OpenAI error: ${response.status} ${txt}`);
    }

    const reader=response.body.getReader();
    const decoder=new TextDecoder('utf-8');
    let full='';
    while(true){
      const {done,value}=await reader.read();
      if(done) break;
      const chunk=decoder.decode(value,{stream:true});
      const lines=chunk.split('\n');
      for(const l of lines){
        if(!l.startsWith('data:')) continue;
        const data=l.replace(/^data:\s*/,'').trim();
        if(data==='[DONE]') continue;
        try{
          const obj=JSON.parse(data);
          const token=obj.choices?.[0]?.delta?.content;
          if(token){
            full+=token;
            event.sender.send('chat-stream-chunk',{token});
          }
        }catch(e){}
      }
    }
    return full;
  }catch(err){
    console.error(err);
    return "Sorry, I seeem to be offline right now. I'll be back soon!";
  }
});

// Add utility to get memory file path
const getMemoryPath = () => path.join(app.getPath('userData'), 'memory.json');

// IPC to load memory summary
ipcMain.handle('load-memory', async () => {
  try {
    const p = getMemoryPath();
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8');
    }
    return '';
  } catch (e) {
    console.error('load-memory error', e);
    return '';
  }
});

// IPC to save memory summary
ipcMain.handle('save-memory', async (event, summary) => {
  try {
    fs.writeFileSync(getMemoryPath(), summary || '', 'utf-8');
    return true;
  } catch (e) {
    console.error('save-memory error', e);
    return false;
  }
});

// IPC to generate summary via OpenAI
ipcMain.handle('summarize', async (event, { history }) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY environment variable not set.');

    const systemPrompt = { role: 'system', content: 'Summarize the user\'s background, preferences, and any ongoing concerns from the conversation below in <=35 words. Write in third person.' };
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [systemPrompt, ...history], temperature: 0.3, max_tokens: 64 })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`OpenAI error: ${resp.status} ${txt}`);
    }
    const data = await resp.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error('summarize error', err);
    return '';
  }
});
