(() => {
 'use strict';
 const button=document.getElementById('portfolio-pdf');
 const status=document.getElementById('portfolio-pdf-status');
 if(!button)return;
 const $=(selector,root=document)=>root.querySelector(selector);
 const element=tag=>document.createElement(tag);
 window.portfolioPrintClone=source=>{
  const copy=source.cloneNode(true),originals=[source,...source.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
  originals.forEach((original,i)=>{
   const clone=clones[i];
   for(const attribute of ['src','href']){
    const value=clone.getAttribute(attribute);
    if(value&&!value.startsWith('#'))clone.setAttribute(attribute,new URL(value,document.baseURI).href);
   }
   if(original.namespaceURI==='http://www.w3.org/2000/svg'&&/^(path|rect|circle|ellipse|line|polyline|polygon|text)$/.test(original.localName)){
    const style=getComputedStyle(original);
    for(const name of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','font-family','font-size','font-weight','paint-order','text-anchor'])clone.style.setProperty(name,style.getPropertyValue(name));
   }
   if(clone instanceof HTMLImageElement){clone.loading='eager';clone.removeAttribute('srcset');}
  });
  return copy;
 };
 const clone=window.portfolioPrintClone;
 function screenStyles(target){
  const imports=new Set();
  const absoluteUrls=(css,base)=>css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g,(match,quote,url)=>url.startsWith('#')?match:'url("'+new URL(url,base).href+'")');
  const rules=(list,base)=>[...list].map(rule=>{
   if(rule.type===CSSRule.IMPORT_RULE){imports.add(rule.href);return '';}
   if(rule.type===CSSRule.MEDIA_RULE){
    const media=rule.conditionText.split(',').filter(query=>!/\bprint\b/.test(query)).map(query=>query.replace(/\bscreen\b/g,'all')).join(',');
    return media&&target.matchMedia(media).matches?rules(rule.cssRules,base):'';
   }
   return absoluteUrls(rule.cssText,base).replace(/(-?\d*\.?\d+)(?:s|l|d)?v(w|h|min|max)\b/g,(match,value,axis)=>{
    const size=axis==='w'?1440:axis==='h'?900:axis==='min'?900:1440;
    return (Number(value)*size/100)+'px';
   });
  }).join('\n');
  const css=[...document.styleSheets].map(sheet=>rules(sheet.cssRules,sheet.href||document.baseURI)).join('\n');
  return {css,imports:[...imports]};
 }
 async function waitForSnapshots(){
  const start=Date.now();
  while(!['traffic','flight','comparisons','harness','pixelConnector'].every(key=>typeof window.portfolioPrintSnapshots?.[key]==='function')){
   if(Date.now()-start>15000)throw Error('시연 준비 시간을 초과하였습니다.');
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  return window.portfolioPrintSnapshots;
 }
 function replaceCanvas(root,id,src){
  const canvas=$('#'+id,root),image=element('img');
  image.id=id;image.className=canvas.className;image.src=src;
  image.alt=canvas.getAttribute('aria-label')||'';
  image.setAttribute('style',canvas.getAttribute('style')||'');
  canvas.replaceWith(image);
 }
 async function build(){
  const snapshots=await waitForSnapshots();
  const traffic=await snapshots.traffic({includeScene:true}),flight=snapshots.flight({includeScene:true});
  const body=clone(document.body);
  body.querySelectorAll('script,iframe,dialog,#timeline-preview,#skill-projects,#toast,.case-entry-viewport,.case-entry-picture,.case-entry-logo').forEach(node=>node.remove());
  const timelineInstruction=$('#projects .timeline-instruction',body);
  if(timelineInstruction){
   const webLink=element('a');
   webLink.href='https://hjcud.github.io/#projects';
   webLink.textContent='웹 포트폴리오에서 프로젝트별 상세 내용을 확인하실 수 있습니다. ↗';
   timelineInstruction.replaceChildren(webLink);
  }
  body.querySelector('.header')?.classList.remove('is-reading-projects');
  body.querySelectorAll('.nav-link').forEach(link=>{link.classList.toggle('is-current',link.hash==='#profile');link.removeAttribute('aria-current');});
  body.querySelectorAll('.case-entry-track').forEach(track=>{
   track.classList.remove('is-animated');track.removeAttribute('style');track.dataset.entryPhase='settled';
  });
  body.querySelectorAll('.project-brand').forEach(brand=>brand.style.visibility='visible');
  body.querySelectorAll('.project-disclosure').forEach(details=>details.open=true);
  for(const row of snapshots.comparisons())$('[data-comparison="'+row.dataset.comparison+'"]',body).replaceWith(row);
  const stages=[...body.querySelectorAll('#i2s-flow-diagram .i2s-visual-flow>li')];
  snapshots.harness().forEach((stage,i)=>stages[i].replaceWith(stage));
  $('#shinjuku-simulation',body).replaceWith(traffic.scene);
  replaceCanvas(body,'traffic-canvas',traffic.image);
  $('#flight-exhibit',body).replaceWith(flight.scene);
  replaceCanvas(body,'flight-canvas',flight.image);
  return body;
 }
 let currentFrame;
 async function prepare(){
  currentFrame?.remove();
  const content=await build();
  const frame=element('iframe');frame.className='portfolio-print-frame';frame.title='포트폴리오 인쇄';frame.setAttribute('aria-hidden','true');
  Object.assign(frame.style,{position:'fixed',left:'-12000px',top:'0',width:'1440px',height:'900px',border:'0'});
  document.body.append(frame);currentFrame=frame;
  const doc=frame.contentDocument;
  doc.open();doc.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>손현준_포트폴리오</title></head><body></body></html>');doc.close();
  const styles=screenStyles(frame.contentWindow);
  const base=doc.createElement('base');base.href=document.baseURI;doc.head.append(base);
  const style=doc.createElement('style');style.textContent=styles.css;doc.head.append(style);
  doc.body.replaceWith(doc.importNode(content,true));
  const stylesheets=[...styles.imports,new URL('styles/portfolio-print.css?v=screen-design-20261125',document.baseURI).href];
  await Promise.all(stylesheets.map(href=>new Promise((resolve,reject)=>{
   const link=doc.createElement('link');link.rel='stylesheet';link.href=href;
   link.onload=resolve;link.onerror=()=>reject(Error('인쇄용 스타일을 불러오지 못하였습니다.'));doc.head.append(link);
  })));
  await Promise.all([...doc.images].filter(image=>image.getAttribute('src')).map(image=>image.decode()));
  await doc.fonts.ready;
  window.portfolioPrintSnapshots.pixelConnector(doc);
  await new Promise(resolve=>frame.contentWindow.requestAnimationFrame(()=>frame.contentWindow.requestAnimationFrame(resolve)));
  frame.dataset.ready='true';return frame;
 }
 const notice=element('dialog');
 notice.id='portfolio-pdf-dialog';
 notice.setAttribute('aria-labelledby','portfolio-pdf-dialog-title');
 notice.setAttribute('aria-describedby','portfolio-pdf-dialog-description');
 notice.innerHTML='<h2 id="portfolio-pdf-dialog-title">PDF 다운로드</h2><div id="portfolio-pdf-dialog-description"><p class="pdf-dialog-lead">애니메이션은 <strong>제외되어 저장</strong>됩니다.</p><p>프로젝트의 동작을 더 쉽게 이해하려면<br>웹에서 확인하시는 것을 권장합니다.</p></div><form method="dialog" class="pdf-dialog-actions"><button type="submit" value="cancel" autofocus>취소</button><button type="submit" value="download" class="pdf-dialog-download">다운로드</button></form>';
 document.body.append(notice);
 async function download(){
  button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='PDF 인쇄 화면을 준비하고 있습니다.';
  try{const frame=await prepare();status.textContent='인쇄 창에서 PDF로 저장을 선택해주세요.';frame.contentWindow.focus();frame.contentWindow.print();}
  catch(error){console.error(error);status.textContent='PDF 인쇄 화면을 준비하지 못하였습니다. 다시 시도해주세요.';}
  finally{button.disabled=false;button.removeAttribute('aria-busy');}
 }
 button.addEventListener('click',()=>{
  notice.returnValue='';
  notice.showModal();
 });
 notice.addEventListener('close',()=>{
  if(notice.returnValue==='download')download();
  else button.focus({preventScroll:true});
 });
 notice.addEventListener('click',event=>{
  if(event.target!==notice)return;
  const rect=notice.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)notice.close('cancel');
 });
})();
