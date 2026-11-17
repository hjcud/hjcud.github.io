import {coordinateFrame,TILE_SIZE} from './flight-model.js?v=flat-coordinate';
import {createAircraftRenderer} from './flight-aircraft.js';

const canvas=document.getElementById('flight-canvas');
const ctx=canvas.getContext('2d',{alpha:false});
const exhibit=document.getElementById('flight-exhibit');
const pause=document.getElementById('flight-pause');
const title=document.getElementById('flight-title');
const stepLabel=document.getElementById('flight-step');
const localLabel=document.getElementById('flight-local');
const tileLabel=document.getElementById('flight-tile');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,width=1,height=1,dpr=1,visible=false,paused=reduced.matches,frame=0,last=0;

// Use the original mesh and its orthographic camera, with a fixed heading.
// X travel moves the environment up-left while the aircraft stays at the origin.
const pose={yaw:Math.PI/2,pitch:0,roll:0};
const drawAircraft=createAircraftRenderer();
const aircraftLayer=document.createElement('canvas');
const aircraftContext=aircraftLayer.getContext('2d');
let aircraftPadding=1;
function iso(x,y,z){return [x*.866+z*.5,x*.25-y*.866-z*.433];}
function cacheAircraft(){
 const zoom=width<600?1.2:1.55;
 aircraftPadding=100*zoom+8;
 aircraftLayer.width=Math.ceil(aircraftPadding*2*dpr);
 aircraftLayer.height=Math.ceil(aircraftPadding*2*dpr);
 aircraftContext.setTransform(dpr,0,0,dpr,0,0);
 drawAircraft(aircraftContext,pose,p=>{
  const q=iso(...p);return [aircraftPadding+q[0]*zoom,aircraftPadding+q[1]*zoom];
 },dpr);
}
function polygon(points,fill,stroke,lineWidth=1){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}
function draw(){
 const state=coordinateFrame(time),scale=Math.max(400,Math.min(760,width*.68))/TILE_SIZE;
 const center=width/2,groundY=height*.52,aircraftY=height*.34;
 const project=(x,y,z)=>{
  const q=iso(x-state.world,y,z);return [center+q[0]*scale,groundY+q[1]*scale];
 };
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#edf2f5';ctx.fillRect(0,0,width,height);
 const reach=(width+height)*2/scale,from=state.world-reach,to=state.world+reach;
 const coasts=[true,false].map(top=>{
  const points=[];
  for(let x=from;x<=to+400;x+=400){
   const z=top?3400+850*Math.sin(x/2800)+280*Math.sin(x/1100):-4100+500*Math.sin(x/2400+.8);
   points.push([x,z]);
  }
  return {top,points};
 });
 const tiles=[];
 for(let z=-4;z<=4;z++)for(let x=state.tile-5;x<=state.tile+5;x++){
  const x0=(x-.5)*TILE_SIZE,z0=(z-.5)*TILE_SIZE;
  const points=[[x0,z0],[x0+TILE_SIZE,z0],[x0+TILE_SIZE,z0+TILE_SIZE],[x0,z0+TILE_SIZE]].map(([a,b])=>project(a,0,b));
  if(points.every(p=>p[0]<-2)||points.every(p=>p[0]>width+2)||points.every(p=>p[1]<-2)||points.every(p=>p[1]>height+2))continue;
  tiles.push({points,active:x===state.tile&&z===0});
 }
 for(const {points,active} of tiles){
  polygon(points,active?'#d9eaf3':'#edf2f5');
  ctx.save();polygon(points);ctx.clip();
  for(const {top,points:coast} of coasts){
   const lip=coast.map(([x,z])=>project(x,180,z));
   // The raised shore and its side face add depth without changing the route.
   polygon([...coast.map(([x,z])=>project(x,0,z)),...lip.slice().reverse()],active?'#9fb7a8':'#bbc8c1');
   const far=top?reach:-reach;
   polygon([...lip,project(to+400,180,far),project(from,180,far)],active?'#bed3c4':'#d5ded9');
  }
  ctx.strokeStyle=active?'#b5d1df':'#d6e0e6';ctx.lineWidth=1;
  for(let x=Math.floor(from/1600)*1600;x<to;x+=1600){
   for(const z of [-1800,1500]){
    const a=project(x,0,z),b=project(x+240,0,z);
    ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
   }
  }
  ctx.restore();
 }
 ctx.setLineDash([7,7]);
 for(const {points} of tiles)polygon(points,null,'#adc2d0');
 ctx.setLineDash([]);
 for(const {points,active} of tiles)if(active)polygon(points,null,'#6296bc',2);
 // A fixed ground reference and shadow make the aircraft's lack of translation visible.
 ctx.save();ctx.translate(center,groundY);ctx.rotate(Math.atan2(.25,.866));
 ctx.fillStyle='#587a911e';ctx.beginPath();ctx.ellipse(0,0,width<600?48:65,16,0,0,Math.PI*2);ctx.fill();ctx.restore();
 const ring=Array.from({length:49},(_,i)=>{
  const a=i/48*Math.PI*2;return project(state.world+Math.cos(a)*800,0,Math.sin(a)*800);
 });
 polygon(ring,null,'#7c9eb785');
 ctx.beginPath();ctx.moveTo(center,aircraftY+20);ctx.lineTo(center,groundY);
 ctx.setLineDash([2,4]);ctx.strokeStyle='#6d95af';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();ctx.arc(center,groundY,3,0,Math.PI*2);ctx.fillStyle='#4d83aa';ctx.fill();
 ctx.drawImage(aircraftLayer,center-aircraftPadding,aircraftY-aircraftPadding,aircraftPadding*2,aircraftPadding*2);
 exhibit.dataset.step=String(state.step);
 const heading=state.step===1?['비행기는 제자리,','지형만 이동']:['타일이 바뀌면','좌표 기준도 전환'];
 if(title.textContent!==heading.join(' '))title.innerHTML=heading.map(text=>`<span>${text}</span>`).join(' ');
 stepLabel.textContent=state.step===1?'01 / 기체 고정':'02 / 좌표 전환';
 tileLabel.textContent=String(state.tile+1).padStart(2,'0');
 const local=Math.trunc(state.local);
 localLabel.textContent=`X ${local<0?'−':'+'}${Math.abs(local).toLocaleString('ko-KR')}`;
 canvas.dataset.time=time.toFixed(3);canvas.dataset.tile=String(state.tile);
 canvas.dataset.local=state.local.toFixed(3);canvas.dataset.world=state.world.toFixed(3);
}
function resize(){
 const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;
 width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);cacheAircraft();draw();
}
function stopped(){return !visible||paused||document.hidden;}
function tick(now){
 frame=0;if(stopped())return;
 if(last&&now-last<32){frame=requestAnimationFrame(tick);return;}
 const dt=last?Math.min((now-last)/1000,.08):0;last=now;time+=dt;
 draw();frame=requestAnimationFrame(tick);
}
function schedule(){cancelAnimationFrame(frame);frame=0;last=0;if(!stopped())frame=requestAnimationFrame(tick);}
function pauseState(){
 pause.textContent=paused?'▷':'Ⅱ';pause.setAttribute('aria-pressed',String(paused));
 pause.setAttribute('aria-label',paused?'비행 좌표 시연 재생':'비행 좌표 시연 일시정지');
}
pause.addEventListener('click',()=>{paused=!paused;pauseState();schedule();});
reduced.addEventListener('change',()=>{paused=reduced.matches;pauseState();schedule();});
document.addEventListener('visibilitychange',schedule);
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(e=>{visible=e[0].isIntersecting;schedule();},{threshold:.05}).observe(exhibit);
pauseState();resize();
