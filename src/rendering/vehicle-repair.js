import {repairParkingSpot} from '../config/repair-parking.js';
import {clipGarageOpening,drawGarage,drawGarageGround} from './garage.js';
import {campBuildingCache} from './camp-building-cache.js';
import {GARAGE} from '../world/workshop.js';
import {drawWheel} from './pine-wheels.js';
import {nearest} from '../world/coordinates.js';
// 维修建筑、残骸与拖车直接进入正式世界深度队列，不创建替代预览画面。
import {REPAIR_CENTER,rescueTruckVisible,towLoadPoint,VEHICLE_REPAIR as C} from '../config/vehicle-repair.js';
import {personalFleet} from '../core/vehicle-repair.js';
import {drawParkedHull} from './parked-vehicles.js';
import {box,oval,poly} from './primitives.js';
// 在两个模拟步之间显示同一辆救援车。车轮、绞盘及载台上的残骸共享这个姿态。
function rescueTruckObject(game,hull,order){
 const item={...order.truck,type:'repair-tow',hull,order};
 const previous=game.rescueHistory?.get(hull),alpha=game.rescueAlpha;
 if(!previous||alpha>=1||previous.phase!==order.phase)return item;
 const start=nearest(previous,order.truck),dx=item.x-start.x,dy=item.y-start.y;
 if(Math.hypot(dx,dy)>120)return item;
 item.x=start.x+dx*alpha;
 item.y=start.y+dy*alpha;
 item.order={...order,wheel:previous.wheel+(order.wheel-previous.wheel)*alpha,timer:previous.timer+(order.timer-previous.timer)*alpha};
 return item;
}
// 同一个订单只生成一辆残骸；挂钩前保留原地，拖运后与拖板一起移动。
export function vehicleServiceObjects(game){
 if(!personalFleet(game)||game.cottage)return [];
 const objects=game.mapId==='forest'?[
  {...REPAIR_CENTER,type:'repair-center-back',depthOffset:-184},
  {...REPAIR_CENTER,type:'repair-center'},
 ]:[];
 for(const [hull,r] of (game.progress.vehicleService||[]).entries()){
  if(!r?.phase||r.mapId!==game.mapId)continue;
  if(['wrecked','outbound'].includes(r.phase))objects.push({...(game.progress.logistics?.tow?.target===hull&&game.towedPosition||r.position),type:'repair-wreck',hull});
  if(rescueTruckVisible(r.phase))objects.push(rescueTruckObject(game,hull,r));
  const spot=repairParkingSpot(r);if(spot)objects.push({...spot,type:'repair-bay',hull,order:r});
 }
 return objects;
}
// 裂痕、松脱侧板与低矮烟气覆盖原装车壳，保留车型与独立炮塔识别。
export function drawWreckDamage(c,x,y,time=0){
 c.save();c.translate(x,y);oval(c,0,0,37,10,'#3c4f4266');
 c.strokeStyle='#344c42';c.lineWidth=2.5;c.lineJoin='round';c.beginPath();c.moveTo(-17,-32);c.lineTo(-7,-22);c.lineTo(-15,-15);c.lineTo(0,-7);c.moveTo(14,-36);c.lineTo(7,-23);c.lineTo(19,-19);c.stroke();
 box(c,20,-4,16,7,2,'#a0aa8c','#3c5946',1.5);
 for(let i=0;i<3;i++){const t=(time*.35+i/3)%1;c.globalAlpha=(1-t)*.42;oval(c,10+Math.sin(t*4)*5,-35-t*28,5+t*8,4+t*6,'#6b766b');}
 c.restore();
}
// 仅在屋顶或门柱实际挡住猫时淡出前景，靠近门口时保持门洞清晰。
function repairFacadeOpacity(site,player){
 if(!player||player.flying)return 1;
 const x=Math.abs(player.x-site.x),y=player.y-site.y;
 const behindFrame=Math.max((GARAGE.bayTop+54-y)/18,(x+22-GARAGE.bayHalf)/18);
 const overlap=Math.max(0,Math.min(1,behindFrame,(136-x)/20,(y+182)/16,-y/12));
 return 1-.75*overlap*overlap*(3-2*overlap);
}
// 两层采同一张立面，避免门洞与前景出现轮廓或颜色偏差。
function paintRepairFacade(c){drawGarage(c,false,{label:'载具维修中心',repair:true});}
// 内壁与坡道在猫身后。遮挡时先铺完整底图，再叠前景，只在角色轮廓内透显。
function drawCenter(c,item,player){
 const back=item.type==='repair-center-back',opacity=repairFacadeOpacity(item,player);
 c.save();
 c.translate(item.x,item.y);
 if(back)drawGarageGround(c);
 else c.globalAlpha*=opacity;
 if(!back||opacity===1)clipGarageOpening(c,{x:0,y:0},!back);
 campBuildingCache.draw(c,'repair-facade',[-136,-184,272,208],paintRepairFacade);
 c.restore();
}
// 车头固定朝下；四轮复用现有载具胎纹，后载台与短驾驶室分层绘制。
function drawTow(c,item,game){
 const r=item.order,edge='#345646',load=towLoadPoint({...r,truck:item});
 c.save();c.translate(item.x,item.y);oval(c,2,-30,54,68,'#304b3c28');
 box(c,-42,-94,84,119,7,'#566f5d',edge,2);
 for(const y of [-76,17])for(const x of [-45,45])drawWheel(c,x,y,r.wheel||0);
 // 短平板从后坡板延伸至驾驶室后侧，正面透视与消防车的长水箱一致。
 box(c,-43,-108,86,83,5,'#8d9f86',edge,2);
 box(c,-36,-102,72,70,3,'#bdc5a7',edge,1.5);
 for(let y=-94;y<-35;y+=12)box(c,-32,y,64,2,0,'#91a58a');
 for(const x of [-43,38])box(c,x,-102,5,70,2,'#d8cf9e',edge,1.1);
 box(c,-40,-110,80,7,2,'#9cab90',edge,1.4);
 if(r.phase==='hooking')for(const x of [-31,15])poly(c,[[x,-109],[x+16,-109],[x+13,-122],[x+3,-122]],'#a5b399',edge,1.5);
 box(c,-13,-29,26,9,3,'#52735b',edge,1.5);oval(c,0,-25,9,4,'#c6ceb0',edge,1.1);
 c.restore();
 // 挂钩残骸与载运货物均在载台之后、驾驶室之前绘制，装车完成时锚点连续。
 if(['hooking','towing'].includes(r.phase)){
  const origin=nearest(r.position,item),t=r.phase==='towing'?1:Math.min(1,r.timer/C.hookSeconds),point={x:origin.x+(load.x-origin.x)*t,y:origin.y+(load.y-origin.y)*t};
  if(r.phase==='hooking'){c.save();c.strokeStyle='#5c6c58';c.lineWidth=2;c.beginPath();c.moveTo(item.x,item.y-25);c.lineTo(point.x,point.y+8);c.stroke();c.restore();}
  drawParkedHull(c,point,game,item.hull);drawWreckDamage(c,point.x,point.y,game.time);
  if(r.phase==='towing'){c.save();c.strokeStyle='#b99e65';c.lineWidth=2;for(const dx of [-27,27]){c.beginPath();c.moveTo(point.x+dx,point.y-14);c.lineTo(point.x+dx,point.y+16);c.stroke();}c.restore();}
 }
 c.save();c.translate(item.x,item.y);
 // 对称风挡、短引擎盖、前灯与格栅明确车头朝下，取消侧面驾驶室及横向翻转。
 box(c,-36,-22,72,49,7,'#d8bc7e',edge,2.3);
 box(c,-32,-19,64,7,3,'#eee0ab',edge,1.4);
 poly(c,[[-29,-11],[29,-11],[31,4],[-31,4]],'#9fc3b9',edge,1.7);
 c.strokeStyle='#dce7cd';c.lineWidth=2;c.beginPath();c.moveTo(-23,-7);c.lineTo(-15,0);c.moveTo(0,-10);c.lineTo(0,3);c.stroke();
 box(c,-35,5,70,24,6,'#dec58a',edge,2);box(c,-39,25,78,7,3,'#8a9d83',edge,1.8);
 for(const x of [-30,20])box(c,x,17,10,6,2,'#fff0b8',edge,1.2);
 box(c,-14,21,28,5,2,'#58765f',edge,1.2);
 for(const x of [-42,36])box(c,x,-6,6,12,2,'#6d8a74',edge,1.3);
 box(c,-19,-27,38,6,2,'#77876e',edge,1.1);
 for(const x of [-17,9])box(c,x,-29,8,6,2,Math.sin(game.time*8)>0?'#edc777':'#c9a061',edge,1);
 c.fillStyle=edge;c.font='bold 9px sans-serif';c.textAlign='center';c.fillText('救援',0,16);c.restore();
}
// 白天夜晚共用正式光照，进度与订单一致，绘制本身不推进维修。
export function drawVehicleServiceObject(c,item,game,night=0,reduced=false,player=game.player){
 if(item.type==='repair-center'||item.type==='repair-center-back'){drawCenter(c,item,player);return;}
 if(item.type==='repair-tow'){drawTow(c,item,game);return;}
 drawParkedHull(c,item,game,item.hull,game.progress.logistics?.tow?.target===item.hull?{wheel:game.progress.vehicleService[item.hull].wheel,track:game.progress.vehicleService[item.hull].wheel}:null);
 if(item.type==='repair-wreck'||item.order?.phase==='repairing')drawWreckDamage(c,item.x,item.y,reduced?0:game.time);
 if(item.type==='repair-bay'){
  const r=item.order;box(c,item.x-38,item.y+20,76,9,4,'#e9dfb5','#41634a',1.5);box(c,item.x-36,item.y+22,72*Math.min(1,r.timer/C.repairSeconds),5,2,'#79a674');
  box(c,item.x-58,item.y+34,116,22,7,'#fff1c7','#41634a',1.5);
  c.save();c.fillStyle='#355b43';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText(r.phase==='ready'?'修好待交付':`维修中 · ${Math.max(0,Math.ceil(C.repairSeconds-r.timer))}秒`,item.x,item.y+49);c.restore();
 }
}
