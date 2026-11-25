(() => {
 const rows=[...document.querySelectorAll('.optimization-comparison')];
 if(!rows.length)return;
 const diagramUnitsPerMeter=5;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const control=document.getElementById('traffic-pause');
 let initialized=false,capturing=false;
 let active=[],frame=0,last=0,scrollFrame=0;
 const scenes=rows.map(row=>({row,type:row.dataset.comparison,time:1.8,panes:[...row.querySelectorAll('svg')].map(svg=>({svg,car:svg.querySelector('.compare-car'),operations:[...svg.closest('figure').querySelectorAll('.route-operation')],path:svg.querySelector('.route-path'),centerline:svg.querySelector('.route-centerline'),samples:[...svg.querySelectorAll('.route-sample')],target:svg.querySelector('.route-target'),targetLine:svg.querySelector('.route-target-line'),nodes:[...svg.querySelectorAll('.route-node')],leader:svg.querySelector('.lane-leader'),distance:svg.querySelector('.leader-distance'),distanceValue:svg.querySelector('.leader-distance-value'),distanceHalo:svg.querySelector('.leader-distance-halo'),footprint:svg.querySelector('.sensor-footprint'),contact:svg.querySelector('.sensor-contact'),person:svg.querySelector('.sensor-person'),sensorRay:svg.querySelector('.sensor-ray'),sensorLimit:svg.querySelector('.sensor-limit'),cursor:svg.querySelector('.frame-cursor'),columns:[...svg.querySelectorAll('.frame-column')],blocks:[...svg.querySelectorAll('.work-block')]}))}));
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
   p.samples.forEach((dot,i)=>{
    const d=p.length*i/Math.max(1,p.samples.length-1),point=p.path.getPointAtLength(d),ahead=p.path.getPointAtLength(Math.min(p.length,d+1)),behind=p.path.getPointAtLength(Math.max(0,d-1));
    const angle=Math.atan2(ahead.y-behind.y,ahead.x-behind.x)*180/Math.PI;
    const direction=document.createElementNS('http://www.w3.org/2000/svg','path');
    direction.setAttribute('class','route-stored-direction');
    direction.setAttribute('d','M-2.5-2L1 0L-2.5 2');
    direction.setAttribute('transform',`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${angle.toFixed(2)})`);
    dot.after(direction);
   });
   p.waypoints=p.nodes.map(node=>({x:Number(node.getAttribute('cx')),y:Number(node.getAttribute('cy'))}));
   let distance=0;
   p.waypoints.forEach((point,i)=>{if(i)distance+=Math.hypot(point.x-p.waypoints[i-1].x,point.y-p.waypoints[i-1].y);point.distance=distance;});
  }
  for(const scene of scenes)for(const p of scene.panes)if(p.person){
   p.description=p.svg.querySelector('desc');
   p.originalDescription=p.description?.textContent;
   const bounds=p.person.getBBox();
   p.personHalfWidth=Math.max(Math.abs(bounds.x),Math.abs(bounds.x+bounds.width))+.9;
   p.personHalfHeight=Math.max(Math.abs(bounds.y),Math.abs(bounds.y+bounds.height))+.9;
  }
  scenes.forEach(draw);initialized=true;
 }
 function move(car,x,y,angle=0){car.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)})`);}
 function draw(scene){
  const staticView=reduced.matches||capturing;
  const t=staticView?(scene.type==='physics'?3.2:2.1):scene.time;
  scene.row.dataset.motion=staticView?'static':'animated';
  scene.panes.forEach((p,index)=>{
   if(scene.type==='route'){
    const travel=t%6,progress=travel/6,d=progress*p.length,a=p.path.getPointAtLength(d),b=p.path.getPointAtLength(Math.min(p.length,d+1));
    const visibility=Math.min(1,travel/.14,(6-travel)/.14);
    move(p.car,a.x,a.y,Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI);
    p.car.style.opacity=String(visibility);
    const operation=Math.floor((t%2.4)/.8);
    p.svg.dataset.operation=String(operation);
    p.operations.forEach((element,i)=>element.classList.toggle('is-current',staticView?(!index?i>0:i===1):i===operation));
    if(!index){
     const found=p.waypoints.findIndex(point=>point.distance>d);
     const next=found<0?p.waypoints.length-1:Math.max(1,found);
     const target=p.waypoints[next];
     p.target.setAttribute('cx',target.x);p.target.setAttribute('cy',target.y);
     p.targetLine.setAttribute('d',`M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${target.x} ${target.y}`);
     p.target.style.opacity=String(visibility);p.targetLine.style.opacity=String(visibility);
     p.nodes.forEach((node,i)=>node.classList.toggle('is-target',i===next));
    }else{
     const sampleIndex=Math.min(p.samples.length-2,Math.floor(progress*(p.samples.length-1)));
     p.svg.dataset.samplePair=String(sampleIndex);
     p.samples.forEach((dot,i)=>{
      const selected=i===sampleIndex||i===sampleIndex+1;
      dot.classList.toggle('is-read',selected);
      dot.setAttribute('r',selected?'3.5':'2');
      dot.nextElementSibling.classList.toggle('is-read',selected);
     });
    }
    }else if(scene.type==='physics'){
    const phase=(t%5.6)/5.6;
    const leaderX=254+7*Math.sin(t*Math.PI*2/7.2),rear=leaderX-11;
    move(p.leader,leaderX,88);
    const y=-10+172*phase;
    const hit=Math.abs(y-88)<=12+p.personHalfHeight,endX=hit?181-p.personHalfWidth:225;
    p.person.setAttribute('transform',`translate(181 ${y.toFixed(2)}) rotate(180)`);
    if(p.svg.dataset.inspection==='all'){
     p.svg.querySelector('.legacy-front-probe').setAttribute('width',(rear-59).toFixed(2));
     const personProbe=p.svg.querySelector('.legacy-person-probe');
     personProbe.setAttribute('y',(y-11).toFixed(2));
     personProbe.style.stroke=hit?'#cb8150':'#819d8e';
     p.svg.dataset.sensorState=hit?'hit':'clear';
     return;
    }
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
    p.distanceValue.textContent=((measuredEnd-59)/diagramUnitsPerMeter).toFixed(1)+' m';
    p.svg.dataset.distanceTarget=personIsCloser?'pedestrian':'vehicle';
    p.svg.dataset.sensorState=hit?'hit':'clear';
    if(staticView){
     if(p.description)p.description.textContent='파란 선과 수치는 앞차까지 계산한 거리입니다. 주황색 영역과 수치는 보행자를 감지한 범위와 거리입니다. 앞차와의 거리는 차선 정보로 계산하고, 사람과 장애물만 BoxCast로 검사합니다.';
     let reference=p.svg.querySelector('.static-leader-reference');
     if(!reference){
      reference=document.createElementNS('http://www.w3.org/2000/svg','g');
      reference.setAttribute('class','static-leader-reference');
      reference.setAttribute('aria-hidden','true');
      reference.innerHTML='<path fill="none" stroke="#3d84b4" stroke-width="1.5"/><text x="66" y="54" fill="#3d84b4" font-size="12" font-weight="600"/>';
      p.svg.append(reference);
     }
     reference.querySelector('path').setAttribute('d',`M59 58H${rear.toFixed(2)}M59 55V61M${rear.toFixed(2)} 55V61`);
     reference.querySelector('text').textContent=((rear-59)/diagramUnitsPerMeter).toFixed(1)+' m';
    }else if(p.description)p.description.textContent=p.originalDescription;
   }else if(scene.type==='schedule'){
    const cursor=-4+312*(t%2.8)/2.8;
    const activity=index=>{const v=Math.max(0,1-Math.abs(cursor-(42+index*55))/32);return v*v*(3-2*v);};
    p.svg.dataset.activeFrame=String(Math.max(1,Math.min(5,Math.round((cursor-42)/55)+1)));
    if(p.cursor){p.cursor.setAttribute('x',(cursor-12).toFixed(2));p.cursor.style.display=staticView?'none':'';}
    p.blocks.forEach(block=>{const pulse=staticView?1:activity(Number(block.dataset.frame));block.style.opacity=String(.55+.45*pulse);block.style.transform=`translateY(${(staticView?0:-1.5*pulse).toFixed(2)}px)`;});
    p.columns.forEach((column,index)=>{const pulse=staticView?1:activity(index),end=p.svg.closest('.after')?[218,232,243]:[219,228,235];column.style.fill=`rgb(${[240,243,246].map((start,i)=>Math.round(start+(end[i]-start)*pulse)).join(',')})`;});
   }
  });
 }
 const stopped=()=>reduced.matches||document.hidden||control?.getAttribute('aria-pressed')==='true';
 function tick(now){
  frame=0;if(!active.length||stopped())return;
  if(last&&now-last<32){frame=requestAnimationFrame(tick);return;}
  const elapsed=last?Math.min((now-last)/1000,.08):0;last=now;
  active.forEach(scene=>{scene.time+=elapsed;draw(scene);});frame=requestAnimationFrame(tick);
 }
 function choose(){
  scrollFrame=0;const next=[];
  initialize();
  for(const scene of scenes){const r=scene.row.getBoundingClientRect();const shown=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,180));
   if(r.height<=0||shown<Math.min(r.height*.45,100))continue;
   next.push(scene);
  }
  if(next.length!==active.length||next.some((scene,index)=>scene!==active[index])||stopped()||!frame){cancelAnimationFrame(frame);frame=0;last=0;active=next;scenes.forEach(s=>s.row.dataset.playing=String(active.includes(s)&&!stopped()));if(active.length&&!stopped())frame=requestAnimationFrame(tick);}
 }
 function queue(){if(!scrollFrame)scrollFrame=requestAnimationFrame(choose);}
 const observer=new IntersectionObserver(queue,{threshold:[0,.25,.5,.75,1]});rows.forEach(row=>observer.observe(row));
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);
 document.addEventListener('visibilitychange',choose);reduced.addEventListener('change',()=>{initialize();scenes.forEach(draw);choose();});
 if(control)new MutationObserver(choose).observe(control,{attributes:true,attributeFilter:['aria-pressed']});
 choose();
 (window.portfolioPrintSnapshots??={}).comparisons=()=>{
  initialize();
  try{capturing=true;scenes.forEach(draw);return rows.map(row=>window.portfolioPrintClone(row));}
  finally{capturing=false;scenes.forEach(draw);}
 };
})();
