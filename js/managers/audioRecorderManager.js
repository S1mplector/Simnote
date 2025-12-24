// audioRecorderManager.js
// Manages audio recording with visualizer and 3D tape recorder button
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module provides audio recording functionality integrated into the entry editor.
// It creates a frosted-glass overlay with a 3D tape recorder visual when activated.
//
// INTEGRATION POINTS:
// - Initialized by RichEditorManager for each editor panel (new-entry, edit-entry)
// - Toolbar button (.audio-recorder-btn) triggers the recording overlay
// - Saved audio is embedded as base64 in the rich editor content
// - Audio restoration handled via static method when loading saved entries
//
// DATA FLOW:
// 1. User clicks toolbar button → openRecordingOverlay()
// 2. User clicks record → startRecording() → getUserMedia() → MediaRecorder
// 3. Audio data collected in chunks → ondataavailable callback
// 4. User stops → stopRecording() → Blob created → showPlayback()
// 5. User saves → saveAudioToEntry() → base64 conversion → DOM insertion
//
// DEPENDENCIES:
// - Web Audio API (AudioContext, AnalyserNode) for visualizer
// - MediaRecorder API for audio capture
// - RichEditorManager (parent) for editor panel context

/**
 * Manages audio recording functionality with a visual tape recorder interface.
 * Each instance is tied to a specific editor panel and handles its own recording state.
 * 
 * @class AudioRecorderManager
 * @example
 * // Typically instantiated by RichEditorManager:
 * this.audioRecorder = new AudioRecorderManager(this.panel);
 */
export class AudioRecorderManager {
  /**
   * Creates an AudioRecorderManager instance for a given editor panel.
   * 
   * @constructor
   * @param {HTMLElement} panel - The editor panel element (e.g., #new-entry-panel or #edit-entry-panel)
   *                              Must contain a .audio-recorder-btn element to activate recording
   */
  constructor(panel) {
    /** @type {HTMLElement} The parent editor panel this recorder is attached to */
    this.panel = panel;
    
    /** @type {HTMLElement|null} The toolbar button that opens the recording overlay */
    this.audioButton = panel.querySelector('.audio-recorder-btn');
    
    /** @type {HTMLElement|null} The frosted-glass overlay element (created dynamically) */
    this.overlay = null;
    
    /** @type {MediaRecorder|null} The MediaRecorder instance for capturing audio */
    this.mediaRecorder = null;
    
    /** @type {Blob[]} Array of audio data chunks collected during recording */
    this.audioChunks = [];
    
    /** @type {Blob|null} The final audio blob after recording stops */
    this.audioBlob = null;
    
    /** @type {string|null} Object URL for the audio blob (for playback) */
    this.audioUrl = null;
    
    /** @type {boolean} Current recording state */
    this.isRecording = false;
    
    /** @type {AnalyserNode|null} Web Audio analyser for frequency visualization */
    this.analyser = null;
    
    /** @type {AudioContext|null} Web Audio context for processing microphone input */
    this.audioContext = null;
    
    /** @type {number|null} requestAnimationFrame ID for the visualizer loop */
    this.animationId = null;
    
    /** @type {MediaStream|null} The microphone media stream */
    this.stream = null;
    
    /** @type {HTMLAudioElement} Preloaded record button press sound */
    this.recordButtonSound = new Audio('resources/record_button_press.mp3');
    
    if (this.audioButton) {
      this.init();
    }
  }

  /**
   * Initializes the audio recorder by setting up button interactions.
   * Called automatically from constructor if audio button exists.
   * 
   * @private
   */
  init() {
    this.setupButtonHover();
    this.audioButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.openRecordingOverlay();
    });
  }

  /**
   * Sets up the 3D hover effect on the toolbar button.
   * The tape recorder icon rotates based on cursor position within the button,
   * creating a perspective-tracking effect.
   * 
   * @private
   */
  setupButtonHover() {
    const tapeRecorder = this.audioButton.querySelector('.tape-recorder-3d');
    if (!tapeRecorder) return;

    // Track mouse position and apply 3D rotation
    this.audioButton.addEventListener('mousemove', (e) => {
      const rect = this.audioButton.getBoundingClientRect();
      // Calculate normalized position (-0.5 to 0.5) from center
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      
      // Apply perspective rotation (max ±25deg) and scale up
      tapeRecorder.style.transform = `
        perspective(200px)
        rotateY(${x * 25}deg)
        rotateX(${-y * 25}deg)
        scale(1.3)
      `;
    });

    // Reset transform on mouse leave
    this.audioButton.addEventListener('mouseleave', () => {
      tapeRecorder.style.transform = 'perspective(200px) rotateY(0deg) rotateX(0deg) scale(1)';
    });
  }

  /**
   * Creates and displays the recording overlay with tape recorder UI.
   * The overlay contains:
   * - Animated tape reels that spin during recording
   * - Canvas-based audio visualizer
   * - Record/stop button with visual feedback
   * - Playback controls after recording
   * 
   * @private
   */
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
            </div>
            <div class="tape-reel tape-reel-right">
              <div class="reel-center"></div>
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
            <button class="nav-icon-btn audio-retry-btn" title="Re-record">
              <svg class="nav-icon-svg" viewBox="0 0 24 24">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              <span class="icon-label">Re-record</span>
            </button>
            <button class="nav-icon-btn audio-save-btn" title="Save">
              <svg class="nav-icon-svg" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              <span class="icon-label">Save</span>
            </button>
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

  /**
   * Binds event listeners to overlay UI elements.
   * Handles: close, record/stop toggle, retry, and save actions.
   * 
   * @private
   */
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
        // Play record button press sound
        if (window.playSfx) window.playSfx(this.recordButtonSound);
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

  /**
   * Starts audio recording from the user's microphone.
   * Sets up Web Audio pipeline for visualization and MediaRecorder for capture.
   * 
   * Flow:
   * 1. Request microphone access via getUserMedia
   * 2. Create AudioContext and AnalyserNode for visualizer
   * 3. Initialize MediaRecorder with data handlers
   * 4. Start recording and UI animations
   * 
   * @async
   * @private
   * @throws {Error} If microphone access is denied or unavailable
   */
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

  /**
   * Stops the current recording session.
   * Releases microphone, stops animations, and triggers blob creation.
   * The MediaRecorder.onstop callback will then call showPlayback().
   * 
   * @private
   */
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
      
      // Stop visualizer and clear canvas
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.clearVisualizer();
      
      // Stop timer
      this.stopTimer();
      
      // Stop reels
      this.overlay.querySelectorAll('.tape-reel').forEach(reel => {
        reel.classList.remove('spinning');
      });
    }
  }

  /**
   * Clears the visualizer canvas to its default background color.
   * Called when recording stops to remove stale frequency data.
   * 
   * @private
   */
  clearVisualizer() {
    const canvas = this.overlay?.querySelector('.audio-visualizer');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(30, 20, 15, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Starts the real-time audio visualizer animation loop.
   * Uses Web Audio AnalyserNode to get frequency data and renders bars on canvas.
   * Automatically stops when isRecording becomes false.
   * 
   * Visual style: Vertical frequency bars with warm tape-like gradient colors.
   * 
   * @private
   */
  drawVisualizer() {
    const canvas = this.overlay.querySelector('.audio-visualizer');
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Animation loop using requestAnimationFrame
    const draw = () => {
      if (!this.isRecording) return;
      
      this.animationId = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas with dark background
      ctx.fillStyle = 'rgba(30, 20, 15, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate bar width based on frequency bin count
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      // Draw frequency bars
      for (let i = 0; i < bufferLength; i++) {
        // Normalize frequency value (0-255) to canvas height
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Warm tape color gradient (orange to brown)
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

  /**
   * Starts the recording duration timer.
   * Updates the time display every second in MM:SS format.
   * 
   * @private
   */
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

  /**
   * Stops the recording duration timer.
   * 
   * @private
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  /**
   * Switches the overlay UI from recording mode to playback mode.
   * Hides record button, shows audio player with re-record/save options.
   * 
   * @private
   */
  showPlayback() {
    const controls = this.overlay.querySelector('.recording-controls');
    const playback = this.overlay.querySelector('.audio-playback');
    const audioEl = this.overlay.querySelector('.audio-preview');
    
    controls.style.display = 'none';
    playback.style.display = 'flex';
    audioEl.src = this.audioUrl;
  }

  /**
   * Resets the recorder to initial state for a new recording.
   * Cleans up previous audio data and revokes object URLs to free memory.
   * Switches UI back from playback mode to recording mode.
   * 
   * @private
   */
  resetRecording() {
    // Clean up previous recording - revoke URL to prevent memory leak
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
    this.audioBlob = null;
    this.audioUrl = null;
    this.audioChunks = [];
    
    // Reset UI to recording mode
    const controls = this.overlay.querySelector('.recording-controls');
    const playback = this.overlay.querySelector('.audio-playback');
    const timeDisplay = this.overlay.querySelector('.recording-time');
    
    controls.style.display = 'flex';
    playback.style.display = 'none';
    timeDisplay.textContent = '00:00';
  }

  /**
   * Saves the recorded audio to the entry's rich editor content.
   * 
   * Storage strategy:
   * - Audio is converted to base64 and stored in a data-audio-data attribute
   * - This allows the audio to persist when the entry HTML content is saved
   * - The audio element src uses an object URL for immediate playback
   * - On entry reload, restoreAudioPlayers() converts data attribute back to src
   * 
   * @async
   * @private
   */
  async saveAudioToEntry() {
    if (!this.audioBlob) return;
    
    // Convert blob to base64 for persistent storage in entry content
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result;
      
      // Insert audio player container into the rich editor
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
        
        // Store base64 in data attribute - this persists when innerHTML is saved
        audioContainer.dataset.audioData = base64Audio;
        
        richEditor.appendChild(audioContainer);
        richEditor.appendChild(document.createElement('br'));
        
        // Trigger input event to notify autosave system
        richEditor.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      this.closeOverlay();
    };
    
    reader.readAsDataURL(this.audioBlob);
  }

  /**
   * Closes the recording overlay and cleans up all resources.
   * Ensures microphone is released, audio context is closed, and DOM is cleaned.
   * Uses a 300ms delay for fade-out animation before removing from DOM.
   * 
   * @private
   */
  closeOverlay() {
    // Cleanup any active recording
    this.stopRecording();
    
    // Close audio context to release system resources
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Animate out then remove from DOM
    if (this.overlay) {
      this.overlay.classList.remove('visible');
      setTimeout(() => {
        this.overlay.remove();
        this.overlay = null;
      }, 300); // Match CSS transition duration
    }
  }

  /**
   * Restores audio player sources from saved entry content.
   * When an entry is loaded, audio elements have empty/invalid src attributes.
   * This method reads base64 data from data-audio-data or file references from
   * data-audio-file attributes and restores the audio src so playback works.
   * 
   * Called by RichEditorManager.setContent() when loading entry content.
   * 
   * @static
   * @param {HTMLElement} container - The container element to search for audio players
   *                                  (typically the .rich-editor element)
   */
  static restoreAudioPlayers(container) {
    const audioContainers = Array.from(container.querySelectorAll('.entry-audio-container'));
    if (!audioContainers.length) return;

    const needsStorageDir = audioContainers.some(node => node.dataset.audioFile);
    const storageDirPromise = needsStorageDir && typeof window !== 'undefined' && window.electronAPI?.getStorageDir
      ? Promise.resolve(window.electronAPI.getStorageDir()).catch(() => null)
      : Promise.resolve(null);

    const toFileUrl = (audioFile, storageDir) => {
      if (!audioFile) return null;
      if (/^(blob:|data:|https?:|file:)/i.test(audioFile)) return audioFile;

      const isAbsolute = audioFile.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(audioFile);
      const baseDir = storageDir?.replace(/[\\/]+$/, '');
      const relativePath = audioFile.replace(/^[/\\]+/, '');
      const absolutePath = isAbsolute || !baseDir ? audioFile : `${baseDir}/${relativePath}`;
      const normalized = absolutePath.replace(/\\/g, '/');
      const prefix = normalized.startsWith('/') ? 'file://' : 'file:///';

      return `${prefix}${encodeURI(normalized)}`;
    };

    audioContainers.forEach(audioContainer => {
      const audioEl = audioContainer.querySelector('audio');
      if (!audioEl) return;

      const audioData = audioContainer.dataset.audioData;
      if (audioData) {
        // Only restore if src isn't already a data URL (avoid double-processing)
        if (!audioEl.src.startsWith('data:')) {
          audioEl.src = audioData;
        }
        return;
      }

      const audioFile = audioContainer.dataset.audioFile;
      if (!audioFile || audioEl.src.startsWith('file:')) return;

      storageDirPromise.then(storageDir => {
        const fileUrl = toFileUrl(audioFile, storageDir);
        if (fileUrl && !audioEl.src.startsWith('file:')) {
          audioEl.src = fileUrl;
        }
      });
    });
  }
}
