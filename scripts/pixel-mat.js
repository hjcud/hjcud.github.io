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
  root.querySelector('[data-pm-zoom-image]').setAttribute('href',base+'.png');
  root.querySelector('[data-pm-preferred-name]').textContent=key==='median'?'Whole-chip central median':'Region allocation (베타)';
  image.alt=(key==='median'?'중앙 대표색':'영역 배정 베타')+'으로 변환한 실제 16×16 캐릭터 결과';
 }));
})();
