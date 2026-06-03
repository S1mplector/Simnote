// lockScreenManager.js
// Manages the lock screen UI and security settings for Simnote

import { t } from '../core/i18n.js';

class LockScreenManager {
  constructor() {
    this.lockScreen = null;
    this.setupModal = null;
    this.confirmModal = null;
    this.confirmModalState = null;

    this.passcodeInput = '';
    this.isSettingUp = false;
    this.setupFlow = 'setup';
    this.setupStep = 0;
    this.setupSteps = [];
    this.setupBusy = false;
    this.currentPasscode = '';
    this.newPasscode = '';

    this.touchIdAvailable = false;
    this.config = null;

    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleActivity = this.handleActivity.bind(this);
    this.handleLanguageChange = this.handleLanguageChange.bind(this);
  }

  async init() {
    if (!window.electronAPI?.security) {
      console.log('[LockScreen] Not in Electron, skipping security init');
      return;
    }

    this.config = await window.electronAPI.security.getConfig();
    this.touchIdAvailable = await window.electronAPI.security.isTouchIdAvailable();

    this.createLockScreen();
    this.createSetupModal();
    this.createConfirmModal();
    this.refreshCopy();

    window.electronAPI.security.onLocked(() => {
      this.showLockScreen();
    });

    this.setupActivityListeners();
    window.addEventListener('languageChanged', this.handleLanguageChange);

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

  createLockScreen() {
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
        <h1 class="lock-screen__title" id="lockScreenTitle"></h1>
        <p class="lock-screen__subtitle" id="lockScreenSubtitle"></p>

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
            <span id="touchIdBtnLabel"></span>
          </button>
        </div>

        <p class="lock-screen__error" id="lockScreenError"></p>
      </div>
    `;

    document.body.appendChild(this.lockScreen);

    this.lockScreen.querySelectorAll('.passcode-key').forEach(key => {
      key.addEventListener('click', () => this.handleKeyPress(key.dataset.key));
    });

    this.lockScreen.querySelector('#touchIdBtn')?.addEventListener('click', () => {
      this.authenticateWithTouchId();
    });
  }

  createSetupModal() {
    this.setupModal = document.createElement('div');
    this.setupModal.className = 'passcode-setup-modal';
    this.setupModal.innerHTML = `
      <div class="passcode-setup-modal__content">
        <p class="passcode-setup-modal__step" id="setupStep"></p>
        <h2 class="passcode-setup-modal__title" id="setupTitle"></h2>
        <p class="passcode-setup-modal__subtitle" id="setupSubtitle"></p>

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
            <button class="passcode-key action" data-key="cancel"></button>
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

    this.setupModal.querySelectorAll('.passcode-key').forEach(key => {
      key.addEventListener('click', () => this.handleSetupKeyPress(key.dataset.key));
    });

    this.setupModal.addEventListener('click', (event) => {
      if (event.target === this.setupModal && !this.setupBusy) {
        this.closeSetupModal();
      }
    });
  }

  createConfirmModal() {
    this.confirmModal = document.createElement('div');
    this.confirmModal.className = 'passcode-setup-modal security-confirm-modal';
    this.confirmModal.innerHTML = `
      <div class="passcode-setup-modal__content security-confirm-modal__content">
        <p class="passcode-setup-modal__step" id="securityConfirmStep"></p>
        <h2 class="passcode-setup-modal__title" id="securityConfirmTitle"></h2>
        <p class="passcode-setup-modal__subtitle" id="securityConfirmBody"></p>
        <div class="security-confirm-modal__actions">
          <button class="security-btn" id="securityConfirmCancel"></button>
          <button class="security-btn security-btn--primary" id="securityConfirmAccept"></button>
        </div>
      </div>
    `;

    document.body.appendChild(this.confirmModal);

    this.confirmModal.addEventListener('click', (event) => {
      if (event.target === this.confirmModal && !this.confirmModalState?.busy) {
        this.closeConfirmModal();
      }
    });

    this.confirmModal.querySelector('#securityConfirmCancel')?.addEventListener('click', () => {
      if (!this.confirmModalState?.busy) {
        this.closeConfirmModal();
      }
    });

    this.confirmModal.querySelector('#securityConfirmAccept')?.addEventListener('click', () => {
      this.handleConfirmAccept();
    });
  }

  setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  handleActivity() {
    if (window.electronAPI?.security && this.config?.enabled) {
      window.electronAPI.security.resetTimer();
    }
  }

  handleLanguageChange() {
    this.refreshCopy();
  }

  refreshCopy() {
    if (this.lockScreen) {
      this.lockScreen.querySelector('#lockScreenTitle').textContent = t('security.lockTitle');
      this.lockScreen.querySelector('#lockScreenSubtitle').textContent = t('security.lockSubtitle');
      this.lockScreen.querySelector('#touchIdBtnLabel').textContent = t('security.useTouchIdButton');
    }

    if (this.setupModal) {
      const cancelBtn = this.setupModal.querySelector('[data-key="cancel"]');
      if (cancelBtn) cancelBtn.textContent = t('common.cancel');
      if (this.isSettingUp) {
        this.updateSetupUI();
      }
    }

    this.renderConfirmModal();
  }

  showLockScreen() {
    this.passcodeInput = '';
    this.updateDots();
    this.clearLockError();
    this.refreshCopy();
    this.lockScreen.classList.remove('hidden');

    const touchIdBtn = this.lockScreen.querySelector('#touchIdBtn');
    if (this.touchIdAvailable && this.config?.useTouchId) {
      touchIdBtn.style.display = 'flex';
      setTimeout(() => this.authenticateWithTouchId(), 300);
    } else {
      touchIdBtn.style.display = 'none';
    }
  }

  hideLockScreen() {
    this.lockScreen.classList.add('hidden');
    this.passcodeInput = '';
    this.updateDots();
    this.clearLockError();
  }

  handleKeyPress(key) {
    if (key === 'clear') {
      this.passcodeInput = '';
    } else if (key === 'delete') {
      this.passcodeInput = this.passcodeInput.slice(0, -1);
    } else if (this.passcodeInput.length < 4) {
      this.passcodeInput += key;
    }

    this.updateDots();

    if (this.passcodeInput.length === 4) {
      this.authenticateWithPasscode();
    }
  }

  updateDots(container = null) {
    const dots = (container || this.lockScreen).querySelectorAll('.passcode-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('filled', index < this.passcodeInput.length);
      dot.classList.remove('error');
    });
  }

  flashDots(container) {
    container.querySelectorAll('.passcode-dot').forEach(dot => {
      dot.classList.add('error');
    });
  }

  clearLockError() {
    const errorEl = this.lockScreen?.querySelector('#lockScreenError');
    if (errorEl) errorEl.textContent = '';
  }

  clearSetupError() {
    const errorEl = this.setupModal?.querySelector('#setupError');
    if (errorEl) errorEl.textContent = '';
  }

  showLockError(message) {
    const errorEl = this.lockScreen?.querySelector('#lockScreenError');
    if (!errorEl) return;

    errorEl.textContent = message;
    this.flashDots(this.lockScreen);

    setTimeout(() => {
      this.passcodeInput = '';
      this.updateDots();
    }, 500);
  }

  showSetupError(message, { resetFlow = false } = {}) {
    const errorEl = this.setupModal?.querySelector('#setupError');
    if (!errorEl) return;

    errorEl.textContent = message;
    this.flashDots(this.setupModal);

    setTimeout(() => {
      this.passcodeInput = '';
      if (resetFlow) {
        this.currentPasscode = '';
        this.newPasscode = '';
        this.setupStep = 0;
      }
      this.updateSetupUI();
    }, 500);
  }

  normalizeSecurityError(error, fallbackKey) {
    const value = String(error || '').toLowerCase();
    if (value.includes('invalid passcode')) return t('security.invalidPasscode');
    if (value.includes('authentication failed')) return t('security.authFailed');
    return t(fallbackKey);
  }

  async authenticateWithPasscode() {
    try {
      const result = await window.electronAPI.security.authenticatePasscode(this.passcodeInput);
      if (result.success) {
        this.hideLockScreen();
      } else {
        this.showLockError(this.normalizeSecurityError(result.error, 'security.invalidPasscode'));
      }
    } catch (err) {
      console.error('[LockScreen] Passcode auth error:', err);
      this.showLockError(t('security.authFailed'));
    }
  }

  async authenticateWithTouchId() {
    try {
      const result = await window.electronAPI.security.authenticateTouchId();
      if (result.success) {
        this.hideLockScreen();
      } else {
        console.log('[LockScreen] Touch ID failed:', result.error);
      }
    } catch (err) {
      console.log('[LockScreen] Touch ID error:', err);
    }
  }

  getSetupSteps(flow) {
    if (flow === 'change') {
      return [
        { titleKey: 'security.currentTitle', subtitleKey: 'security.currentSubtitle' },
        { titleKey: 'security.newTitle', subtitleKey: 'security.newSubtitle' },
        { titleKey: 'security.changeConfirmTitle', subtitleKey: 'security.changeConfirmSubtitle' }
      ];
    }

    if (flow === 'disable') {
      return [
        { titleKey: 'security.disableTitle', subtitleKey: 'security.disableSubtitle' }
      ];
    }

    return [
      { titleKey: 'security.setupTitle', subtitleKey: 'security.setupSubtitle' },
      { titleKey: 'security.confirmTitle', subtitleKey: 'security.confirmSubtitle' }
    ];
  }

  openSetupModal(flow = 'setup') {
    this.isSettingUp = true;
    this.setupFlow = flow;
    this.setupStep = 0;
    this.setupSteps = this.getSetupSteps(flow);
    this.setupBusy = false;
    this.passcodeInput = '';
    this.currentPasscode = '';
    this.newPasscode = '';

    this.clearSetupError();
    this.updateSetupUI();
    this.setupModal.classList.add('visible');
  }

  openDisableModal() {
    this.openSetupModal('disable');
  }

  closeSetupModal() {
    this.isSettingUp = false;
    this.setupBusy = false;
    this.setupModal.classList.remove('visible');
    this.passcodeInput = '';
    this.currentPasscode = '';
    this.newPasscode = '';
    this.clearSetupError();
    this.updateDots(this.setupModal.querySelector('#setupDots'));
    this.setSetupBusy(false);
  }

  updateSetupUI() {
    if (!this.setupModal || !this.setupSteps.length) return;

    const stepEl = this.setupModal.querySelector('#setupStep');
    const titleEl = this.setupModal.querySelector('#setupTitle');
    const subtitleEl = this.setupModal.querySelector('#setupSubtitle');
    const dotsContainer = this.setupModal.querySelector('#setupDots');
    const total = this.setupSteps.length;
    const step = this.setupSteps[this.setupStep] || this.setupSteps[0];

    stepEl.textContent = total > 1
      ? t('security.stepLabel', { current: this.setupStep + 1, total })
      : t('security.title');
    titleEl.textContent = t(step.titleKey);
    subtitleEl.textContent = t(step.subtitleKey);

    this.updateDots(dotsContainer);
  }

  setSetupBusy(isBusy) {
    this.setupBusy = isBusy;
    this.setupModal?.querySelectorAll('.passcode-key').forEach(button => {
      button.disabled = isBusy;
    });
  }

  handleSetupMismatch() {
    const errorEl = this.setupModal?.querySelector('#setupError');
    if (!errorEl) return;

    errorEl.textContent = t('security.passcodesDoNotMatch');
    this.flashDots(this.setupModal);

    setTimeout(() => {
      this.passcodeInput = '';
      this.newPasscode = '';
      this.setupStep = this.setupFlow === 'change' ? 1 : 0;
      this.updateSetupUI();
    }, 500);
  }

  handleSetupKeyPress(key) {
    if (this.setupBusy) return;

    this.clearSetupError();

    if (key === 'cancel') {
      this.closeSetupModal();
      return;
    }

    if (key === 'delete') {
      this.passcodeInput = this.passcodeInput.slice(0, -1);
    } else if (this.passcodeInput.length < 4) {
      this.passcodeInput += key;
    }

    this.updateDots(this.setupModal.querySelector('#setupDots'));

    if (this.passcodeInput.length === 4) {
      void this.handleCompletedSetupStep();
    }
  }

  async handleCompletedSetupStep() {
    if (this.setupFlow === 'disable') {
      this.currentPasscode = this.passcodeInput;
      await this.completeSetup();
      return;
    }

    if (this.setupFlow === 'change' && this.setupStep === 0) {
      this.currentPasscode = this.passcodeInput;
      this.passcodeInput = '';
      this.setupStep = 1;
      this.updateSetupUI();
      return;
    }

    if ((this.setupFlow === 'setup' && this.setupStep === 0) || (this.setupFlow === 'change' && this.setupStep === 1)) {
      this.newPasscode = this.passcodeInput;
      this.passcodeInput = '';
      this.setupStep += 1;
      this.updateSetupUI();
      return;
    }

    if (this.passcodeInput !== this.newPasscode) {
      this.handleSetupMismatch();
      return;
    }

    await this.completeSetup();
  }

  async completeSetup() {
    const flow = this.setupFlow;
    this.setSetupBusy(true);

    try {
      let result;

      if (flow === 'change') {
        result = await window.electronAPI.security.changePasscode(this.currentPasscode, this.newPasscode);
      } else if (flow === 'disable') {
        result = await window.electronAPI.security.disable(this.currentPasscode);
      } else {
        result = await window.electronAPI.security.setupPasscode(this.newPasscode);
      }

      if (!result.success) {
        const fallbackKey = flow === 'change'
          ? 'security.changeFailed'
          : flow === 'disable'
            ? 'security.disableFailed'
            : 'security.setupFailed';
        this.showSetupError(this.normalizeSecurityError(result.error, fallbackKey), {
          resetFlow: flow !== 'setup'
        });
        return;
      }

      this.config = await window.electronAPI.security.getConfig();
      this.closeSetupModal();
      window.dispatchEvent(new Event('security-config-changed'));

      if (flow === 'change') {
        window.showPopup?.(t('security.changeSuccess'));
        return;
      }

      if (flow === 'disable') {
        window.showPopup?.(t('security.disableSuccess'));
        return;
      }

      window.showPopup?.(t('security.passcodeSet'));
      if (this.touchIdAvailable) {
        this.promptTouchIdSetup();
      }
    } catch (err) {
      console.error('[LockScreen] Security flow failed:', err);
      const fallbackKey = flow === 'change'
        ? 'security.changeFailed'
        : flow === 'disable'
          ? 'security.disableFailed'
          : 'security.setupFailed';
      this.showSetupError(t(fallbackKey), { resetFlow: flow !== 'setup' });
    } finally {
      this.setSetupBusy(false);
    }
  }

  showConfirmModal({ titleKey, bodyKey, confirmKey, cancelKey, onConfirm }) {
    this.confirmModalState = {
      titleKey,
      bodyKey,
      confirmKey,
      cancelKey,
      onConfirm,
      busy: false
    };
    this.renderConfirmModal();
    this.confirmModal.classList.add('visible');
  }

  renderConfirmModal() {
    if (!this.confirmModal || !this.confirmModalState) return;

    const { titleKey, bodyKey, confirmKey, cancelKey, busy } = this.confirmModalState;
    this.confirmModal.querySelector('#securityConfirmStep').textContent = t('security.title');
    this.confirmModal.querySelector('#securityConfirmTitle').textContent = t(titleKey);
    this.confirmModal.querySelector('#securityConfirmBody').textContent = t(bodyKey);
    this.confirmModal.querySelector('#securityConfirmCancel').textContent = t(cancelKey);
    this.confirmModal.querySelector('#securityConfirmAccept').textContent = t(confirmKey);
    this.confirmModal.querySelectorAll('button').forEach(button => {
      button.disabled = busy;
    });
  }

  closeConfirmModal() {
    this.confirmModal.classList.remove('visible');
    this.confirmModalState = null;
  }

  async handleConfirmAccept() {
    if (!this.confirmModalState?.onConfirm || this.confirmModalState.busy) return;

    this.confirmModalState.busy = true;
    this.renderConfirmModal();

    try {
      await this.confirmModalState.onConfirm();
      this.closeConfirmModal();
    } catch (err) {
      console.error('[LockScreen] Confirm action failed:', err);
      this.closeConfirmModal();
    }
  }

  promptTouchIdSetup() {
    this.showConfirmModal({
      titleKey: 'security.touchIdPromptTitle',
      bodyKey: 'security.touchIdPromptBody',
      confirmKey: 'security.touchIdEnable',
      cancelKey: 'security.touchIdLater',
      onConfirm: async () => {
        try {
          await window.electronAPI.security.enableTouchId();
          this.config = await window.electronAPI.security.getConfig();
          window.dispatchEvent(new Event('security-config-changed'));
        } catch (err) {
          console.error('[LockScreen] Failed to enable Touch ID:', err);
          window.showPopup?.(t('security.touchIdFailed'));
        }
      }
    });
  }

  async lock() {
    if (this.config?.enabled) {
      await window.electronAPI.security.lock();
      this.showLockScreen();
    }
  }

  async disableSecurity(passcode) {
    const result = await window.electronAPI.security.disable(passcode);
    if (result.success) {
      this.config = await window.electronAPI.security.getConfig();
      return true;
    }
    throw new Error(result.error || t('security.disableFailed'));
  }

  async setAutoLockTimeout(minutes) {
    await window.electronAPI.security.setAutoLock(minutes);
    this.config = await window.electronAPI.security.getConfig();
  }

  async setTouchIdEnabled(enabled) {
    if (enabled) {
      await window.electronAPI.security.enableTouchId();
    } else {
      await window.electronAPI.security.disableTouchId();
    }
    this.config = await window.electronAPI.security.getConfig();
  }
}

export const lockScreenManager = new LockScreenManager();
