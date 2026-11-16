import {roadData} from './traffic-data.js';
export const lanes=roadData.lanes;
export function sample(laneId,s){
 const p=lanes[laneId].points;
 let lo=0,hi=p.length-1;s=Math.max(0,Math.min(s,lanes[laneId].length));
 while(hi-lo>1){const m=(lo+hi)>>1;if(p[m][2]<=s)lo=m;else hi=m;}
 const a=p[lo],b=p[hi],t=Math.max(0,Math.min(1,(s-a[2])/(b[2]-a[2])));
 return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};
}
export function nearest(laneId,point){
 let best=Infinity,s=0;const ps=lanes[laneId].points;
 for(let i=0;i<ps.length-1;i++){
  const a=ps[i],b=ps[i+1],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.z-a[1])*dz)/(dx*dx+dz*dz)));
  const dist=(point.x-a[0]-dx*t)**2+(point.z-a[1]-dz*t)**2;
  if(dist<best){best=dist;s=a[2]+(b[2]-a[2])*t;}
 }return s;
}
const ease=t=>t*t*t*(t*(t*6-15)+10);
export function changePoint(lane,s,change,ahead=0){
 const t=Math.max(0,Math.min(1,(change.travel+ahead)/change.length)),w=ease(t);
 const a=sample(lane,s+ahead),b=sample(change.to,change.targetS+ahead);
 return {x:a.x+(b.x-a.x)*w,z:a.z+(b.z-a.z)*w};
}
function changePose(lane,s,change){
 const p=changePoint(lane,s,change),next=changePoint(lane,s,change,.05);
 return {...p,angle:Math.atan2(next.z-p.z,next.x-p.x)};
}
export class TrafficSimulation{
 constructor(){
  this.time=140;this.completedChanges=0;this.stops=0;this.cars=[];this.people=[];this.signal='green';this.phase=140;
  const seeds=[[1,108],[1,132],[0,36],[2,18],[2,173],[0,220],[3,28],[3,96],[4,48],[4,185],[5,10],[5,125],[4,238],[0,115]];
  this.cars=seeds.map(([lane,s],id)=>({id,lane,spawnLane:lane,s,v:id===1?3.2:6.8,cruise:id===1?3.2:7.2+(id%3)*.35,length:id===1?8:4.2,change:null,cooldown:0,reason:'cruise',sensor:{reach:12,hit:false},pos:sample(lane,s),active:true}));
  this.updateSignal();this.updatePeople();
 }
 updateSignal(){
  const p=this.phase=this.time%160;
  this.signal=p<52.6667||p>=159?'red':p<155?'green':'yellow';
  this.remaining=this.signal==='red'?(p>=159?160-p+52.6667:52.6667-p):this.signal==='green'?155-p:159-p;
 }
 updatePeople(){
  this.people=[];const p=this.phase,cycle=Math.floor(this.time/160);
  for(let i=0;i<16;i++){
   // Wait offscreen, cross during vehicle red, then keep walking beyond the opposite edge.
   const row=cycle%2?3-Math.floor(i/4):Math.floor(i/4),reverse=(i%2===1)!==(cycle%2===1);
   const start=4+row*2.5+(i%4)*.75,age=p-start;
   const from=reverse?48+row*1.5:-35-row*1.5,to=reverse?-35-(3-row)*1.5:48+(3-row)*1.5;
   const duration=Math.abs(to-from)/1.8,progress=Math.max(0,Math.min(1,age/duration)),moving=progress>0&&progress<1;
   const z=from+(to-from)*progress,turn=ease(Math.max(0,Math.min(1,(age-duration)/2))),heading=(reverse?Math.PI:0)+Math.PI*turn;
   this.people.push({id:i,x:49.4+(i%2)*2.7+(Math.floor(i/2)%2)*1.3,z,heading,moving,crossing:moving&&z>=-13&&z<=12.5});
  }
  this.walk=this.people.some(person=>person.crossing);
 }
 occupied(car,lane){return car.lane===lane||car.change?.to===lane;}
 gapAhead(car,lane,s){
  let gap=Infinity,leader=null;
  for(const other of this.cars){if(other===car||!other.active||!this.occupied(other,lane))continue;
   const os=other.lane===lane?other.s:other.change.targetS;
   const g=os-s-(other.length+car.length)/2-2.5;
   if(os>s&&g<gap){gap=g;leader=other;}
  }return {gap,leader};
 }
 safeTarget(car,lane,s){
  return this.cars.every(other=>{
   if(other===car||!other.active||!this.occupied(other,lane))return true;
   const os=other.lane===lane?other.s:other.change.targetS;
   return Math.abs(os-s)>(car.length+other.length)/2+(os<s?16:20);
  });
 }
 tryChange(car,leader){
  if(car.change||car.cooldown>0||car.id===1)return;
  const lane=lanes[car.lane];
  // The world's stop-line queue protection also applies to the web demonstration.
  if(lane.stop>=0&&car.s<lane.stop+12&&car.s>lane.stop-45)return;
  for(const rule of lane.rules){
   const branch=rule.to===6;
   if(car.s<rule.start||car.s+(branch?12:26)>rule.end||(branch?car.id%3!==2:!leader||leader.v>car.cruise-1.2))continue;
   const targetS=nearest(rule.to,car.pos);
   if(!this.safeTarget(car,rule.to,targetS))continue;
   car.change={to:rule.to,targetS,travel:0,length:branch?12:26};car.cooldown=12;return;
  }
 }
 step(dt){
  this.time+=dt;this.updateSignal();this.updatePeople();
  for(const car of this.cars){
   if(!car.active){
    const lane=car.spawnLane;
    if(this.safeTarget(car,lane,0)){car.lane=lane;car.s=0;car.v=0;car.active=true;car.reason='cruise';car.sensor.hit=false;car.pos=sample(lane,0);}
    continue;
   }
   car.cooldown=Math.max(0,car.cooldown-dt);
   const lane=lanes[car.lane],ahead=this.gapAhead(car,car.lane,car.s);
   this.tryChange(car,ahead.gap<38?ahead.leader:null);
   let gap=ahead.gap,leader=ahead.leader,reason=gap<25?'vehicle':'cruise',limit=car.change?6.5:car.cruise;
   if(car.change){
    const target=this.gapAhead(car,car.change.to,car.change.targetS);
    if(target.gap<gap){gap=target.gap;leader=target.leader;reason='vehicle';}
    // Retain source-lane occupancy until the maneuver finishes.
   }
   const stopGap=lane.stop-car.s-car.length/2;
   const canBrake=stopGap>car.v*car.v/6;
   if(lane.stop>=0&&stopGap>=-.05&&(this.signal==='red'||this.signal==='yellow'&&canBrake)&&stopGap<gap){gap=Math.max(0,stopGap);leader=null;reason='signal';}
   // A small front corridor represents the original player/obstacle check.
   const f=sample(car.lane,car.s+car.length/2);car.sensor.hit=false;
   for(const person of this.people){
    if(!person.crossing)continue;
    const dx=person.x-f.x,dz=person.z-f.z;
    const forward=dx*Math.cos(f.angle)+dz*Math.sin(f.angle),side=Math.abs(-dx*Math.sin(f.angle)+dz*Math.cos(f.angle));
    if(forward>0&&forward<car.sensor.reach&&side<2.2){
     car.sensor.hit=true;
     if(forward-2<gap){gap=Math.max(0,forward-2);leader=null;reason='person';}
    }
   }
   if(leader)limit=Math.min(limit,Math.max(0,leader.v+(gap-car.v*1.2)/2));
   limit=Math.min(limit,Math.sqrt(Math.max(0,2*2.7*(gap-.15))));
   if(limit<.04)limit=0;
   const acceleration=Math.max(-3,Math.min(1.7,(limit-car.v)/dt));
   car.v=Math.max(0,car.v+acceleration*dt);
   const ds=Math.min(car.v*dt,Math.max(0,gap));car.s+=ds;car.reason=car.change?'change':reason;
   if(car.change){
    const ch=car.change;ch.travel+=ds;ch.targetS+=ds;
    car.pos=changePose(car.lane,car.s,ch);
    if(ch.travel>=ch.length){car.lane=ch.to;car.s=ch.targetS;car.change=null;this.completedChanges++;}
   }else car.pos=sample(car.lane,car.s);
   if(car.s>lanes[car.lane].length-car.length){car.active=false;car.change=null;}
  }
 }
}
