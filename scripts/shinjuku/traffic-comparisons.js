(() => {
 const rows=[...document.querySelectorAll('.optimization-comparison')];
 if(!rows.length)return;
 const diagramUnitsPerMeter=5;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const control=document.getElementById('traffic-pause');
 let initialized=false;
 let active=null,frame=0,last=0,scrollFrame=0;
 const scenes=rows.map(row=>({row,type:row.dataset.comparison,time:1.8,panes:[...row.querySelectorAll('svg')].map(svg=>({svg,car:svg.querySelector('.compare-car'),path:svg.querySelector('.route-path'),centerline:svg.querySelector('.route-centerline'),samples:[...svg.querySelectorAll('.route-sample')],progress:svg.querySelector('.route-progress'),target:svg.querySelector('.route-target'),targetLine:svg.querySelector('.route-target-line'),nodes:[...svg.querySelectorAll('.route-node')],leader:svg.querySelector('.lane-leader'),distance:svg.querySelector('.leader-distance'),distanceValue:svg.querySelector('.leader-distance-value'),distanceHalo:svg.querySelector('.leader-distance-halo'),footprint:svg.querySelector('.sensor-footprint'),contact:svg.querySelector('.sensor-contact'),signalRed:svg.querySelector('.signal-red'),signalGreen:svg.querySelector('.signal-green'),person:svg.querySelector('.sensor-person'),sensorRay:svg.querySelector('.sensor-ray'),sensorLimit:svg.querySelector('.sensor-limit'),scan:svg.querySelector('.frame-scan'),blocks:[...svg.querySelectorAll('.work-block')]}))}));
 function initialize(){
  if(initialized)return;
  for(const scene of scenes)for(const p of scene.panes)if(p.path){
   const centerline=p.centerline||p.path,length=centerline.getTotalLength(),dots=p.nodes.length?p.nodes:p.samples;
   dots.forEach((dot,i)=>{
    const point=centerline.getPointAtLength(length*i/Math.max(1,dots.length-1));
    dot.setAttribute('cx',point.x.toFixed(3));dot.setAttribute('cy',point.y.toFixed(3));
   });
   if(p.nodes.length)p.path.setAttribute('d',p.nodes.map((node,i)=>`${i?'L':'M'}${node.getAttribute('cx')} ${node.getAttribute('cy')}`).join(' '));
   p.length=p.path.getTotalLength();
   p.waypoints=p.nodes.map(node=>({x:Number(node.getAttribute('cx')),y:Number(node.getAttribute('cy'))}));
   let distance=0;
   p.waypoints.forEach((point,i)=>{if(i)distance+=Math.hypot(point.x-p.waypoints[i-1].x,point.y-p.waypoints[i-1].y);point.distance=distance;});
  }
  for(const scene of scenes)for(const p of scene.panes)if(p.person){
   const bounds=p.person.getBBox();
   p.personHalfWidth=Math.max(Math.abs(bounds.x),Math.abs(bounds.x+bounds.width))+.9;
   p.personHalfHeight=Math.max(Math.abs(bounds.y),Math.abs(bounds.y+bounds.height))+.9;
  }
  scenes.forEach(draw);initialized=true;
 }
 function move(car,x,y,angle=0){car.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)})`);}
 function draw(scene){
  const t=scene.time;
  scene.panes.forEach((p,index)=>{
   if(scene.type==='route'){
    const progress=t%8/8,d=progress*p.length,a=p.path.getPointAtLength(d),b=p.path.getPointAtLength(Math.min(p.length,d+1));
    move(p.car,a.x,a.y,Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI);
    p.car.style.opacity=String(Math.min(1,progress*15,(1-progress)*15));
    if(!index){
     const found=p.waypoints.findIndex(point=>point.distance>d);
     const next=found<0?p.waypoints.length-1:Math.max(1,found);
     const target=p.waypoints[next];
     p.target.setAttribute('cx',target.x);p.target.setAttribute('cy',target.y);
     p.targetLine.setAttribute('d',`M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${target.x} ${target.y}`);
     p.nodes.forEach((node,i)=>node.classList.toggle('is-target',i===next));
    }else{
     p.progress.style.strokeDasharray=`${d.toFixed(2)} ${p.length.toFixed(2)}`;
    }
    }else if(scene.type==='physics'){
    const phase=t%12,waiting=phase>=8;
    const leaderX=254+(waiting?0:8*Math.sin(phase*Math.PI/4)),rear=leaderX-11;
    move(p.leader,leaderX,88);
    const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    const incoming=phase<2.6,y=phase<2.6?27+61*smooth(phase/2.6):phase<4.8?88:88-61*smooth((phase-4.8)/2.4);
    const hit=Math.abs(y-88)<=12+p.personHalfHeight,endX=hit?181-p.personHalfWidth:225;
    p.person.setAttribute('transform',`translate(181 ${y.toFixed(2)}) rotate(${incoming?180:0})`);
    p.sensorRay.setAttribute('d',`M59 76H${endX.toFixed(2)}V100H59Z`);
    p.sensorLimit.setAttribute('d',`M${endX.toFixed(2)} 76V100`);
    const color=hit?'#cb8150':'#579680';
    p.sensorRay.style.stroke=color;p.sensorRay.style.fill=hit?'#cb815026':'#57968016';p.sensorLimit.style.stroke=color;
    p.footprint.style.opacity='1';p.contact.style.opacity=hit?'1':'0';
    p.contact.setAttribute('cx',endX.toFixed(2));p.contact.setAttribute('cy',Math.max(76,Math.min(100,y)).toFixed(2));
    // Use the nearest obstruction, keeping the value, endpoint and target in sync.
    const personIsCloser=hit&&endX<rear,measuredEnd=personIsCloser?endX:rear;
    p.distance.setAttribute('d',`M59 88H${measuredEnd.toFixed(2)}M59 84V92M${measuredEnd.toFixed(2)} 84V92`);
    p.distanceHalo.setAttribute('d',`M59 88H${measuredEnd.toFixed(2)}`);
    p.distanceValue.textContent=(personIsCloser?'보행자 ':'앞차 ')+((measuredEnd-59)/diagramUnitsPerMeter).toFixed(1)+' m';
    p.svg.dataset.distanceTarget=personIsCloser?'pedestrian':'vehicle';
    p.signalRed.style.fill=waiting?'#e3746c':'#74838c';
    p.signalGreen.style.fill=waiting?'#74838c':'#63b69c';
    p.svg.dataset.sensorState=hit?'hit':'clear';
    p.svg.dataset.signalState=waiting?'red':'green';
   }else if(scene.type==='schedule'){
    const current=Math.floor(t*1.5)%5;p.scan.setAttribute('x',String(22+current*55));
    p.blocks.forEach(b=>{const selected=Number(b.dataset.frame)===current;b.style.opacity=selected?'1':'.65';});
   }
  });
 }
 const stopped=()=>reduced.matches||document.hidden||control?.getAttribute('aria-pressed')==='true';
 function tick(now){
  frame=0;if(!active||stopped())return;
  if(last&&now-last<32){frame=requestAnimationFrame(tick);return;}
  active.time+=last?Math.min((now-last)/1000,.08):0;last=now;draw(active);frame=requestAnimationFrame(tick);
 }
 function choose(){
  scrollFrame=0;let next=null,best=Infinity;
  initialize();
  for(const scene of scenes){const r=scene.row.getBoundingClientRect();const shown=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,180));
   if(r.height<=0||shown<Math.min(r.height*.45,100))continue;
   const distance=Math.abs((r.top+r.bottom)/2-innerHeight*.55);if(distance<best){best=distance;next=scene;}
  }
  if(next!==active||stopped()||!frame){cancelAnimationFrame(frame);frame=0;last=0;active=next;scenes.forEach(s=>s.row.dataset.playing=String(s===active&&!stopped()));if(active&&!stopped())frame=requestAnimationFrame(tick);}
 }
 function queue(){if(!scrollFrame)scrollFrame=requestAnimationFrame(choose);}
 const observer=new IntersectionObserver(queue,{threshold:[0,.25,.5,.75,1]});rows.forEach(row=>observer.observe(row));
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);
 document.addEventListener('visibilitychange',choose);reduced.addEventListener('change',choose);
 if(control)new MutationObserver(choose).observe(control,{attributes:true,attributeFilter:['aria-pressed']});
 choose();
})();
