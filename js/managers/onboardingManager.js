// onboardingManager.js
// First-time user onboarding flow

export class OnboardingManager {
  constructor() {
    this.storageKey = 'simnote_onboarding_complete';
    this.currentStep = 0;
    this.steps = [
      {
        title: 'Welcome to Simnote! 📝',
        content: 'Your personal journaling companion. Let\'s take a quick tour of the features.',
        target: null,
        position: 'center'
      },
      {
        title: 'Start Journaling 🖋️',
        content: 'Click here to create a new journal entry. Choose a template and capture your thoughts.',
        target: '#new-entry-btn',
        position: 'right'
      },
      {
        title: 'View Your Entries 📚',
        content: 'Access all your past entries here. Search, filter by date, or sort by mood.',
        target: '#load-entry-btn',
        position: 'right'
      },
      {
        title: 'Track Your Progress 📊',
        content: 'View your journaling insights - streaks, mood trends, and writing statistics.',
        target: '#stats-btn',
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
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <h3>${step.title}</h3>
        <p>${step.content}</p>
        <div class="tooltip-actions">
          <span class="tooltip-progress">${stepIndex + 1} / ${this.steps.length}</span>
          <div class="tooltip-buttons">
            ${stepIndex > 0 ? '<button class="tooltip-btn prev">Back</button>' : ''}
            ${stepIndex < this.steps.length - 1 
              ? '<button class="tooltip-btn next">Next</button>' 
              : '<button class="tooltip-btn finish">Get Started</button>'}
          </div>
        </div>
        <button class="tooltip-skip">Skip Tour</button>
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
      skipBtn.addEventListener('click', () => this.complete());
    }
  }

  positionTooltip(tooltip, step) {
    if (step.position === 'center' || !step.target) {
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
  }

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.id = 'onboarding-overlay';
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
  }

  reset() {
    localStorage.removeItem(this.storageKey);
  }
}
