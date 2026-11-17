// Coordinate demonstration, not a port of the flight dynamics or a benchmark.
export const TILE_SIZE=10000;
export function splitCoordinate(value){
 const tile=Math.floor((value+TILE_SIZE/2)/TILE_SIZE);
 return {tile,local:value-tile*TILE_SIZE};
}
// Continuous one-axis journey, with holds on either side of the tile boundary.
export function coordinateFrame(time){
 const duration=18,cycle=Math.floor(time/duration),phase=time-cycle*duration;
 let offset;
 if(phase<6)offset=phase/6*4000;
 else if(phase<8)offset=4000+(phase-6)/2*990;
 else if(phase<9.25)offset=4990;
 else if(phase<10.25)offset=4990+(phase-9.25)*20;
 else if(phase<11.75)offset=5010;
 else offset=5010+(phase-11.75)/6.25*4990;
 const world=cycle*TILE_SIZE+offset,position=splitCoordinate(world);
 return {world,...position,step:phase>=6&&phase<13.5?2:1};
}
export function remoteTarget(receivedTile,local,displayedTile){return local+(receivedTile-displayedTile)*TILE_SIZE;}
// External tracking view: inverse of worldToAircraft, without translation.
export function aircraftToWorld([x,y,z],pose){
 const cr=Math.cos(pose.roll),sr=Math.sin(pose.roll),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch),cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw);
 const a=cr*x-sr*y,b=sr*x+cr*y,c=cp*b+sp*z,d=-sp*b+cp*z;
 return [cy*a+sy*d,c,-sy*a+cy*d];
}
// Inverse flight pose: world -> aircraft reference frame. Y is up, Z is forward.
export function worldToAircraft(p,pose){
 const x=p[0]-pose.x,y=p[1]-pose.altitude,z=p[2]-pose.z;
 const cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw);
 const xx=cy*x-sy*z,zz=sy*x+cy*z;
 const cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
 const yy=cp*y-sp*zz,zzz=sp*y+cp*zz;
 const cr=Math.cos(pose.roll),sr=Math.sin(pose.roll);
 return [cr*xx+sr*yy,-sr*xx+cr*yy,zzz];
}
export class FlightDemo{
 constructor(){this.time=0;this.x=4300;this.z=4300;this.yaw=.32;this.pitch=.025;this.roll=0;this.altitude=650;}
 step(dt){
  this.time+=dt;
  this.yaw=.32+this.time*.115+.22*Math.sin(this.time*.2);
  this.roll=-.16-.06*Math.cos(this.time*.2);
  this.pitch=.10*Math.sin(this.time*.23);
  this.altitude=650+110*Math.sin(this.time*.23);
  this.x+=Math.sin(this.yaw)*1050*dt;this.z+=Math.cos(this.yaw)*1050*dt;
 }
 get phase(){return '오른쪽 선회';}
}
