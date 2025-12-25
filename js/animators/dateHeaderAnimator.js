// dateHeaderAnimator.js
// Time-of-day themed header background animation
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This animator creates dynamic backgrounds for the mood panel header
// based on time of day. Features:
// - Morning/afternoon/evening/night themes
// - Animated clouds for daytime
// - Pulsing sun with rays for morning/afternoon
// - Glowing moon with craters for night
// - Twinkling stars and shooting stars for nighttime
// - CSS class-based theming
//
// TIME SLOTS:
// - morning (5-12): Warm sunrise theme with sun
// - afternoon (12-18): Blue sky with clouds and sun
// - evening (18-22): Sunset theme with setting sun
// - night (22-5): Dark theme with moon, stars, shooting stars
//
// DEPENDENCIES:
// - Header element with .date-bg child

/**
 * Time-of-day themed header animator.
 * Creates dynamic visual elements based on current hour.
 * 
 * @class DateHeaderAnimator
 */
export class DateHeaderAnimator {
  /**
   * Creates DateHeaderAnimator for a header element.
   * @param {HTMLElement} headerEl - The header element to animate
   * @constructor
   */
  constructor(headerEl) {
    /** @type {HTMLElement} Header element */
    this.header = headerEl;
    /** @type {HTMLElement|null} Background container */
    this.bg = headerEl.querySelector('.date-bg');
    /** @type {string} Current time slot */
    this.currentSlot = null;
    /** @type {number|null} Shooting star interval ID */
    this.shootingStarInterval = null;
    
    if (!this.bg) return;
    this.init();
  }

  /**
   * Initializes the animator based on current time.
   */
  init() {
    const hour = new Date().getHours();
    let slot;
    if (hour >= 5 && hour < 12) slot = 'morning';
    else if (hour >= 12 && hour < 18) slot = 'afternoon';
    else if (hour >= 18 && hour < 22) slot = 'evening';
    else slot = 'night';

    this.currentSlot = slot;
    this.header.classList.remove('morning', 'afternoon', 'evening', 'night');
    this.header.classList.add(slot);

    // Clear any existing intervals
    if (this.shootingStarInterval) {
      clearInterval(this.shootingStarInterval);
      this.shootingStarInterval = null;
    }

    // Create theme-specific elements
    switch (slot) {
      case 'morning':
        this.createSun();
        this.createSunRays();
        break;
      case 'afternoon':
        this.createSun();
        this.createClouds();
        break;
      case 'evening':
        this.createSettingSun();
        break;
      case 'night':
        this.createMoon();
        this.createStars();
        this.startShootingStars();
        break;
    }
  }

  /**
   * Creates a pulsing sun element.
   */
  createSun() {
    const sun = document.createElement('div');
    sun.className = 'sun';
    this.bg.appendChild(sun);
  }

  /**
   * Creates animated sun rays for morning.
   */
  createSunRays() {
    const raysContainer = document.createElement('div');
    raysContainer.className = 'sun-rays';

    // Create 12 rays
    for (let i = 0; i < 12; i++) {
      const ray = document.createElement('div');
      ray.className = 'sun-ray';
      ray.style.transform = `rotate(${i * 30}deg)`;
      raysContainer.appendChild(ray);
    }

    this.bg.appendChild(raysContainer);
  }

  /**
   * Creates a setting sun for evening.
   */
  createSettingSun() {
    const sun = document.createElement('div');
    sun.className = 'sun';
    this.bg.appendChild(sun);
  }

  /**
   * Creates animated cloud elements.
   */
  createClouds() {
    const cloudPath = 'M25 10 Q30 0 40 5 Q50 0 55 10 Q65 8 65 18 Q65 28 55 28 L15 28 Q5 28 5 18 Q5 10 15 10 Q18 5 25 10 Z';
    
    const cloudConfigs = [
      { width: 100, top: 8, delay: 0, duration: 35 },
      { width: 140, top: 45, delay: 8, duration: 45 },
      { width: 80, top: 25, delay: 15, duration: 30 },
    ];

    cloudConfigs.forEach((config) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 70 35');
      svg.classList.add('cloud');
      svg.style.width = config.width + 'px';
      svg.style.top = config.top + '%';
      svg.style.left = '-150px';
      svg.style.animationDuration = config.duration + 's';
      svg.style.animationDelay = config.delay + 's';

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', cloudPath);
      svg.appendChild(path);
      this.bg.appendChild(svg);
    });
  }

  /**
   * Creates a glowing moon with craters.
   */
  createMoon() {
    const moon = document.createElement('div');
    moon.className = 'moon';

    // Add craters
    const craters = [
      { size: 6, left: 20, top: 15 },
      { size: 4, left: 45, top: 35 },
      { size: 8, left: 30, top: 55 },
      { size: 3, left: 60, top: 20 },
    ];

    craters.forEach((crater) => {
      const c = document.createElement('div');
      c.className = 'moon-crater';
      c.style.width = crater.size + 'px';
      c.style.height = crater.size + 'px';
      c.style.left = crater.left + '%';
      c.style.top = crater.top + '%';
      moon.appendChild(c);
    });

    this.bg.appendChild(moon);
  }

  /**
   * Creates twinkling star elements.
   */
  createStars() {
    const starCount = 45;

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('span');
      const isLarge = Math.random() < 0.15;
      star.className = isLarge ? 'star large' : 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
      star.style.animationDuration = (3 + Math.random() * 4) + 's';
      this.bg.appendChild(star);
    }
  }

  /**
   * Starts periodic shooting star animations.
   */
  startShootingStars() {
    // Create initial shooting star after a delay
    setTimeout(() => this.createShootingStar(), 2000);

    // Create shooting stars periodically
    this.shootingStarInterval = setInterval(() => {
      if (Math.random() < 0.4) { // 40% chance every interval
        this.createShootingStar();
      }
    }, 5000);
  }

  /**
   * Creates a single shooting star animation.
   */
  createShootingStar() {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    
    // Random starting position in the upper portion
    star.style.left = (10 + Math.random() * 60) + '%';
    star.style.top = (5 + Math.random() * 30) + '%';
    
    // Random angle via transform
    const angle = -30 + Math.random() * 20; // -30 to -10 degrees
    star.style.transform = `rotate(${angle}deg)`;
    
    this.bg.appendChild(star);

    // Remove after animation completes
    setTimeout(() => {
      if (star.parentNode) {
        star.remove();
      }
    }, 2500);
  }

  /**
   * Cleans up intervals and elements.
   */
  destroy() {
    if (this.shootingStarInterval) {
      clearInterval(this.shootingStarInterval);
      this.shootingStarInterval = null;
    }
    if (this.bg) {
      this.bg.innerHTML = '';
    }
  }
} 