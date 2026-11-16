(() => {
 const rows=[...document.querySelectorAll('.optimization-comparison')];
 if(!rows.length)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const control=document.getElementById('traffic-pause');
 let initialized=false;
 let active=null,frame=0,last=0,scrollFrame=0;
 const scenes=rows.map(row=>({row,type:row.dataset.comparison,time:1.8,panes:[...row.querySelectorAll('svg')].map(svg=>({svg,car:svg.querySelector('.compare-car'),path:svg.querySelector('.route-path'),progress:svg.querySelector('.route-progress'),target:svg.querySelector('.route-target'),targetLine:svg.querySelector('.route-target-line'),nodes:[...svg.querySelectorAll('.route-node')],leader:svg.querySelector('.lane-leader'),distance:svg.querySelector('.leader-distance'),person:svg.querySelector('.sensor-person'),sensorRay:svg.querySelector('.sensor-ray'),sensorLimit:svg.querySelector('.sensor-limit'),status:svg.querySelector('.sensor-status'),scan:svg.querySelector('.frame-scan'),blocks:[...svg.querySelectorAll('.work-block')]}))}));
 function initialize(){
  if(initialized)return;
  for(const scene of scenes)for(const p of scene.panes)if(p.path){
   p.length=p.path.getTotalLength();
   p.waypoints=p.nodes.map(node=>({x:Number(node.getAttribute('cx')),y:Number(node.getAttribute('cy'))}));
   let distance=0;
   p.waypoints.forEach((point,i)=>{if(i)distance+=Math.hypot(point.x-p.waypoints[i-1].x,point.y-p.waypoints[i-1].y);point.distance=distance;});
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
    if(p.leader){
     const x=254+8*Math.sin(t*.7),rear=x-11;
     move(p.leader,x,93);
     p.distance.setAttribute('d',`M60 43H${rear.toFixed(2)}M60 39V47M${rear.toFixed(2)} 39V47`);
    }
    if(p.person){
     const phase=(t%12)/6,forward=phase<1,y=56+(forward?phase:2-phase)*70,hit=y>=73&&y<=113;
     p.person.setAttribute('transform',`translate(181 ${y.toFixed(2)}) rotate(${forward?180:0})`);
     const color=hit?'#cb8150':'#579680';
     p.sensorRay.style.stroke=color;p.sensorLimit.style.stroke=color;
     p.sensorLimit.style.opacity=hit?String(.65+.35*(.5+.5*Math.sin(t*4))):'.5';
     p.status.textContent=hit?'장애물 감지':'전방 장애물 없음';
     p.status.style.fill=color;
    }
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
