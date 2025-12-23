// moodsSmileyAnimator.js
// Animated smiley face icon for stats button
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This animator replaces the stats button icon with an animated
// smiley face that responds to hover. Features:
// - Sleeping state with animated ZZZs
// - Wake-up animation on hover
// - Eye tracking following cursor
// - Auto-sleep after timeout
//
// STATES:
// - sleeping: Eyes closed, ZZZs floating
// - waking: Eyes opening transition
// - awake: Eyes open, tracking cursor
//
// DEPENDENCIES:
// - Stats button with id 'stats-btn'
// - CSS animations for transitions

/**
 * Animated smiley face for stats button.
 * Eyes track cursor, sleeps when idle.
 * 
 * @class MoodsSmileyAnimator
 */
export class MoodsSmileyAnimator {
  /**
   * Creates MoodsSmileyAnimator and replaces icon.
   * @constructor
   */
  constructor() {
    /** @type {HTMLElement} Stats button element */
    this.statsBtn = document.getElementById('stats-btn');
    if (!this.statsBtn) return;

    this.state = 'sleeping'; // sleeping, waking, awake, sleeping-back
    this.awakeTimeout = null;
    this.trackingInterval = null;
    this.isTracking = false;
    
    this.replaceSmileyIcon();
    this.attachEventListeners();
  }

  replaceSmileyIcon() {
    const svg = this.statsBtn.querySelector('.nav-icon-svg');
    if (!svg) return;

    const smileyContainer = document.createElement('div');
    smileyContainer.className = 'moods-smiley sleeping';
    smileyContainer.innerHTML = `
      <div class="moods-smiley-face"></div>
      <div class="moods-smiley-eye left">
        <div class="moods-smiley-pupil"></div>
      </div>
      <div class="moods-smiley-eye right">
        <div class="moods-smiley-pupil"></div>
      </div>
      <div class="moods-smiley-mouth"></div>
      <div class="moods-smiley-zzz">z</div>
      <div class="moods-smiley-zzz">z</div>
      <div class="moods-smiley-zzz">z</div>
    `;

    svg.replaceWith(smileyContainer);
    this.smiley = smileyContainer;
    this.leftPupil = smileyContainer.querySelector('.moods-smiley-eye.left .moods-smiley-pupil');
    this.rightPupil = smileyContainer.querySelector('.moods-smiley-eye.right .moods-smiley-pupil');
  }

  attachEventListeners() {
    this.statsBtn.addEventListener('mouseenter', () => this.onHover());
    this.statsBtn.addEventListener('mouseleave', () => this.onLeave());
  }

  onHover() {
    if (this.state === 'sleeping') {
      this.wakeUp();
    }
    
    clearTimeout(this.awakeTimeout);
  }

  onLeave() {
    clearTimeout(this.awakeTimeout);
    
    if (this.state === 'awake' || this.state === 'waking') {
      this.awakeTimeout = setTimeout(() => {
        this.goBackToSleep();
      }, 3000);
    }
  }

  wakeUp() {
    this.state = 'waking';
    this.smiley.classList.remove('sleeping');
    this.smiley.classList.add('waking');

    setTimeout(() => {
      this.smiley.classList.remove('waking');
      this.smiley.classList.add('awake');
      this.state = 'awake';
      this.startTracking();
      
      this.awakeTimeout = setTimeout(() => {
        this.goBackToSleep();
      }, 5000);
    }, 600);
  }

  goBackToSleep() {
    this.stopTracking();
    this.state = 'sleeping';
    this.smiley.classList.remove('awake', 'waking');
    this.smiley.classList.add('sleeping');
    
    if (this.leftPupil && this.rightPupil) {
      this.leftPupil.style.transform = 'translate(-50%, -50%)';
      this.rightPupil.style.transform = 'translate(-50%, -50%)';
    }
  }

  startTracking() {
    if (this.isTracking) return;
    this.isTracking = true;

    const trackCursor = (e) => {
      if (this.state !== 'awake') return;

      const btnRect = this.statsBtn.getBoundingClientRect();
      const btnCenterX = btnRect.left + btnRect.width / 2;
      const btnCenterY = btnRect.top + btnRect.height / 2;

      const deltaX = e.clientX - btnCenterX;
      const deltaY = e.clientY - btnCenterY;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 200;
      const clampedDistance = Math.min(distance, maxDistance);

      const angle = Math.atan2(deltaY, deltaX);
      
      const maxPupilMove = 0.8;
      const moveX = Math.cos(angle) * (clampedDistance / maxDistance) * maxPupilMove;
      const moveY = Math.sin(angle) * (clampedDistance / maxDistance) * maxPupilMove;

      if (this.leftPupil && this.rightPupil) {
        this.leftPupil.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
        this.rightPupil.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
      }
    };

    this.trackingHandler = trackCursor;
    document.addEventListener('mousemove', this.trackingHandler);
  }

  stopTracking() {
    if (!this.isTracking) return;
    this.isTracking = false;

    if (this.trackingHandler) {
      document.removeEventListener('mousemove', this.trackingHandler);
      this.trackingHandler = null;
    }
  }

  destroy() {
    clearTimeout(this.awakeTimeout);
    this.stopTracking();
  }
}
