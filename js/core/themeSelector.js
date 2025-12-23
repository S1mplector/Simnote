// themeSelector.js
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
  const saved = localStorage.getItem('selectedTheme') || 'dark-sakura';
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