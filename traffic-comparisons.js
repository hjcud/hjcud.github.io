(() => {
 const rows=[...document.querySelectorAll('.optimization-comparison')];
 if(!rows.length)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const control=document.getElementById('traffic-pause');
 const projectDisclosure=document.getElementById('traffic-methods').closest('.project-disclosure');
 let initialized=false;
 let active=null,frame=0,last=0,scrollFrame=0;
 const scenes=rows.map(row=>({row,type:row.dataset.comparison,time:1.8,panes:[...row.querySelectorAll('svg')].map(svg=>({svg,car:svg.querySelector('.compare-car'),path:svg.querySelector('.route-path'),calculation:svg.querySelector('.route-calculation'),nodes:[...svg.querySelectorAll('.route-node')],scan:svg.querySelector('.frame-scan'),blocks:[...svg.querySelectorAll('.work-block')],dots:[...svg.querySelectorAll('.packet-dot')],ghost:svg.querySelector('.sample-ghost'),sweep:svg.querySelector('.physics-sweep'),hits:[...svg.querySelectorAll('.physics-hit')]}))}));
 function initialize(){
  if(initialized)return;
  for(const scene of scenes)for(const p of scene.panes)if(p.path)p.length=p.path.getTotalLength();
  scenes.forEach(draw);initialized=true;
 }
 const position=t=>150-120*Math.cos(t*.9);
 function move(car,x,y,angle=0){car.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)})`);}
 function draw(scene){
  const t=scene.time;
  scene.panes.forEach((p,index)=>{
   if(scene.type==='route'){
    const progress=t%7/7,d=progress*p.length,a=p.path.getPointAtLength(d),b=p.path.getPointAtLength(Math.min(p.length,d+1));
    move(p.car,a.x,a.y,Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI);
    p.car.style.opacity=String(Math.min(1,progress*15,(1-progress)*15));
    if(!index){p.calculation.style.strokeDashoffset=String(-Math.floor(t*7)%10*28);p.nodes.forEach((n,i)=>n.style.opacity=String(.2+((Math.floor(t*7)+i)%4===0?.8:0)));}
    }else if(scene.type==='physics'){
    const pulse=.4+.6*(.5+.5*Math.sin(t*3));
    p.sweep.style.opacity=String(pulse);
    p.hits.forEach(hit=>{const physical=!index||hit.classList.contains('physics-person');hit.style.opacity=physical?String(pulse):'0';});
   }else if(scene.type==='schedule'){
    const current=Math.floor(t*1.5)%5;p.scan.setAttribute('x',String(22+current*55));
    p.blocks.forEach(b=>{const selected=Number(b.dataset.frame)===current;b.style.opacity=selected?'1':'.65';});
   }else{
    const interval=.65,step=Math.floor(t/interval),sampleTime=step*interval,alpha=(t-sampleTime)/interval;
    const current=position(sampleTime),previous=position(Math.max(0,sampleTime-interval));
    const x=index?previous+(current-previous)*alpha:current;
    move(p.car,x,80,Math.sin((index?t-interval:sampleTime)*.9)>=0?0:180);
    p.ghost.setAttribute('transform',`translate(${current.toFixed(2)} 80)`);
    p.ghost.style.display=index?'':'none';
    p.dots.forEach((dot,i)=>{dot.style.fill=i===step%6?'#6b98c1':'#d1dbe4';dot.setAttribute('r',i===step%6?'4':'3');});
   }
  });
 }
 const stopped=()=>!projectDisclosure.open||reduced.matches||document.hidden||control?.getAttribute('aria-pressed')==='true';
 function tick(now){
  frame=0;if(!active||stopped())return;
  if(last&&now-last<32){frame=requestAnimationFrame(tick);return;}
  active.time+=last?Math.min((now-last)/1000,.08):0;last=now;draw(active);frame=requestAnimationFrame(tick);
 }
 function choose(){
  scrollFrame=0;let next=null,best=Infinity;
  if(projectDisclosure.open)initialize();
  for(const scene of scenes){if(!projectDisclosure.open)break;const r=scene.row.getBoundingClientRect();const shown=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,180));
   if(r.height<=0||shown<Math.min(r.height*.45,100))continue;
   const distance=Math.abs((r.top+r.bottom)/2-innerHeight*.55);if(distance<best){best=distance;next=scene;}
  }
  if(next!==active||stopped()||!frame){cancelAnimationFrame(frame);frame=0;last=0;active=next;scenes.forEach(s=>s.row.dataset.playing=String(s===active&&!stopped()));if(active&&!stopped())frame=requestAnimationFrame(tick);}
 }
 function queue(){if(!scrollFrame)scrollFrame=requestAnimationFrame(choose);}
 projectDisclosure.addEventListener('toggle',choose);
 const observer=new IntersectionObserver(queue,{threshold:[0,.25,.5,.75,1]});rows.forEach(row=>observer.observe(row));
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);
 document.addEventListener('visibilitychange',choose);reduced.addEventListener('change',choose);
 if(control)new MutationObserver(choose).observe(control,{attributes:true,attributeFilter:['aria-pressed']});
 choose();
})();
