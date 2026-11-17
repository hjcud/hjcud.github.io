import {aircraftToWorld} from './flight-model.js';

// Small, closed convex parts. Triangles are baked once, not sorted every frame.
// Per-pixel depth avoids intersecting wings/fuselage changing painter order.
export const aircraftTriangles=[];
const AIRCRAFT_RGB=[134,164,184];
function face(points,part){
 const p=points.map(v=>v.map(n=>n*1.4));
 const rgb=AIRCRAFT_RGB;
 for(let i=1;i<p.length-1;i++)aircraftTriangles.push({points:[p[0],p[i],p[i+1]],rgb,part});
}
function prism(outline,bottom,top,part){
 face(outline.map(([x,z])=>[x,top,z]),part);
 face(outline.map(([x,z])=>[x,bottom,z]).reverse(),part);
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length];
  face([[a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],top,b[1]],[a[0],top,a[1]]],part);
 }
}
// Rounded, tapered hull with a boat-like underside instead of a flat slab.
const sections=[[-40,.8,0,1],[-34,4,1,3.5],[-24,6.4,1.5,5.5],[-8,7.2,1.7,6.5],[14,7,1.7,6.6],[25,6.4,1.5,6.2],[34,4.8,1,4.8],[41,2.4,0,2.5],[44,.5,-.4,.8]];
const hullRings=sections.map(([z,w,y,h])=>Array.from({length:12},(_,i)=>{
 const a=i/12*Math.PI*2;return [Math.cos(a)*w,y+Math.sin(a)*h,z];
}));
for(let j=0;j<hullRings.length-1;j++)for(let i=0;i<12;i++){
 face([hullRings[j][i],hullRings[j][(i+1)%12],hullRings[j+1][(i+1)%12],hullRings[j+1][i]],'hull');
}
face(hullRings[0].slice().reverse(),'hull');
face(hullRings.at(-1),'hull');
// Separate convex wings prevent a triangle fan from filling the concave gap.
prism([[-6,4],[-47,-12],[-47,-20],[-6,-14]],0,2,'wing');
prism([[6,4],[47,-12],[47,-20],[6,-14]],0,2,'wing');
prism([[-3,-26],[-21,-31],[-21,-37],[21,-37],[21,-31],[3,-26]],19,21,'tail');
// Closed fin with both sides, leading/trailing edges and thickness.
const fin=[[5,-25],[19,-28],[19,-37],[3,-38]];
face(fin.map(([y,z])=>[-1.4,y,z]),'tail');
face(fin.map(([y,z])=>[1.4,y,z]),'tail');
for(let i=0;i<fin.length;i++){
 const a=fin[i],b=fin[(i+1)%fin.length];
 face([[-1.4,...a],[1.4,...a],[1.4,...b],[-1.4,...b]],'tail');
}
prism([[-32,19],[32,19],[32,23],[-32,23]],1,4,'engine-mount');
for(const x of [-29,-22,-15,-8,8,15,22,29]){
 const ring=z=>Array.from({length:8},(_,i)=>[x+Math.cos(i*Math.PI/4)*2.7,6+Math.sin(i*Math.PI/4)*2.7,z]);
 const a=ring(18),b=ring(28);
 face(a,'engine');face(b,'engine');
 for(let i=0;i<8;i++)face([a[i],a[(i+1)%8],b[(i+1)%8],b[i]],'engine');
}

// Camera depth is orthogonal to both screen projection rows in flight-view.js.
export function cameraDepth([x,y,z]){return .433*x+.5*y-.75*z;}
const edge=(a,b,x,y)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
export function rasterizeTriangle(vertices,rgb,width,height,pixels,depth,ids,id){
 const [a,b,c]=vertices,area=edge(a,b,c[0],c[1]);
 if(Math.abs(area)<1e-7)return;
 const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
 const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const u=edge(b,c,x+.5,y+.5)/area,v=edge(c,a,x+.5,y+.5)/area,w=1-u-v;
  if(u<-.000001||v<-.000001||w<-.000001)continue;
  const z=u*a[2]+v*b[2]+w*c[2],at=y*width+x;
  if(z<=depth[at])continue;
  depth[at]=z;if(ids)ids[at]=id;
  const offset=at*4;pixels[offset]=rgb[0];pixels[offset+1]=rgb[1];pixels[offset+2]=rgb[2];pixels[offset+3]=255;
 }
}
export function projectedAircraft(pose,project){
 return aircraftTriangles.map(t=>({...t,points:t.points.map(p=>{const q=aircraftToWorld(p,pose),s=project(q);return [s[0],s[1],cameraDepth(q)];})}));
}
// Rasterize only the aircraft's small bounding rectangle, capped by the view DPR.
export function createAircraftRenderer(){
 const surface=document.createElement('canvas'),context=surface.getContext('2d');
 let buffer,depth,w=0,h=0;
 return (ctx,pose,project,dpr)=>{
  const sampleRatio=Math.max(2,dpr);
  const triangles=projectedAircraft(pose,project),points=triangles.flatMap(t=>t.points);
  const left=Math.floor(Math.min(...points.map(p=>p[0]))-2),top=Math.floor(Math.min(...points.map(p=>p[1]))-2);
  const nextW=Math.ceil((Math.max(...points.map(p=>p[0]))-left+2)*sampleRatio),nextH=Math.ceil((Math.max(...points.map(p=>p[1]))-top+2)*sampleRatio);
  // Use a fixed allocation bucket to avoid reallocating ImageData on every angle.
  const bucketW=Math.ceil(nextW/32)*32,bucketH=Math.ceil(nextH/32)*32;
  if(bucketW>w||bucketH>h){w=Math.max(w,bucketW);h=Math.max(h,bucketH);surface.width=w;surface.height=h;buffer=context.createImageData(w,h);depth=new Float64Array(w*h);}
  buffer.data.fill(0);depth.fill(-Infinity);
  for(const t of triangles)rasterizeTriangle(t.points.map(([x,y,z])=>[(x-left)*sampleRatio,(y-top)*sampleRatio,z]),t.rgb,w,h,buffer.data,depth);
  context.putImageData(buffer,0,0);
  ctx.drawImage(surface,0,0,nextW,nextH,left,top,nextW/sampleRatio,nextH/sampleRatio);
  return {left,top,width:nextW/sampleRatio,height:nextH/sampleRatio};
 };
}
