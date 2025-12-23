// dateHeaderAnimator.js
// Time-of-day themed header background animation
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This animator creates dynamic backgrounds for the mood panel header
// based on time of day. Features:
// - Morning/afternoon/evening/night themes
// - Animated clouds for daytime
// - Twinkling stars for nighttime
// - CSS class-based theming
//
// TIME SLOTS:
// - morning (5-12): Light theme
// - afternoon (12-18): Warm theme
// - evening (18-22): Sunset theme
// - night (22-5): Dark theme with stars
//
// DEPENDENCIES:
// - Header element with .date-bg child

/**
 * Time-of-day themed header animator.
 * Adds clouds or stars based on current hour.
 * 
 * @class DateHeaderAnimator
 */
export class DateHeaderAnimator {
  /**
   * Creates DateHeaderAnimator for a header element.
   * @param {HTMLElement} headerEl - The header element to animate
   * @constructor
   */
  constructor(headerEl){
    /** @type {HTMLElement} Header element */
    this.header = headerEl;
    this.bg = headerEl.querySelector('.date-bg');
    if(!this.bg) return;
    this.init();
  }
  init(){
    const hour = new Date().getHours();
    let slot;
    if(hour >= 5 && hour < 12) slot='morning';
    else if(hour >= 12 && hour < 18) slot='afternoon';
    else if(hour >= 18 && hour < 22) slot='evening';
    else slot='night';
    this.header.classList.remove('morning','afternoon','evening','night');
    this.header.classList.add(slot);
    if(slot==='night') this.createStars();
  }
  createClouds(){
    const cloudPath = 'M60 30c0-16.6-13.4-30-30-30C22.5 0 15.1 4.9 11.3 12C5 12.3 0 17.4 0 23.8C0 30.6 5.4 36 12.1 36H57c8.3 0 15-6.7 15-15c0-8.3-6.7-15-15-15c-0.7 0-1.4 0-2 .1C70.4 8.6 60 18.3 60 30z';
    for(let i=0;i<3;i++){
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 72 40');
      svg.classList.add('cloud');
      svg.style.width = 120 + 40*i + 'px';
      svg.style.top = 10 + 25*i + 'px';
      svg.style.left = -200 + 'px';
      svg.style.animationDuration = 30 + 10*i + 's';
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', cloudPath);
      svg.appendChild(path);
      this.bg.appendChild(svg);
    }
  }
  createStars(){
    for(let i=0;i<35;i++){
      const s = document.createElement('span');
      s.className='star';
      s.style.left = Math.random()*100 + '%';
      s.style.top  = Math.random()*100 + '%';
      const d = (Math.random()*4).toFixed(2);
      s.style.animationDelay = d+'s';
      s.style.animationDuration = 4 + Math.random()*4 + 's';
      this.bg.appendChild(s);
    }
  }
} 