// chatManager.js
import { PanelManager } from './panelManager.js';
import { BreathingOverlay } from '../components/breathingOverlay.js';

class ChatManager{
  constructor(){
    // DOM refs
    this.chatBtn = document.getElementById('chat-btn');
    this.chatPanel = document.getElementById('chat-panel');
    this.mainPanel = document.getElementById('main-panel');
    this.backBtn = this.chatPanel?.querySelector('.chat-back-btn');
    this.messagesDiv = document.getElementById('chat-messages');
    this.input = document.getElementById('chat-input');
    this.sendBtn = null;
    this.inputRow = document.getElementById('chat-input-row');
    this.newBtn = document.getElementById('chat-new-btn');

    this.history = [];
    this.memorySummary = '';
    this.userMood = window.currentMood || '';
    this.introShown = false;
    this.collapseThreshold = 20;
    this.autoScrollThreshold = 120; // px

    this.init();
  }

  init(){
    // Load memory summary once
    window.electronAPI.loadMemory().then(sum=>{if(sum){this.memorySummary=sum;}});

    // Create new message indicator
    this.newMsgIndicator=document.createElement('div');
    this.newMsgIndicator.className='new-msg-indicator';
    this.newMsgIndicator.textContent='New messages ↓';
    this.newMsgIndicator.addEventListener('click',()=>{
      this.scrollMessagesToBottom(true);
      this.newMsgIndicator.style.display='none';
    });
    this.chatPanel.appendChild(this.newMsgIndicator);

    if(this.chatBtn){
      this.chatBtn.addEventListener('click', ()=>{
        PanelManager.transitionPanels(this.mainPanel, this.chatPanel);
        this.input?.focus();
        // Show intro only on first open
        if(!this.introShown){
          this.appendMessage("Hello, I'm Serenity – your calming companion here in Simnote. I specialize in relaxing conversation and gentle CBT-style guidance. How can I support you today?", 'assistant', true);
          this.appendMessage("Your privacy matters: our chat isn't stored anywhere once you close Simnote. Serenity only knows what you share during this session.", 'assistant', true);
          this.introShown = true;
          // reset state each open
          if(this.inputRow){this.inputRow.classList.add('collapsed');}
          if(this.newBtn){this.newBtn.style.display='inline-block';}
        }
      });
    }

    if(this.backBtn){
      this.backBtn.addEventListener('click', ()=>{
        PanelManager.transitionPanels(this.chatPanel, this.mainPanel);
      });
    }

    const send = ()=>{
      const text = this.input.value.trim();
      if(!text) return;
      // special command to trigger breathing overlay
      if(text.toLowerCase().includes('/breathe')){
        this.showBreathingOverlay();
        this.input.value='';
        return;
      }

      // Apply ambient color shift based on sentiment of user text
      const sentiment=this.detectSentiment(text);
      const palette={positive:'#86e57f',negative:'#4e8cff',angry:'#ff6666',neutral:null};
      const col=palette[sentiment];
      if(col){this.applyAmbientColor(col);}

      this.appendMessage(text, 'user');
      this.input.value='';
      this.input.focus();
      this.history.push({role:'user', content:text});
      this.requestAssistantReply();
    };

    if(this.input){
      this.input.addEventListener('keydown', (e)=>{
        if(e.key==='Enter' && !e.shiftKey){
          e.preventDefault();
          send();
        }
      });
    }

    // Collapse input row initially
    if(this.inputRow){
      this.inputRow.classList.add('collapsed');
    }

    if(this.newBtn){
      this.newBtn.addEventListener('click', ()=>{
        // reveal input row
        this.inputRow.classList.remove('collapsed');
        this.input.focus();
        // hide bubble
        this.newBtn.style.display='none';
      });
    }
  }

  appendMessage(text, role, isIntro = false){
    const msg=document.createElement('div');
    msg.className = `msg ${role}`;
    msg.textContent = text;
    if(role==='assistant'){
      // trigger fade-in
      msg.classList.add('fade-in');
    }
    this.messagesDiv.appendChild(msg);
    this.manageAutoScroll();
    this.compactHistory();
    // input box stays fixed-height; no resize
  }

  async requestAssistantReply(){
    // show typing indicator
    const typing = document.createElement('div');
    typing.className='msg assistant';
    const wrap=document.createElement('div');
    wrap.className='typing';
    wrap.innerHTML='<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    typing.appendChild(wrap);
    this.messagesDiv.appendChild(typing);
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;

    // Prepare history with optional mood system message
    const sendHistory = [...this.history];
    if(this.userMood){
      sendHistory.unshift({role:'system',content:`User current mood: ${this.userMood}`});
    }
    if(this.memorySummary){
      sendHistory.unshift({role:'system',content:`User memory: ${this.memorySummary}`});
    }

    // Listen to streaming tokens
    const chunkHandler = (_,data)=>{
      wrap.remove();
      const {token}=data;
      if(!typing.dataset.started){typing.dataset.started='1';typing.textContent='';}
      typing.textContent += token;
      this.manageAutoScroll();
    };
    window.electronAPI.onChatStreamChunk(chunkHandler);

    try{
      const full = await window.electronAPI.chatStream(sendHistory);
      window.electronAPI.onChatStreamChunk(()=>{}); // detach listener
      typing.remove();

      const trimmed = full.trim();
      // Guard-rail: if model sends only the [BREATH] token, ask for confirmation
      if(/^\[breath\]$/i.test(trimmed)){
        this.showBreathingPrompt();
        // track in history so the model knows overlay invoked/declined later
        this.history.push({role:'assistant', content:'[BREATH]'});
        return;
      }

      let final=full;
      // Detect ambient color token
      const colMatch=final.match(/\[COLOR:([^\]]+)\]/i);
      if(colMatch){
        const col=colMatch[1].trim();
        this.applyAmbientColor(col);
        final=final.replace(colMatch[0],'').trim();
      }

      this.appendMessage(final,'assistant');
      this.history.push({role:'assistant', content:final});
      // Update memory summary asynchronously (debounced by setTimeout)
      clearTimeout(this.memoryTimer);
      this.memoryTimer = setTimeout(()=>this.updateMemory(), 500);
    }catch(err){
      typing.remove();
      console.error(err);
      this.appendMessage('Sorry, I had trouble responding.', 'assistant');
    }
  }

  // ---------- Breathing helpers ----------
  showBreathingPrompt(){
    const msg=document.createElement('div');
    msg.className='msg assistant';
    msg.innerHTML=`I can guide you through a one-minute breathing exercise. <button class="breath-btn breath-start">Begin</button> <button class="breath-btn breath-skip">Skip</button>`;
    this.messagesDiv.appendChild(msg);
    this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;

    const beginBtn=msg.querySelector('.breath-start');
    const skipBtn=msg.querySelector('.breath-skip');

    beginBtn?.addEventListener('click',()=>{
      msg.remove();
      this.showBreathingOverlay();
      // Let the model know user completed the exercise in next turn
      this.history.push({role:'user',content:'[BREATH_DONE]'});
    });

    skipBtn?.addEventListener('click',()=>{
      msg.remove();
      // Optional: inform model user skipped
      this.history.push({role:'user',content:'[BREATH_SKIPPED]'});
    });
  }

  showBreathingOverlay(){
    BreathingOverlay.start();
  }

  async updateMemory(){
    try{
      const summary = await window.electronAPI.summarize(this.history);
      if(summary){
        this.memorySummary = summary;
        await window.electronAPI.saveMemory(summary);
      }
    }catch(e){console.error('memory update failed',e);}
  }

  manageAutoScroll(force=false){
    const nearBottom = (this.messagesDiv.scrollHeight - this.messagesDiv.scrollTop - this.messagesDiv.clientHeight) < this.autoScrollThreshold;
    if(force || nearBottom){
      this.scrollMessagesToBottom();
      this.newMsgIndicator.style.display='none';
    }else{
      this.newMsgIndicator.style.display='block';
    }
  }

  scrollMessagesToBottom(now){
    if(now){
      this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
    }else{
      this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
    }
  }

  compactHistory(){
    const children=[...this.messagesDiv.children];
    if(children.length <= this.collapseThreshold) return;
    // find or create collapsed wrapper
    let wrapper=this.messagesDiv.querySelector('.collapsed-history');
    if(!wrapper){
      wrapper=document.createElement('div');
      wrapper.className='collapsed-history';
      wrapper.style.textAlign='center';
      wrapper.style.margin='12px 0';
      const btn=document.createElement('button');
      btn.textContent=`Show earlier messages`;
      btn.style.background='transparent';
      btn.style.border='none';btn.style.color='#ccc';btn.style.cursor='pointer';
      btn.addEventListener('click',()=>{
        wrapper.style.display='none';
        for(const el of wrapper.stored){el.style.display='';}
      });
      wrapper.appendChild(btn);
      this.messagesDiv.insertBefore(wrapper, children[0]);
      wrapper.stored=[];
    }
    // move oldest messages into wrapper
    while(this.messagesDiv.children.length - (wrapper.stored?.length||0) > this.collapseThreshold){
      const first=this.messagesDiv.children[ (wrapper === this.messagesDiv.children[0] ? 1 :0) ];
      if(!first || first===wrapper) break;
      wrapper.stored.push(first);
      first.style.display='none';
    }
    wrapper.querySelector('button').textContent=`Show ${wrapper.stored.length} earlier messages`;
  }

  applyAmbientColor(color){
    // Accept hex or css color
    let rgb;
    const ctx=document.createElement('canvas').getContext('2d');
    ctx.fillStyle=color;
    rgb=ctx.fillStyle; // normalized to rgb(a)
    // extract rgb numbers
    const rgba=rgb.match(/rgba?\(([^)]+)\)/)[1].split(',').map(s=>parseFloat(s));
    const bg=`rgba(${rgba[0]},${rgba[1]},${rgba[2]},0.07)`;
    const border=`rgba(${rgba[0]},${rgba[1]},${rgba[2]},0.3)`;
    this.chatPanel.style.setProperty('--chat-bg', bg);
    this.chatPanel.style.setProperty('--chat-border', border);
  }

  detectSentiment(txt){
    const low=txt.toLowerCase();
    const negativeWords=['sad','down','terrible','depressed','anxious','anxiety','worried','scared','lonely','hopeless','tired','exhausted','angry','frustrated'];
    const positiveWords=['happy','great','excited','good','grateful','thankful','joy','hopeful','optimistic'];
    let score=0;
    for(const w of positiveWords){if(low.includes(w)) score++;}
    for(const w of negativeWords){if(low.includes(w)) score--;}
    if(score>0) return 'positive';
    if(score<0) return (low.includes('angry')||low.includes('mad'))?'angry':'negative';
    return 'neutral';
  }
}

// Initialise once DOM is ready
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', ()=> new ChatManager());
}else{
  new ChatManager();
} 