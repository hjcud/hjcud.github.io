'use strict';
(() => {
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const header = $('.header');
const previews = $$('template[id^="preview-"]');
const aliases={'web-backend':'java',react:'web-frontend',typescript:'web-frontend',kotlin:'android',compose:'android'};
const skillData={
 unity:{name:'Unity',keys:['unity'],copy:'VRChat 월드와 VR 시뮬레이터를 제작하고, Profiler로 차량 계산에 걸리는 시간을 확인하며 최적화하였습니다.'},
 csharp:{name:'C#',keys:['csharp'],copy:'차량 주행과 비행 계산, 위치 동기화와 VR 화재 확산 로직을 구현하였습니다.'},
 udonsharp:{name:'UdonSharp',keys:['udonsharp'],copy:'VRChat의 차량 주행과 스피커 제어, 비행과 상태 동기화를 구현하였습니다.'},
 'ai-skills':{name:'AI 스킬',keys:['ai-skills'],copy:'Pixel Mat의 픽셀 아트 생성과 변환, 검사 과정을 AI 스킬로 작성하였습니다. 팀 프로젝트에서는 명세 확인과 테스트 규칙을 담은 스킬을 사용하였습니다.'},
 harness:{name:'AI 하네스',keys:['harness'],copy:'AI 하네스 ‘Stackcord’에 확인할 명세와 작업 범위, 테스트 절차를 정리하였습니다. 작업 계획은 Jira로 옮겨 팀과 공유하였습니다.'},
 git:{name:'Git',keys:['git'],copy:'브랜치와 PR로 변경 내용을 검토하고 통합하였습니다. 작업 범위와 병합 순서는 팀 작업 기록에 남겼습니다.'},
 java:{name:'Java',keys:['java'],copy:'Idea2Strategy의 전략 작성과 백테스트 API, BetterBatter의 백엔드 로직을 Java로 개발하였습니다.'},
 spring:{name:'Spring Boot',keys:['spring'],copy:'Spring Boot로 Idea2Strategy의 전략 작성과 백테스트 API, BetterBatter의 백엔드 기능을 개발하였습니다.'},
 'web-frontend':{name:'React / TypeScript',keys:['react','typescript'],ratings:[['React',20],['TypeScript',20]],copy:'BetterBatter의 실시간 경기 중계와 경기 예측 화면, 사용자 상호작용을 개발하였습니다.'},
 android:{name:'Kotlin / Jetpack Compose',keys:['kotlin','compose'],ratings:[['Kotlin',20],['Jetpack Compose',20]],copy:'바로영업 Android 앱에서 고객 정보 화면과 전화가 왔을 때 상담 정보를 보여주는 기능을 개발하였습니다.'}
};
const skillButtons=$$('#skills [data-skill]');
const skillPanel=$('#skill-projects');
const skillCarousel=$('.skill-carousel');
const skillSlides=$$('.skill-slide');
const skillPageButton=$('#skill-page-next');
const skillPreviousButton=$('#skill-page-prev');
const skillViewport=$('.skill-carousel-viewport');
let selectedSkill=null,skillAnchor=null,skillPage=0;
function measureSkillSlides(){
 const height=Math.ceil(Math.max(...skillSlides.map(slide=>slide.getBoundingClientRect().height)));
 if(height>0)skillViewport.style.height=height+'px';
}
new ResizeObserver(measureSkillSlides).observe(skillCarousel);
skillSlides.forEach(slide=>new ResizeObserver(measureSkillSlides).observe(slide));
document.fonts.ready.then(measureSkillSlides);
measureSkillSlides();
function positionSkillPanel(){
 if(!skillAnchor||!skillPanel.matches(':popover-open'))return;
 const margin=16,rect=skillAnchor.getBoundingClientRect(),width=skillPanel.offsetWidth,height=skillPanel.offsetHeight;
 let left=Math.min(innerWidth-width-margin,Math.max(margin,rect.left)),top;
 if(innerWidth<=760){left=(innerWidth-width)/2;top=innerHeight-height-margin;}
 else{
  const area=skillViewport.getBoundingClientRect();
  top=area.bottom+10;if(top+height>innerHeight-margin)top=area.top-height-10;
  top=Math.max(header.getBoundingClientRect().bottom+8,Math.min(top,innerHeight-height-margin));
 }
 skillPanel.style.left=left+'px';skillPanel.style.top=top+'px';
}
function closeSkill(restoreFocus=false){
 const anchor=skillAnchor;
 if(skillPanel.matches(':popover-open'))skillPanel.hidePopover();
 selectedSkill=null;skillAnchor=null;skillButtons.forEach(button=>button.setAttribute('aria-expanded','false'));
 $('#skill-selection-status').textContent='기술 설명을 닫았습니다.';
 if(restoreFocus)anchor?.focus({preventScroll:true});
}
function changeSkillPage(next){
 closeSkill();skillPage=next;
 const focusOnSlide=skillSlides.some(slide=>slide.contains(document.activeElement));
 if(focusOnSlide||(!next&&document.activeElement===skillPreviousButton))skillPageButton.focus({preventScroll:true});
 skillSlides.forEach((slide,index)=>{const active=index===skillPage;slide.inert=!active;slide.setAttribute('aria-hidden',String(!active));});
 skillCarousel.dataset.page=String(skillPage);
 skillPreviousButton.hidden=!skillPage;
 const label=skillPage?'주로 사용하는 기술 보기':'기타 프로젝트 사용 기술 보기';
 skillPageButton.setAttribute('aria-label',label);skillPageButton.title=label;
 $('#skill-page-status').textContent=skillPage?'기타 프로젝트 사용 기술을 표시하였습니다.':'주로 사용하는 기술을 표시하였습니다.';
}
skillPageButton.addEventListener('click',()=>changeSkillPage(skillPage?0:1));
skillPreviousButton.addEventListener('click',()=>changeSkillPage(0));
function selectSkill(request,keyboard=false){
 const key=aliases[request]||request;if(!key){closeSkill();return;}
 if(selectedSkill===key&&skillPanel.matches(':popover-open')){closeSkill();return;}
 const data=skillData[key];if(!data)return;
 const button=skillButtons.find(item=>item.dataset.skill===key),page=skillSlides.findIndex(slide=>slide.contains(button));
 if(page!==skillPage)changeSkillPage(page);
 selectedSkill=key;skillAnchor=button;
 skillButtons.forEach(item=>item.setAttribute('aria-expanded',String(item===button)));
 skillPanel.dataset.context=data.ratings?'other':'main';
 $('#skill-project-title').textContent=data.name;$('.skill-experience',skillPanel).textContent=data.copy;
 const ratings=$('.skill-detail-ratings',skillPanel);ratings.replaceChildren();ratings.hidden=!data.ratings;
 for(const [name,value] of data.ratings||[]){const label=document.createElement('span');label.textContent=name;const score=document.createElement('strong');score.textContent=value+'%';label.append(score);ratings.append(label);}
 const related=previews.filter(project=>data.keys.some(skill=>project.dataset.skills.split(/\s+/).includes(skill)));
 related.sort((a,b)=>Number(b.dataset.featured==='true')-Number(a.dataset.featured==='true'));
 const links=$('#skill-project-links');links.replaceChildren();
 related.slice(0,2).forEach(project=>{const a=document.createElement('a');a.href='#'+project.id.slice(8);a.textContent=project.dataset.title+' ↗';links.append(a);});
 if(!skillPanel.matches(':popover-open'))skillPanel.showPopover();positionSkillPanel();
 if(keyboard)skillPanel.focus({preventScroll:true});
 $('#skill-selection-status').textContent=data.name+' 활용 경험을 표시하였습니다.';
}
skillButtons.forEach(button=>{button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',event=>selectSkill(button.dataset.skill,event.detail===0));});
$('#skill-detail-close').addEventListener('click',()=>closeSkill(true));
$('#skill-project-links').addEventListener('click',event=>{if(event.target.closest('a'))closeSkill();});
$$('a[data-tech]').forEach(badge=>badge.addEventListener('click',()=>selectSkill(badge.dataset.tech)));
document.addEventListener('pointerdown',event=>{if(skillPanel.matches(':popover-open')&&!skillPanel.contains(event.target)&&!event.target.closest('#skills [data-skill],#skill-page-next,#skill-page-prev'))closeSkill();});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&skillPanel.matches(':popover-open')){event.preventDefault();closeSkill(true);return;}
 const button=event.target.closest('#skills [data-skill]');
 if(!button||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const buttons=skillButtons.filter(item=>skillSlides[skillPage].contains(item));
 const index=buttons.indexOf(button),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1)+buttons.length)%buttons.length;
 event.preventDefault();buttons[next].focus({preventScroll:true});if(selectedSkill)selectSkill(buttons[next].dataset.skill);
});
addEventListener('scroll',()=>{if(skillPanel.matches(':popover-open'))closeSkill();},{passive:true});
addEventListener('resize',()=>{measureSkillSlides();if(skillPanel.matches(':popover-open'))positionSkillPanel();});
})();
