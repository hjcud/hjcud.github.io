import {FlightDemo,splitCoordinate,TILE_SIZE,aircraftToWorld} from './flight-model.js';
import {createAircraftRenderer} from './flight-aircraft.js';
const canvas=document.getElementById('flight-canvas'),ctx=canvas.getContext('2d',{alpha:false});
const exhibit=document.getElementById('flight-exhibit'),pause=document.getElementById('flight-pause');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),sim=new FlightDemo();
let visible=false,paused=reduced.matches,frame=0,last=0,uiTime=0,width=1,height=1,dpr=1,zoom=1;
const $=id=>document.getElementById(id),drawAircraft=createAircraftRenderer();
const radiansToDegrees=v=>v*180/Math.PI;
function project([x,y,z]){return [width*(width<600?.5:.58)+(x*.866+z*.5)*zoom,height*(width<600?.30:.42)+(x*.25-z*.433-y*.866)*zoom];}
function polygon(points,fill,stroke){
 ctx.beginPath();points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.65;ctx.stroke();}
}
function line(points,color,lineWidth=1){ctx.beginPath();points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();}
function textAt(point,text,color='#708d9e',size=10){const [x,y]=project(point);ctx.font=`${size}px system-ui,sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,x,y);}
// One continuous coast across tile boundaries, not repeated island stamps.
const coastCache=new Map();
function coast(z){return -6500+1800*Math.sin(z/9000)+700*Math.sin(z/2500);}
function coastStrip(tileX,tileZ){
 const key=tileX+','+tileZ;if(coastCache.has(key))return coastCache.get(key);
 const x0=tileX*TILE_SIZE-5000,x1=x0+TILE_SIZE,z0=tileZ*TILE_SIZE-5000;
 const points=[[x0,0,z0]];
 for(let i=0;i<=24;i++){const z=z0+i*TILE_SIZE/24;points.push([Math.max(x0,Math.min(x1,coast(z))),0,z]);}
 points.push([x0,0,z0+TILE_SIZE]);coastCache.set(key,points);
 if(coastCache.size>120)coastCache.delete(coastCache.keys().next().value);
 return points;
}
let previousTile=null,boundaryAt=-10;
let previousBasis={x:0,z:0};

// Fixed X/Z reference frame is independent of terrain translation and aircraft attitude.
function drawOrigin(){
 const y=-12,radius=83;
 const ring=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return [Math.cos(a)*radius,y,Math.sin(a)*radius];});
 polygon(ring,'#ffffff32');line(ring,'#537c9c90',1);
 line([[-106,y,0],[112,y,0]],'#668aa5',1);
 line([[0,y,-106],[0,y,112]],'#668aa5',1);
 textAt([122,y,0],'+X','#47718e',10);textAt([0,y,124],'+Z','#47718e',10);
 const [ox,oy]=project([0,y,0]);
 ctx.beginPath();ctx.arc(ox,oy,3,0,Math.PI*2);ctx.fillStyle='#3677a7';ctx.fill();
}
function drawOriginLabel(){
 const [x,y]=project([0,-12,0]),labelY=project([0,0,0])[1]+105*zoom,labelWidth=Math.min(310,width-24),compact=labelWidth<290;
 const localX=Math.trunc(splitCoordinate(sim.x).local).toLocaleString('ko-KR'),localZ=Math.trunc(splitCoordinate(sim.z).local).toLocaleString('ko-KR');
 ctx.beginPath();ctx.moveTo(x,y+50*zoom);ctx.lineTo(x,labelY-22);ctx.setLineDash([2,4]);ctx.strokeStyle='#547f9a75';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#fffffff5';ctx.strokeStyle='#99b5ca';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x-labelWidth/2,labelY-20,labelWidth,132,7);ctx.fill();ctx.stroke();
 ctx.textAlign='center';ctx.font='11px system-ui,sans-serif';ctx.fillStyle='#607e95';ctx.fillText('기체 위치 고정',x,labelY+1);
 ctx.font=`650 ${compact?23:27}px system-ui,sans-serif`;ctx.fillStyle='#245c88';ctx.fillText('X 0  /  Z 0',x,labelY+33);
 ctx.beginPath();ctx.moveTo(x-labelWidth/2+18,labelY+49);ctx.lineTo(x+labelWidth/2-18,labelY+49);ctx.strokeStyle='#dce7ef';ctx.stroke();
 ctx.font='11px system-ui,sans-serif';ctx.fillStyle='#718ba0';ctx.fillText('타일 내 좌표',x,labelY+70);
 ctx.font=`600 ${compact?17:21}px system-ui,sans-serif`;ctx.fillStyle='#376e99';ctx.fillText(`X ${localX}  /  Z ${localZ}`,x,labelY+97);
}

function draw(){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#eaf2f6';ctx.fillRect(0,0,width,height);
 const sx=splitCoordinate(sim.x),sz=splitCoordinate(sim.z),key=sx.tile+','+sz.tile;
 if(previousTile&&key!==previousTile.key){
  previousBasis={x:previousTile.x,z:previousTile.z};
  boundaryAt=sim.time;
 }
 previousTile={key,x:sx.tile,z:sz.tile};
 // External tracking camera. Translation is rebased; terrain retains world orientation.
 const world=(x,y,z)=>[x/38,y/38,z/38];
 const absolute=([x,y,z])=>world(x-sx.tile*TILE_SIZE-sx.local,y-sim.altitude,z-sz.tile*TILE_SIZE-sz.local);
 const tiles=[];
 for(let z=-4;z<=4;z++)for(let x=-4;x<=4;x++){
  const cx=x*TILE_SIZE-sx.local,cz=z*TILE_SIZE-sz.local;
  const points=[[-5000,-5000],[5000,-5000],[5000,5000],[-5000,5000]].map(([a,b])=>world(cx+a,-sim.altitude,cz+b));
  const screen=points.map(project);
  if(screen.every(p=>p[0]<-40)||screen.every(p=>p[0]>width+40)||screen.every(p=>p[1]<-40)||screen.every(p=>p[1]>height+40))continue;
  tiles.push({x,z,cx,cz,points});
 }
 for(const t of tiles){
  polygon(t.points,t.x===0&&t.z===0?'#daeaf4':'#eaf2f6');
  polygon(coastStrip(sx.tile+t.x,sz.tile+t.z).map(absolute),'#c8d8cf');
 }
 // Coastline stays continuous while local tile coordinates wrap.
 const coastLine=[];
 for(let z=sim.z-45000;z<=sim.z+45000;z+=350)coastLine.push(absolute([coast(z),0,z]));
 line(coastLine,'#a7c1b3',2);
 for(const t of tiles){
  const active=t.x===0&&t.z===0;
  polygon(t.points,null,active?'#729ab8':'#bfD1dc');
  if(active)line([...t.points,t.points[0]],'#5a92bb',1.5);
  if(active&&sim.time-boundaryAt<3){ctx.globalAlpha=(1-(sim.time-boundaryAt)/3)*.14;polygon(t.points,'#247bd2');ctx.globalAlpha=1;}
  if(active)textAt(world(t.cx,-sim.altitude+20,t.cz),'기준 타일','#487da2',width<500?10:12);
  textAt(world(t.cx-3500,-sim.altitude+20,t.cz-3600),`${sx.tile+t.x}, ${sz.tile+t.z}`,active?'#47799d':'#89a4b5',width<500?8:10);
 }
 // Show the old basis and its transfer to the new tile without moving the landscape.
 if(sim.time-boundaryAt<3){
  const oldX=(previousBasis.x-sx.tile)*TILE_SIZE-sx.local,oldZ=(previousBasis.z-sz.tile)*TILE_SIZE-sz.local;
  const oldCorners=[[-5000,-5000],[5000,-5000],[5000,5000],[-5000,5000],[-5000,-5000]].map(([x,z])=>world(oldX+x,-sim.altitude,z+oldZ));
  ctx.globalAlpha=Math.min(1,(3-(sim.time-boundaryAt))/.7);ctx.setLineDash([4,5]);line(oldCorners,'#8b9eae',1.2);ctx.setLineDash([]);
  const from=project(world(oldX,-sim.altitude,oldZ)),to=project(world(-sx.local,-sim.altitude,-sz.local));
  const a=Math.atan2(to[1]-from[1],to[0]-from[0]);
  ctx.beginPath();ctx.moveTo(...from);ctx.lineTo(...to);ctx.strokeStyle='#3f83b5';ctx.lineWidth=1.5;ctx.stroke();
  ctx.beginPath();ctx.moveTo(...to);ctx.lineTo(to[0]-9*Math.cos(a-.4),to[1]-9*Math.sin(a-.4));ctx.lineTo(to[0]-9*Math.cos(a+.4),to[1]-9*Math.sin(a+.4));ctx.closePath();ctx.fillStyle='#3f83b5';ctx.fill();ctx.globalAlpha=1;
 }
 // Mesh and heading now rotate together in the external view, including pitch and bank.
 const rotate=p=>aircraftToWorld(p,sim);
 const shadow=[[-7,0,50],[8,0,50],[10,0,5],[62,0,-22],[62,0,-29],[8,0,-19],[5,0,-52],[-5,0,-52],[-8,0,-19],[-62,0,-29],[-62,0,-22],[-10,0,5]].map(p=>{const q=rotate(p);return [q[0],-sim.altitude/38,q[2]];});
 polygon(shadow,'#557b921c');
 drawOrigin();
 ctx.setLineDash([3,5]);line([[0,0,0],rotate([0,0,108])],'#5385a7',1);ctx.setLineDash([]);
 drawAircraft(ctx,sim,project,dpr);
 drawOriginLabel();
 canvas.dataset.heading=(sim.yaw%(Math.PI*2)).toFixed(3);
}
function updateUI(){
 const x=splitCoordinate(sim.x),z=splitCoordinate(sim.z);
 $('flight-yaw').textContent=`${((radiansToDegrees(sim.yaw)%360+360)%360).toFixed(1)}°`;
 $('flight-pitch').textContent=`${radiansToDegrees(sim.pitch).toFixed(1)}°`;
 $('flight-roll').textContent=`${radiansToDegrees(sim.roll).toFixed(1)}°`;
 canvas.dataset.time=sim.time.toFixed(2);canvas.dataset.tile=`${x.tile},${z.tile}`;
}
function resize(){const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);zoom=width<600?Math.max(width/600,.58):width/900;draw();updateUI();}
function stopped(){return !visible||paused||document.hidden;}
function tick(now){frame=0;if(stopped())return;if(last&&now-last<32){frame=requestAnimationFrame(tick);return;}const dt=last?Math.min((now-last)/1000,.08):0;last=now;sim.step(dt);draw();if(now-uiTime>160){updateUI();uiTime=now;}frame=requestAnimationFrame(tick);}
function schedule(){cancelAnimationFrame(frame);frame=0;last=0;if(!stopped())frame=requestAnimationFrame(tick);}
function pauseState(){pause.textContent=paused?'▷':'Ⅱ';pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'비행 좌표 시연 재생':'비행 좌표 시연 일시정지');}
pause.addEventListener('click',()=>{paused=!paused;pauseState();schedule();});
reduced.addEventListener('change',()=>{paused=reduced.matches;pauseState();schedule();});
document.addEventListener('visibilitychange',schedule);
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(e=>{visible=e[0].isIntersecting;schedule();},{threshold:.05}).observe(exhibit);
pauseState();resize();
