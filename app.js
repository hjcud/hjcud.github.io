'use strict';
(() => {
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const projects = $$('.project, .additional-project');
const projectDisclosures = $$('.project-disclosure');
const dock = $('.timeline-dock');
const stage = $('.timeline-stage');
const timelineScroll = $('.timeline-scroll');
const lanes = $$('.timeline-lane');
const periods = $$('[data-project]');
let fullTimelineHeight=0, smallTimelineHeight=0, singleTimelineHeight=0, compression=0;
let laneHeights=[];
const header = $('.header');
let currentIndex = -1;
let scrollScheduled = false;
let cancelAnchorAlignment=()=>{};

// Keep orientation in the existing header, without changing its height.
const readingPosition=document.createElement('a');
readingPosition.className='reading-position';
readingPosition.hidden=true;
readingPosition.innerHTML='<span class="reading-count"></span><span class="reading-name"></span>';
header.insertBefore(readingPosition,header.querySelector('nav'));
const readingTrack=document.createElement('div');
readingTrack.className='reading-track';
readingTrack.setAttribute('aria-hidden','true');
readingTrack.hidden=true;
const readingSegments=projects.map(()=>{
 const segment=document.createElement('span');
 segment.className='reading-segment';
 readingTrack.append(segment);
 return segment;
});
header.append(readingTrack);
let readingKey='';
function updateReadingPosition(index,pinned){
 const visible=pinned&&index>=0;
 readingPosition.hidden=!visible;
 readingTrack.hidden=!visible;
 header.classList.toggle('is-reading-projects',visible);
 if(!visible){readingKey='';return;}
 const project=projects[index];
 const compact=project.closest('.compact-services');
 const grouped=compact&&matchMedia('(min-width:761px)').matches;
 const members=grouped?$$('.compact-service',compact):[project];
 const first=projects.indexOf(members[0]),last=projects.indexOf(members.at(-1));
 const key=first+':'+last;
 if(key!==readingKey){
   readingKey=key;
   const number=n=>String(n+1).padStart(2,'0');
   const range=first===last?number(first):number(first)+'–'+number(last);
   const name=grouped?(compact.classList.contains('compact-university')?'대학교 프로젝트':members.map(p=>p.dataset.title).join(', ')):project.dataset.title;
   $('.reading-count',readingPosition).textContent=range+' / '+String(projects.length).padStart(2,'0');
   $('.reading-name',readingPosition).textContent=name;
   readingPosition.href='#'+members[0].id;
   readingPosition.setAttribute('aria-label',`전체 ${projects.length}개 중 ${first+1}${first===last?'':'–'+(last+1)}번째, ${name} 시작으로 이동`);
   readingPosition.title=name+' 시작으로 이동';
 }
 // Use this project only: expanding later projects must not reset progress.
 const rect=(grouped?compact:project).getBoundingClientRect();
 let fraction=Math.max(0,Math.min(1,(innerHeight-24-rect.top)/Math.max(1,rect.height)));
 if(last===projects.length-1&&scrollY+innerHeight>=document.documentElement.scrollHeight-2)fraction=1;
 readingSegments.forEach((segment,i)=>{
   segment.classList.toggle('is-current',i>=first&&i<=last);
   segment.classList.toggle('is-past',i<first);
   segment.style.setProperty('--read',String(i<first?1:i<=last?fraction:0));
 });
}

// The next link also provides a quiet, explicit end to each long case study.
projects.forEach((project,index)=>{
 if(project.closest('.compact-services')||!projects[index+1])return;
 const next=projects[index+1],compact=next.closest('.compact-services');
 const link=document.createElement('a');
 link.className='project-end-nav';
 link.href='#'+next.id;
 const label=document.createElement('span');
 label.textContent=compact?'다른 프로젝트':'다음 프로젝트';
 const title=document.createElement('strong');
 title.textContent=compact?$$('.compact-service',compact).map(p=>p.dataset.title).join(', '):next.dataset.title;
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

function revealActivePeriod() {
 if(timelineScroll.scrollWidth<=timelineScroll.clientWidth)return;
 const label=periods.find(a=>a.dataset.project===projects[currentIndex]?.id)?.querySelector('span');
 if(!label)return;
 // Keep the leading title and the start of its bar visible on narrow screens.
 const range=document.createRange();
 range.selectNodeContents(label);
 const title=range.getBoundingClientRect();
 const viewport=timelineScroll.getBoundingClientRect();
 const left=viewport.left+16, right=viewport.right-16;
 const bar=label.parentElement.getBoundingClientRect();
 const targetRight=Math.max(title.right,Math.min(bar.right,bar.left+40));
 const shift=title.left<left?title.left-left:targetRight>right?targetRight-right:0;
 if(shift)timelineScroll.scrollBy({left:shift,behavior:'instant'});
}
function visibleTimelinePeriods() {
 const project=projects[Math.max(0,currentIndex)];
 const compact=project?.closest('.compact-services');
 const ids=new Set(compact&&matchMedia('(min-width:761px)').matches
   ?$$('.compact-service',compact).map(p=>p.id):[project?.id]);
 return periods.filter(a=>ids.has(a.dataset.project));
}
function setActive(index) {
 const changed=currentIndex!==index;
 currentIndex=index;
 if(singleTimelineHeight)smallTimelineHeight=singleTimelineHeight+39*(visibleTimelinePeriods().length-1);
 const highlighted=index>=0?new Set(visibleTimelinePeriods()):new Set();
 periods.forEach(a=>{
   const selected=a.dataset.project===projects[index]?.id;
   a.classList.toggle('is-active',highlighted.has(a));
   if(selected)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');
 });
 if(changed)revealActivePeriod();
}
function compressTimeline(amount) {
 compression=amount;
 dock.style.setProperty('--compression',String(amount));
 $('.timeline-foot').inert=amount>=.5;
 // Keep the first lane during compression without marking it as being read yet.
 const visible=visibleTimelinePeriods();
 lanes.forEach((lane,i)=>{
   const count=visible.filter(a=>lane.contains(a)).length;
   const selected=count>0;
   lane.style.height=(laneHeights[i]*(1-amount)+(selected?52+39*(count-1):0)*amount)+'px';
   lane.style.opacity=String(selected?1:1-amount);
   lane.inert=amount>=.999&&!selected;
 });
 periods.forEach(a=>{
   const selected=visible.includes(a);
   a.style.opacity=String(selected?1:Math.max(0,1-amount*2));
   a.style.visibility=!selected&&amount>=.5?'hidden':'visible';
   a.tabIndex=!selected&&amount>=.5?-1:0;
   const row=Number(a.style.getPropertyValue('--row'));
   const base=a.classList.contains('start-marker')?15:7;
   const compactRow=selected?visible.filter(p=>p.closest('.timeline-lane')===a.closest('.timeline-lane')).indexOf(a):row;
   a.style.top=(base+39*(row*(1-amount)+compactRow*amount))+'px';
 });
}
function measureTimeline() {
 const old=compression;
 dock.classList.remove('is-pinned');
 dock.style.setProperty('--compression','0');
 lanes.forEach(lane=>{lane.style.height='';lane.style.opacity='';});
 laneHeights=lanes.map(lane=>lane.getBoundingClientRect().height);
 compressTimeline(0);fullTimelineHeight=dock.getBoundingClientRect().height;
 compressTimeline(1);smallTimelineHeight=dock.getBoundingClientRect().height;
 singleTimelineHeight=smallTimelineHeight-39*(visibleTimelinePeriods().length-1);
 stage.style.height=fullTimelineHeight+'px';
 compressTimeline(old);
 updateReading();
 revealActivePeriod();
}
function updateReading() {
 const headerBottom=header.getBoundingClientRect().bottom;
 const stageTop=stage.getBoundingClientRect().top;
 const pinned=stageTop<=headerBottom;
 // Selection must not depend on the selected row's height (one, two or three bars).
 // Otherwise a boundary can alternate between two projects on successive frames.
 const travel=Math.max(1,fullTimelineHeight-singleTimelineHeight);
 const amount=pinned?Math.max(0,Math.min(1,(headerBottom-stageTop)/travel)):0;
 // Reserve the expanded height so compression does not move the articles.
 dock.classList.toggle('is-pinned',pinned);
 const readingHeight=fullTimelineHeight-(fullTimelineHeight-singleTimelineHeight)*amount;
 const edge=headerBottom+(pinned?readingHeight:0)+70;
 let index=-1,readingTop=-Infinity;
 projects.forEach((p,i)=>{
   const group=p.closest('.project-group');
   const compact=p.closest('.compact-services');
   const readingStart=compact&&matchMedia('(min-width:761px)').matches?compact:
     group?.querySelector('.project')===p&&!compact?group:p;
   const top=readingStart.getBoundingClientRect().top;
   if(top<=edge&&(top>readingTop+1||(Math.abs(top-readingTop)<=1&&i===currentIndex))){index=i;readingTop=top;}
 });
 // A short, closed final row can be fully visible without reaching the top edge.
 // At the page end it is the destination, even on a tall desktop viewport.
 if(pinned&&scrollY+innerHeight>=document.documentElement.scrollHeight-2){
   const last=projects.at(-1).getBoundingClientRect();
   if(last.top<innerHeight&&last.bottom>headerBottom)index=projects.length-1;
 }
 setActive(index);compressTimeline(amount);
 const visibleHeight=fullTimelineHeight-(fullTimelineHeight-smallTimelineHeight)*amount;
 const footerTop=$('#contact').getBoundingClientRect().top;
 dock.style.transform=pinned?`translateY(${Math.min(0,footerTop-headerBottom-visibleHeight)}px)`:'none';
 updateReadingPosition(index,pinned);
 const section=$('#projects').getBoundingClientRect().top<=headerBottom+120?'projects':'profile';
 $$('.nav-link').forEach(a=>a.classList.toggle('is-current',a.getAttribute('href')==='#'+section));
 scrollScheduled=false;
}
addEventListener('scroll',()=>{
 if(!scrollScheduled){
   scrollScheduled=true;
   requestAnimationFrame(updateReading);
 }
}, {passive:true});
addEventListener('resize',measureTimeline);
function navigate(id,push=true) {
 cancelAnchorAlignment();
 id=({'hinasaki-methods-title':'hinasaki','vr-fire-methods-title':'vr-fire','vr-fire-section-title':'vr-fire','propro-making-title':'propro'})[id]||id;
 const target=document.getElementById(id);
 if(!target)return;
 const targetProject=target.closest('.project');
 if(targetProject)setActive(projects.indexOf(targetProject));
 // Open the destination exclusively before measuring its scroll position.
 const ownDisclosure=target.closest('.project-fold')?.querySelector('.project-disclosure');
 if(ownDisclosure)setProjectOpen(ownDisclosure,true);
 for(let parent=target.parentElement;parent;parent=parent.parentElement){if(parent.tagName==='DETAILS')parent.open=true;}
 if(target.tagName==='DETAILS')target.open=true;
 const isProject=!!target.closest('.project-fold') || target.classList.contains('project-group') || id==='main' || id==='more-projects';
 const offset=header.offsetHeight+(isProject?smallTimelineHeight:0)+24;
 const top=id==='top'?0:target.getBoundingClientRect().top+scrollY-offset;
 if(isProject){
   const cleanup=()=>{
     removeEventListener('scrollend',alignHeading);
     removeEventListener('wheel',cleanup);
     removeEventListener('touchstart',cleanup);
     cancelAnchorAlignment=()=>{};
   };
   const alignHeading=()=>{
     cleanup();
     updateReading();
     const overlap=header.offsetHeight+dock.getBoundingClientRect().height+24-target.getBoundingClientRect().top;
     if(overlap>1)window.scrollBy({top:-overlap,behavior:'instant'});
   };
   cancelAnchorAlignment=cleanup;
   addEventListener('scrollend',alignHeading,{once:true});
   addEventListener('wheel',cleanup,{once:true,passive:true});
   addEventListener('touchstart',cleanup,{once:true,passive:true});
 }
 window.scrollTo({top:Math.max(0,top),behavior:reducedMotion.matches?'instant':'smooth'});
 if(push)history.pushState(null,'','#'+id);
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href^="#"]');
 if(!link||event.ctrlKey||event.metaKey||event.shiftKey)return;
 const id=link.getAttribute('href').slice(1);
 if(document.getElementById(id)){event.preventDefault();navigate(id);}
});
addEventListener('popstate',()=>navigate(location.hash.slice(1)||'top',false));
function disclosureGroup(disclosure) {
 const compact=disclosure.closest('.compact-services');
 return compact?$$('.project-disclosure',compact):[disclosure];
}
function setProjectOpen(disclosure,open,keepPosition=false,positionAnchor=null) {
 const anchor=positionAnchor||disclosure.querySelector(':scope > summary');
 const previousTop=keepPosition?anchor.getBoundingClientRect().top:0;
 const group=disclosureGroup(disclosure);
 if(open)projectDisclosures.forEach(other=>{
   if(!group.includes(other)){
     other.open=false;
   }
 });
 group.forEach(member=>{member.open=open;});
 $$('.compact-group-toggle').forEach(button=>{
   const expanded=!!button.closest('.compact-services').querySelector('.project-disclosure[open]');
   button.setAttribute('aria-expanded',String(expanded));
   button.setAttribute('aria-label',button.closest('.compact-services').getAttribute('aria-label')+(expanded?' 함께 접기':' 함께 펼치기'));
   if(button.closest('.compact-university'))button.querySelector('span:first-child').textContent=expanded?'프로젝트 상세 접기':'프로젝트 상세 펼치기';
 });
 // Collapsing an earlier project must not move the clicked heading away.
 if(keepPosition){
   const restoreHeading=()=>{
     const shift=anchor.getBoundingClientRect().top-previousTop;
     if(Math.abs(shift)>.5)window.scrollTo({top:Math.max(0,scrollY+shift),behavior:'instant'});
   };
   restoreHeading();
   // Details layout and canvas resizing can settle after the synchronous toggle.
   requestAnimationFrame(()=>{restoreHeading();updateReading();});
 }
 updateReading();
}
$$('.compact-group-toggle').forEach(button=>button.addEventListener('click',()=>{
 cancelAnchorAlignment();
 const disclosure=button.closest('.compact-services').querySelector('.project-disclosure');
 // Treat each supporting row as one accordion group and keep its toggle in place.
 setProjectOpen(disclosure,!disclosure.open,true,button);
}));
projectDisclosures.forEach(disclosure=>{
 const summary=disclosure.querySelector(':scope > summary');
 summary.addEventListener('click',event=>{
   if(event.defaultPrevented||event.target.closest('a,button,input,select,textarea'))return;
   event.preventDefault();
   cancelAnchorAlignment();
   setProjectOpen(disclosure,!disclosure.open,true);
 });
 disclosure.addEventListener('toggle',()=>{
   // Keep a compact row together, including native or deep-link openings.
   const group=disclosureGroup(disclosure);
   if(disclosure.open&&(group.some(member=>!member.open)||projectDisclosures.some(other=>other.open&&!group.includes(other)))){
     setProjectOpen(disclosure,true);
   }
   requestAnimationFrame(updateReading);
 });
});

// Nested evidence changes the page height without changing the open project.
$('.i2s-instruction-example')?.addEventListener('toggle',()=>requestAnimationFrame(updateReading));

// Build related-project links from the badges displayed on each project.
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
 const related=projects.filter(project=>$$('[data-tech]',project).some(badge=>badge.dataset.tech===key));
 $('#skill-project-title').textContent=name+' 사용 프로젝트';
 related.forEach(project=>{
   const a=document.createElement('a');a.href='#'+project.id;a.textContent=project.dataset.title+' ↗';$('#skill-project-links').append(a);
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
 'baro-customers':['baro/customers.webp','바로영업 / 고객 목록'],
 'baro-calendar':['baro/calendar.webp','바로영업 / 일정 관리'],
"vr-fire-0":["vr-fire/classroom.png", "VR 화재 시뮬레이터 / 강의실 재현"],
"vr-fire-1":["vr-fire/spread.png", "VR 화재 시뮬레이터 / 화재 확산"],
"vr-fire-2":["vr-fire/colliders.png", "VR 화재 시뮬레이터 / 불의 중복 생성을 확인하는 범위"],
"vr-fire-3":["vr-fire/extinguisher.png", "VR 화재 시뮬레이터 / 소화기 분사"],
"hinasaki-0":["hinasaki/teardrop-apollo.gif", "Hinasaki Shaders / 사용 예시 (@mbM0001_)"],
"hinasaki-1":["hinasaki/teardrop-controls.gif", "Hinasaki Shaders / 머티리얼 조정 (hjcud)"],
"hinasaki-2":["hinasaki/teardrop-uv-preview.gif", "Hinasaki Shaders / UV 미리보기 (hjcud)"],

 'propro-ipa':['propro/ipa.webp','ProPro / 발음기호 학습 / 최종보고서에 수록된 앱 화면'],
 'propro-words':['propro/words.webp','ProPro / 단어 발음 학습 / 최종보고서에 수록된 앱 화면'],
 'propro-compare':['propro/compare.webp','ProPro / 유사 발음 비교 / 최종보고서에 수록된 앱 화면'],
 'shimanami-exhibition':['shimanami-exhibition.webp','Shimanami Ekranoplan / 무사시노미술대학 전시 현장'],
 'bb-live':['bb-live.jpg','BetterBatter / 경기 상황 / 실제 UI에 시연 데이터를 적용한 화면'],
 'bb-vote':['bb-vote.jpg','BetterBatter / 예측 참여 / 실제 UI에 시연 데이터를 적용한 화면'],
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
 {id:'propro',slides:[['propro-ipa','발음기호 학습'],['propro-words','단어 발음 학습'],['propro-compare','유사 발음 비교']]},
 {id:'vr-fire',slides:[['vr-fire-0','강의실 재현'],['vr-fire-1','시간에 따른 화재 확산'],['vr-fire-2','불의 중복 생성을 확인하는 범위'],['vr-fire-3','소화기 분사']]},
 {id:'betterbatter',slides:[['bb-live','경기 상황'],['bb-vote','예측 참여']]},
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
setActive(-1);measureTimeline();
document.fonts.ready.then(()=>{
 measureTimeline();
 if(location.hash)requestAnimationFrame(()=>navigate(decodeURIComponent(location.hash.slice(1)),false));
});
})();
