// themeSelector.js
import { FirefliesPreviewAnimator, AuroraPreviewAnimator, SakuraPreviewAnimator, LavenderPreviewAnimator } from '../animators/themePreviewAnimators.js';
import { typeText } from '../utils/typingEffect.js';

// Shared preview canvas & animator reference
let previewCanvas = null;
let previewContainer = null;
let previewAnimator = null;
let previewLabel = null;
let previewHome = null;

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
    togglePreviewVisibility();
  });

  function togglePreviewVisibility(){
    if(!previewContainer) return;
    const open=listEl.classList.contains('open');
    previewContainer.classList.toggle('visible',open);

    // Position container next to last button when open
    if(open){
      // Compute position relative to dropdown list
      const lastBtn=listEl.lastElementChild;
      if(lastBtn){
        const rect=lastBtn.getBoundingClientRect();
        const popupRect=dropdown.getBoundingClientRect();
        // place container 10px to right of last button
        const offsetLeft=rect.right - popupRect.left + 10;
        const offsetTop=rect.top - popupRect.top;
        Object.assign(previewContainer.style,{position:'absolute',left:offsetLeft+'px',top:offsetTop+'px'});
      }
      // animate label
      if(previewLabel){
        previewLabel.textContent='';
        typeText(previewLabel,'Preview?',50);
      }
    }else{
      // keep absolute pos during fade-out, then reset after transition ends
      if(previewLabel) previewLabel.textContent='';
      setTimeout(()=>{
        if(!listEl.classList.contains('open')){
          Object.assign(previewContainer.style,{position:'relative',left:'',top:''});
        }
      },500);
    }

    if(!open){
      stopPreview();
    }
  }

  document.addEventListener('click',e=>{
    if(!dropdown.contains(e.target)){
      listEl.classList.remove('open');
      togglePreviewVisibility();
    }
  });

  // Grab preview canvas once DOM is ready
  previewCanvas = document.getElementById('theme-preview-canvas');
  previewContainer = document.getElementById('theme-preview-container');
  previewLabel = document.getElementById('preview-label');
  previewHome = previewContainer.parentElement; // original wrapper div

  items.forEach(li=>{
    li.addEventListener('click',()=>{
      apply(li.dataset.value,li.textContent);
      listEl.classList.remove('open');
      togglePreviewVisibility();
    });

    // --- Hover preview logic (dedicated window) ---
    li.addEventListener('mouseenter',()=>{
      startPreview(li.dataset.value);
    });
    li.addEventListener('mouseleave',()=>{
      stopPreview();
    });
  });

  /* ---------------------- Theme Preview (window) ---------------------- */
  function startPreview(theme){
    if(!previewCanvas) return;

    // clear previous
    stopPreview();

    // Only preview animated themes (others just clear canvas)
    if(!['aurora','fireflies','dark-sakura','light-sakura','lavender-breeze'].includes(theme)){
      const ctx=previewCanvas.getContext('2d');
      ctx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
      return;
    }

    // Adjust for devicePixelRatio
    const dpr=window.devicePixelRatio||1;
    // Use container size to set backing canvas
    const cw=previewContainer.clientWidth;
    const ch=previewContainer.clientHeight;
    previewCanvas.width=cw*dpr;
    previewCanvas.height=ch*dpr;

    if(theme==='fireflies'){
      previewAnimator=new FirefliesPreviewAnimator(previewCanvas);
    }else if(theme==='aurora'){
      previewAnimator=new AuroraPreviewAnimator(previewCanvas);
    }else if(theme==='lavender-breeze'){
      previewAnimator=new LavenderPreviewAnimator(previewCanvas);
    }else{
      previewAnimator=new SakuraPreviewAnimator(previewCanvas, theme==='light-sakura');
    }
  }

  function stopPreview(){
    if(previewAnimator && previewAnimator.destroy){
      previewAnimator.destroy();
    }
    previewAnimator=null;
    if(previewCanvas){
      const ctx=previewCanvas.getContext('2d');
      ctx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
    }
  }
} 