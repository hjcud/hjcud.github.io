'use strict';
(() => {
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const projects = $$('.featured-case');
const header = $('.header');
const previews = $$('template[id^="preview-"]');

const readingPosition = document.createElement('a');
readingPosition.className = 'reading-position';
readingPosition.innerHTML = '<span class="reading-count"></span><span class="reading-name"></span>';
const readingTrack = document.createElement('div');
readingTrack.className = 'reading-track';
readingTrack.setAttribute('aria-hidden', 'true');
const segments = projects.map(() => {
 const segment = document.createElement('span');
 segment.className = 'reading-segment';
 readingTrack.append(segment);
 return segment;
});
header.insertBefore(readingPosition, header.querySelector('nav'));
header.append(readingTrack);

let frame = 0, lastProject = -2;
function updateReading() {
 frame = 0;
 const edge = header.getBoundingClientRect().bottom + Math.min(innerHeight * .24, 150);
 const rects = projects.map(project => project.getBoundingClientRect());
 const active = rects.findIndex(r => r.top <= edge && r.bottom > edge);
 if (active !== lastProject) {
   lastProject = active;
   const reading = active >= 0;
   header.classList.toggle('is-reading-projects', reading);
   readingPosition.hidden = readingTrack.hidden = !reading;
   if (reading) {
     const project = projects[active];
     $('.reading-count', readingPosition).textContent = String(active + 1).padStart(2, '0') + ' / ' + String(projects.length).padStart(2, '0');
     $('.reading-name', readingPosition).textContent = project.dataset.title;
     readingPosition.href = '#' + project.id;
     readingPosition.setAttribute('aria-label', project.dataset.title + ' 상세 처음으로');
   }
 }
 if (active >= 0) {
   const r = rects[active];
   const read = Math.max(0, Math.min(1, (innerHeight - r.top) / r.height));
   segments.forEach((segment, i) => {
     segment.style.setProperty('--read', i < active ? 1 : i === active ? read : 0);
     segment.classList.toggle('is-past', i < active);
     segment.classList.toggle('is-current', i === active);
   });
 }
 const navEdge = header.getBoundingClientRect().bottom + 30;
 const section = $('#projects').getBoundingClientRect().top <= navEdge ? 'projects' :
                 $('#background').getBoundingClientRect().top <= navEdge ? 'background' : 'profile';
 $$('.nav-link').forEach(link => {
   const current = link.hash === '#' + section;
   link.classList.toggle('is-current', current);
   if (current) link.setAttribute('aria-current', 'location');
   else link.removeAttribute('aria-current');
 });
}
function scheduleReading() { if (!frame) frame = requestAnimationFrame(updateReading); }
addEventListener('scroll', scheduleReading, {passive:true});
addEventListener('resize', scheduleReading);
new ResizeObserver(scheduleReading).observe(document.body);
document.fonts.ready.then(scheduleReading);

// The next link also provides a quiet, explicit end to each long case study.
projects.forEach((project,index)=>{
 if(!projects[index+1])return;
 const next=projects[index+1];
 const link=document.createElement('a');
 link.className='project-end-nav';
 link.href='#'+next.id;
 const label=document.createElement('span');
 label.textContent='다음 프로젝트';
 const title=document.createElement('strong');
 title.textContent=next.dataset.title;
 const arrow=document.createElement('span');
 arrow.className='project-end-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↓';
 link.append(label,title,arrow);
 project.querySelector('.project-body').append(link);
});

$('#months').innerHTML = Array.from({length:46},(_,i)=>`<span>${i % 12 + 1}</span>`).join('');
const icons = {
 blocks:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="15" y="3" width="8" height="8" rx="2"/><rect x="3" y="15" width="8" height="8" rx="2"/><path d="M15 19h8m-4-4v8"/>',
 chart:'<path d="M4 3v19h19M8 16l5-5 4 3 6-8M18 6h5v5"/>',
 workflow:'<rect x="8" y="2" width="10" height="6" rx="1"/><rect x="2" y="18" width="8" height="6" rx="1"/><rect x="16" y="18" width="8" height="6" rx="1"/><path d="M13 8v5M6 18v-5h14v5"/>',
 joystick:'<circle cx="13" cy="6" r="3"/><path d="M13 9v8M8 13H5L3 22h20l-2-9h-3M9 18h8"/>',
 gauge:'<path d="M5 21a10 10 0 1 1 16 0M6 19h14M13 3v3M5.5 6.5l2 2M20.5 6.5l-2 2M3 13h3m14 0h3M13 16l5-7"/><circle cx="13" cy="16" r="1.5"/>',
 car:'<path d="m4 10 2-6h12l2 6M3 10h18v9H3zM6 19v3m12-3v3M6 14h2m8 0h2M6 10h12"/>',
 speaker:'<path d="M3 9h5l7-5v16l-7-5H3zM18 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
 sync:'<path d="M20 8a9 9 0 0 0-15-3L2 8m0-6v6h6M4 16a9 9 0 0 0 15 3l3-3m0 6v-6h-6"/>'
};
$$('[data-icon]').forEach(el=>el.innerHTML=`<svg aria-hidden="true" viewBox="0 0 26 26">${icons[el.dataset.icon]}</svg>`);

// Normal fragment links keep native history, keyboard behavior and sticky-header offsets.
const oldTargets = {
 'hinasaki-methods-title':'hinasaki', 'vr-fire-methods-title':'vr-fire',
 'vr-fire-section-title':'vr-fire', 'propro-making-title':'propro',
 'more-projects':'group-ssafy'
};
function hashTarget() {
 let id;
 try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
 const direct = document.getElementById(id);
 const legacyGroup = id.match(/^(group-(?:university|collaboration|ssafy))-title$/)?.[1];
 const legacyCard = id.match(/^(hinasaki|vr-fire|propro|betterbatter|baro-sales)-(?:heading|compact-body|carousel|slide-status)$/)?.[1];
 const target = direct || document.getElementById(oldTargets[id] || legacyGroup || legacyCard || '');
 if (!target) return;
 if (target.matches('button.period')) {
   target.scrollIntoView({block:'center', behavior:'instant'});
   window.portfolioTimelinePreview?.show(target.dataset.project, {focus:true});
 } else if (!direct) {
   target.scrollIntoView({block:'start', behavior:'instant'});
 }
}
addEventListener('hashchange', hashTarget);
addEventListener('DOMContentLoaded', () => { if (location.hash) hashTarget(); });
document.addEventListener('click', event => {
 if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
 const link = event.target.closest('a[href^="#"]');
 if (link && link.hash === location.hash && document.getElementById(link.hash.slice(1))?.matches('button.period')) {
   event.preventDefault();
   hashTarget();
 }
});

const skillButtons=$$('[data-skill]');
let selectedSkill=null;
function selectSkill(key) {
 selectedSkill=key;
 skillButtons.forEach(button=>{const active=button.dataset.skill===key;button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-expanded',String(active));});
 const panel=$('#skill-projects');
 panel.hidden=!key;
 $('#skill-project-links').replaceChildren();
 if(!key){$('#skill-selection-status').textContent='기술 선택을 해제했습니다.';return;}
 const button=skillButtons.find(button=>button.dataset.skill===key);
 const name=$('.tech-name',button).textContent;
 const related=previews.filter(project=>project.dataset.skills.split(/\s+/).includes(key));
 $('#skill-project-title').textContent=name+' 사용 프로젝트';
 related.forEach(project=>{
   const a=document.createElement('a');a.href='#'+project.id.slice('preview-'.length);a.textContent=project.dataset.title+' ↗';$('#skill-project-links').append(a);
 });
 $('#skill-selection-status').textContent=name+' 사용 프로젝트 '+related.length+'개';
}
skillButtons.forEach(button=>{button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',$('.tech-name',button).textContent+' 사용 프로젝트 보기');button.addEventListener('click',()=>selectSkill(selectedSkill===button.dataset.skill?null:button.dataset.skill));});
$$('a[data-tech]').forEach(badge=>badge.addEventListener('click',()=>selectSkill(badge.dataset.tech)));
$('#skill-clear').addEventListener('click',()=>{
 const button=skillButtons.find(button=>button.dataset.skill===selectedSkill);selectSkill(null);button?.focus({preventScroll:true});
});

// Native dialog provides focus containment, Escape dismissal and focus restoration.
const dialog=$('#media-dialog');
const dialogContent=$('#dialog-content');
let dialogTrigger=null;
function openDialog(title, content, trigger) {
 dialogTrigger=trigger || document.activeElement;
 $('#dialog-title').textContent=title;
 dialogContent.replaceChildren(content);
 dialog.showModal();
 document.body.style.overflow='hidden';
 $('#dialog-close').focus();
}
$('#dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{
 const video=$('video',dialogContent);if(video)video.pause();
 dialogContent.replaceChildren();document.body.style.overflow='';
 dialogTrigger?.focus({preventScroll:true});
});
const gallery={

 'shimanami-exhibition':['shimanami-exhibition.webp','Shimanami Ekranoplan / 무사시노미술대학 전시 현장'],
 shinjuku:['shinjuku.webp','Shinjuku Live Street / 실제 플레이 화면'],
 'shinjuku-community':['shinjuku-community.webp','Shinjuku Live Street / 역 앞 거리'],
 shimanami:['shimanami-flight.webp','Shimanami Ekranoplan / 바다 위 비행'],
 cockpit:['cockpit.webp','Shimanami Ekranoplan / 조종석'],
 'i2s-editor':['i2s-strategy-complex-light.png','Idea2Strategy / 복합 전략 구성 (라이트 모드, 70% 배율)'],
 'i2s-home':['i2s-strategy-list-light.png','Idea2Strategy / 전략 목록 (라이트 모드, 시연 데이터)'],
 'i2s-backtest':['i2s-backtest-clean-light.png','Idea2Strategy / 백테스트 차트와 체결 표 (라이트 모드, 시연 데이터)']
};
$$('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{
 const [src,title]=gallery[button.dataset.gallery];const img=new Image();img.src='assets/'+src;img.alt=title;openDialog(title,img,button);
}));
$$('[data-video]').forEach(button=>button.addEventListener('click',()=>{
 const video=document.createElement('video');video.src='assets/'+button.dataset.video;video.controls=true;video.playsInline=true;video.preload='metadata';
 openDialog(button.dataset.title,video,button);video.play().catch(()=>{});
}));

// Advance only while visible and idle; hover and keyboard focus pause the slideshow.
for(const config of [
 {id:'shinjuku',slides:[['shinjuku','거리 공연'],['shinjuku-community','역 앞 거리']]},
 {id:'shimanami',slides:[['shimanami','바다 위 비행'],['cockpit','조종석']]},
 {id:'i2s',slides:[['i2s-home','전략 목록'],['i2s-editor','전략 구성'],['i2s-backtest','백테스트 차트와 체결 표']]}
]){
 const carousel=$('#'+config.id+'-carousel'),images=$$('.carousel-image',carousel);
 let index=0,visible=false,hover=false,focused=false;
 function show(next,manual=false){
  index=(next+config.slides.length)%config.slides.length;
  images.forEach((img,i)=>{img.classList.toggle('is-current',i===index);img.setAttribute('aria-hidden',String(i!==index));});
  const [key,caption]=config.slides[index],button=$('.screenshot-stage',carousel);
  button.dataset.gallery=key;button.setAttribute('aria-label',caption+' 화면 크게 보기');
  const captionElement=$('#'+config.id+'-slide-caption');
  if(captionElement)captionElement.textContent=caption;
  if(manual)$('#'+config.id+'-slide-status').textContent=caption+', '+(index+1)+' / '+config.slides.length;
 }
 carousel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(index+(event.key==='ArrowRight'?1:-1),true);}});
 carousel.addEventListener('mouseenter',()=>hover=true);carousel.addEventListener('mouseleave',()=>hover=false);
 carousel.addEventListener('focusin',()=>focused=true);carousel.addEventListener('focusout',e=>{if(!carousel.contains(e.relatedTarget))focused=false;});
 new IntersectionObserver(e=>{visible=e[0].isIntersecting;},{threshold:.25}).observe(carousel);
 setInterval(()=>{if(visible&&!reducedMotion.matches&&!hover&&!focused&&!document.hidden&&!dialog.open)show(index+1);},5000);
}

function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),1800);}

const tabButtons=$$('.view-tabs [role=tab]');
function selectTab(button) {
 tabButtons.forEach(b=>{const active=b===button;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;document.getElementById(b.getAttribute('aria-controls')).hidden=!active;});
}
tabButtons.forEach((b,i)=>{
 b.addEventListener('click',()=>selectTab(b));
 b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabButtons.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabButtons.length)%tabButtons.length;selectTab(tabButtons[next]);tabButtons[next].focus();}});
});

// Scale the iframe itself so pointer coordinates inside the original editor
// remain in its own 1280px coordinate system (including drag and drop).
const editorViewport = document.querySelector('.i2s-editor-viewport');
if (editorViewport) {
 const fitEditor = () => editorViewport.style.setProperty('--editor-scale', String(editorViewport.clientWidth / 1280));
 new ResizeObserver(fitEditor).observe(editorViewport);
 fitEditor();
}
updateReading();
})();
