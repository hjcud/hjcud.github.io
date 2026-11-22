'use strict';
(() => {
 const root=document.getElementById('pixel-mat');
 if(!root)return;
 const subjects={
  citizen:{name:'시민',width:16,height:16,draft:'1254 × 1254',description:'16 × 16px · PPU 16',colors:'10,836개 RGBA 값 → 8색 + 투명',issue:'16×16으로 옮긴 첫 결과에서 머리 위치가 달라지고 양발이 붙었습니다. 생성된 디테일을 그대로 축소하는 것만으로는 작은 캐릭터의 형태를 유지하기 어려웠습니다.',decision:'호스트가 작성한 46셀 수정안으로 머리 위치와 발 사이 간격을 조정하고, 기존 게임의 8색 팔레트에 맞췄습니다. 수정은 지정한 영역 안에서 검증한 뒤 적용했습니다.',outcome:'16×16·8색과 발 기준점을 맞춘 정적 리소스를 얻었습니다. 얼굴과 손의 세부 표현은 여전히 제한적이며, 걷기 동작과 다른 방향은 추가 제작이 필요합니다.'},
  tree:{name:'나무',width:24,height:32,draft:'1086 × 1448',description:'24 × 32px · PPU 16',colors:'22,571개 RGBA 값 → 15색 + 투명',issue:'고해상도 잎의 질감을 작은 격자에 옮겨야 했습니다. 팔레트를 더 줄여 본 결과에서는 잎 덩어리의 구분이 평평해졌습니다.',decision:'기존 나무의 점유 영역과 줄기 밑면에 맞춰 샘플링한 뒤, 색을 더 줄인 결과 대신 15색 결과를 선택했습니다. 최소 색 수보다 작은 화면에서의 덩어리 구분을 우선했습니다.',outcome:'24×32·15색의 변형 나무를 만들고 기존 지면 기준에 맞췄습니다. 정적 배치까지만 검토했으며, 게임 안에서의 가림과 충돌은 별도 확인이 필요합니다.'},
  house:{name:'집',width:32,height:40,draft:'1122 × 1402',description:'32 × 40px · PPU 16',colors:'62,413개 RGBA 값 → 32색 + 투명',issue:'첫 생성에서는 문이 의도한 방향과 다른 벽에 나왔습니다. 이미지의 시점과 구조가 게임에서 필요한 배치 조건에 맞는지 먼저 판단해야 했습니다.',decision:'문이 놓일 벽을 수정하도록 두 번째 이미지를 요청했습니다. 보정된 초안을 32×40으로 옮기고 밑면을 정렬한 뒤, 픽셀 형태와 투명도는 유지하면서 63색을 32색으로 줄였습니다.',outcome:'32×40·32색의 편집 가능한 건물 리소스를 얻었습니다. 생성 방향의 수정과 색 정리를 각각 나눠 처리했으며, 기존 건물과 구조가 완전히 같다는 의미는 아닙니다.'}
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
  root.querySelector('[data-pm-dimensions]').textContent=subject.draft+' → '+subject.width+' × '+subject.height+'px';
  root.querySelector('[data-pm-colors]').textContent=subject.colors;
  for(const key of ['issue','decision','outcome'])root.querySelector('[data-pm-'+key+']').textContent=subject[key];
  root.querySelectorAll('[data-pm-download]').forEach(link=>link.href=base+link.dataset.pmDownload);
  root.querySelector('#pm-comparison-status').textContent=subject.name+' 비교 · '+subject.description+' · 확대 '+scale+'배';
 }
 root.querySelectorAll('[data-pm-subject]').forEach(button=>button.addEventListener('click',()=>{current=button.dataset.pmSubject;render();}));
 root.querySelectorAll('[data-pm-scale]').forEach(button=>button.addEventListener('click',()=>{scale=Number(button.dataset.pmScale);render();}));
 render();
 const complex=root.querySelector('#pixel-mat-complex');
 if(complex)complex.querySelectorAll('[data-pm-whole-strategy]').forEach(button=>button.addEventListener('click',()=>{
  const region=button.dataset.pmWholeStrategy==='region',name=region?'whole-region':'whole-median',base='assets/pixel-mat/whole-comparison/';
  complex.querySelectorAll('[data-pm-whole-strategy]').forEach(control=>control.setAttribute('aria-pressed',String(control===button)));
  complex.querySelectorAll('[data-pm-whole-image]').forEach(img=>{img.src=base+name+'.png';if(!img.dataset.pmOriginalAlt)img.dataset.pmOriginalAlt=img.alt;img.alt=region?'영역 배정 베타 · '+img.dataset.pmOriginalAlt.replace('중앙 대표색','영역 배정'):img.dataset.pmOriginalAlt;});
  complex.querySelector('[data-pm-whole-project]').href=base+name+'.pixeltool';
  complex.querySelector('[data-pm-whole-png]').href=base+name+'.png';
  complex.querySelector('[data-pm-whole-label]').textContent=region?'세부 설정 · 영역 배정 (베타)':'최신 스킬 · 중앙 대표색 (기본)';
  complex.querySelector('[data-pm-whole-caption]').textContent=region?'같은 생성 보드를 구조 기반으로 변환한 16×16·13개 RGBA 값의 베타 결과입니다. 새 이미지 생성이나 픽셀 덧그리기는 하지 않았습니다.':'같은 사용자 요청에 스킬 지침을 추가해 생성하고, 공유 변환 코드로 16×16·16개 RGBA 값으로 확정했습니다. 얼굴과 랜턴의 세부 표현은 줄었습니다.';
 }));
 if(complex)complex.querySelectorAll('[data-pm-complex-scale]').forEach(button=>button.addEventListener('click',()=>{
  const scale=Number(button.dataset.pmComplexScale);
  complex.querySelectorAll('[data-pm-complex-scale]').forEach(control=>control.setAttribute('aria-pressed',String(control===button)));
  complex.querySelectorAll('[data-pm-complex-native]').forEach(img=>{img.width=16*scale;img.height=16*scale;});
 }));
})();
