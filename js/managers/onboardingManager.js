// onboardingManager.js
// First-time user onboarding flow

export class OnboardingManager {
  constructor() {
    this.storageKey = 'simnote_onboarding_complete';
    this.currentStep = 0;
    this.keyHandler = null;
    this.steps = [
      {
        title: 'Welcome to Simnote! 📝',
        content: 'Your personal journaling companion. Let\'s take a quick tour of the features.',
        target: null,
        position: 'center'
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

  shouldShowOnboarding() {
    return !localStorage.getItem(this.storageKey);
  }

  start() {
    if (!this.shouldShowOnboarding()) return;
    
    // Wait for splash animation to complete
    setTimeout(() => {
      this.showStep(0);
    }, 4000);
  }

  showStep(stepIndex) {
    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];
    
    // Remove existing tooltip
    this.removeTooltip();
    
    // Create overlay if first step
    if (stepIndex === 0) {
      this.createOverlay();
    }
    
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
  }

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

  createOverlay() {
    let overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
      requestAnimationFrame(() => overlay.classList.add('visible'));
      return;
    }

    overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.id = 'onboarding-overlay';
    overlay.addEventListener('click', () => this.complete());
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  removeTooltip() {
    const tooltip = document.querySelector('.onboarding-tooltip');
    if (tooltip) tooltip.remove();
    
    // Remove highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    }
  }

  prev() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

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
  }

  reset() {
    localStorage.removeItem(this.storageKey);
  }
}
