// lockScreenManager.js
// Manages the lock screen UI and security settings for Simnote
//
// FEATURES:
// - Passcode entry with numeric keypad
// - Touch ID authentication (macOS)
// - Security settings panel
// - Auto-lock on inactivity
// - Passcode setup/change workflow

/**
 * Lock Screen Manager
 * Handles all lock screen UI and security interactions
 */
class LockScreenManager {
  constructor() {
    this.lockScreen = null;
    this.passcodeInput = '';
    this.isSettingUp = false;
    this.setupStep = 0; // 0 = enter new, 1 = confirm
    this.newPasscode = '';
    this.touchIdAvailable = false;
    this.config = null;
    
    // Bind methods
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleActivity = this.handleActivity.bind(this);
  }

  /**
   * Initializes the lock screen manager.
   * Call this after DOM is ready.
   */
  async init() {
    // Check if running in Electron
    if (!window.electronAPI?.security) {
      console.log('[LockScreen] Not in Electron, skipping security init');
      return;
    }

    // Load security config
    this.config = await window.electronAPI.security.getConfig();
    this.touchIdAvailable = await window.electronAPI.security.isTouchIdAvailable();

    // Create lock screen elements
    this.createLockScreen();
    this.createSetupModal();

    // Listen for lock events from main process
    window.electronAPI.security.onLocked(() => {
      this.showLockScreen();
    });

    // Set up activity listeners for auto-lock timer reset
    this.setupActivityListeners();

    // Check if app should start locked
    if (this.config.enabled) {
      const isUnlocked = await window.electronAPI.security.isUnlocked();
      if (!isUnlocked) {
        this.showLockScreen();
      }
    }

    console.log('[LockScreen] Initialized', { 
      enabled: this.config.enabled, 
      touchIdAvailable: this.touchIdAvailable 
    });
  }

  /**
   * Creates the lock screen DOM elements.
   * @private
   */
  createLockScreen() {
    // Create lock screen container
    this.lockScreen = document.createElement('div');
    this.lockScreen.className = 'lock-screen hidden';
    this.lockScreen.innerHTML = `
      <div class="lock-screen__container">
        <div class="lock-screen__icon">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h1 class="lock-screen__title">Simnote is Locked</h1>
        <p class="lock-screen__subtitle">Enter your passcode to unlock</p>
        
        <div class="passcode-input">
          <div class="passcode-dots">
            <div class="passcode-dot" data-index="0"></div>
            <div class="passcode-dot" data-index="1"></div>
            <div class="passcode-dot" data-index="2"></div>
            <div class="passcode-dot" data-index="3"></div>
          </div>
          
          <div class="passcode-keypad">
            <button class="passcode-key" data-key="1">1</button>
            <button class="passcode-key" data-key="2">2</button>
            <button class="passcode-key" data-key="3">3</button>
            <button class="passcode-key" data-key="4">4</button>
            <button class="passcode-key" data-key="5">5</button>
            <button class="passcode-key" data-key="6">6</button>
            <button class="passcode-key" data-key="7">7</button>
            <button class="passcode-key" data-key="8">8</button>
            <button class="passcode-key" data-key="9">9</button>
            <button class="passcode-key action" data-key="clear">
              <svg viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
            </button>
            <button class="passcode-key" data-key="0">0</button>
            <button class="passcode-key action" data-key="delete">
              <svg viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
            </button>
          </div>
          
          <button class="touch-id-btn" id="touchIdBtn" style="display: none;">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z"/>
            </svg>
            Use Touch ID
          </button>
        </div>
        
        <p class="lock-screen__error" id="lockScreenError"></p>
      </div>
    `;

    document.body.appendChild(this.lockScreen);

    // Set up event listeners
    this.lockScreen.querySelectorAll('.passcode-key').forEach(key => {
      key.addEventListener('click', () => this.handleKeyPress(key.dataset.key));
    });

    // Touch ID button
    const touchIdBtn = this.lockScreen.querySelector('#touchIdBtn');
    touchIdBtn.addEventListener('click', () => this.authenticateWithTouchId());
  }

  /**
   * Creates the passcode setup modal.
   * @private
   */
  createSetupModal() {
    this.setupModal = document.createElement('div');
    this.setupModal.className = 'passcode-setup-modal';
    this.setupModal.innerHTML = `
      <div class="passcode-setup-modal__content">
        <p class="passcode-setup-modal__step" id="setupStep">Step 1 of 2</p>
        <h2 class="passcode-setup-modal__title" id="setupTitle">Enter a new passcode</h2>
        
        <div class="passcode-input">
          <div class="passcode-dots" id="setupDots">
            <div class="passcode-dot" data-index="0"></div>
            <div class="passcode-dot" data-index="1"></div>
            <div class="passcode-dot" data-index="2"></div>
            <div class="passcode-dot" data-index="3"></div>
          </div>
          
          <div class="passcode-keypad" id="setupKeypad">
            <button class="passcode-key" data-key="1">1</button>
            <button class="passcode-key" data-key="2">2</button>
            <button class="passcode-key" data-key="3">3</button>
            <button class="passcode-key" data-key="4">4</button>
            <button class="passcode-key" data-key="5">5</button>
            <button class="passcode-key" data-key="6">6</button>
            <button class="passcode-key" data-key="7">7</button>
            <button class="passcode-key" data-key="8">8</button>
            <button class="passcode-key" data-key="9">9</button>
            <button class="passcode-key action" data-key="cancel">Cancel</button>
            <button class="passcode-key" data-key="0">0</button>
            <button class="passcode-key action" data-key="delete">
              <svg viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
            </button>
          </div>
        </div>
        
        <p class="lock-screen__error" id="setupError"></p>
      </div>
    `;

    document.body.appendChild(this.setupModal);

    // Set up event listeners for setup modal
    this.setupModal.querySelectorAll('.passcode-key').forEach(key => {
      key.addEventListener('click', () => this.handleSetupKeyPress(key.dataset.key));
    });
  }

  /**
   * Sets up activity listeners for auto-lock timer reset.
   * @private
   */
  setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  /**
   * Handles user activity to reset auto-lock timer.
   * @private
   */
  handleActivity() {
    if (window.electronAPI?.security && this.config?.enabled) {
      window.electronAPI.security.resetTimer();
    }
  }

  /**
   * Shows the lock screen.
   */
  showLockScreen() {
    this.passcodeInput = '';
    this.updateDots();
    this.clearError();
    this.lockScreen.classList.remove('hidden');
    
    // Show Touch ID button if available and enabled
    const touchIdBtn = this.lockScreen.querySelector('#touchIdBtn');
    if (this.touchIdAvailable && this.config?.useTouchId) {
      touchIdBtn.style.display = 'flex';
      // Auto-trigger Touch ID
      setTimeout(() => this.authenticateWithTouchId(), 300);
    } else {
      touchIdBtn.style.display = 'none';
    }
  }

  /**
   * Hides the lock screen.
   */
  hideLockScreen() {
    this.lockScreen.classList.add('hidden');
    this.passcodeInput = '';
    this.updateDots();
  }

  /**
   * Handles keypad key press.
   * @param {string} key - The key pressed
   * @private
   */
  handleKeyPress(key) {
    if (key === 'clear') {
      this.passcodeInput = '';
    } else if (key === 'delete') {
      this.passcodeInput = this.passcodeInput.slice(0, -1);
    } else if (this.passcodeInput.length < 4) {
      this.passcodeInput += key;
    }

    this.updateDots();

    // Auto-submit when 4 digits entered
    if (this.passcodeInput.length === 4) {
      this.authenticateWithPasscode();
    }
  }

  /**
   * Updates the passcode dots display.
   * @param {HTMLElement} [container] - Optional container for dots
   * @private
   */
  updateDots(container = null) {
    const dots = (container || this.lockScreen).querySelectorAll('.passcode-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('filled', index < this.passcodeInput.length);
      dot.classList.remove('error');
    });
  }

  /**
   * Shows an error on the lock screen.
   * @param {string} message - Error message
   * @private
   */
  showError(message) {
    const errorEl = this.lockScreen.querySelector('#lockScreenError');
    errorEl.textContent = message;
    
    // Shake dots
    const dots = this.lockScreen.querySelectorAll('.passcode-dot');
    dots.forEach(dot => {
      dot.classList.add('error');
    });

    // Clear after delay
    setTimeout(() => {
      this.passcodeInput = '';
      this.updateDots();
    }, 500);
  }

  /**
   * Clears the error message.
   * @private
   */
  clearError() {
    const errorEl = this.lockScreen.querySelector('#lockScreenError');
    errorEl.textContent = '';
  }

  /**
   * Authenticates with passcode.
   * @private
   */
  async authenticateWithPasscode() {
    try {
      const result = await window.electronAPI.security.authenticatePasscode(this.passcodeInput);
      if (result.success) {
        this.hideLockScreen();
      } else {
        this.showError(result.error || 'Invalid passcode');
      }
    } catch (err) {
      this.showError('Authentication failed');
    }
  }

  /**
   * Authenticates with Touch ID.
   * @private
   */
  async authenticateWithTouchId() {
    try {
      const result = await window.electronAPI.security.authenticateTouchId();
      if (result.success) {
        this.hideLockScreen();
      } else {
        // Touch ID failed, user can still use passcode
        console.log('[LockScreen] Touch ID failed:', result.error);
      }
    } catch (err) {
      console.log('[LockScreen] Touch ID error:', err);
    }
  }

  /**
   * Opens the passcode setup modal.
   * @param {boolean} isChanging - Whether changing existing passcode
   */
  openSetupModal(isChanging = false) {
    this.isSettingUp = true;
    this.setupStep = 0;
    this.passcodeInput = '';
    this.newPasscode = '';
    
    this.updateSetupUI();
    this.setupModal.classList.add('visible');
  }

  /**
   * Closes the passcode setup modal.
   */
  closeSetupModal() {
    this.isSettingUp = false;
    this.setupModal.classList.remove('visible');
    this.passcodeInput = '';
    this.newPasscode = '';
  }

  /**
   * Updates the setup modal UI.
   * @private
   */
  updateSetupUI() {
    const stepEl = this.setupModal.querySelector('#setupStep');
    const titleEl = this.setupModal.querySelector('#setupTitle');
    const dotsContainer = this.setupModal.querySelector('#setupDots');
    
    if (this.setupStep === 0) {
      stepEl.textContent = 'Step 1 of 2';
      titleEl.textContent = 'Enter a new passcode';
    } else {
      stepEl.textContent = 'Step 2 of 2';
      titleEl.textContent = 'Confirm your passcode';
    }
    
    this.updateDots(dotsContainer);
  }

  /**
   * Handles keypad key press in setup modal.
   * @param {string} key - The key pressed
   * @private
   */
  handleSetupKeyPress(key) {
    const errorEl = this.setupModal.querySelector('#setupError');
    errorEl.textContent = '';

    if (key === 'cancel') {
      this.closeSetupModal();
      return;
    }

    if (key === 'delete') {
      this.passcodeInput = this.passcodeInput.slice(0, -1);
    } else if (this.passcodeInput.length < 4) {
      this.passcodeInput += key;
    }

    const dotsContainer = this.setupModal.querySelector('#setupDots');
    this.updateDots(dotsContainer);

    // Auto-proceed when 4 digits entered
    if (this.passcodeInput.length === 4) {
      if (this.setupStep === 0) {
        // Save first entry and move to confirm
        this.newPasscode = this.passcodeInput;
        this.passcodeInput = '';
        this.setupStep = 1;
        this.updateSetupUI();
      } else {
        // Verify confirmation matches
        if (this.passcodeInput === this.newPasscode) {
          this.completeSetup();
        } else {
          errorEl.textContent = 'Passcodes do not match';
          this.passcodeInput = '';
          this.setupStep = 0;
          this.newPasscode = '';
          setTimeout(() => this.updateSetupUI(), 500);
        }
      }
    }
  }

  /**
   * Completes the passcode setup.
   * @private
   */
  async completeSetup() {
    try {
      const result = await window.electronAPI.security.setupPasscode(this.newPasscode);
      if (result.success) {
        this.config = await window.electronAPI.security.getConfig();
        this.closeSetupModal();
        
        // Dispatch event to refresh settings UI
        window.dispatchEvent(new Event('security-config-changed'));
        
        // Optionally enable Touch ID
        if (this.touchIdAvailable) {
          this.promptTouchIdSetup();
        }
      } else {
        const errorEl = this.setupModal.querySelector('#setupError');
        errorEl.textContent = result.error || 'Setup failed';
      }
    } catch (err) {
      const errorEl = this.setupModal.querySelector('#setupError');
      errorEl.textContent = 'Setup failed';
    }
  }

  /**
   * Prompts user to enable Touch ID.
   * @private
   */
  async promptTouchIdSetup() {
    const enable = confirm('Would you like to enable Touch ID for faster unlocking?');
    if (enable) {
      await window.electronAPI.security.enableTouchId();
      this.config = await window.electronAPI.security.getConfig();
    }
  }

  /**
   * Locks the app manually.
   */
  async lock() {
    if (this.config?.enabled) {
      await window.electronAPI.security.lock();
      this.showLockScreen();
    }
  }

  /**
   * Disables security after passcode verification.
   * @param {string} passcode - Current passcode for verification
   */
  async disableSecurity(passcode) {
    const result = await window.electronAPI.security.disable(passcode);
    if (result.success) {
      this.config = await window.electronAPI.security.getConfig();
      return true;
    }
    throw new Error(result.error || 'Failed to disable security');
  }

  /**
   * Sets the auto-lock timeout.
   * @param {number} minutes - Minutes of inactivity (0 = disabled)
   */
  async setAutoLockTimeout(minutes) {
    await window.electronAPI.security.setAutoLock(minutes);
    this.config = await window.electronAPI.security.getConfig();
  }

  /**
   * Toggles Touch ID on/off.
   * @param {boolean} enabled - Whether to enable Touch ID
   */
  async setTouchIdEnabled(enabled) {
    if (enabled) {
      await window.electronAPI.security.enableTouchId();
    } else {
      await window.electronAPI.security.disableTouchId();
    }
    this.config = await window.electronAPI.security.getConfig();
  }
}

// Export singleton instance
export const lockScreenManager = new LockScreenManager();
