'use strict';
(() => {
 const root=document.getElementById('pixel-mat');
 if(!root)return;
 const preferred={median:'central-median',region:'region-allocation'};
 root.querySelectorAll('[data-pm-preferred]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.pmPreferred,name=preferred[key];
  if(!name)return;
  const base='assets/pixel-mat/complex-character/'+name;
  root.querySelectorAll('[data-pm-preferred]').forEach(control=>control.setAttribute('aria-pressed',String(control===button)));
  const image=root.querySelector('[data-pm-preferred-image]');
  image.src=base+'.png';
  root.querySelector('[data-pm-preferred-name]').textContent=key==='median'?'Whole-chip central median':'Region allocation (베타)';
  image.alt=(key==='median'?'중앙 대표색':'영역 배정 베타')+'으로 변환한 실제 16×16 캐릭터 결과';
  root.querySelector('[data-pm-preferred-png]').href=base+'.png';
  root.querySelector('[data-pm-preferred-project]').href=base+'.pixeltool';
 }));
 const subjects={
  citizen:{name:'시민',width:16,height:16,draft:'1254×1254',colors:'8색과 투명',decision:'AI가 제안한 픽셀 수정안으로 머리 위치와 양발 간격을 고치고, 게임의 8색 팔레트에 맞췄습니다.'},
  tree:{name:'나무',width:24,height:32,draft:'1086×1448',colors:'15색과 투명',decision:'색을 더 줄이면 잎 덩어리가 구분되지 않아 15색을 사용했습니다. 줄기 밑면은 게임의 지면 기준에 맞췄습니다.'},
  house:{name:'집',width:32,height:40,draft:'1122×1402',colors:'32색과 투명',decision:'문이 다른 벽에 나와 다시 그리도록 요청했습니다. 수정한 이미지를 32×40으로 줄이고, 밑면 위치와 32색 팔레트를 맞췄습니다.'}
 };
 function selectSubject(key){
  const subject=subjects[key];
  if(!subject)return;
  const base='assets/pixel-mat/'+key+'/';
  root.querySelectorAll('[data-pm-subject]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pmSubject===key)));
  root.querySelectorAll('[data-pm-image]').forEach(image=>{
   const native=image.dataset.pmImage==='native';
   image.src=base+(native?'native':'draft')+'.png';
   image.alt=subject.name+(native?' 실제 '+subject.width+'×'+subject.height+' 픽셀 결과, 4배 확대':' AI 생성 초안');
   if(native){
    image.width=subject.width*4;image.height=subject.height*4;
    image.style.setProperty('--pm-width',subject.width*4+'px');
    image.style.setProperty('--pm-height',subject.height*4+'px');
   }
  });
  root.querySelector('[data-pm-draft-size]').textContent=subject.draft;
  root.querySelector('[data-pm-size]').textContent=subject.width+'×'+subject.height+' / '+subject.colors;
  root.querySelector('[data-pm-decision]').textContent=subject.decision;
  root.querySelectorAll('[data-pm-download]').forEach(link=>link.href=base+link.dataset.pmDownload);
  root.querySelector('#pm-comparison-status').textContent=subject.name+' 비교, '+subject.width+'×'+subject.height+' 픽셀';
 }
 root.querySelectorAll('[data-pm-subject]').forEach(button=>button.addEventListener('click',()=>selectSubject(button.dataset.pmSubject)));
 selectSubject('citizen');
})();
