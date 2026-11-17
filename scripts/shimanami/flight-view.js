import {coordinateFrame,TILE_SIZE} from './flight-model.js?v=flat-coordinate';

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

function label(text,x,y,color){
 ctx.font='600 12px system-ui,sans-serif';ctx.textAlign='center';
 const w=ctx.measureText(text).width+22;
 ctx.fillStyle='#ffffffeb';ctx.beginPath();ctx.roundRect(x-w/2,y-15,w,27,5);ctx.fill();
 ctx.fillStyle=color;ctx.fillText(text,x,y+3);
}
function draw(){
 const state=coordinateFrame(time),scale=Math.max(280,Math.min(620,width*.76))/TILE_SIZE;
 const center=width/2,worldToScreen=x=>center+(x-state.world)*scale;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#edf2f5';ctx.fillRect(0,0,width,height);
 for(let tile=state.tile-2;tile<=state.tile+2;tile++){
  const left=worldToScreen((tile-.5)*TILE_SIZE),right=left+TILE_SIZE*scale;
  if(right<0||left>width)continue;
  const active=tile===state.tile;
  ctx.save();ctx.beginPath();ctx.rect(left,0,right-left,height);ctx.clip();
  ctx.fillStyle=active?'#d9eaf3':'#edf2f5';ctx.fillRect(left,0,right-left,height);
  // Coast geometry and camera remain continuous when the coordinate basis changes.
  for(const top of [true,false]){
   ctx.beginPath();ctx.moveTo(left,top?0:height);
   for(let x=left;x<=right+5;x+=5){
    const world=state.world+(x-center)/scale;
    const y=top?height*(.13+.07*Math.sin(world/2600)+.025*Math.sin(world/950)):
     height*(.91+.045*Math.sin(world/1900+.8));
    ctx.lineTo(x,y);
   }
   ctx.lineTo(right,top?0:height);ctx.closePath();
   ctx.fillStyle=active?'#bed3c4':'#d5ded9';ctx.fill();
  }
  ctx.strokeStyle=active?'#b5d1df':'#d6e0e6';ctx.lineWidth=1.5;
  for(let x=Math.floor((state.world-width/scale)/1100)*1100;x<state.world+width/scale;x+=1100){
   const sx=worldToScreen(x);
   for(const row of [.29,.7]){ctx.beginPath();ctx.moveTo(sx,height*row);ctx.lineTo(sx+14,height*row);ctx.stroke();}
  }
  ctx.restore();
  ctx.beginPath();ctx.moveTo(left,0);ctx.lineTo(left,height);
  ctx.setLineDash([7,7]);ctx.strokeStyle='#8da8ba';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
  const visibleLeft=Math.max(left,0),visibleRight=Math.min(right,width);
  if(visibleRight-visibleLeft>100)label(active?'현재 타일':tile<state.tile?'이전 타일':'다음 타일',
   (visibleLeft+visibleRight)/2,28,active?'#366d96':'#8295a3');
 }
 const boundary=worldToScreen((Math.floor(state.world/TILE_SIZE)+.5)*TILE_SIZE);
 if(state.step===2&&boundary>52&&boundary<width-52){
  ctx.beginPath();ctx.moveTo(boundary,55);ctx.lineTo(boundary,height-91);
  ctx.setLineDash([7,7]);ctx.strokeStyle='#628daf';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
 }
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
