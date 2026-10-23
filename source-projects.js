'use strict';
(() => {
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const slides={
  hinasaki:[
   ['hinasaki/teardrop-apollo.webp','눈물 셰이더 사용 예시','hinasaki/teardrop-apollo.gif','hinasaki-0']
  ],
  'hinasaki-controls':[
   ['hinasaki/teardrop-controls.webp','머티리얼 조정','hinasaki/teardrop-controls.gif','hinasaki-1']
  ],
  'hinasaki-uv':[
   ['hinasaki/teardrop-uv-preview.webp','UV 미리보기','hinasaki/teardrop-uv-preview.gif','hinasaki-2']
  ]
 };
 document.querySelectorAll('[data-source-gallery]').forEach(gallery=>{
  const key=gallery.dataset.sourceGallery,items=slides[key];
  const img=gallery.querySelector('img'),expand=gallery.querySelector('[data-gallery]');
  const play=gallery.querySelector('[data-source-play]');
  let index=0,visible=false,wantsPlay=!motion.matches;
  function render(announce=false){
   const [still,caption,gif]=items[index];
   const playing=!!gif&&wantsPlay&&visible&&!document.hidden;
   const source='assets/'+(playing?gif:still);
   if(img.getAttribute('src')!==source)img.src=source;
   img.alt=caption;
   expand.dataset.gallery=items[index][3]||key+'-'+index;
   expand.setAttribute('aria-label',caption+' 크게 보기');
   const captionElement=gallery.querySelector('[data-source-caption]');
   if(captionElement)captionElement.textContent=caption;
   const count=gallery.querySelector('[data-source-count]');
   if(count)count.textContent=(index+1)+' / '+items.length;
   if(play){play.textContent=playing?'멈춤':'재생';play.setAttribute('aria-pressed',String(playing));play.setAttribute('aria-label',caption+(playing?' GIF 멈춤':' GIF 재생'));}
   if(announce)gallery.querySelector('[data-source-status]').textContent=caption+', '+(index+1)+' / '+items.length;
  }
  function show(delta){index=(index+delta+items.length)%items.length;render(true);}
  gallery.querySelector('[data-source-prev]')?.addEventListener('click',()=>show(-1));
  gallery.querySelector('[data-source-next]')?.addEventListener('click',()=>show(1));
  gallery.addEventListener('keydown',event=>{if(items.length>1&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();show(event.key==='ArrowLeft'?-1:1);}});
  if(play)play.addEventListener('click',()=>{wantsPlay=!wantsPlay;render();});
  if(items.some(item=>item[2])){
   new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;render();},{threshold:.1}).observe(gallery);
   document.addEventListener('visibilitychange',()=>render());
   motion.addEventListener('change',()=>{wantsPlay=!motion.matches;render();});
  }
  render();
 });
})();
