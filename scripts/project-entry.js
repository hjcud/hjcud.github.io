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
 let gate=null,inputKind=null,inputTimer=0,lastWheel=0,lastScroll=scrollY,touch=null;
 const scrollRoot=document.documentElement;
 const unlockScroll=()=>scrollRoot.classList.remove('is-entry-scroll-paused');
 const endOf=entry=>scrollY+entry.track.getBoundingClientRect().top-entry.top+entry.cover+entry.run;
 const markInput=kind=>{inputKind=kind;clearTimeout(inputTimer);inputTimer=setTimeout(()=>{inputKind=null;unlockScroll();},200);};
 const releaseGate=()=>{gate=null;inputKind=null;lastScroll=scrollY;clearTimeout(inputTimer);unlockScroll();};
 function crossing(from,to){
  if(to<=from)return null;
  return entries.find(entry=>entry.run&&!entry.gatePassed&&endOf(entry)>=from-1&&endOf(entry)<=to+1)||null;
 }
 function stopAt(entry){
  const end=Math.ceil(endOf(entry));
  gate=entry;entry.gatePassed=true;
  // Stop the native gesture once; never chase scroll events back to this point.
  scrollRoot.classList.add('is-entry-scroll-paused');
  scrollTo({top:end,behavior:'instant'});
  lastScroll=scrollY;update();
 }
 function nestedScroll(target,delta){
  for(let node=target;node&&node!==document.body;node=node.parentElement){
   if(node.scrollHeight<=node.clientHeight+1||!/(auto|scroll)/.test(getComputedStyle(node).overflowY))continue;
   if(delta>0?node.scrollTop+node.clientHeight<node.scrollHeight-1:node.scrollTop>0)return true;
  }
  return false;
 }
 function onWheel(event){
  if(event.defaultPrevented||event.ctrlKey||Math.abs(event.deltaX)>=Math.abs(event.deltaY))return;
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
  if(nestedScroll(event.target,delta))return;
  const now=performance.now(),fresh=inputKind!=='wheel'||now-lastWheel>200;
  lastWheel=now;
  if(gate){
   if(delta<0||fresh)releaseGate();
   else{event.preventDefault();markInput('wheel');return;}
  }
  markInput('wheel');
  const entry=crossing(scrollY,scrollY+delta);
  if(entry){event.preventDefault();stopAt(entry);}
 }
 function onScroll(){
  const current=scrollY;
  if(inputKind){
   const kind=inputKind;
   if(!gate){
    const entry=crossing(lastScroll,current);
    if(entry)stopAt(entry);
   }
   markInput(kind);
  }
  lastScroll=scrollY;
  for(const entry of entries)if(entry.gatePassed&&scrollY<endOf(entry)-80)entry.gatePassed=false;
  schedule();
 }

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
  const viewport=scrollRoot.getBoundingClientRect().width;
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
   // Retain the original full-screen cover before the morph begins.
   entry.cover=mobile?Math.min(280,Math.max(180,entry.screen*.32)):Math.min(380,Math.max(240,entry.screen*.38));
   track.style.setProperty('--entry-cover',entry.cover+'px');
   // Shorten only the morph; keep the full-screen cover interval unchanged.
   const originalRun=mobile?Math.min(320,viewportHeight*.38):Math.min(440,viewportHeight*.46);
   entry.run=originalRun/2;
   // The input gate supplies the pause; only retain a two-pixel rounding buffer.
   entry.reading=2;
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
  const viewport=scrollRoot.getBoundingClientRect().width;
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
 addEventListener('scroll',onScroll,{passive:true});
 addEventListener('wheel',onWheel,{passive:false});
 addEventListener('touchstart',event=>{
  releaseGate();
  touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;
  if(touch)markInput('touch');
 },{passive:true});
 addEventListener('touchmove',event=>{
  if(!touch||event.touches.length!==1)return;
  const point=event.touches[0],delta=touch.y-point.clientY,horizontal=touch.x-point.clientX;
  touch={x:point.clientX,y:point.clientY};
  if(Math.abs(horizontal)>=Math.abs(delta)||nestedScroll(event.target,delta))return;
  if(delta<0)releaseGate();
  markInput('touch');
  if(gate){event.preventDefault();return;}
  const entry=crossing(scrollY,scrollY+delta);
  if(entry){event.preventDefault();stopAt(entry);}
 },{passive:false});
 const endTouch=()=>{touch=null;if(inputKind==='touch')markInput('touch');};
 addEventListener('touchend',endTouch,{passive:true});
 addEventListener('touchcancel',endTouch,{passive:true});
 addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')releaseGate();},{passive:true});
 addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(['Home','End','Tab','Escape'].includes(event.key)){releaseGate();return;}
  if(!['ArrowDown','PageDown',' ','ArrowUp','PageUp'].includes(event.key))return;
  if(gate){
   if(!event.repeat)releaseGate();
   else{event.preventDefault();markInput('key');return;}
  }
  markInput('key');
 });
 addEventListener('hashchange',releaseGate);
 addEventListener('resize',()=>{releaseGate();lastScroll=scrollY;scheduleMeasure();});
 reducedMotion.addEventListener('change',()=>{releaseGate();scheduleMeasure();});
 const observer=new ResizeObserver(scheduleMeasure);
 entries.forEach(entry=>observer.observe(entry.layout));
 document.fonts.ready.then(scheduleMeasure);
 addEventListener('pageshow',scheduleMeasure);
 measure();
})();
