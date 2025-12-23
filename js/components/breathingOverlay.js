// breathingOverlay.js
// Guided breathing exercise overlay with animated progress ring
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This component creates a full-screen breathing exercise overlay.
// Features:
// - SVG progress ring animation
// - 4-2-6 breathing pattern (inhale-hold-exhale)
// - Configurable cycle count
// - Radial gradient backdrop with blur
// - Close button and round indicator
//
// BREATHING PATTERN:
// - Inhale: 4 seconds (ring fills, circle scales up)
// - Hold: 2 seconds (pause)
// - Exhale: 6 seconds (ring empties, circle scales down)
//
// USAGE:
// import { BreathingOverlay } from './components/breathingOverlay.js';
// BreathingOverlay.start({ cycles: 5 });
//
// DEPENDENCIES:
// - DOM APIs for overlay creation
// - SVG for progress ring

/**
 * Guided breathing exercise overlay component.
 * Creates animated breathing guidance with progress ring.
 * 
 * @class BreathingOverlay
 */
export class BreathingOverlay{
  /** @type {HTMLElement|null} Active overlay element (singleton) */
  static active = null;

  static start(options={}){
    if(BreathingOverlay.active){return;}
    const cfg={cycles: options.cycles||5, pattern:[4,2,6]}; // inhale, hold, exhale seconds
    const ov=document.createElement('div');
    ov.id='breathing-overlay';
    Object.assign(ov.style,{
      position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
      background:'radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.9) 70%)',
      backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',zIndex:10000,opacity:'0',transition:'opacity 0.6s ease'});

    // --- Container ---
    const wrap=document.createElement('div');
    wrap.style.display='flex';wrap.style.flexDirection='column';wrap.style.alignItems='center';wrap.style.gap='20px';

    // SVG progress ring
    const size=160, radius=70, stroke=6, circ=2*Math.PI*radius;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('width',size);svg.setAttribute('height',size);
    const circleBg=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circleBg.setAttribute('cx',size/2);circleBg.setAttribute('cy',size/2);circleBg.setAttribute('r',radius);
    circleBg.setAttribute('stroke','rgba(255,255,255,0.15)');circleBg.setAttribute('stroke-width',stroke);
    circleBg.setAttribute('fill','none');
    svg.appendChild(circleBg);
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',size/2);circle.setAttribute('cy',size/2);circle.setAttribute('r',radius);
    circle.setAttribute('stroke','#ffffff');circle.setAttribute('stroke-width',stroke);
    circle.setAttribute('fill','none');
    circle.setAttribute('stroke-linecap','round');
    circle.style.transform='rotate(-90deg)';circle.style.transformOrigin='50% 50%';
    circle.style.strokeDasharray=circ;
    circle.style.strokeDashoffset=circ;
    svg.appendChild(circle);

    // Countdown text
    const num=null; // removed

    const label=document.createElement('div');
    Object.assign(label.style,{color:'#fff',fontSize:'1.4rem',letterSpacing:'0.5px',marginTop:'6px',textShadow:'0 1px 3px rgba(0,0,0,0.6)',transition:'opacity 0.4s ease, transform 0.4s ease',opacity:'0'});

    // Round indicator & exit
    const footer=document.createElement('div');
    footer.style.position='absolute';footer.style.bottom='20px';footer.style.right='20px';footer.style.display='flex';footer.style.alignItems='center';footer.style.gap='12px';footer.style.color='#fff';footer.style.fontSize='0.9rem';
    const roundTxt=document.createElement('span');
    const closeBtn=document.createElement('button');closeBtn.textContent='✕';Object.assign(closeBtn.style,{background:'transparent',border:'none',color:'#fff',fontSize:'1.2rem',cursor:'pointer'});
    footer.appendChild(roundTxt);footer.appendChild(closeBtn);

    wrap.appendChild(svg);wrap.appendChild(label);
    ov.appendChild(wrap);ov.appendChild(footer);
    document.body.appendChild(ov);
    requestAnimationFrame(()=>ov.style.opacity='1');

    // animation
    const totalPerCycle=cfg.pattern.reduce((a,b)=>a+b,0);
    let cycle=0,phase=0,phaseTime=0;
    const phaseNames=['Inhale','Hold','Exhale'];
    let labelTimeout=null;
    const updateRound=()=>{roundTxt.textContent=`Round ${cycle+1} / ${cfg.cycles}`;};
    updateRound();

    const tick=()=>{
      if(cycle>=cfg.cycles){cleanup();return;}
      const duration=cfg.pattern[phase];
      if(labelTimeout){clearTimeout(labelTimeout);} // ensure clean
      label.style.opacity='0';label.style.transform='translateY(10px)';
      labelTimeout=setTimeout(()=>{label.textContent=phaseNames[phase];label.style.opacity='1';label.style.transform='translateY(0)';},200);
      // animate ring for inhale & exhale only
      if(phase!==1){
        circle.animate([{strokeDashoffset:circ},{strokeDashoffset:0}],{duration:duration*1000,fill:'forwards'});
      }
      // scale circle
      const startScale=phase===2?1:0.6; // if exhale start big
      const endScale=phase===0?1:0.6; // inhale ends big, exhale ends small
      if(phase!==1){circle.animate([{transform:`scale(${startScale})`},{transform:`scale(${endScale})`}],{duration:duration*1000,fill:'forwards'});}  
      setTimeout(()=>nextPhase(),duration*1000);
    };

    const nextPhase=()=>{
      // fade number out quickly
      label.style.opacity='0';
      phase=(phase+1)%3;
      if(phase===0){cycle++;updateRound();if(cycle>=cfg.cycles){cleanup();return;}}
      // reset ring for inhale
      if(phase===0){circle.style.strokeDashoffset=circ;}
      setTimeout(tick,300);
    };

    const cleanup=()=>{ov.style.opacity='0';setTimeout(()=>{ov.remove();BreathingOverlay.active=null;},600);};

    closeBtn.onclick=cleanup;
    BreathingOverlay.active=ov;
    tick();
  }
} 