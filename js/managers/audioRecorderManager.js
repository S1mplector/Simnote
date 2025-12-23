// audioRecorderManager.js
// Manages audio recording with visualizer and 3D tape recorder button

export class AudioRecorderManager {
  constructor(panel) {
    this.panel = panel;
    this.audioButton = panel.querySelector('.audio-recorder-btn');
    this.overlay = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioBlob = null;
    this.audioUrl = null;
    this.isRecording = false;
    this.analyser = null;
    this.audioContext = null;
    this.animationId = null;
    this.stream = null;
    
    if (this.audioButton) {
      this.init();
    }
  }

  init() {
    this.setupButtonHover();
    this.audioButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.openRecordingOverlay();
    });
  }

  setupButtonHover() {
    const tapeRecorder = this.audioButton.querySelector('.tape-recorder-3d');
    if (!tapeRecorder) return;

    this.audioButton.addEventListener('mousemove', (e) => {
      const rect = this.audioButton.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      
      tapeRecorder.style.transform = `
        perspective(200px)
        rotateY(${x * 25}deg)
        rotateX(${-y * 25}deg)
        scale(1.3)
      `;
    });

    this.audioButton.addEventListener('mouseleave', () => {
      tapeRecorder.style.transform = 'perspective(200px) rotateY(0deg) rotateX(0deg) scale(1)';
    });
  }

  openRecordingOverlay() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'audio-recorder-overlay';
    this.overlay.innerHTML = `
      <div class="audio-recorder-modal">
        <button class="audio-close-btn" title="Close">×</button>
        <div class="tape-recorder-visual">
          <div class="tape-body">
            <div class="tape-reel tape-reel-left">
              <div class="reel-center"></div>
              <div class="reel-spoke"></div>
              <div class="reel-spoke"></div>
              <div class="reel-spoke"></div>
            </div>
            <div class="tape-reel tape-reel-right">
              <div class="reel-center"></div>
              <div class="reel-spoke"></div>
              <div class="reel-spoke"></div>
              <div class="reel-spoke"></div>
            </div>
            <div class="tape-window">
              <canvas class="audio-visualizer" width="200" height="60"></canvas>
            </div>
            <div class="tape-label">SIMNOTE AUDIO</div>
          </div>
        </div>
        <div class="recording-controls">
          <button class="record-btn" title="Record">
            <span class="record-icon"></span>
          </button>
          <span class="recording-time">00:00</span>
        </div>
        <div class="audio-playback" style="display: none;">
          <audio class="audio-preview" controls></audio>
          <div class="audio-actions">
            <button class="audio-retry-btn">Re-record</button>
            <button class="audio-save-btn">Save to Entry</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });

    this.setupOverlayEvents();
  }

  setupOverlayEvents() {
    const closeBtn = this.overlay.querySelector('.audio-close-btn');
    const recordBtn = this.overlay.querySelector('.record-btn');
    const retryBtn = this.overlay.querySelector('.audio-retry-btn');
    const saveBtn = this.overlay.querySelector('.audio-save-btn');

    closeBtn.addEventListener('click', () => this.closeOverlay());
    
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.closeOverlay();
    });

    recordBtn.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });

    retryBtn.addEventListener('click', () => {
      this.resetRecording();
    });

    saveBtn.addEventListener('click', () => {
      this.saveAudioToEntry();
    });
  }

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio context for visualizer
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      this.analyser.fftSize = 256;
      
      // Setup media recorder
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        this.audioChunks.push(e.data);
      };
      
      this.mediaRecorder.onstop = () => {
        this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioUrl = URL.createObjectURL(this.audioBlob);
        this.showPlayback();
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      
      // UI updates
      const recordBtn = this.overlay.querySelector('.record-btn');
      recordBtn.classList.add('recording');
      
      // Start visualizer
      this.drawVisualizer();
      
      // Start timer
      this.startTimer();
      
      // Animate reels
      this.overlay.querySelectorAll('.tape-reel').forEach(reel => {
        reel.classList.add('spinning');
      });
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      
      // UI updates
      const recordBtn = this.overlay.querySelector('.record-btn');
      recordBtn.classList.remove('recording');
      
      // Stop visualizer
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      
      // Stop timer
      this.stopTimer();
      
      // Stop reels
      this.overlay.querySelectorAll('.tape-reel').forEach(reel => {
        reel.classList.remove('spinning');
      });
    }
  }

  drawVisualizer() {
    const canvas = this.overlay.querySelector('.audio-visualizer');
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!this.isRecording) return;
      
      this.animationId = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = 'rgba(30, 20, 15, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Warm tape color gradient
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#ffae75');
        gradient.addColorStop(1, '#b08871');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  }

  startTimer() {
    this.recordingStartTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      const timeDisplay = this.overlay.querySelector('.recording-time');
      if (timeDisplay) timeDisplay.textContent = timeStr;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  showPlayback() {
    const controls = this.overlay.querySelector('.recording-controls');
    const playback = this.overlay.querySelector('.audio-playback');
    const audioEl = this.overlay.querySelector('.audio-preview');
    
    controls.style.display = 'none';
    playback.style.display = 'flex';
    audioEl.src = this.audioUrl;
  }

  resetRecording() {
    // Clean up previous recording
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
    this.audioBlob = null;
    this.audioUrl = null;
    this.audioChunks = [];
    
    // Reset UI
    const controls = this.overlay.querySelector('.recording-controls');
    const playback = this.overlay.querySelector('.audio-playback');
    const timeDisplay = this.overlay.querySelector('.recording-time');
    
    controls.style.display = 'flex';
    playback.style.display = 'none';
    timeDisplay.textContent = '00:00';
  }

  async saveAudioToEntry() {
    if (!this.audioBlob) return;
    
    // Convert blob to base64 for storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result;
      
      // Insert audio player into the rich editor
      const richEditor = this.panel.querySelector('.rich-editor');
      if (richEditor) {
        const audioContainer = document.createElement('div');
        audioContainer.className = 'entry-audio-container';
        audioContainer.innerHTML = `
          <div class="entry-audio-player">
            <div class="audio-tape-icon">🎙️</div>
            <audio controls src="${this.audioUrl}"></audio>
          </div>
        `;
        
        // Store the base64 in a data attribute for persistence
        audioContainer.dataset.audioData = base64Audio;
        
        richEditor.appendChild(audioContainer);
        richEditor.appendChild(document.createElement('br'));
        
        // Trigger input event for autosave
        richEditor.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      this.closeOverlay();
    };
    
    reader.readAsDataURL(this.audioBlob);
  }

  closeOverlay() {
    // Cleanup
    this.stopRecording();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.overlay) {
      this.overlay.classList.remove('visible');
      setTimeout(() => {
        this.overlay.remove();
        this.overlay = null;
      }, 300);
    }
  }

  // Static method to restore audio from saved entry content
  static restoreAudioPlayers(container) {
    const audioContainers = container.querySelectorAll('.entry-audio-container');
    audioContainers.forEach(audioContainer => {
      const audioData = audioContainer.dataset.audioData;
      if (audioData) {
        const audioEl = audioContainer.querySelector('audio');
        if (audioEl && !audioEl.src.startsWith('data:')) {
          audioEl.src = audioData;
        }
      }
    });
  }
}
