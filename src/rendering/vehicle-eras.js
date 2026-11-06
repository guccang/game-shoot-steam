// 图集只含空车和马蹄，骑手与枪械始终复用正式角色绘制器。
import {eraVehicle,eraHullScale,ERA_FIRST} from '../config/vehicle-eras.js';
import horse from '../../assets/vehicle-eras/horse.json' with {type:'json'};
let atlas,pony,loading;
// 原图尺寸和图集格数不匹配时终止启动，防止漏画部件。
async function decodeSheet(file,w,h){
 const image=new Image();image.src=new URL('../../assets/vehicle-eras/'+file,import.meta.url).href;
 await image.decode();
 if(image.width!==w||image.height!==h)throw Error('升阶载具图集尺寸无效：'+file);
 return image;
}
// 按需解码同一张图集，首次加载失败明确报告缺失素材。
export function loadEraAtlas(){
 if(!loading){
  const rows=Math.ceil(horse.sourceFrames.length/horse.columns);
  loading=Promise.all([decodeSheet('front.webp',1280,960),decodeSheet(horse.file,horse.columns*horse.cell[0],rows*horse.cell[1])])
   .then(([body,animal])=>{atlas=body;pony=animal;});
 }
 return loading;
}
// 身体露出至真实车沿，形成前后遮挡；不按材质裁切脸或枪。
export function clipEraSeat(c,point,vehicle){
 const m=vehicle.active&&eraVehicle(vehicle.index);if(!m)return;
 const s=eraHullScale(m),edge=point.y+(m.edge-176)*s,bend=(m.bend||0)*s;
 c.beginPath();c.moveTo(point.x-150,point.y-220);c.lineTo(point.x+150,point.y-220);c.lineTo(point.x+150,edge);
 for(let dx=28;dx>=-28;dx-=2)c.lineTo(point.x+dx*s,edge+bend*(1-(dx/28)**2));
 c.lineTo(point.x-150,edge);c.closePath();c.clip();
}
// 裁掉底稿左右两块旧踏板，固定车叉、前轮和挡泥板仍使用原画。
function clipBicycleFrame(c,bike){
 const [left,right]=bike.axles;
 c.beginPath();c.rect(0,0,250,250);
 c.rect(1,bike.axisY-11,left-1,23);c.rect(right,bike.axisY-11,249-right,23);
 c.clip('evenodd');
}
// 从正面看到的胎纹在轮顶和接地点收窄，两端自然滚入背面。
function drawBicycleDrive(c,bike,phase,ridden){
 const [top,bottom]=bike.tire,cy=(top+bottom)/2,radius=(bottom-top)/2;
 c.lineCap='round';c.lineJoin='round';
 for(let i=0;i<12;i++){
  const angle=phase+i*Math.PI/6,depth=Math.cos(angle);
  if(depth<=0)continue;
  const y=cy+Math.sin(angle)*radius,w=3+4*depth;
  c.strokeStyle='#51483e';c.lineWidth=1.5+1.6*depth;
  c.beginPath();c.moveTo(125-w,y-1.7*depth);c.lineTo(125,y+1.7*depth);c.lineTo(125+w,y-1.7*depth);c.stroke();
 }
 for(let i=0;i<2;i++){
  const side=i===0?-1:1,angle=phase+i*Math.PI,hub=bike.axles[i];
  const x=bike.pedals[i]+side*3*Math.cos(angle),y=bike.axisY+16*Math.sin(angle);
  c.beginPath();c.moveTo(hub,bike.axisY);c.lineTo(x-side*7,y);
  c.strokeStyle='#554d3c';c.lineWidth=6;c.stroke();c.strokeStyle=bike.trim;c.lineWidth=2.5;c.stroke();
  c.beginPath();c.roundRect(x-10,y-3,20,7,2.5);c.fillStyle=bike.trim;c.fill();c.strokeStyle='#554d3c';c.lineWidth=2;c.stroke();
  if(ridden){c.beginPath();c.ellipse(x,y-4,5.8,4.5,0,0,2*Math.PI);c.fillStyle='#efc787';c.fill();c.lineWidth=1.5;c.stroke();}
 }
}
// 轮纹随路程滚动；挽马播放同源待机及步行片段，接触点独立于车厢。
function drawRunningGear(c,m,vehicle,time,reduced){
 const phase=vehicle.wheelPhase||0;
 if(m.bike){drawBicycleDrive(c,m.bike,phase,vehicle.active);return;}
 for(const [x,y] of m.wheels){
  c.save();c.beginPath();c.ellipse(x,y,4.2,9,0,0,Math.PI*2);c.clip();c.strokeStyle='#a89875';c.lineWidth=1.35;
  const offset=((phase*5)%6+6)%6;
  for(let j=-13;j<12;j+=6){c.beginPath();c.moveTo(x-4,y+j+offset);c.lineTo(x,y+j+offset+2);c.lineTo(x+4,y+j+offset);c.stroke();}c.restore();
 }
 if(m.horse){
  const frame=vehicle.active&&!reduced?(vehicle.horseFrame??0):horse.idle[reduced?0:Math.floor(time*horse.fps)%horse.idle.length];
  const [w,h]=horse.cell,[ax,ay]=horse.anchor,k=m.horse.scale;
  c.drawImage(pony,frame%horse.columns*w,Math.floor(frame/horse.columns)*h,w,h,125-ax*k,m.horse.baseline-ay*k,w*k,h*k);
 }
}
// 空车停驻、行驶和车库图标共用一张底稿，部件相位只来自行程。
export function drawEraHull(c,m,vehicle,front=false,time=0,reduced=false){
 if(!atlas?.complete||!atlas.naturalWidth){loadEraAtlas();return;}
 const i=m.index-ERA_FIRST,s=eraHullScale(m);c.save();c.scale(s,s);c.translate(-125,-176);
 if(!front){
  c.fillStyle='#384b3627';c.beginPath();c.ellipse(125,219,m.bike?44:81,12,0,0,2*Math.PI);c.fill();
  if(m.bike)clipBicycleFrame(c,m.bike);
  c.drawImage(atlas,(i%4)*320,Math.floor(i/4)*320,320,320,0,0,250,250);
 }else drawRunningGear(c,m,vehicle,time,reduced);
 c.restore();
}
// 小图完整居中展示空车，驻车时不内嵌角色。
export function drawEraIcon(c,m){
 if(!atlas?.naturalWidth){loadEraAtlas().then(()=>{if(c.canvas.dataset?.eraIcon===m.id)drawEraIcon(c,m);});return;}
 // 图标以原画视框居中，避免战场缩比使手机列表里的车型难以辨认。
 c.clearRect(0,0,c.canvas.width,c.canvas.height);
 const iconScale=Math.min(c.canvas.width,c.canvas.height)/260,s=iconScale/eraHullScale(m);
 c.save();c.translate(c.canvas.width/2,c.canvas.height/2+51*iconScale);c.scale(s,s);
 drawEraHull(c,m,{});drawEraHull(c,m,{},true);c.restore();
}
