'use strict';
(() => {
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const header=document.querySelector('.header');
 const viewportProbe=document.createElement('div');viewportProbe.className='case-entry-viewport';viewportProbe.setAttribute('aria-hidden','true');document.body.append(viewportProbe);
 const entries=[];
 const clamp=value=>Math.max(0,Math.min(1,value));
 const mix=(a,b,t)=>a+(b-a)*t;
 const ease=value=>value*value*(3-2*value);
 let frame=0,measureFrame=0;

 for(const project of document.querySelectorAll('.featured-case')){
  const disclosure=project.querySelector('.project-disclosure');
  const summary=disclosure.querySelector(':scope>.project-summary');
  const body=disclosure.querySelector(':scope>.project-body');
  if(!summary||!body)continue;
  const copy=body.querySelector(':scope>.project-copy');
  const visual=body.querySelector(':scope>.project-visual');
  if(!copy||!visual)continue;
  const heading=summary.querySelector('.project-brand');
  const photograph=visual.querySelector('.screenshot-stage');
  if(!heading||!photograph)continue;
  const track=document.createElement('div');track.className='case-entry-track';
  const stage=document.createElement('div');stage.className='case-entry';
  const layout=document.createElement('div');layout.className='case-entry-layout';
  disclosure.insertBefore(track,summary);
  const highlights=summary.querySelector('.project-highlights');
  if(highlights)visual.prepend(highlights);
  layout.append(summary,copy,visual);stage.append(layout);track.append(stage);
  project.classList.add('has-case-entry');

  const picture=document.createElement('div');picture.className='case-entry-picture';picture.setAttribute('aria-hidden','true');
  const image=new Image();image.alt='';image.decoding='async';image.src=visual.querySelector('.is-current').src;picture.append(image);
  const logo=heading.cloneNode(true);logo.removeAttribute('id');logo.setAttribute('aria-hidden','true');logo.className='case-entry-logo';
  logo.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  const lightLogo=logo.cloneNode(true);lightLogo.classList.add('case-entry-logo-light');
  stage.append(picture,logo,lightLogo);
  const entry={project,track,stage,layout,summary,copy,visual,heading,photograph,picture,image,logo,lightLogo,cover:0,run:0,progress:1};entries.push(entry);
  layout.addEventListener('focusin',()=>{
   if(!entry.run||entry.progress>=1)return;
   // Keyboard navigation reveals the actual control rather than an invisible target.
   const end=scrollY+track.getBoundingClientRect().top-entry.top+entry.cover+entry.run;
   scrollTo({top:end,behavior:'instant'});update();
  });
 }

 function syncImage(entry){
  const current=entry.visual.querySelector('.carousel-image.is-current');
  if(current&&entry.image.src!==current.src)entry.image.src=current.src;
 }
 function measure(){
  measureFrame=0;
  const active=!reducedMotion.matches;
  const viewport=document.documentElement.clientWidth;
  const viewportHeight=viewportProbe.getBoundingClientRect().height||innerHeight;
  const mobile=viewport<=760;
  const top=header.getBoundingClientRect().height;
  for(const entry of entries){
   const {project,track,stage,heading,logo,lightLogo,photograph}=entry;
   track.style.width='';track.style.marginLeft='';track.style.height='';
   const left=project.getBoundingClientRect().left;
   track.style.width=viewport+'px';track.style.marginLeft=-left+'px';
   track.classList.toggle('is-animated',active);
   entry.top=top;entry.screen=viewportHeight-top;
   track.style.setProperty('--entry-top',top+'px');track.style.setProperty('--entry-screen',entry.screen+'px');
   if(!active){entry.cover=entry.run=0;entry.progress=1;track.style.setProperty('--entry-cover','0px');track.dataset.entryPhase='settled';continue;}
   // Give the full-screen cover and the final introduction separate reading intervals.
   entry.cover=mobile?Math.min(280,Math.max(180,entry.screen*.32)):Math.min(380,Math.max(240,entry.screen*.38));
   track.style.setProperty('--entry-cover',entry.cover+'px');
   // Shorten only the morph; keep the full-screen cover interval unchanged.
   const originalRun=mobile?Math.min(320,viewportHeight*.38):Math.min(440,viewportHeight*.46);
   entry.run=originalRun/2;
   const fitsIntroduction=entry.layout.offsetHeight<=entry.screen;
   // Keep desktop introductions in place through a stable reading interval.
   // Taller mobile layouts continue normally so their lower content stays reachable.
   entry.reading=(!mobile||fitsIntroduction)?Math.max(520,Math.min(840,entry.screen*.9)):0;
   track.style.setProperty('--entry-travel',entry.run+'px');
   track.style.setProperty('--entry-reading',entry.reading+'px');
   track.style.height=(stage.offsetHeight+entry.cover+entry.run+entry.reading)+'px';
   const origin=stage.getBoundingClientRect(),photo=photograph.getBoundingClientRect();
   entry.photo={x:photo.left-origin.left,y:photo.top-origin.top,width:photo.width,height:photo.height};
   const wordmark=heading.querySelector('.world-wordmark');
   const first=wordmark||heading.querySelector('.brand-symbol');
   const last=wordmark||heading.lastElementChild;
   const firstRect=first.getBoundingClientRect(),lastRect=last.getBoundingClientRect(),headingRect=heading.getBoundingClientRect();
   const style=getComputedStyle(heading);
   for(const layer of [logo,lightLogo]){
    Object.assign(layer.style,{font:style.font,letterSpacing:style.letterSpacing,gap:style.gap});
    const symbol=layer.querySelector('.brand-symbol');
    if(symbol)Object.assign(symbol.style,{width:firstRect.width+'px',height:firstRect.height+'px',flex:'none'});
   }
   entry.brand={x:firstRect.left-origin.left,y:(wordmark?firstRect.top:headingRect.top)-origin.top,width:lastRect.right-firstRect.left,height:wordmark?firstRect.height:headingRect.height};
   for(const layer of [logo,lightLogo]){layer.style.width=entry.brand.width+'px';layer.style.height=entry.brand.height+'px';}
   const startWidth=Math.min(640,viewport*(mobile?.78:.52));
   entry.logoScale=startWidth/entry.brand.width;
   entry.logoStart={x:(viewport-startWidth)/2,y:(entry.screen-entry.brand.height*entry.logoScale)/2};
   syncImage(entry);
  }
  update();
 }
 function update(){
  frame=0;
  const positions=entries.map(entry=>entry.track.getBoundingClientRect().top);
  const viewport=document.documentElement.clientWidth;
  for(const [index,entry] of entries.entries()){
   if(!entry.run)continue;
   const {track,picture,logo,lightLogo,photo,brand}=entry;
   const raw=clamp((entry.top-positions[index]-entry.cover)/entry.run);
   const progress=raw>=.998?1:raw;
   const phase=progress>=1?'settled':progress<=0?'cover':'transition';
   if(track.dataset.entryPhase==='settled'&&phase!=='settled')syncImage(entry);
   track.dataset.entryPhase=phase;entry.progress=progress;
   if(phase==='settled')continue;
   // Keep the full cover still through its own interval, then move continuously.
   const t=ease(progress);
   picture.style.width=mix(viewport,photo.width,t)+'px';picture.style.height=mix(entry.screen,photo.height,t)+'px';
   picture.style.transform=`translate(${photo.x*t}px,${photo.y*t}px)`;picture.style.borderRadius=(7*t)+'px';
   picture.style.setProperty('--entry-shade',.42*(1-t));
   const scale=mix(entry.logoScale,1,t);
   const logoX=mix(entry.logoStart.x,brand.x,t),logoY=mix(entry.logoStart.y,brand.y,t);
   const transform=`translate(${logoX}px,${logoY}px) scale(${scale})`;
   logo.style.transform=lightLogo.style.transform=transform;
   // White over the photograph, original ink over the white page, with no gray midpoint.
   const pictureLeft=photo.x*t,pictureTop=photo.y*t;
   const pictureRight=pictureLeft+mix(viewport,photo.width,t),pictureBottom=pictureTop+mix(entry.screen,photo.height,t);
   const insetTop=Math.max(0,(pictureTop-logoY)/scale),insetRight=Math.max(0,brand.width-(pictureRight-logoX)/scale);
   const insetBottom=Math.max(0,brand.height-(pictureBottom-logoY)/scale),insetLeft=Math.max(0,(pictureLeft-logoX)/scale);
   lightLogo.style.clipPath=`inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
   track.style.setProperty('--entry-copy',ease(clamp((progress-.66)/.26)));
  }
  // The completed state uses the original live carousel and accessible text.
  for(const entry of entries)if(entry.progress>=1)entry.track.style.setProperty('--entry-copy',1);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update);}
 function scheduleMeasure(){if(!measureFrame)measureFrame=requestAnimationFrame(measure);}
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',scheduleMeasure);
 reducedMotion.addEventListener('change',scheduleMeasure);
 const observer=new ResizeObserver(scheduleMeasure);
 entries.forEach(entry=>observer.observe(entry.layout));
 document.fonts.ready.then(scheduleMeasure);
 addEventListener('pageshow',scheduleMeasure);
 measure();
})();
