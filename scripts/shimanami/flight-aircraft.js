import {aircraftToWorld} from './flight-model.js';

// Clean explanatory geometry fitted to the original Lun FBX proportions.
// Omit windows, antennae and panel lines; retain its exterior color regions.
export const aircraftTriangles=[];
const MATERIALS={hull:[132,140,146],silver:[220,226,229],
 'lower-blue':[102,145,187],'tail-accent':[192,62,85],engine:[105,120,132]};
function face(vertices,part){
 const points=vertices.map(([x,y,z])=>[x*1.8,y*1.8,(z+1.7)*1.8]);
 for(let i=1;i<points.length-1;i++)aircraftTriangles.push({points:[points[0],points[i],points[i+1]],rgb:MATERIALS[part],part});
}
function prism(outline,bottom,top,part){
 face(outline.map(([x,z])=>[x,top,z]),part);
 face(outline.map(([x,z])=>[x,bottom,z]).reverse(),part);
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length];
  face([[a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],top,b[1]],[a[0],top,a[1]]],part);
 }
}
// Preserve the native exterior length/span ratio (about 1.70) and narrow hull.
const sections=[[-39,.25,2.2,.35],[-34,1,1.8,1.3],[-26,2,1.3,2.4],
 [-14,2.9,1.1,3.1],[0,3.1,1.1,3.5],[16,3,1.1,3.6],
 [24,2.7,1.1,3.5],[30,1.9,1.2,2.9],[34,1,1.7,1.9],[36,.12,2.1,.3]];
const rings=sections.map(([z,w,y,h])=>Array.from({length:16},(_,i)=>{
 const a=i/16*Math.PI*2;return [Math.cos(a)*w,y+Math.sin(a)*h,z];
}));
for(let j=0;j<rings.length-1;j++)for(let i=0;i<16;i++){
 const a=i/16*Math.PI*2+Math.PI/16;
 const part=Math.sin(a)<-.38?'lower-blue':sections[j][0]>=24?'silver':'hull';
 face([rings[j][i],rings[j][(i+1)%16],rings[j+1][(i+1)%16],rings[j+1][i]],part);
}
face(rings[0].slice().reverse(),'hull');face(rings.at(-1),'silver');
// Short main wings and large elevated tailplane are characteristic of the Lun.
for(const side of [-1,1]){
 prism([[side*2,11],[side*22,6],[side*22,-5],[side*2,-7]],-.4,.35,'silver');
 prism([[side*21,6.2],[side*22.4,5.8],[side*22.4,-5.2],[side*21,-5.2]],-.8,.25,'lower-blue');
 prism([[side*.7,-28],[side*22,-34.2],[side*22,-39],[side*.7,-38]],14.3,14.85,'silver');
}
// Build the two red bands into the fin surface rather than overlaying linework.
const finLevels=[2.5,7,8.5,10.5,12,14.5,18];
const finPoint=(height,side)=>[side*.48,height,-25-(height-2.5)*.57];
const finBack=(height,side)=>[side*.48,height,-39+(height-2.5)*.08];
for(let i=0;i<finLevels.length-1;i++){
 const a=finLevels[i],b=finLevels[i+1],part=i===1||i===3?'tail-accent':'hull';
 for(const side of [-1,1])face([finPoint(a,side),finBack(a,side),finBack(b,side),finPoint(b,side)],part);
 face([finPoint(a,-1),finPoint(a,1),finPoint(b,1),finPoint(b,-1)],part);
 face([finBack(a,-1),finBack(a,1),finBack(b,1),finBack(b,-1)],part);
}
face([finPoint(18,-1),finPoint(18,1),finBack(18,1),finBack(18,-1)],'hull');
// Eight smooth, closed nacelles use the original fan spacing and forward position.
prism([[-11.5,22.5],[11.5,22.5],[11.5,25],[-11.5,25]],2.6,3.2,'silver');
for(const x of [-10.55,-8.17,-5.8,-3.43,3.43,5.8,8.17,10.55]){
 const engineRings=[[21.2,.78],[22.5,1.06],[26.5,1.06],[27.3,.93]].map(([z,r])=>Array.from({length:16},(_,i)=>{
  const a=i/16*Math.PI*2;return [x+Math.cos(a)*r,4+Math.sin(a)*r,z];
 }));
 face(engineRings[0].slice().reverse(),'engine');face(engineRings.at(-1),'engine');
 for(let j=0;j<engineRings.length-1;j++)for(let i=0;i<16;i++)face([
  engineRings[j][i],engineRings[j][(i+1)%16],engineRings[j+1][(i+1)%16],engineRings[j+1][i]
 ],'silver');
}

// Camera depth is orthogonal to both screen projection rows in flight-view.js.
export function cameraDepth([x,y,z]){return .866*Math.SQRT1_2*(x-z)+.5*y;}
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
// Broad soft lighting keeps the pale material colors readable without heavy shadows.
function shadedMaterial(points,base){
 const [a,b,c]=points,u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
 let nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];
 const length=Math.hypot(nx,ny,nz)||1;nx/=length;ny/=length;nz/=length;
 // Two-sided normals keep mirrored mesh parts consistently lit.
 if(.866*Math.SQRT1_2*(nx-nz)+ny*.5<0){nx=-nx;ny=-ny;nz=-nz;}
 const lightLength=Math.hypot(-.35,.88,-.32);
 const diffuse=Math.max(0,(-.35*nx+.88*ny-.32*nz)/lightLength);
 const intensity=.88+.16*diffuse;
 return base.map(channel=>Math.min(255,Math.round(channel*intensity)));
}
export function projectedAircraft(pose,project){
 return aircraftTriangles.map(t=>{
  const world=t.points.map(p=>aircraftToWorld(p,pose));
  const points=world.map(q=>{const s=project(q);return [s[0],s[1],cameraDepth(q)];});
  return {...t,points,rgb:shadedMaterial(world,t.rgb)};
 });
}
// Rasterize only the aircraft's small bounding rectangle, capped by the view DPR.
export function createAircraftRenderer(){
 const surface=document.createElement('canvas'),context=surface.getContext('2d');
 let buffer,depth,w=0,h=0;
 return (ctx,pose,project,dpr)=>{
  const sampleRatio=Math.max(2,dpr);
  const triangles=projectedAircraft(pose,project);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const triangle of triangles)for(const [x,y] of triangle.points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  const left=Math.floor(minX-2),top=Math.floor(minY-2);
  const nextW=Math.ceil((maxX-left+2)*sampleRatio),nextH=Math.ceil((maxY-top+2)*sampleRatio);
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
