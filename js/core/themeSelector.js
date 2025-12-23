// themeSelector.js
// Theme selection and persistence
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module manages theme selection via clickable theme blocks.
// Features:
// - Persists selected theme to localStorage
// - Updates data-theme attribute on body
// - Dispatches 'themeChanged' event for other components
//
// AVAILABLE THEMES:
// - plain-dark, plain-light, sepia, aurora, fireflies, lavender-breeze, etc.
//
// DEPENDENCIES:
// - Theme blocks in DOM with data-value attributes
// - localStorage for persistence

/**
 * Initializes theme selector with click handlers.
 * Loads saved theme from localStorage and sets up event listeners.
 */
export function initThemeSelector(){
  const selector = document.getElementById('theme-selector');
  if(!selector) return;
  
  const blocks = selector.querySelectorAll('.theme-block');
  let initialized = false;

  const apply = (theme) => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('selectedTheme', theme);
    
    // Update active state on blocks
    blocks.forEach(block => {
      block.classList.toggle('active', block.dataset.value === theme);
    });
    
    if(initialized){
      window.dispatchEvent(new CustomEvent('themeChanged', {detail: theme}));
    }
  };

  // Init saved theme
  const saved = localStorage.getItem('selectedTheme') || 'plain-dark';
  const savedBlock = [...blocks].find(b => b.dataset.value === saved) || blocks[0];
  apply(savedBlock.dataset.value);
  initialized = true;

  // Handle block clicks
  blocks.forEach(block => {
    block.addEventListener('click', () => {
      apply(block.dataset.value);
    });
  });
} 
