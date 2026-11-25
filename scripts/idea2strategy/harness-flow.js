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
 let capturing=false,time=0,visible=false,paused=false,frame=0,last=0,measureFrame=0;

 function svg(tag,attributes={}){
  const element=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
  return element;
 }
 const overlay=svg('svg',{'class':'i2s-flow-connectors','aria-hidden':'true',preserveAspectRatio:'none'});
 const defs=svg('defs'),marker=svg('marker',{id:'i2s-flow-arrow',viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:6,markerHeight:6,orient:'auto'});
 marker.append(svg('path',{d:'M1 1L7 4L1 7',fill:'none',stroke:'#9db8ce','stroke-width':1.2,'stroke-linecap':'round','stroke-linejoin':'round'}));defs.append(marker);overlay.append(defs);
 const connections=[0,1].map(()=>{
  const path=svg('path',{'class':'i2s-connection','marker-end':'url(#i2s-flow-arrow)'});overlay.append(path);return path;
 });
 display.append(overlay);
 const scan=display.querySelector('.i2s-spec-scan'),lens=display.querySelector('.i2s-read-lens');
 const planChecks=[...display.querySelectorAll('.i2s-plan-check')];
 const jiraPath=display.querySelector('.i2s-jira-path'),jiraPacket=display.querySelector('.i2s-jira-packet'),jira=display.querySelector('.i2s-jira-shared');
 const aiSparkle=display.querySelector('.i2s-ai-sparkle');
 const code=[...display.querySelectorAll('.i2s-code-line')];
 const test=display.querySelector('.i2s-test-check'),pr=display.querySelector('.i2s-pr-check'),verification=display.querySelector('.i2s-verification');
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
  const staticView=reduced.matches||printing.matches||capturing;
  // Each illustration owns its loop: none waits for another illustration to finish.
  const [reading,sharing,implementation]=staticView?[2.2,3,4]:[time%4.8,time%5.6,time%6.8];
  if(aiSparkle)aiSparkle.style.opacity=String(staticView?1:.76+.24*(.5-.5*Math.cos(implementation*2*Math.PI/3.4)));
  const readReset=smooth(ramp(reading,2.7,1.4));
  const row=Math.min(2,reading/.65)*(1-readReset);
  lens.setAttribute('transform',`translate(-14 ${(-64+24*row).toFixed(2)})`);
  scan.setAttribute('y',(47+24*row).toFixed(2));
  scan.setAttribute('opacity',String(.65*smooth(ramp(reading,0,.25))*(1-ramp(reading,1.8,.35))));

  const shareReset=smooth(ramp(sharing,3.8,1.3));
  planChecks.forEach((path,index)=>{reveal(path,smooth(ramp(sharing,.2+index*.3,.3)));path.style.opacity=String(1-shareReset);});
  const transfer=smooth(ramp(sharing,1.35,1.1)),position=jiraPath.getPointAtLength(jiraLength*transfer);
  jiraPacket.setAttribute('cx',position.x);jiraPacket.setAttribute('cy',position.y);
  jiraPacket.setAttribute('opacity',String(smooth(clamp(transfer/.18))*smooth(clamp((1-transfer)/.18))));
  jira.style.opacity=String(.7+.3*ramp(sharing,1.95,.45)*(1-shareReset));

  const codeReset=smooth(ramp(implementation,4.8,1.5));
  code.forEach((path,index)=>{reveal(path,smooth(ramp(implementation,.2+index*.32,.35)));path.style.opacity=String(1-codeReset);});
  reveal(test,smooth(ramp(implementation,1.9,.5)));reveal(pr,smooth(ramp(implementation,2.6,.5)));
  test.style.opacity=pr.style.opacity=String(1-codeReset);
  verification.style.opacity=String(.7+.3*ramp(implementation,1.9,1.2)*(1-codeReset));

  const phases=staticView?['complete','complete','complete']:[
   reading<1.8?'reading':reading<2.7?'complete':'returning',
   sharing<1.35?'planning':sharing<2.45?'sharing':sharing<3.8?'complete':'reset',
   implementation<1.9?'implementation':implementation<3.1?'verification':implementation<4.8?'complete':'reset'
  ];
  stages.forEach((stage,index)=>{
   stage.classList.toggle('is-verifying',index===2&&phases[index]==='verification');
   stage.dataset.flowState=staticView?'complete':'running';
   stage.dataset.flowPhase=phases[index];
   stage.dataset.flowTime=[reading,sharing,implementation][index].toFixed(2);
  });
  display.dataset.flowMode='parallel';display.dataset.flowPhase=staticView?'complete':'parallel';display.dataset.flowTime=time.toFixed(2);
 }
 function measure(){
  measureFrame=0;
  const origin=display.getBoundingClientRect(),boxes=illustrations.map(element=>element.getBoundingClientRect());
  if(!origin.width||!origin.height)return;
  overlay.setAttribute('viewBox',`0 0 ${origin.width} ${origin.height}`);
  connections.forEach((path,index)=>{
   const a=boxes[index],b=boxes[index+1];let d;
   if(narrow.matches){const x=a.left-origin.left+a.width/2;d=`M${x} ${a.bottom-origin.top+5}L${x} ${b.top-origin.top-5}`;}
   else{const y=a.top-origin.top+a.height*.51;d=`M${a.right-origin.left+4} ${y}L${b.left-origin.left-4} ${y}`;}
   path.setAttribute('d',d);
  });
  draw();
 }
 function tick(now){
  frame=0;if(!visible||paused||reduced.matches||printing.matches||document.hidden)return;
  time+=last?Math.min((now-last)/1000,.08):0;last=now;draw();frame=requestAnimationFrame(tick);
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
 (window.portfolioPrintSnapshots??={}).harness=()=>{try{capturing=true;draw();return stages.map(stage=>window.portfolioPrintClone(stage));}finally{capturing=false;draw();}};
 reflectControl();measure();
})();
