import {coordinateFrame,TILE_SIZE} from './flight-model.js?v=continuous-flight';
import {createAircraftRenderer} from './flight-aircraft.js?v=no-windows';

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
let aircraftPadding=1,cachedZoom=0,cachedDpr=0,aircraftBounds;
const groundLabelAnchors=new Map();
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
 aircraftBounds=drawAircraft(aircraftContext,pose,p=>{
  const q=iso(...p);return [aircraftPadding+q[0]*zoom,aircraftPadding+q[1]*zoom];
 },dpr);
}
function polygon(points,fill,stroke,lineWidth=1){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}
function drawGroundLabels(state,project,shoreAt,center,aircraftY,basis,scale){
 const base=canvas.getBoundingClientRect();
 const obstacles=Array.from(exhibit.querySelectorAll('.flight-anchor,.flight-position,.flight-boundary-label,#flight-pause,.flight-motion-cue')).filter(el=>getComputedStyle(el).display!=='none').map(el=>{
  const r=el.getBoundingClientRect();return {left:r.left-base.left-1,top:r.top-base.top-1,right:r.right-base.left+1,bottom:r.bottom-base.top+1};
 });
 obstacles.push({left:center-aircraftPadding+aircraftBounds.left-3,top:aircraftY-aircraftPadding+aircraftBounds.top-3,
  right:center-aircraftPadding+aircraftBounds.left+aircraftBounds.width+3,bottom:aircraftY-aircraftPadding+aircraftBounds.top+aircraftBounds.height+3});
 const drawn=[];
 ctx.textAlign='center';ctx.textBaseline='middle';
 const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 for(const tile of [state.tile,state.tile+1,state.tile-1,state.tile+2,state.tile-2]){
  if(drawn.length>=(width<600?2:3))break;
  const fontSize=width<600?Math.max(18,22-(String(tile).length-1)*2):36;
  ctx.font=`650 ${fontSize}px system-ui,sans-serif`;
  const text=`(${tile},0)`,halfWidth=ctx.measureText(text).width/2+3,halfHeight=fontSize*.56+3;
  function candidate(localX,z){
   const x=(tile+localX)*TILE_SIZE,y=z<shoreAt(x,false)||z>shoreAt(x,true)?180:0;
   if(Math.abs(localX)*TILE_SIZE+halfWidth/scale>=TILE_SIZE/2||Math.abs(z)+halfHeight/scale>=TILE_SIZE/2)return null;
   const point=project(x,y+1,z);
   const corners=[[-halfWidth,-halfHeight],[halfWidth,-halfHeight],[halfWidth,halfHeight],[-halfWidth,halfHeight]].map(([a,b])=>[point[0]+a*basis.xx-b*basis.zx,point[1]+a*basis.xy-b*basis.zy]);
   const box={left:Math.min(...corners.map(p=>p[0])),right:Math.max(...corners.map(p=>p[0])),top:Math.min(...corners.map(p=>p[1])),bottom:Math.max(...corners.map(p=>p[1]))};
   if(box.left<7||box.right>width-7||box.top<7||box.bottom>height-7||obstacles.some(r=>overlaps(box,r)))return null;
   let clearance=Math.min(box.left,width-box.right,box.top,height-box.bottom);
   for(const r of obstacles){
    const dx=Math.max(r.left-box.right,box.left-r.right,0),dy=Math.max(r.top-box.bottom,box.top-r.bottom,0);
    clearance=Math.min(clearance,Math.hypot(dx,dy));
   }
   const score=clearance*3-Math.abs(z)/3000-Math.abs(localX);
   return {localX,z,point,box,score};
  }
  const previous=groundLabelAnchors.get(tile);
  let chosen=previous?candidate(previous.localX,previous.z):null;
  if(!chosen)for(const localX of [-.25,.25,-.4,.4,0])for(const z of [0,-600,600,-1800,1800,-3600,3600]){
   const next=candidate(localX,z);if(next&&(!chosen||next.score>chosen.score))chosen=next;
  }
  // Narrow screens leave readable pockets beside the aircraft's readout.
  // Convert those free screen positions back to stable world anchors as well.
  if(!previous||!candidate(previous.localX,previous.z)){
   for(const fx of [.15,.85,.3,.7,.5])for(const fy of [.58,.54,.65,.25,.16]){
    const u=(width*fx-basis.origin[0])/scale,v=(height*fy-basis.origin[1])/scale,det=basis.xx*basis.zy-basis.zx*basis.xy;
    const x=state.world+(basis.zy*u-basis.zx*v)/det,z=(-basis.xy*u+basis.xx*v)/det;
    const localX=(Math.round(x/10)*10-tile*TILE_SIZE)/TILE_SIZE;
    if(localX<=-.49||localX>=.49||Math.abs(z)>4800)continue;
    const next=candidate(localX,Math.round(z/10)*10);
    if(next&&(!chosen||next.score>chosen.score))chosen=next;
   }
  }
  if(!chosen)continue;
  groundLabelAnchors.set(tile,{localX:chosen.localX,z:chosen.z});
  ctx.save();ctx.transform(basis.xx,basis.xy,-basis.zx,-basis.zy,...chosen.point);
  ctx.lineJoin='round';ctx.strokeStyle='#ffffffee';ctx.lineWidth=3;ctx.strokeText(text,0,0);
  ctx.fillStyle=tile===state.tile?'#32688f':'#6b8595';ctx.fillText(text,0,0);ctx.restore();
  obstacles.push({left:chosen.box.left-5,right:chosen.box.right+5,top:chosen.box.top-5,bottom:chosen.box.bottom+5});
  drawn.push(tile);
 }
 for(const tile of groundLabelAnchors.keys())if(Math.abs(tile-state.tile)>3)groundLabelAnchors.delete(tile);
 ctx.textBaseline='alphabetic';ctx.lineJoin='miter';
}
function draw(){
 const state=coordinateFrame(time),scale=Math.max(400,Math.min(760,width*.68))/TILE_SIZE;
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
 function boundaryLine(points){
  if(points.every(p=>p[0]<-4)||points.every(p=>p[0]>width+4)||points.every(p=>p[1]<-4)||points.every(p=>p[1]>height+4))return;
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.setLineDash([11,7]);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='#ffffff';ctx.lineWidth=5.5;ctx.stroke();
  ctx.strokeStyle='#3476a6';ctx.lineWidth=2.5;ctx.stroke();
  ctx.setLineDash([]);ctx.lineCap='butt';ctx.lineJoin='miter';
 }
 for(let tile=Math.floor(from/TILE_SIZE);tile<=Math.ceil(to/TILE_SIZE);tile++){
  const boundary=(tile+.5)*TILE_SIZE,lower=shoreAt(boundary,false),upper=shoreAt(boundary,true);
  boundaryLine([[-reach,180],[lower,180],[lower,0],[upper,0],[upper,180],[reach,180]].map(([z,y])=>project(boundary,y,z)));
 }
 // Z boundaries lie beyond the sea corridor, on the raised land surface.
 for(let row=Math.floor(-reach/TILE_SIZE);row<=Math.ceil(reach/TILE_SIZE);row++){
  const z=(row+.5)*TILE_SIZE;
  boundaryLine([project(from,180,z),project(to,180,z)]);
 }
 drawGroundLabels(state,project,shoreAt,center,aircraftY,basis,scale);
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
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);groundLabelAnchors.clear();draw();
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
