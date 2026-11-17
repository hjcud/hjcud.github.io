import {coordinateFrame,TILE_SIZE,groundDashes,terrainScale} from './flight-model.js?v=world-anchored';
import {createAircraftRenderer} from './flight-aircraft.js?v=light-original-colors';

const canvas=document.getElementById('flight-canvas');
const ctx=canvas.getContext('2d',{alpha:false});
const exhibit=document.getElementById('flight-exhibit');
const pause=document.getElementById('flight-pause');
const position=document.querySelector('#flight-exhibit .flight-position');
const localLabel=document.getElementById('flight-local');
const tileLabel=document.getElementById('flight-tile');
const altitudeLabel=document.getElementById('flight-altitude');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,width=1,height=1,dpr=1,visible=false,paused=reduced.matches,frame=0,last=0;
let previousTile=null,basisChangedAt=-Infinity;

// Keep the aircraft position and attitude fixed. Apply inverse flight pitch to the environment.
// X travel moves the environment up-left while the aircraft stays at the origin.
const pose={yaw:Math.PI/2,pitch:0,roll:0};
const drawAircraft=createAircraftRenderer();
const aircraftLayer=document.createElement('canvas');
const aircraftContext=aircraftLayer.getContext('2d');
let aircraftPadding=1,cachedZoom=0,cachedDpr=0;
function iso(x,y,z){return [x*.866+z*.5,x*.25-y*.866-z*.433];}
function cacheAircraft(){
 const zoom=width<600?1.2:1.55;
 if(zoom===cachedZoom&&dpr===cachedDpr)return;
 cachedZoom=zoom;cachedDpr=dpr;
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
function drawGroundLabels(project,shoreAt,basis,scale,from,to,reach){
 // One pale identifier at each immutable tile center. Let the scene naturally
 // occlude it rather than moving it to a free screen position.
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`600 ${Math.min(52,Math.max(30,TILE_SIZE*scale*.07))}px system-ui,sans-serif`;
 ctx.fillStyle='rgba(57,94,119,.32)';
 for(let x=Math.floor(from/TILE_SIZE);x<=Math.ceil(to/TILE_SIZE);x++){
  for(let z=Math.floor(-reach/TILE_SIZE);z<=Math.ceil(reach/TILE_SIZE);z++){
   const wx=x*TILE_SIZE,wz=z*TILE_SIZE,y=wz<shoreAt(wx,false)||wz>shoreAt(wx,true)?180:0;
   const point=project(wx,y+1,wz);
   if(point[0]<-160||point[0]>width+160||point[1]<-70||point[1]>height+70)continue;
   ctx.save();ctx.transform(basis.xx,basis.xy,-basis.zx,-basis.zy,...point);
   ctx.fillText(`(${x},${z})`,0,0);ctx.restore();
  }
 }
 ctx.restore();
}
function draw(){
 const state=coordinateFrame(time),scale=terrainScale(width);
 const center=width/2,groundY=height*.52+(state.altitude-650)*.2,aircraftY=height*.34;
 cacheAircraft();
 const tilt=state.pitch*1.4,c=Math.cos(tilt),s=Math.sin(tilt);
 // Scale the displayed altitude for a legible tracking view, then rotate the
 // environment opposite the climb around the fixed aircraft reference point.
 const cameraHeight=(groundY-aircraftY)/(.866*scale);
 const project=(x,y,z)=>{
  const dx=x-state.world,dy=y-cameraHeight;
  const q=iso(c*dx+s*dy,-s*dx+c*dy,z);
  return [center+q[0]*scale,aircraftY+q[1]*scale];
 };
 const origin=project(state.world,0,0),xAxis=project(state.world+1/scale,0,0),zAxis=project(state.world,0,1/scale);
 const basis={origin,xx:xAxis[0]-origin[0],xy:xAxis[1]-origin[1],zx:zAxis[0]-origin[0],zy:zAxis[1]-origin[1]};
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
 // Both tile axes follow the same terrain transform and raised shore.
 const shoreAt=(x,top)=>{
  const sample=a=>top?3400+850*Math.sin(a/2800)+280*Math.sin(a/1100):-4100+500*Math.sin(a/2400+.8);
  const left=Math.floor(x/400)*400,t=(x-left)/400;
  return sample(left)*(1-t)+sample(left+400)*t;
 };
 // Build dashes in world space, not with a screen-space line-dash phase.
 // Both axes and every intersection retain their pattern while the camera moves.
 ctx.beginPath();
 function dash(points){
  if(points.every(p=>p[0]<-5)||points.every(p=>p[0]>width+5)||points.every(p=>p[1]<-5)||points.every(p=>p[1]>height+5))return;
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
 }
 for(let tile=Math.floor(from/TILE_SIZE);tile<=Math.ceil(to/TILE_SIZE);tile++){
  const x=(tile+.5)*TILE_SIZE,lower=shoreAt(x,false),upper=shoreAt(x,true);
  const extent=[project(x,180,-reach),project(x,0,lower),project(x,0,upper),project(x,180,reach)];
  if(extent.every(p=>p[0]<-5)||extent.every(p=>p[0]>width+5)||extent.every(p=>p[1]<-5)||extent.every(p=>p[1]>height+5))continue;
  for(const [start,end] of groundDashes(-reach,reach)){
   const cuts=[start,...[lower,upper].filter(z=>z>start&&z<end),end],points=[];
   for(let i=0;i<cuts.length-1;i++){
    const a=cuts[i],b=cuts[i+1],mid=(a+b)/2,y=mid<lower||mid>upper?180:0;
    points.push(project(x,y,a),project(x,y,b));
   }
   dash(points);
  }
 }
 for(let row=Math.floor(-reach/TILE_SIZE);row<=Math.ceil(reach/TILE_SIZE);row++){
  const z=(row+.5)*TILE_SIZE,a=project(from,180,z),b=project(to,180,z);
  if([a,b].every(p=>p[0]<-5)||[a,b].every(p=>p[0]>width+5)||[a,b].every(p=>p[1]<-5)||[a,b].every(p=>p[1]>height+5))continue;
  for(const [start,end] of groundDashes(from,to))dash([project(start,180,z),project(end,180,z)]);
 }
 ctx.lineCap='butt';ctx.lineJoin='round';
 ctx.strokeStyle='#ffffff';ctx.lineWidth=width<600?4.5:5.5;ctx.stroke();
 ctx.strokeStyle='#3476a6';ctx.lineWidth=width<600?2:2.5;ctx.stroke();ctx.lineJoin='miter';
 drawGroundLabels(project,shoreAt,basis,scale,from,to,reach);
 // A soft shadow is enough to establish height; avoid extra rings and axes on the sea.
 ctx.save();ctx.translate(...origin);ctx.rotate(Math.atan2(basis.xy,basis.xx));
 ctx.filter='blur(3px)';ctx.fillStyle='#587a9124';ctx.beginPath();
 ctx.ellipse(0,0,width<600?45:60,13,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.drawImage(aircraftLayer,center-aircraftPadding,aircraftY-aircraftPadding,aircraftPadding*2,aircraftPadding*2);
 exhibit.dataset.step=String(state.step);
 if(previousTile!==null&&state.tile!==previousTile)basisChangedAt=time;
 previousTile=state.tile;
 const emphasis=Math.max(0,1-(time-basisChangedAt)/1.25)*.18;
 position.style.setProperty('--basis-emphasis',emphasis.toFixed(3));
 tileLabel.textContent=`(${state.tile}, 0)`;
 altitudeLabel.textContent=`${Math.round(state.altitude)} m`;
 const local=Math.trunc(state.local);
 localLabel.textContent=`X ${local<0?'−':'+'}${Math.abs(local).toLocaleString('ko-KR')}`;
 canvas.dataset.time=time.toFixed(3);canvas.dataset.tile=String(state.tile);
 canvas.dataset.local=state.local.toFixed(3);canvas.dataset.world=state.world.toFixed(3);
 canvas.dataset.altitude=state.altitude.toFixed(3);canvas.dataset.pitch=state.pitch.toFixed(4);
 canvas.dataset.terrainPitch=(-tilt).toFixed(4);
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
