import {coordinateFrame,TILE_SIZE} from './flight-model.js?v=continuous-flight';
import {createAircraftRenderer} from './flight-aircraft.js';

const canvas=document.getElementById('flight-canvas');
const ctx=canvas.getContext('2d',{alpha:false});
const exhibit=document.getElementById('flight-exhibit');
const pause=document.getElementById('flight-pause');
const title=document.getElementById('flight-title');
const stepLabel=document.getElementById('flight-step');
const localLabel=document.getElementById('flight-local');
const tileLabel=document.getElementById('flight-tile');
const altitudeLabel=document.getElementById('flight-altitude');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,width=1,height=1,dpr=1,visible=false,paused=reduced.matches,frame=0,last=0;

// Use the original mesh and camera. Keep the horizontal origin fixed while pitch follows the climb.
// X travel moves the environment up-left while the aircraft stays at the origin.
const pose={yaw:Math.PI/2,pitch:0,roll:0};
const drawAircraft=createAircraftRenderer();
const aircraftLayer=document.createElement('canvas');
const aircraftContext=aircraftLayer.getContext('2d');
let aircraftPadding=1,cachedPitch=NaN,cachedZoom=0,cachedDpr=0;
function iso(x,y,z){return [x*.866+z*.5,x*.25-y*.866-z*.433];}
function cacheAircraft(pitch){
 const zoom=width<600?1.2:1.55,angle=Math.round(pitch*1000)/1000;
 if(angle===cachedPitch&&zoom===cachedZoom&&dpr===cachedDpr)return;
 cachedPitch=angle;cachedZoom=zoom;cachedDpr=dpr;pose.pitch=angle;
 aircraftPadding=100*zoom+8;
 const side=Math.ceil(aircraftPadding*2*dpr);
 if(aircraftLayer.width!==side||aircraftLayer.height!==side){aircraftLayer.width=side;aircraftLayer.height=side;}
 aircraftContext.setTransform(dpr,0,0,dpr,0,0);
 aircraftContext.clearRect(0,0,aircraftPadding*2,aircraftPadding*2);
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
 const center=width/2,groundY=height*.52+(state.altitude-650)*.2,aircraftY=height*.34;
 const project=(x,y,z)=>{
  const q=iso(x-state.world,y,z);return [center+q[0]*scale,groundY+q[1]*scale];
 };
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#eaf2f6';ctx.fillRect(0,0,width,height);
 const reach=(width+height)*2/scale;
 // Anchor samples to world coordinates: moving the camera must not reshape the coast.
 const from=Math.floor((state.world-reach)/400)*400,to=Math.ceil((state.world+reach)/400)*400;
 const x0=(state.tile-.5)*TILE_SIZE,z0=-TILE_SIZE/2;
 const currentTile=[[x0,z0],[x0+TILE_SIZE,z0],[x0+TILE_SIZE,z0+TILE_SIZE],[x0,z0+TILE_SIZE]].map(([x,z])=>project(x,0,z));
 polygon(currentTile,'#deebf3');
 // Paint each shoreline once, across tiles. Ground-tile clipping previously
 // sliced the elevated edges and left visible seams at the coordinate boundary.
 for(const top of [true,false]){
  const coast=[];
  for(let x=from;x<=to;x+=400){
   const z=top?3400+850*Math.sin(x/2800)+280*Math.sin(x/1100):-4100+500*Math.sin(x/2400+.8);
   coast.push([x,z]);
  }
  const lip=coast.map(([x,z])=>project(x,180,z));
  polygon([...coast.map(([x,z])=>project(x,0,z)),...lip.slice().reverse()],'#a6bdad');
  const far=top?reach:-reach;
  polygon([...lip,project(to,180,far),project(from,180,far)],'#bfd2c3');
 }
 // Keep the one explanatory boundary visible over both water and land.
 // A white casing separates the dashed blue line from every terrain color.
 if(state.step===2){
  const boundary=(Math.floor(time/18)+.5)*TILE_SIZE;
  const a=project(boundary,0,-reach),b=project(boundary,0,reach);
  ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.setLineDash([11,7]);
  ctx.lineCap='round';ctx.strokeStyle='#ffffff';ctx.lineWidth=5.5;ctx.stroke();
  ctx.strokeStyle='#3476a6';ctx.lineWidth=2.5;ctx.stroke();
  ctx.setLineDash([]);ctx.lineCap='butt';
 }
 // A soft shadow is enough to establish height; avoid extra rings and axes on the sea.
 ctx.save();ctx.translate(center,groundY);ctx.rotate(Math.atan2(.25,.866));
 ctx.filter='blur(3px)';ctx.fillStyle='#587a9124';ctx.beginPath();
 ctx.ellipse(0,0,width<600?45:60,13,0,0,Math.PI*2);ctx.fill();ctx.restore();
 cacheAircraft(state.pitch);
 ctx.drawImage(aircraftLayer,center-aircraftPadding,aircraftY-aircraftPadding,aircraftPadding*2,aircraftPadding*2);
 exhibit.dataset.step=String(state.step);
 const heading=state.step===1?['비행기는 제자리,','지형만 이동']:['타일이 바뀌면','좌표 기준도 전환'];
 if(title.textContent!==heading.join(' '))title.innerHTML=heading.map(text=>`<span>${text}</span>`).join(' ');
 stepLabel.textContent=state.step===1?'01 / 기체 고정':'02 / 좌표 전환';
 tileLabel.textContent=String(state.tile+1).padStart(2,'0');
 altitudeLabel.textContent=`${Math.round(state.altitude)} m`;
 const local=Math.trunc(state.local);
 localLabel.textContent=`X ${local<0?'−':'+'}${Math.abs(local).toLocaleString('ko-KR')}`;
 canvas.dataset.time=time.toFixed(3);canvas.dataset.tile=String(state.tile);
 canvas.dataset.local=state.local.toFixed(3);canvas.dataset.world=state.world.toFixed(3);
 canvas.dataset.altitude=state.altitude.toFixed(3);canvas.dataset.pitch=state.pitch.toFixed(4);
}
function resize(){
 const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;
 width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);draw();
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
