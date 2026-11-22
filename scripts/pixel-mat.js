'use strict';
(() => {
 const root=document.getElementById('pixel-mat');
 if(!root)return;
 const subjects={
  citizen:{name:'시민',width:16,height:16,draft:'1254 × 1254',description:'16 × 16px · PPU 16'},
  tree:{name:'나무',width:24,height:32,draft:'1086 × 1448',description:'24 × 32px · PPU 16'},
  house:{name:'집',width:32,height:40,draft:'1122 × 1402',description:'32 × 40px · PPU 16'}
 };
 let current='citizen',scale=8;
 function render(){
  const subject=subjects[current],base='assets/pixel-mat/'+current+'/';
  root.querySelectorAll('[data-pm-subject]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pmSubject===current)));
  root.querySelectorAll('[data-pm-scale]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.pmScale)===scale)));
  root.querySelectorAll('[data-pm-image]').forEach(img=>{
   const kind=img.dataset.pmImage;
   img.src=base+kind+'.png';
   img.alt=subject.name+' '+({draft:'이미지 생성 원본',baseline:'기존 Miniworld 리소스',native:'Pixel Mat 스킬 결과'}[kind]);
   if(kind!=='draft'){
    const factor=img.closest('.pm-native-row')?1:scale;
    img.width=subject.width*factor;img.height=subject.height*factor;
   }
  });
  root.querySelectorAll('[data-pm-size]').forEach(node=>node.textContent=subject.description);
  root.querySelector('[data-pm-draft-size]').textContent=subject.draft+'px';
  root.querySelectorAll('[data-pm-download]').forEach(link=>link.href=base+link.dataset.pmDownload);
  root.querySelector('#pm-comparison-status').textContent=subject.name+' 비교 · '+subject.description+' · 확대 '+scale+'배';
 }
 root.querySelectorAll('[data-pm-subject]').forEach(button=>button.addEventListener('click',()=>{current=button.dataset.pmSubject;render();}));
 root.querySelectorAll('[data-pm-scale]').forEach(button=>button.addEventListener('click',()=>{scale=Number(button.dataset.pmScale);render();}));
 render();
})();
