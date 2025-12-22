// themeSelector.js
export function initThemeSelector(){
  const dropdown=document.getElementById('theme-dropdown');
  if(!dropdown) return;
  const selectedEl=dropdown.querySelector('#theme-selected');
  const listEl=dropdown.querySelector('#theme-list');
  const items=listEl.querySelectorAll('li');

  let initialized=false;

  const apply=(theme,text)=>{
    document.body.setAttribute('data-theme',theme);
    localStorage.setItem('selectedTheme',theme);
    selectedEl.textContent=text;
    if(initialized){
      window.dispatchEvent(new CustomEvent('themeChanged',{detail:theme}));
    }
  };

  // init saved theme
  const saved=localStorage.getItem('selectedTheme')||'dark-sakura';
  const savedItem=[...items].find(li=>li.dataset.value===saved)||items[0];
  apply(savedItem.dataset.value,savedItem.textContent);
  initialized=true;

  // toggle open
  selectedEl.addEventListener('click',()=>{
    listEl.classList.toggle('open');
  });

  document.addEventListener('click',e=>{
    if(!dropdown.contains(e.target)){
      listEl.classList.remove('open');
    }
  });

  items.forEach(li=>{
    li.addEventListener('click',()=>{
      apply(li.dataset.value,li.textContent);
      listEl.classList.remove('open');
    });
  });
} 