// main-electron.js (CommonJS style)

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Load .env (project root) so GUI launches also see the key
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (_) {
  /* dotenv not installed or .env missing – silently continue */
}

const { FileStorageManager } = require('../managers/fileStorageManager.js');

let fileStorageManager = null;

function createWindow() {
  // Example: store entries in the app's userData folder
  const storageDir = path.join(app.getPath('userData'), 'entries');
  fileStorageManager = new FileStorageManager(storageDir);

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

// Handle IPC calls from the renderer to save entries
ipcMain.handle('save-entry', (event, { entryName, entryContent }) => {
  if (!fileStorageManager) {
    throw new Error("FileStorageManager not initialized!");
  }
  fileStorageManager.saveEntry(entryName, entryContent);
  return "Entry saved successfully!";
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
