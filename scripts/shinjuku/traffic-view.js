const section=document.querySelector('#shinjuku-simulation');
const canvas=document.querySelector('#traffic-canvas'),ctx=canvas.getContext('2d',{alpha:false});
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const pause=document.querySelector('#traffic-pause');
const $=id=>document.getElementById(id);
let sim,core,background,cache,visible=false,ready=false,paused=motion.matches,frame=0,last=0,clock=0,uiTime=0;
let width=1,height=1,scale=1,offsetX=0,offsetY=0,ratio=1;
let focusId=null,focusSince=0;
const project=p=>({x:55+(p.x+140)*3.45,y:240-p.z*3.45});
const colors={green:'#5eaa8b',yellow:'#d2a54e',red:'#db827b'};
async function init(){
 if(ready)return;ready=true;
 try{
  core=await import('./traffic-core.js?v=traffic-motion');sim=new core.TrafficSimulation();
  background=new Image();background.src='assets/shinjuku/road.svg';await background.decode();
  resize();updateUI();schedule();
 }catch(error){const message=section.querySelector('.traffic-error');message.hidden=false;message.textContent='도로 시연을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';console.error(error);}
}
function resize(){
 if(!background||!sim)return;
 const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;width=r.width;height=r.height;ratio=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 scale=width<600?Math.max(width/430,height/265):Math.max(width/680,height/290);
 // On phones, retain readable vehicles by framing the crossing rather than shrinking the whole road.
 offsetX=width<600?width*.55-710*scale:width*.5-650*scale;offsetY=width<600?height*.54-232*scale:height*.52-230*scale;
 cache=document.createElement('canvas');cache.width=canvas.width;cache.height=canvas.height;
 const c=cache.getContext('2d',{alpha:false});c.setTransform(ratio,0,0,ratio,0,0);c.fillStyle='#f1f3f4';c.fillRect(0,0,width,height);c.translate(offsetX,offsetY);c.scale(scale,scale);c.drawImage(background,0,0,1100,440);draw();
}
function roundRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function chooseFocus(actors){
 const inFrame=actors.filter(car=>{
  const p=project(car.pos),x=p.x*scale+offsetX,y=p.y*scale+offsetY;
  const margin=Math.max(24,car.length*3.45*scale/2+8);
  return x>margin&&x<width-margin&&y>55&&y<height-55;
 });
 const priority=car=>sim.walk&&car.sensor?.hit?6:car.change?5:car.sensor?.hit?4:car.reason==='signal'?3:car.reason==='vehicle'?2:0;
 inFrame.sort((a,b)=>priority(b)-priority(a)||Math.abs(a.pos.x-52)-Math.abs(b.pos.x-52));
 const current=inFrame.find(car=>car.id===focusId),next=inFrame[0];
 if(current&&(sim.time-focusSince<8||priority(current)>=priority(next)))return current;
 if(next&&next.id!==focusId){focusId=next.id;focusSince=sim.time;}
 return next;
}
function drawGuidance(car){
 if(!car)return;
 if(car.change){
  const ch=car.change,remaining=Math.max(0,ch.length-ch.travel);
  ctx.beginPath();
  for(let i=0;i<=24;i++){
   const p=project(core.changePoint(car.lane,car.s,ch,remaining*i/24));
   if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);
  }
  ctx.strokeStyle='#719ab5c0';ctx.lineWidth=1.2;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
  const target=project(core.changePoint(car.lane,car.s,ch,remaining));
  ctx.beginPath();ctx.arc(target.x,target.y,2.6,0,Math.PI*2);ctx.strokeStyle='#719ab5';ctx.lineWidth=.9;ctx.stroke();
 }else if(car.sensor){
  const front=core.sample(car.lane,car.s+car.length/2),p=project(front);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-front.angle);
  const reach=car.sensor.reach*3.45;
  ctx.strokeStyle=car.sensor.hit?'#c18b54bb':'#5d9d8466';ctx.lineWidth=1.1;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(reach,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(reach,-4);ctx.quadraticCurveTo(reach+4,0,reach,4);ctx.stroke();ctx.restore();
 }
}
function drawStatus(car){
 if(!car)return;
 const label=car.change?'차선 변경':car.reason==='person'?'보행자 감지':car.reason==='signal'?'신호 대기':car.reason==='vehicle'?'앞차 간격 유지':'주행 중';
 ctx.setTransform(ratio,0,0,ratio,0,0);
 const x=14,y=height-42,w=Math.min(210,width-70);
 roundRect(x,y,w,28,4,'#fffffff0');
 ctx.beginPath();ctx.arc(x+12,y+14,3,0,Math.PI*2);ctx.fillStyle='#3989bb';ctx.fill();
 ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillStyle='#466581';ctx.fillText(label,x+23,y+18);
 ctx.font='10px sans-serif';ctx.textAlign='right';ctx.fillStyle='#7c8d9b';ctx.fillText(`${Math.round(car.v*3.6)} km/h`,x+w-10,y+18);
 canvas.dataset.focus=String(car.id);canvas.dataset.focusState=car.reason;
}
function draw(){
 if(!sim||!cache)return;
 ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(cache,0,0);
 ctx.setTransform(ratio*scale,0,0,ratio*scale,ratio*offsetX,ratio*offsetY);
 const actors=sim.cars.filter(c=>c.active),focus=chooseFocus(actors);
 for(const [x,z] of [[63.5,-16.5],[43,22.5]]){
  const p=project({x,z});roundRect(p.x-11,p.y-5,22,10,4,'#3b4b58');
  ['red','yellow','green'].forEach((color,i)=>{ctx.beginPath();ctx.arc(p.x-7+i*7,p.y,2.2,0,Math.PI*2);ctx.fillStyle=sim.signal===color?colors[color]:'#63737e';ctx.fill();});
 }
 const walk=sim.walk;
 for(const z of [-15,21.5]){const p=project({x:56.8,z});roundRect(p.x-3,p.y-5,6,10,2,'#3b4b58');ctx.fillStyle=walk?'#67b796':'#d4827b';ctx.beginPath();ctx.arc(p.x,p.y-2,1.2,0,Math.PI*2);ctx.fill();ctx.fillRect(p.x-.8,p.y,1.6,3);}
 drawGuidance(focus);
 sim.people.forEach(person);
 for(const car of actors){
  const p=project(car.pos),selected=car===focus;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-car.pos.angle);
  const len=car.length*3.45,w=6.6;
  roundRect(-len/2+.8,-w/2+1.4,len,w,2.1,'#27394530');
  roundRect(-len/2,-w/2,len,w,2.1,selected?'#3989bb':car.id===1?'#a5b4be':'#e3eaed');
  roundRect(len/2-5,-w/2+.8,2.8,w-1.6,.7,selected?'#b0d1e2':'#607a8b');
  if(car.id===1){roundRect(-len/2+1,-w/2+.5,len-7,w-1,1,'#c3cdd3');}else roundRect(-len/2+2,-w/2+.9,2,w-1.8,.5,'#91a8b5');
  ctx.fillStyle='#ffedbe';ctx.fillRect(len/2-1,-w/2+.4,1,1.4);ctx.fillRect(len/2-1,w/2-1.8,1,1.4);
  if(car.v<.5){ctx.fillStyle='#d46e66';ctx.fillRect(-len/2,-w/2+.3,1,1.5);ctx.fillRect(-len/2,w/2-1.8,1,1.5);}
  if(car.change&&Math.floor(sim.time*3)%2===0){
   const target=core.sample(car.change.to,car.change.targetS),dx=target.x-car.pos.x,dz=target.z-car.pos.z;
   const side=-dx*Math.sin(car.pos.angle)+dz*Math.cos(car.pos.angle),indicatorY=side>0?-w/2-1:w/2;
   ctx.fillStyle='#f4bd54';ctx.fillRect(len/2-4,indicatorY,2.5,1.3);ctx.fillRect(-len/2+1,indicatorY,2.5,1.3);
  }
  ctx.restore();
 }
 drawStatus(focus);
}
function person(p){
 const q=project(p);ctx.beginPath();ctx.ellipse(q.x+1,q.y+1.8,2.5,1.4,0,0,Math.PI*2);ctx.fillStyle='#314a5a18';ctx.fill();
 ctx.beginPath();ctx.arc(q.x,q.y,2.1,0,Math.PI*2);ctx.fillStyle=p.crossing?'#bb9375':['#849b99','#8d9db1','#b2a294'][p.id%3];ctx.fill();
 ctx.beginPath();ctx.arc(q.x-.4,q.y-.6,.9,0,Math.PI*2);ctx.fillStyle='#f0e5d9';ctx.fill();
}
function updateUI(){
 if(!sim)return;
 $('traffic-light').className='light-'+sim.signal;
 $('traffic-signal-label').textContent=sim.signal==='green'?'차량 통행':sim.signal==='yellow'?'정지 준비':'차량 정지';
 $('traffic-countdown').textContent=Math.ceil(sim.remaining/3)+'초';
 $('traffic-walk-light').className=sim.walk?'light-green':'light-red';
 $('traffic-walk-label').textContent=sim.walk?'보행자 횡단':'보행자 대기';
 $('traffic-walk-countdown').textContent=Math.ceil(sim.walkRemaining/3)+'초';
 canvas.dataset.signal=sim.signal;canvas.dataset.walk=String(sim.walk);canvas.dataset.laneChanges=String(sim.completedChanges);canvas.dataset.time=sim.time.toFixed(1);
}
function tick(now){
 frame=0;if(!visible||document.hidden||paused||!sim)return;
 if(last&&now-last<32){frame=requestAnimationFrame(tick);return;}
 const elapsed=last?Math.min((now-last)/1000,.08):0;last=now;clock+=elapsed*3;
 while(clock>=.05){sim.step(.05);clock-=.05;}
 draw();if(now-uiTime>200){updateUI();uiTime=now;}frame=requestAnimationFrame(tick);
}
function schedule(){cancelAnimationFrame(frame);frame=0;last=0;if(visible&&!document.hidden&&!paused&&sim)frame=requestAnimationFrame(tick);}
function reflectPause(){pause.textContent=paused?'▷':'Ⅱ';pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'교통 시연 재생':'교통 시연 일시정지');}
pause.addEventListener('click',()=>{paused=!paused;reflectPause();schedule();});
motion.addEventListener('change',()=>{paused=motion.matches;reflectPause();schedule();});
document.addEventListener('visibilitychange',schedule);
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)init();schedule();},{threshold:.05}).observe(canvas);
reflectPause();
