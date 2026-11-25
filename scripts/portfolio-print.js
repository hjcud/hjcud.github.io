(() => {
 'use strict';
 const button=document.getElementById('portfolio-pdf');
 const status=document.getElementById('portfolio-pdf-status');
 if(!button)return;
 const $=(selector,root=document)=>root.querySelector(selector);
 const text=(selector,root=document)=>$(selector,root)?.textContent.trim()||'';
 const element=(tag,className,content)=>{const e=document.createElement(tag);if(className)e.className=className;if(content!==undefined)e.textContent=content;return e;};
 window.portfolioPrintClone=source=>{
  const copy=source.cloneNode(true),originals=[source,...source.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
  originals.forEach((original,i)=>{
   const clone=clones[i];
   for(const attribute of ['src','href']){const value=clone.getAttribute(attribute);if(value&&!value.startsWith('#'))clone.setAttribute(attribute,new URL(value,document.baseURI).href);}
   if(original.namespaceURI==='http://www.w3.org/2000/svg'&&/^(path|rect|circle|ellipse|line|polyline|polygon|text)$/.test(original.localName)){
    const style=getComputedStyle(original);
    for(const name of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','font-family','font-size','font-weight','paint-order','text-anchor'])clone.style.setProperty(name,style.getPropertyValue(name));
   }
   if(clone instanceof HTMLImageElement){clone.loading='eager';clone.removeAttribute('srcset');}
  });
  return copy;
 };
 const clone=window.portfolioPrintClone;
 const blocks=(root,selector)=>[...root.querySelectorAll(selector)].map(clone);
 function sheet(name){const page=element('section','print-sheet');page.append(element('div','print-running','손현준 / 프로젝트 기록'),element('h1','print-page-title',name));return page;}
 function figure(src,caption,className=''){const f=element('figure','print-figure '+className),img=element('img');img.src=src;img.alt=caption;f.append(img);if(caption)f.append(element('figcaption','',caption));return f;}
 function introduction(project){
  const wrap=element('section','print-introduction');
  wrap.append(element('p','print-date',text('.project-summary .eyebrow',project)),element('p','print-technologies',[...project.querySelectorAll('.technology-tags .tech-name')].map(e=>e.textContent).join(' / ')));
  const layout=element('div','print-intro-layout'),copy=element('div','print-intro-copy');
  copy.append(...blocks(project,'.project-copy > .summary'));
  const meta=$('.project-meta',project);if(meta)copy.append(clone(meta));
  const links=[...project.querySelectorAll('.project-copy > a')].filter(a=>a.href.startsWith('https:'));
  for(const a of links)copy.append(clone(a));
  layout.append(copy);
  const photograph=$('.screenshot-stage .carousel-image',project);
  if(photograph)layout.append(figure(photograph.src,photograph.alt,'print-project-photo'));
  wrap.append(layout);
  const date=$('.ssafy-project-details .eyebrow',project);if(date)wrap.prepend(clone(date));
  return wrap;
 }
 function problem(project){const heading=$('.problem-solving-heading',project),wrap=element('section','print-problem');if(heading)wrap.append(clone(heading));return wrap;}
 function cleanVisual(root){
  root.querySelectorAll('button').forEach(b=>b.replaceWith(...b.childNodes));
  root.querySelectorAll('.screenshot-expand,.pm-process-connector,.carousel-arrow,.sr-only,.i2s-flow-connectors,.method-row-label').forEach(e=>e.remove());
  root.querySelectorAll('[hidden],[inert]').forEach(e=>{e.removeAttribute('hidden');e.removeAttribute('inert');});
  return root;
 }
 async function waitForSnapshots(){
  const start=Date.now();while(!['traffic','flight','comparisons','harness'].every(key=>typeof window.portfolioPrintSnapshots?.[key]==='function')){
   if(Date.now()-start>15000)throw Error('시연 준비 시간을 초과하였습니다.');
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  return window.portfolioPrintSnapshots;
 }
 async function build(){
  const snapshots=await waitForSnapshots(),root=element('main','print-portfolio');
  const cover=sheet('손현준');
  const contacts=element('div','print-contacts');
  for(const a of document.querySelectorAll('.overview-contact > a')){const link=element('a','',a.textContent.replace('↗','').trim());link.href=a.href;contacts.append(link);}
  const web=element('a','','hjcud.github.io');web.href='https://hjcud.github.io/';contacts.append(web);cover.append(contacts);
  const history=element('div','print-history');
  for(const id of ['education','languages']){const section=element('section');section.append(element('h2','',text('#'+id+' h2')));for(const node of document.querySelectorAll('#'+id+' .profile-education-list > li,#'+id+' .profile-language-item'))section.append(clone(node));history.append(section);}
  cover.append(history,element('h2','','기술 경험'));
  const skills=element('div','print-skills');
  for(const item of document.querySelectorAll('#skills [data-skill]')){const row=element('div');row.append(element('span','',text('.tech-name',item)),element('b','',text('.skill-value',item)));skills.append(row);}cover.append(skills);
  cover.append(element('h2','','주요 프로젝트'));
  const contents=element('div','print-contents');
  for(const project of document.querySelectorAll('.featured-case')){const link=element('a','',project.dataset.title);link.href='https://hjcud.github.io/#'+project.id;contents.append(link);}cover.append(contents);
  cover.append(element('h2','','그 외 프로젝트'));
  const others=element('div','print-other-projects');
  for(const template of document.querySelectorAll('template[id^="preview-"]:not([data-featured="true"])')){const content=template.content,section=element('section');section.append(element('h3','',template.dataset.title),element('small','',text('.timeline-preview-meta',content)));const paragraph=content.querySelector('p:not([class])')||[...content.querySelectorAll('p')].at(-1);if(paragraph)section.append(clone(paragraph));others.append(section);}cover.append(others);root.append(cover);
  const shinjuku=$('#shinjuku'),shinjukuIntro=sheet('Shinjuku Live Street');shinjukuIntro.append(introduction(shinjuku),problem(shinjuku));
  const results=element('section','print-results');results.append(element('h2','','평균 CPU 프레임 시간'),element('strong','print-result','17.65 ms → 11.92 ms / 32.4% 감소'));
  const conditions=$('.measurement-note-panel',shinjuku);if(conditions)results.append(clone(conditions));shinjukuIntro.append(results);root.append(shinjukuIntro);
  const traffic=sheet('Shinjuku Live Street / 차량 처리 개선');traffic.append(figure(await snapshots.traffic(),'실제 로직을 반영한 교통 시뮬레이션의 보행자 감지 장면','print-traffic'));
  const comparisons=element('div','print-comparisons');comparisons.append(...snapshots.comparisons().map(cleanVisual));traffic.append(comparisons);root.append(traffic);
  const pixel=$('#pixel-mat'),pixelIntro=sheet('Pixel Mat');pixelIntro.append(introduction(pixel),element('h2','',text('#pm-complex-title')));pixelIntro.append(cleanVisual(clone($('.pm-comparison',pixel))));root.append(pixelIntro);
  const pixelProcess=sheet('Pixel Mat / 이미지 생성과 변환');pixelProcess.append(cleanVisual(clone($('.pm-listed-process',pixel))),cleanVisual(clone($('.pm-map-example',pixel))));root.append(pixelProcess);
  const flight=$('#shimanami'),flightPage=sheet('Shimanami Ekranoplan');flightPage.append(introduction(flight));
  const exhibition=$('.flight-exhibition',flight);if(exhibition)flightPage.append(cleanVisual(clone(exhibition)));
  flightPage.append(problem(flight),figure(snapshots.flight(),'기체는 원점 X 0 / Z 0에 고정하고 지형을 반대 방향으로 이동','print-flight'),clone($('.flight-static-comparison')));root.append(flightPage);
  const i2s=$('#idea2strategy'),i2sPage=sheet('Idea2Strategy');i2sPage.append(introduction(i2s),clone($('.i2s-case-opening',i2s)));
  const heading=clone($('.i2s-workflow-heading',i2s));heading.querySelectorAll('button').forEach(e=>e.remove());i2sPage.append(heading);
  const flow=element('ol','print-ai-flow');flow.append(...snapshots.harness().map(cleanVisual));i2sPage.append(flow);root.append(i2sPage);
  const records=sheet('Idea2Strategy / AI 하네스 ‘Stackcord’');records.append(clone($('.i2s-implementation-records',i2s)),clone($('.i2s-rule-excerpt',i2s)),clone($('.i2s-record-links',i2s)));root.append(records);
  cleanVisual(root);
  return root;
 }
 let currentFrame;
 async function prepare(){
  currentFrame?.remove();
  const content=await build();
  const frame=element('iframe','portfolio-print-frame');frame.title='손현준 포트폴리오 인쇄';frame.setAttribute('aria-hidden','true');
  Object.assign(frame.style,{position:'fixed',left:'-12000px',top:'0',width:'820px',height:'1160px',border:'0'});document.body.append(frame);currentFrame=frame;
  const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>손현준_포트폴리오</title><base href="'+document.baseURI+'"><link rel="stylesheet" href="styles/portfolio-print.css?v=a4-20261125"></head><body></body></html>');doc.close();doc.body.append(doc.importNode(content,true));
  const stylesheet=doc.querySelector('link[rel="stylesheet"]');
  await new Promise((resolve,reject)=>{if(stylesheet.sheet){resolve();return;}stylesheet.addEventListener('load',resolve,{once:true});stylesheet.addEventListener('error',()=>reject(Error('인쇄용 스타일을 불러오지 못하였습니다.')),{once:true});});
  await Promise.all([...doc.images].map(img=>img.decode().catch(()=>{throw Error('인쇄용 이미지를 불러오지 못하였습니다.');})));
  await doc.fonts.ready;
  await new Promise(resolve=>frame.contentWindow.requestAnimationFrame(()=>frame.contentWindow.requestAnimationFrame(resolve)));
  frame.dataset.ready='true';return frame;
 }
 button.addEventListener('click',async()=>{
  button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='PDF 인쇄 화면을 준비하고 있습니다.';
  try{const frame=await prepare();status.textContent='인쇄 창에서 PDF로 저장을 선택해주세요.';frame.contentWindow.focus();frame.contentWindow.print();}
  catch(error){console.error(error);status.textContent='PDF 인쇄 화면을 준비하지 못하였습니다. 다시 시도해주세요.';}
  finally{button.disabled=false;button.removeAttribute('aria-busy');}
 });
})();
