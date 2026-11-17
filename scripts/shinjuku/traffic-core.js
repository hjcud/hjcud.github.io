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
 constructor({incidents=false}={}){
  this.enableIncidents=incidents;this.incident=null;this.nextIncidentAt=0;this.observedId=9;this.completedRecoveries=0;
  this.time=140;this.completedChanges=0;this.stops=0;this.cars=[];this.people=[];this.signal='green';this.phase=140;
  const seeds=[[1,108],[1,132],[0,36],[2,18],[2,173],[0,220],[3,28],[3,96],[4,48],[4,185],[5,10],[5,125],[4,238],[0,115]];
  this.cars=seeds.map(([lane,s],id)=>({id,lane,spawnLane:lane,s,v:id===1?3.2:6.8,cruise:id===1?3.2:7.2+(id%3)*.35,length:id===1?8:4.2,change:null,cooldown:0,reason:'cruise',sensor:{reach:12,castReach:12,halfWidth:1.2,hit:false,personId:null,point:null},recovery:null,blockedFor:0,pos:sample(lane,s),active:true}));
  this.lastDt=0;this.updateSignal();this.updatePeople();
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
  if(this.incident){
   const e=this.incident,target=this.cars.find(c=>c.id===e.carId);
   if(target&&(!target.active||target.pos.x>e.x+10))e.released=true;
   if(e.released)e.z+=1.8*this.lastDt;
   else e.z=Math.max(e.holdZ,e.z-7*this.lastDt);
   const moving=e.released||e.z>e.holdZ;
   if(e.z>52){this.incident=null;this.nextIncidentAt=this.time+20;}
   else this.people.push({id:100,x:e.x,z:e.z,heading:e.released?0:Math.PI,moving,crossing:e.z>=-13&&e.z<=13,radius:.6,incident:true});
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
 observe(car){
  if(!car?.active)return null;
  let leaderLane=car.lane,leaderS=car.s,ahead=this.gapAhead(car,leaderLane,leaderS);
  if(car.change){
   const target=this.gapAhead(car,car.change.to,car.change.targetS);
   if(car.change.recovery||target.gap<ahead.gap){ahead=target;leaderLane=car.change.to;leaderS=car.change.targetS;}
  }
  const stop=lanes[car.lane].stop,frontS=car.s+car.length/2;
  const leader=ahead.leader,leaderCenter=leader?(leader.lane===leaderLane?leader.s:leader.change.targetS):null;
  return {
   lane:car.lane,frontS,stopS:stop>=frontS-.05?stop:null,stopGap:stop>=frontS-.05?Math.max(0,stop-frontS):null,
   hasStop:stop>=0,leaderLane,leaderFromS:leaderS+car.length/2,
   leaderRearS:leader?leaderCenter-leader.length/2:null,leaderGap:leader?Math.max(0,ahead.gap+2.5):null,
   leaderId:leader?.id??null,sensorHit:car.sensor.hit,sensorReach:car.sensor.reach
  };
 }
 safeTarget(car,lane,s){
  return this.cars.every(other=>{
   if(other===car||!other.active||!this.occupied(other,lane))return true;
   const os=other.lane===lane?other.s:other.change.targetS;
   return Math.abs(os-s)>(car.length+other.length)/2+(os<s?16:20);
  });
 }
 tryChange(car,leader){
  if(car.change||car.cooldown>0||car.id===1||this.incident?.carId===car.id&&!this.incident.released)return;
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
 // A staged intrusion makes the original stop/reverse/recovery conditions observable.
 beginIncident(){
  if(!this.enableIncidents||this.incident||this.time<this.nextIncidentAt||this.signal!=='green')return;
  const car=this.cars.find(c=>c.id===this.observedId);
  if(!car?.active||car.lane<3||car.lane>5||car.change||car.recovery||car.pos.x<30||car.pos.x>37||car.v>3.2)return;
  const point=sample(car.lane,car.s+36);
  this.incident={carId:car.id,x:point.x,z:36,holdZ:point.z,released:false};
 }
 sense(car,direction=1,maxReach=null){
  const frontOf=p=>({x:p.x+Math.cos(p.angle)*direction*car.length/2,z:p.z+Math.sin(p.angle)*direction*car.length/2});
  const front=frontOf(car.pos),castReach=maxReach??Math.max(12,Math.abs(car.v)*1.5+5),halfWidth=1.2;
  const path=[front];
  if(car.change&&direction>0){
   const ch=car.change;
   for(let a=1;a<=Math.ceil(castReach);a++){
    const d=Math.min(a,castReach),p=ch.travel+d<ch.length?changePose(car.lane,car.s+d,{...ch,travel:ch.travel+d,targetS:ch.targetS+d}):sample(ch.to,ch.targetS+d);
    path.push(frontOf(p));
   }
  }else path.push({x:front.x+Math.cos(car.pos.angle)*direction*castReach,z:front.z+Math.sin(car.pos.angle)*direction*castReach});
  const sensor={front,direction,castReach,reach:castReach,halfWidth,hit:false,personId:null,point:null,path:[front]};
  let travel=0;
  for(let i=1;i<path.length&&travel<castReach;i++){
   const a=path[i-1],b=path[i],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<1e-6)continue;
   const ux=(b.x-a.x)/length,uz=(b.z-a.z)/length,range=Math.min(length,castReach-travel);let contact=range,hit=null;
   for(const person of this.people){
    if(!person.crossing)continue;
    const dx=person.x-a.x,dz=person.z-a.z,along=dx*ux+dz*uz,side=-dx*uz+dz*ux,r=person.radius??.55,outside=Math.max(0,Math.abs(side)-halfWidth);
    if(outside>r||along+r<0)continue;
    const distance=Math.max(0,along-Math.sqrt(r*r-outside*outside));if(distance>contact)continue;
    const lateral=Math.max(-halfWidth,Math.min(halfWidth,side));contact=distance;
    hit={personId:person.id,point:{x:a.x+ux*distance-uz*lateral,z:a.z+uz*distance+ux*lateral}};
   }
   sensor.path.push({x:a.x+ux*contact,z:a.z+uz*contact});
   if(hit){sensor.hit=true;sensor.reach=travel+contact;sensor.personId=hit.personId;sensor.point=hit.point;break;}
   travel+=range;
  }
  return sensor;
 }
 poseClear(car,pose){
  const ux=Math.cos(pose.angle),uz=Math.sin(pose.angle),halfL=car.length/2+.18,halfW=1.2;
  for(const other of this.cars){
   if(other===car||!other.active)continue;
   const vx=Math.cos(other.pos.angle),vz=Math.sin(other.pos.angle),dx=other.pos.x-pose.x,dz=other.pos.z-pose.z;
   let overlap=true;
   for(const [x,z] of [[ux,uz],[-uz,ux],[vx,vz],[-vz,vx]]){
    const extent=halfL*Math.abs(ux*x+uz*z)+halfW*Math.abs(-uz*x+ux*z)+(other.length/2+.12)*Math.abs(vx*x+vz*z)+1.05*Math.abs(-vz*x+vx*z);
    if(Math.abs(dx*x+dz*z)>=extent){overlap=false;break;}
   }
   if(overlap)return false;
  }
  for(const person of this.people){
   if(!person.crossing)continue;
   const dx=person.x-pose.x,dz=person.z-pose.z;
   const along=Math.max(0,Math.abs(dx*ux+dz*uz)-halfL),side=Math.max(0,Math.abs(-dx*uz+dz*ux)-halfW);
   if(Math.hypot(along,side)<(person.radius??.55)+.15)return false;
  }
  return true;
 }
 rearClearance(car){
  let gap=Math.max(0,car.s-1);
  for(const other of this.cars){
   if(other===car||!other.active||!this.occupied(other,car.lane))continue;
   const os=other.lane===car.lane?other.s:other.change.targetS;
   if(os<car.s)gap=Math.min(gap,car.s-os-(car.length+other.length)/2-.6);
  }
  const sensor=this.sense(car,-1,Math.max(0,gap));
  if(sensor.hit)gap=Math.min(gap,sensor.reach-.6);
  return Math.max(0,gap);
 }
 tryRecovery(car){
  if(car.recovery||car.change||car.v>.2||car.blockedFor<1.8||this.incident?.carId!==car.id)return;
  const lane=lanes[car.lane];
  if(lane.stop>=0&&car.s<lane.stop+12&&car.s>lane.stop-45)return;
  const rear=this.rearClearance(car);
  for(const rule of lane.rules){
   if(rule.to===6||car.s+12>rule.end)continue;
   for(const reverseDistance of [2,2.5,3,3.5,4]){
    if(rear<reverseDistance+.1||car.s-reverseDistance<rule.start)continue;
    const startS=car.s-reverseDistance,start=sample(car.lane,startS),targetS=nearest(rule.to,start);
    if(!this.safeTarget(car,rule.to,targetS))continue;
    let clear=true;
    for(let d=0;d<=10;d+=.25){
     const p=changePose(car.lane,startS+d,{to:rule.to,targetS:targetS+d,travel:d,length:10});
     if(!this.poseClear(car,p)){clear=false;break;}
    }
    if(!clear)continue;
    car.recovery={phase:'gear',to:rule.to,reverse:0,reverseDistance,timer:.45};car.v=0;car.cooldown=16;return;
   }
  }
 }
 advanceRecovery(car,dt){
  const r=car.recovery;if(!r)return false;
  if(r.phase==='gear'){
   car.v=0;r.timer-=dt;car.reason='person';
   if(r.timer<=0)r.phase='reverse';
  }else if(r.phase==='reverse'){
   const distance=Math.min(1.2*dt,r.reverseDistance-r.reverse,this.rearClearance(car));
   car.s-=distance;r.reverse+=distance;car.v=-distance/dt;car.pos=sample(car.lane,car.s);car.reason='reverse';
   if(r.reverse>=r.reverseDistance-.001){r.phase='forward';r.timer=.45;car.v=0;}
  }else{
   car.v=0;r.timer-=dt;car.reason='reverse';
   const targetS=nearest(r.to,car.pos);
   if(r.timer<=0&&this.safeTarget(car,r.to,targetS)){
    car.change={to:r.to,targetS,travel:0,length:10,recovery:true};car.recovery=null;
   }
  }
  car.sensor=this.sense(car);return true;
 }
 step(dt){
  this.lastDt=dt;this.time+=dt;this.updateSignal();this.beginIncident();this.updatePeople();
  for(const car of this.cars){
   if(!car.active){
    const lane=car.spawnLane;
    if(this.safeTarget(car,lane,0)){car.lane=lane;car.s=0;car.v=0;car.active=true;car.reason='cruise';car.recovery=null;car.blockedFor=0;car.sensor.hit=false;car.pos=sample(lane,0);}
    continue;
   }
   car.cooldown=Math.max(0,car.cooldown-dt);
   if(this.advanceRecovery(car,dt))continue;
   const lane=lanes[car.lane],ahead=this.gapAhead(car,car.lane,car.s);
   this.tryChange(car,ahead.gap<38?ahead.leader:null);
   let gap=ahead.gap,leader=ahead.leader,reason=gap<25?'vehicle':'cruise',limit=car.change?6.5:car.cruise;
   if(car.change){
    const target=this.gapAhead(car,car.change.to,car.change.targetS);
    if(target.gap<gap){gap=target.gap;leader=target.leader;reason='vehicle';}
    if(car.change.recovery)limit=Math.min(limit,2.8);
    // Retain source-lane occupancy until the maneuver finishes.
   }
   if(car.change?.recovery){gap=Infinity;leader=null;reason='change';}
   const stopGap=lane.stop-car.s-car.length/2;
   const canBrake=stopGap>car.v*car.v/6;
   if(lane.stop>=0&&stopGap>=-.05&&(this.signal==='red'||this.signal==='yellow'&&canBrake)&&stopGap<gap){gap=Math.max(0,stopGap);leader=null;reason='signal';}
   // Swept front rectangle against pedestrian circles, including the nearest contact point.
   car.sensor=this.sense(car);
   if(car.sensor.hit&&car.sensor.reach-.9<gap){gap=Math.max(0,car.sensor.reach-.9);leader=null;reason='person';}
   if(leader)limit=Math.min(limit,Math.max(0,leader.v+(gap-car.v*1.2)/2));
   limit=Math.min(limit,Math.sqrt(Math.max(0,2*2.7*(gap-.15))));
   if(limit<.04)limit=0;
   const acceleration=Math.max(-3,Math.min(1.7,(limit-car.v)/dt));
   car.v=Math.max(0,car.v+acceleration*dt);
   let ds=Math.min(car.v*dt,Math.max(0,gap));
   if(car.change?.recovery&&!this.poseClear(car,changePose(car.lane,car.s+ds,{...car.change,travel:car.change.travel+ds,targetS:car.change.targetS+ds}))){ds=0;car.v=0;}
   car.s+=ds;car.reason=car.change?'change':reason;
   car.blockedFor=car.sensor.hit&&car.v<.2?car.blockedFor+dt:0;
   this.tryRecovery(car);
   if(car.change){
    const ch=car.change;ch.travel+=ds;ch.targetS+=ds;
    car.pos=changePose(car.lane,car.s,ch);
    if(ch.travel>=ch.length){car.lane=ch.to;car.s=ch.targetS;car.change=null;this.completedChanges++;if(ch.recovery)this.completedRecoveries++;}
   }else car.pos=sample(car.lane,car.s);
   car.sensor=this.sense(car);
   if(car.s>lanes[car.lane].length-car.length){car.active=false;car.change=null;}
  }
 }
}
