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
  image.alt=(key==='median'?'중앙 대표색':'영역 배정 베타')+'으로 변환한 실제 16×16 캐릭터 결과';
  root.querySelector('[data-pm-preferred-png]').href=base+'.png';
  root.querySelector('[data-pm-preferred-project]').href=base+'.pixeltool';
 }));
 const subjects={
  citizen:{name:'시민',width:16,height:16,draft:'1254×1254',colors:'8색과 투명',decision:'머리 위치와 발 사이 간격을 호스트가 작성한 픽셀 수정안으로 조정하고, 게임의 8색 팔레트와 지면 기준에 맞췄습니다.'},
  tree:{name:'나무',width:24,height:32,draft:'1086×1448',colors:'15색과 투명',decision:'줄기 밑면을 게임의 지면 기준에 맞췄습니다. 색을 더 줄인 안은 잎 덩어리의 구분이 사라져, 15색 결과를 선택했습니다.'},
  house:{name:'집',width:32,height:40,draft:'1122×1402',colors:'32색과 투명',decision:'다른 벽에 나온 문을 다시 생성하도록 요청했습니다. 보정한 초안의 밑면을 정렬하고, 픽셀 형태와 투명도를 유지하며 32색으로 줄였습니다.'}
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
