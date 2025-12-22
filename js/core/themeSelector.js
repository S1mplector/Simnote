// themeSelector.js
export function initThemeSelector(){
  const selector = document.getElementById('theme-selector');
  if(!selector) return;
  
  const currentBtn = document.getElementById('theme-selected');
  const optionsContainer = document.getElementById('theme-options');
  const options = optionsContainer.querySelectorAll('.theme-option');
  const themeName = currentBtn.querySelector('.theme-name');

  let initialized = false;

  const apply = (theme, text) => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('selectedTheme', theme);
    currentBtn.dataset.value = theme;
    themeName.textContent = text;
    
    // Update active state on options
    options.forEach(opt => {
      opt.classList.toggle('active', opt.dataset.value === theme);
    });
    
    if(initialized){
      window.dispatchEvent(new CustomEvent('themeChanged', {detail: theme}));
    }
  };

  // Init saved theme
  const saved = localStorage.getItem('selectedTheme') || 'dark-sakura';
  const savedOption = [...options].find(opt => opt.dataset.value === saved) || options[0];
  apply(savedOption.dataset.value, savedOption.textContent);
  initialized = true;

  // Toggle open/close
  currentBtn.addEventListener('click', () => {
    selector.classList.toggle('open');
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if(!selector.contains(e.target)){
      selector.classList.remove('open');
    }
  });

  // Handle option clicks
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      apply(opt.dataset.value, opt.textContent);
      selector.classList.remove('open');
    });
  });
} 