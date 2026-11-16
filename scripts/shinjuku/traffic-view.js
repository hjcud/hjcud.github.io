const section=document.querySelector('#shinjuku-simulation');
const canvas=document.querySelector('#traffic-canvas'),ctx=canvas.getContext('2d',{alpha:false});
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const pause=document.querySelector('#traffic-pause');
const $=id=>document.getElementById(id);
let sim,core,background,cache,visible=false,ready=false,paused=motion.matches,frame=0,last=0,clock=0,uiTime=0;
let width=1,height=1,scale=1,offsetX=0,offsetY=0,ratio=1;
let focusId=9;
const resetControl=$('traffic-reset');
const project=p=>({x:55+(p.x+140)*3.45,y:240-p.z*3.45});
const colors={green:'#5eaa8b',yellow:'#d2a54e',red:'#db827b'};
async function init(){
 if(ready)return;ready=true;
 try{
  core=await import('./traffic-core.js?v=vehicle-observation');resetSimulation();
  background=new Image();background.src='assets/shinjuku/road.svg?v=compact-road';await background.decode();
  resize();updateUI();schedule();
 }catch(error){const message=section.querySelector('.traffic-error');message.hidden=false;message.textContent='도로 시연을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';console.error(error);}
}
function resize(){
 if(!background||!sim)return;
 const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;width=r.width;height=r.height;ratio=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 // Frame the crossing and adjacent lanes, with room for the signal and status controls.
 scale=Math.min(width<600?1.45:Math.min(2.35,width/420),(height-74)/106);
 offsetX=width*(width<600?.53:.5)-717.4*scale;offsetY=height*(width<600?.56:.55)-240*scale;
 const roadRight=width-1045*scale,roadLeft=-65*scale;
 if(roadRight<=roadLeft)offsetX=Math.max(roadRight,Math.min(roadLeft,offsetX));
 cache=document.createElement('canvas');cache.width=canvas.width;cache.height=canvas.height;
 const c=cache.getContext('2d',{alpha:false});c.setTransform(ratio,0,0,ratio,0,0);c.fillStyle='#f1f3f4';c.fillRect(0,0,width,height);c.translate(offsetX,offsetY);c.scale(scale,scale);c.drawImage(background,0,0,1100,440);draw();updateUI();
}
function roundRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function resetSimulation(){
 sim=new core.TrafficSimulation();
 for(let step=0;step<680;step++)sim.step(.05);
 focusId=9;clock=0;last=0;
 resetControl.disabled=false;
}
function inFrame(car){
 if(!car?.active)return false;
 const p=project(car.pos),x=p.x*scale+offsetX,y=p.y*scale+offsetY;
 const halfLength=car.length*3.45*scale/2,halfWidth=3.3*scale;
 const extentX=Math.abs(Math.cos(car.pos.angle))*halfLength+Math.abs(Math.sin(car.pos.angle))*halfWidth;
 const extentY=Math.abs(Math.sin(car.pos.angle))*halfLength+Math.abs(Math.cos(car.pos.angle))*halfWidth;
 return x+extentX>0&&x-extentX<width&&y+extentY>0&&y-extentY<height;
}
function chooseFocus(actors){
 const current=actors.find(car=>car.id===focusId&&inFrame(car));
 if(current)return current;
 const next=actors.filter(inFrame).sort((a,b)=>Math.abs(a.pos.x-52)-Math.abs(b.pos.x-52))[0];
 if(next){focusId=next.id;updateLegend();}
 return next;
}
function lanePoint(lane,s,offset){
 const p=core.sample(lane,s);
 return project({x:p.x-Math.sin(p.angle)*offset,z:p.z+Math.cos(p.angle)*offset});
}
function drawDistance(lane,from,to,offset,dashed){
 if(to<=from)return;
 ctx.save();ctx.beginPath();
 const steps=Math.max(1,Math.ceil((to-from)/3));
 for(let i=0;i<=steps;i++){
  const p=lanePoint(lane,from+(to-from)*i/steps,offset);
  if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);
 }
 ctx.strokeStyle=dashed?'#548dbba6':'#548dbb';ctx.lineWidth=1.2;ctx.setLineDash(dashed?[3,3]:[]);ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();
 for(const s of [from,to]){const a=lanePoint(lane,s,offset-.45),b=lanePoint(lane,s,offset+.45);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}
 ctx.stroke();ctx.restore();
}
function drawGuidance(car){
 if(!car)return;
 const reading=sim.observe(car),points=core.lanes[car.lane].points;
 // These fixed road samples show the cached lane data used for positions and distances.
 ctx.beginPath();points.forEach((point,i)=>{const p=project({x:point[0],z:point[1]});if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});
 ctx.strokeStyle='#7ca7c14d';ctx.lineWidth=.7;ctx.stroke();
 ctx.fillStyle='#6999b4b3';
 for(let i=0;i<points.length;i+=4){const p=project({x:points[i][0],z:points[i][1]});ctx.beginPath();ctx.arc(p.x,p.y,.8,0,Math.PI*2);ctx.fill();}
 if(reading.leaderRearS!==null)drawDistance(reading.leaderLane,reading.leaderFromS,reading.leaderRearS,1.25,false);
 if(reading.stopS!==null)drawDistance(reading.lane,reading.frontS,reading.stopS,-1.25,true);
 if(car.change){
  const ch=car.change,remaining=Math.max(0,ch.length-ch.travel);
  ctx.beginPath();
  for(let i=0;i<=24;i++){
   const p=project(core.changePoint(car.lane,car.s,ch,remaining*i/24));
   if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);
  }
  ctx.strokeStyle='#719ab5c0';ctx.lineWidth=1.2;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
 }else{
  const front=core.sample(car.lane,car.s+car.length/2),p=project(front);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-front.angle);
  const reach=car.sensor.reach*3.45;
  ctx.strokeStyle=car.sensor.hit?'#c18b54dd':'#5d9d84aa';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(reach,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(reach,-4);ctx.quadraticCurveTo(reach+4,0,reach,4);ctx.stroke();ctx.restore();
 }
}
function updateLegend(){
 const car=sim.cars.find(car=>car.id===focusId),hit=inFrame(car)&&!car.change&&car.sensor.hit;
 $('traffic-detection').classList.toggle('is-hit',hit);
 $('traffic-detection-label').textContent=hit?'보행자 감지':'전방 감지';
}
function draw(){
 if(!sim||!cache)return;
 ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(cache,0,0);
 ctx.setTransform(ratio*scale,0,0,ratio*scale,ratio*offsetX,ratio*offsetY);
 const actors=sim.cars.filter(c=>c.active),focus=chooseFocus(actors);
 const lamp=project({x:62,z:17});roundRect(lamp.x-11,lamp.y-5,22,10,4,'#3b4b58');
 ['red','yellow','green'].forEach((color,i)=>{ctx.beginPath();ctx.arc(lamp.x-7+i*7,lamp.y,2.2,0,Math.PI*2);ctx.fillStyle=sim.signal===color?colors[color]:'#63737e';ctx.fill();});
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
 canvas.dataset.focus=String(focusId);canvas.dataset.focusState=focus?.reason||'outside';
}
function person(p){
 const q=project(p),swing=p.moving?Math.sin(sim.time*4.2+p.id*.7):0;
 const shirt=['#719492','#7d91ad','#b4987c'][p.id%3];
 const skin=['#d3b29a','#e2c6ae','#c19a7c'][p.id%3],hair=['#51443f','#39444c','#806750'][p.id%3];
 ctx.save();ctx.translate(q.x,q.y);
 ctx.beginPath();ctx.ellipse(.4,.8,2.15,2.5,0,0,Math.PI*2);ctx.fillStyle='#314a5a16';ctx.fill();
 ctx.rotate(p.heading);
 // The crown sits above the shoulders; hands and feet remain visible around the body.
 ctx.lineCap='round';ctx.strokeStyle='#4e6070';ctx.lineWidth=.8;
 for(const side of [-1,1]){
  const step=swing*side;
  ctx.beginPath();ctx.moveTo(side*.65,.7);ctx.lineTo(side*.7,1.8+step*.55);ctx.stroke();
  roundRect(side*.7-.4,1.7+step*.55,.8,.8,.25,'#394b59');
  ctx.strokeStyle=shirt;ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(side*1.25,-.05);ctx.lineTo(side*1.65,.7-step*.4);ctx.stroke();
  ctx.beginPath();ctx.arc(side*1.65,.9-step*.4,.38,0,Math.PI*2);ctx.fillStyle=skin;ctx.fill();
  ctx.strokeStyle='#4e6070';ctx.lineWidth=.8;
 }
 ctx.beginPath();ctx.ellipse(0,.25,1.65,1.15,0,0,Math.PI*2);ctx.fillStyle=shirt;ctx.fill();
 ctx.beginPath();ctx.ellipse(0,-1.1,.7,.65,0,0,Math.PI*2);ctx.fillStyle=skin;ctx.fill();
 ctx.beginPath();ctx.ellipse(0,-.65,1.05,1.15,0,0,Math.PI*2);ctx.fillStyle=hair;ctx.fill();
 ctx.beginPath();ctx.ellipse(-.3,-.95,.35,.55,-.4,0,Math.PI*2);ctx.fillStyle='#ffffff16';ctx.fill();
 ctx.restore();
}
function updateUI(){
 if(!sim)return;
 $('traffic-light').className='light-'+sim.signal;
 $('traffic-signal-label').textContent=sim.signal==='green'?'차량 통행':sim.signal==='yellow'?'정지 준비':'차량 정지';
 $('traffic-countdown').textContent=Math.ceil(sim.remaining/3)+'초';
 updateLegend();
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
function selectVehicle(id){focusId=id;draw();updateUI();}
function hitVehicle(event){
 if(!sim)return null;
 const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
 let selected=null,best=Infinity;
 for(const car of sim.cars){
  if(!car.active)continue;
  const p=project(car.pos),dx=x-(p.x*scale+offsetX),dy=y-(p.y*scale+offsetY);
  const along=dx*Math.cos(car.pos.angle)-dy*Math.sin(car.pos.angle),side=dx*Math.sin(car.pos.angle)+dy*Math.cos(car.pos.angle);
  const distance=Math.hypot(Math.max(0,Math.abs(along)-car.length*3.45*scale/2),Math.max(0,Math.abs(side)-3.3*scale));
  const score=distance+Math.hypot(dx,dy)*.001;
  if(distance<=(event.pointerType==='touch'?14:9)&&score<best){selected=car;best=score;}
 }
 return selected;
}
canvas.addEventListener('click',event=>{const car=hitVehicle(event);if(car)selectVehicle(car.id);});
canvas.addEventListener('pointermove',event=>{canvas.style.cursor=hitVehicle(event)?'pointer':'';});
canvas.addEventListener('pointerleave',()=>{canvas.style.cursor='';});
canvas.addEventListener('keydown',event=>{
 if(!sim||!['ArrowLeft','ArrowRight'].includes(event.key))return;
 const choices=sim.cars.filter(inFrame);if(!choices.length)return;
 event.preventDefault();
 const index=choices.findIndex(car=>car.id===focusId),direction=event.key==='ArrowRight'?1:-1;
 selectVehicle(choices[(index+direction+choices.length)%choices.length].id);
});
resetControl.addEventListener('click',()=>{if(!core)return;resetSimulation();draw();updateUI();schedule();});
pause.addEventListener('click',()=>{paused=!paused;reflectPause();if(sim)updateUI();schedule();});
motion.addEventListener('change',()=>{paused=motion.matches;reflectPause();if(sim)updateUI();schedule();});
document.addEventListener('visibilitychange',schedule);
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)init();schedule();},{threshold:.05}).observe(canvas);
reflectPause();
