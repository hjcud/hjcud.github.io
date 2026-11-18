'use strict';
(() => {
 const display=document.querySelector('#i2s-flow-diagram');
 const control=document.querySelector('#i2s-flow-pause');
 if(!display||!control)return;
 const list=display.querySelector('.i2s-visual-flow');
 const stages=[...list.children];
 const illustrations=stages.map(stage=>stage.querySelector('.i2s-flow-illustration svg'));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const narrow=matchMedia('(max-width:760px)');
 const printing=matchMedia('print');
 const ns='http://www.w3.org/2000/svg';
 const clamp=value=>Math.max(0,Math.min(1,value));
 const ramp=(time,start,duration)=>clamp((time-start)/duration);
 const smooth=value=>value*value*(3-2*value);
 let time=0,visible=false,paused=false,frame=0,last=0,measureFrame=0;

 function svg(tag,attributes={}){
  const element=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
  return element;
 }
 const overlay=svg('svg',{'class':'i2s-flow-connectors','aria-hidden':'true',preserveAspectRatio:'none'});
 const defs=svg('defs'),marker=svg('marker',{id:'i2s-flow-arrow',viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:6,markerHeight:6,orient:'auto'});
 marker.append(svg('path',{d:'M1 1L7 4L1 7',fill:'none',stroke:'#9db8ce','stroke-width':1.2,'stroke-linecap':'round','stroke-linejoin':'round'}));defs.append(marker);overlay.append(defs);
 const connections=[0,1].map(()=>{
  const path=svg('path',{'class':'i2s-connection','marker-end':'url(#i2s-flow-arrow)'});overlay.append(path);return {path,length:0};
 });
 const packet=svg('g',{opacity:0});packet.append(svg('circle',{r:8,fill:'#6c9cc622'}),svg('circle',{r:4,fill:'#5c94c0',stroke:'#fff','stroke-width':1.5}));overlay.append(packet);display.append(overlay);
 const scan=display.querySelector('.i2s-spec-scan'),lens=display.querySelector('.i2s-read-lens');
 const planChecks=[...display.querySelectorAll('.i2s-plan-check')];
 const jiraPath=display.querySelector('.i2s-jira-path'),jiraPacket=display.querySelector('.i2s-jira-packet'),jira=display.querySelector('.i2s-jira-shared');
 const code=[...display.querySelectorAll('.i2s-code-line')];
 const test=display.querySelector('.i2s-test-check'),pr=display.querySelector('.i2s-pr-check'),verification=display.querySelector('.i2s-verification'),glyph=display.querySelector('.i2s-ai-glyph');
 const strokes=[...planChecks,...code,test,pr];
 const lengths=new Map(strokes.map(path=>[path,path.getTotalLength()]));
 const jiraLength=jiraPath.getTotalLength();
 display.classList.add('is-enhanced');

 function reveal(path,progress){
  const length=lengths.get(path);
  path.style.strokeDasharray=length+' '+length;
  path.style.strokeDashoffset=String(length*(1-progress));
 }
 function draw(){
  const t=reduced.matches||printing.matches?11:time;
  const phase=t<3.3?'specification':t<6.2?'sharing':t<8.5?'implementation':t<10?'verification':'complete';
  const active=phase==='specification'?0:phase==='sharing'?1:phase==='complete'?-1:2;
  stages.forEach((stage,index)=>{
   const complete=phase==='complete'||index<active;
   stage.classList.toggle('is-active',index===active);
   stage.classList.toggle('is-complete',complete);
   stage.classList.toggle('is-verifying',index===2&&phase==='verification');
   stage.dataset.flowState=complete?'complete':index===active?'active':'pending';
  });
  const row=Math.min(2,t/.85);
  lens.setAttribute('transform',`translate(-14 ${(-64+24*row).toFixed(2)})`);
  scan.setAttribute('y',(47+24*row).toFixed(2));scan.setAttribute('opacity',String(.85*(1-ramp(t,2.6,.4))));
  planChecks.forEach((path,index)=>reveal(path,smooth(ramp(t,3.4+index*.3,.3))));
  const transfer=smooth(ramp(t,4.3,1.15)),position=jiraPath.getPointAtLength(jiraLength*transfer);
  jiraPacket.setAttribute('cx',position.x);jiraPacket.setAttribute('cy',position.y);jiraPacket.setAttribute('opacity',t>=4.3&&t<=5.45?'1':'0');
  jira.style.opacity=String(.35+.65*ramp(t,5.15,.4));
  code.forEach((path,index)=>reveal(path,smooth(ramp(t,6.3+index*.38,.4))));
  const pulse=t>=6.2&&t<8.5?1+.08*Math.sin((t-6.2)*Math.PI*3):1;
  glyph.setAttribute('transform',`translate(27 117) scale(${pulse.toFixed(3)}) translate(-27 -117)`);
  reveal(test,smooth(ramp(t,8.5,.6)));reveal(pr,smooth(ramp(t,9.2,.6)));
  verification.style.opacity=String(.35+.65*ramp(t,8.5,1.3));
  connections.forEach((connection,index)=>connection.path.classList.toggle('is-passed',t>=(index?6.2:3.3)));
  let link=-1,progress=0;
  if(t>=2.6&&t<3.3){link=0;progress=smooth(ramp(t,2.6,.7));}
  if(t>=5.5&&t<6.2){link=1;progress=smooth(ramp(t,5.5,.7));}
  packet.setAttribute('opacity',link>=0?'1':'0');
  if(link>=0&&connections[link].length){const point=connections[link].path.getPointAtLength(connections[link].length*progress);packet.setAttribute('transform',`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);}
  display.dataset.flowPhase=phase;display.dataset.flowTime=t.toFixed(2);
 }
 function measure(){
  measureFrame=0;
  const origin=display.getBoundingClientRect(),boxes=illustrations.map(element=>element.getBoundingClientRect());
  if(!origin.width||!origin.height)return;
  overlay.setAttribute('viewBox',`0 0 ${origin.width} ${origin.height}`);
  connections.forEach((connection,index)=>{
   const a=boxes[index],b=boxes[index+1];let d;
   if(narrow.matches){const x=a.left-origin.left+a.width/2;d=`M${x} ${a.bottom-origin.top+5}L${x} ${b.top-origin.top-5}`;}
   else{const y=a.top-origin.top+a.height*.51;d=`M${a.right-origin.left+4} ${y}L${b.left-origin.left-4} ${y}`;}
   connection.path.setAttribute('d',d);connection.length=connection.path.getTotalLength();
  });
  draw();
 }
 function tick(now){
  frame=0;if(!visible||paused||reduced.matches||printing.matches||document.hidden)return;
  time=(time+(last?Math.min((now-last)/1000,.08):0))%12.2;last=now;draw();frame=requestAnimationFrame(tick);
 }
 function schedule(){cancelAnimationFrame(frame);frame=0;last=0;if(visible&&!paused&&!reduced.matches&&!printing.matches&&!document.hidden)frame=requestAnimationFrame(tick);}
 function queueMeasure(){if(!measureFrame)measureFrame=requestAnimationFrame(measure);}
 function reflectControl(){
  control.hidden=reduced.matches;
  control.setAttribute('aria-pressed',String(paused));
  control.setAttribute('aria-label',paused?'AI 개발 흐름 애니메이션 재생':'AI 개발 흐름 애니메이션 일시정지');
  control.textContent=paused?'▷':'Ⅱ';
 }
 control.addEventListener('click',()=>{paused=!paused;reflectControl();schedule();});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.15;schedule();},{threshold:[0,.15,.5,1]}).observe(display);
 new ResizeObserver(queueMeasure).observe(display);
 addEventListener('resize',queueMeasure);
 document.addEventListener('visibilitychange',schedule);
 printing.addEventListener('change',()=>{draw();schedule();});
 reduced.addEventListener('change',()=>{if(!reduced.matches)time=0;reflectControl();draw();schedule();});
 document.fonts.ready.then(queueMeasure);
 reflectControl();measure();
})();
