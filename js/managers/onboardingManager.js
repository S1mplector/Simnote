// onboardingManager.js
// First-time user onboarding flow
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module provides a guided onboarding experience for first-time users.
// Features include:
// - Multi-step tutorial with progress tracking
// - Targeted highlighting of UI elements
// - Responsive tooltip positioning
// - Skip functionality and keyboard support (Escape)
// - One-time display via localStorage flag
//
// STEPS:
// 1. Welcome message (centered)
// 2. Journal drawer highlight
// 3. Entries drawer highlight
// 4. Moods drawer highlight
// 5. Settings button highlight
// 6. Completion message
//
// DEPENDENCIES:
// - localStorage for completion tracking
// - DOM APIs for positioning and overlay

/**
 * Manages first-time user onboarding flow.
 * Shows guided tooltips highlighting key features.
 * 
 * @class OnboardingManager
 */
export class OnboardingManager {
  /**
   * Creates OnboardingManager with step definitions.
   * @constructor
   */
  constructor() {
    /** @type {string} localStorage key for completion status */
    this.storageKey = 'simnote_onboarding_complete';
    /** @type {number} Current step index */
    this.currentStep = 0;
    /** @type {Function|null} Escape key handler reference */
    this.keyHandler = null;
    /** @type {Function|null} Window resize handler reference */
    this.resizeHandler = null;
    /** @type {Array<{title: string, content: string, target: string|null, position: string}>} */
    this.steps = [
      {
        title: 'Welcome to Simnote! 📝',
        content: 'Your personal journaling companion. Let\'s take a quick tour of the features.',
        target: null,
        position: 'center'
      },
      {
        title: 'Daily Inspiration 💭',
        content: 'Tap the quote card for a daily dose of inspiration. Favorite quotes you love with ❤️ and view them anytime.',
        target: '#quote-card',
        position: 'left'
      },
      {
        title: 'Start Journaling 🖋️',
        content: 'Open the top drawer to start a new journal entry and capture your thoughts.',
        target: '.chest__drawer[data-action="journal"] .drawer__panel--front',
        position: 'right'
      },
      {
        title: 'View Your Entries 📚',
        content: 'Pull the middle drawer to browse past entries, search, and filter.',
        target: '.chest__drawer[data-action="entries"] .drawer__panel--front',
        position: 'right'
      },
      {
        title: 'Track Your Moods 😊',
        content: 'Open the bottom drawer to see mood trends and insights.',
        target: '.chest__drawer[data-action="moods"] .drawer__panel--front',
        position: 'right'
      },
      {
        title: 'Customize Your Space ⚙️',
        content: 'Change themes, export your data, and personalize your experience.',
        target: '#theme-settings-btn',
        position: 'right'
      },
      {
        title: 'You\'re All Set! 🎉',
        content: 'Start your journaling journey today. Press Shift + ? anytime to see keyboard shortcuts.',
        target: null,
        position: 'center'
      }
    ];
  }

  /**
   * Checks if onboarding should be shown.
   * @returns {boolean} True if not yet completed
   */
  shouldShowOnboarding() {
    return !localStorage.getItem(this.storageKey);
  }

  /**
   * Starts the onboarding flow after splash animation.
   * Shows confirmation prompt before beginning tour.
   */
  start() {
    if (!this.shouldShowOnboarding()) return;
    
    setTimeout(() => {
      this.showWelcomePrompt();
    }, 4000);
  }

  /**
   * Shows subtle first-time hint at top left.
   * @private
   */
  showWelcomePrompt() {
    const hint = document.createElement('div');
    hint.className = 'onboarding-first-time-hint';
    hint.innerHTML = `
      <span class="first-time-hint-text">First time at Simnote? Hover here to start the tutorial!</span>
      <div class="first-time-hint-actions">
        <button class="first-time-hint-btn first-time-hint-btn--start">Start Tour</button>
        <button class="first-time-hint-btn first-time-hint-btn--dismiss">✕</button>
      </div>
    `;
    
    document.body.appendChild(hint);
    
    // Animate in
    requestAnimationFrame(() => hint.classList.add('visible'));
    
    // Show actions on hover
    hint.addEventListener('mouseenter', () => hint.classList.add('expanded'));
    hint.addEventListener('mouseleave', () => hint.classList.remove('expanded'));
    
    // Bind events
    hint.querySelector('.first-time-hint-btn--dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissHint(hint);
      this.complete();
    });
    
    hint.querySelector('.first-time-hint-btn--start').addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissHint(hint);
      this.showStep(0);
    });
    
    // Auto-dismiss after 15 seconds if not interacted
    this.hintTimer = setTimeout(() => {
      if (hint.parentNode) {
        this.dismissHint(hint);
        this.complete();
      }
    }, 15000);
  }

  /**
   * Dismisses the first-time hint.
   * @param {HTMLElement} hint - Hint element to remove
   * @private
   */
  dismissHint(hint) {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    hint.classList.remove('visible');
    setTimeout(() => hint.remove(), 300);
  }

  /**
   * Shows a specific onboarding step.
   * @param {number} stepIndex - Step index to show
   */
  showStep(stepIndex) {
    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];
    
    // Remove existing tooltip
    this.removeTooltip();
    
    // Ensure overlay exists for all steps
    this.createOverlay();
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'onboarding-tooltip';
    const progress = (stepIndex + 1) / this.steps.length;
    tooltip.style.setProperty('--progress', progress.toFixed(3));
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <div class="tooltip-header">
          <span class="tooltip-step">Step ${stepIndex + 1} of ${this.steps.length}</span>
          <button class="tooltip-skip" type="button">Skip</button>
        </div>
        <h3>${step.title}</h3>
        <p>${step.content}</p>
        <div class="tooltip-progress-bar" aria-hidden="true">
          <span class="tooltip-progress-fill"></span>
        </div>
        <div class="tooltip-actions">
          <div class="tooltip-buttons">
            ${stepIndex > 0 ? '<button class="tooltip-btn prev">Back</button>' : ''}
            ${stepIndex < this.steps.length - 1 
              ? '<button class="tooltip-btn next">Next</button>' 
              : '<button class="tooltip-btn finish">Get Started</button>'}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    this.positionTooltip(tooltip, step);
    
    // Highlight target
    if (step.target) {
      const target = document.querySelector(step.target);
      if (target) {
        target.classList.add('onboarding-highlight');
      }
    }

    this.updateOverlaySpotlight(step);
    
    // Animate in
    requestAnimationFrame(() => tooltip.classList.add('visible'));
    
    // Event handlers
    const nextBtn = tooltip.querySelector('.next');
    const prevBtn = tooltip.querySelector('.prev');
    const finishBtn = tooltip.querySelector('.finish');
    const skipBtn = tooltip.querySelector('.tooltip-skip');
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.next());
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prev());
    }
    if (finishBtn) {
      finishBtn.addEventListener('click', () => this.complete());
    }
    if (skipBtn) {
      skipBtn.addEventListener('click', (event) => {
        event.preventDefault();
        this.complete();
      });
    }

    if (!this.keyHandler) {
      this.keyHandler = (event) => {
        if (event.key === 'Escape') {
          this.complete();
        }
      };
      document.addEventListener('keydown', this.keyHandler);
    }

    if (!this.resizeHandler) {
      this.resizeHandler = () => {
        const current = this.steps[this.currentStep];
        if (current) {
          this.updateOverlaySpotlight(current);
        }
      };
      window.addEventListener('resize', this.resizeHandler);
    }
  }

  /**
   * Positions tooltip relative to target element.
   * Falls back to center if target not found or on small screens.
   * 
   * @param {HTMLElement} tooltip - Tooltip element
   * @param {Object} step - Step definition with target and position
   * @private
   */
  positionTooltip(tooltip, step) {
    tooltip.classList.remove('arrow-left', 'arrow-right', 'arrow-top', 'arrow-bottom');

    if (step.position === 'center' || !step.target || window.innerWidth < 720) {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }
    
    const target = document.querySelector(step.target);
    if (!target) {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }
    
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    switch (step.position) {
      case 'right':
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        tooltip.style.left = `${rect.right + 20}px`;
        tooltip.style.transform = 'translateY(-50%)';
        tooltip.classList.add('arrow-left');
        break;
      case 'left':
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        tooltip.style.left = `${rect.left - tooltipRect.width - 20}px`;
        tooltip.style.transform = 'translateY(-50%)';
        tooltip.classList.add('arrow-right');
        break;
      case 'bottom':
        tooltip.style.top = `${rect.bottom + 20}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.classList.add('arrow-top');
        break;
      case 'top':
        tooltip.style.top = `${rect.top - tooltipRect.height - 20}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.classList.add('arrow-bottom');
        break;
    }

    const bounds = tooltip.getBoundingClientRect();
    const margin = 12;
    if (
      bounds.left < margin ||
      bounds.right > window.innerWidth - margin ||
      bounds.top < margin ||
      bounds.bottom > window.innerHeight - margin
    ) {
      tooltip.classList.remove('arrow-left', 'arrow-right', 'arrow-top', 'arrow-bottom');
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }
  }

  /**
   * Creates the semi-transparent background overlay.
   * @private
   */
  createOverlay() {
    let overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
      requestAnimationFrame(() => overlay.classList.add('visible'));
      return;
    }

    overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.id = 'onboarding-overlay';
    overlay.dataset.spotlight = 'off';
    overlay.innerHTML = `
      <div class="onboarding-overlay__slice onboarding-overlay__slice--top"></div>
      <div class="onboarding-overlay__slice onboarding-overlay__slice--left"></div>
      <div class="onboarding-overlay__slice onboarding-overlay__slice--right"></div>
      <div class="onboarding-overlay__slice onboarding-overlay__slice--bottom"></div>
      <div class="onboarding-overlay__spotlight" aria-hidden="true"></div>
    `;
    overlay.querySelectorAll('.onboarding-overlay__slice').forEach(slice => {
      slice.addEventListener('click', () => this.complete());
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  updateOverlaySpotlight(step) {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    const target = step?.target ? document.querySelector(step.target) : null;
    if (!target || step.position === 'center') {
      overlay.dataset.spotlight = 'off';
      overlay.style.setProperty('--spotlight-top', '0px');
      overlay.style.setProperty('--spotlight-left', '0px');
      overlay.style.setProperty('--spotlight-width', '0px');
      overlay.style.setProperty('--spotlight-height', '0px');
      overlay.style.setProperty('--spotlight-radius', '0px');
      return;
    }

    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      overlay.dataset.spotlight = 'off';
      return;
    }

    const padding = 14;
    const top = Math.max(0, rect.top - padding);
    const left = Math.max(0, rect.left - padding);
    const width = Math.min(window.innerWidth - left, rect.width + padding * 2);
    const height = Math.min(window.innerHeight - top, rect.height + padding * 2);
    const computedRadius = parseFloat(getComputedStyle(target).borderRadius) || 10;
    const radius = Math.max(8, computedRadius + Math.round(padding / 2));

    overlay.dataset.spotlight = 'on';
    overlay.style.setProperty('--spotlight-top', `${Math.round(top)}px`);
    overlay.style.setProperty('--spotlight-left', `${Math.round(left)}px`);
    overlay.style.setProperty('--spotlight-width', `${Math.round(width)}px`);
    overlay.style.setProperty('--spotlight-height', `${Math.round(height)}px`);
    overlay.style.setProperty('--spotlight-radius', `${Math.round(radius)}px`);
  }

  /**
   * Removes tooltip and target highlights.
   * @private
   */
  removeTooltip() {
    const tooltip = document.querySelector('.onboarding-tooltip');
    if (tooltip) tooltip.remove();
    
    // Remove highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
  }

  /**
   * Advances to next step.
   */
  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    }
  }

  /**
   * Goes back to previous step.
   */
  prev() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  /**
   * Completes onboarding, saving flag to localStorage.
   */
  complete() {
    localStorage.setItem(this.storageKey, 'true');
    this.removeTooltip();
    
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 300);
    }

    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  /**
   * Resets onboarding to show again.
   */
  reset() {
    localStorage.removeItem(this.storageKey);
  }
}
