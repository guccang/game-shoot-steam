// 生产设施正式Canvas绘制：矮底座、独立喷嘴、台面与压榨罐共享森林配色。
import {carriedSprinkler} from '../core/farm-production.js';
import {SPRINKLER_OFFSETS,SPRINKLER,SPRINKLER_OUTLINE,sprinklerReach} from '../config/farm-production.js';
import {nearest,worldDistance} from '../world/coordinates.js';
// 设施以脚底参与现有深度排序，不增加图片或独立画布。
export function productionObjects(game){
 const s=game.progress.production;if(!s)return [];const held=carriedSprinkler(game);
 return [...s.sprinklers.filter(p=>p.id!==held?.id).map(p=>({...p,type:'farm-production',kind:'sprinkler'})),...(s.bench?[{...s.bench,type:'farm-production',kind:'bench'}]:[]),...(held?[{...held,x:game.player.x+32,y:game.player.y+8,type:'farm-production',kind:'sprinkler',carried:true}]:[])].filter(p=>p.mapId===game.mapId);
}
// 地面预览绘制两层方形轮廓和24个田格，范围与实际浇水判定一致。
export function drawProductionGround(c,game,view){
 const cursor=game.productionCursor;if(!cursor||cursor.point?.mapId!==game.mapId)return;
 const p=nearest(cursor.point,{x:view.x+view.w/2,y:view.y+view.h/2});c.save();c.translate(p.x,p.y);c.strokeStyle=cursor.reason?'#a35f45':'#527754';c.fillStyle=cursor.reason?'#b9724d33':'#a6c48b55';c.lineWidth=2;c.setLineDash([5,4]);
 if(cursor.kind==='sprinkler'){c.beginPath();for(const [i,[x,y]] of SPRINKLER_OUTLINE.entries())c[i?'lineTo':'moveTo'](x*SPRINKLER.cellWidth,y*SPRINKLER.cellHeight);c.closePath();c.stroke();}
 for(const [x,y] of cursor.kind==='sprinkler'?SPRINKLER_OFFSETS:[[0,0]]){c.beginPath();c.roundRect(x-25,y-18,50,36,7);c.fill();c.stroke();}c.setLineDash([]);c.restore();
 c.save();c.globalAlpha=.65;drawProductionDevice(c,{...p,kind:cursor.kind},game.time,true);c.restore();
}
// 正式绘制与验收共用喷头姿态；暂停不推进游戏时间，停转后回到同一个完整圈姿态。
export function sprinklerPose(item,time,event,reduced=false){
 const d=event?.devices?.find(d=>d.id===item.id&&d.mapId===item.mapId&&worldDistance(d,item)<.1);
 const elapsed=d?time-d.time:-1,active=elapsed>=0&&elapsed<SPRINKLER.spraySeconds;
 const progress=active?elapsed/SPRINKLER.spraySeconds:0;
 const angle=active&&!reduced?Math.PI*2*progress*progress*(3-2*progress):0;
 const pressure=active?Math.min(1,elapsed/.18,(SPRINKLER.spraySeconds-elapsed)/.18):0;
 return {active,angle,elapsed,pressure};
}
// 喷嘴沿竖轴旋转：横向和纵深分别投影，只有横臂运动，底座与竖管保持固定。
function drawSprinklerHead(c,angle){
 const x=Math.cos(angle)*19,y=Math.sin(angle)*8;
 c.lineCap='round';c.strokeStyle='#3b5742';c.lineWidth=9;c.beginPath();c.moveTo(-x,-25-y);c.lineTo(x,-25+y);c.stroke();
 c.strokeStyle='#91b6a4';c.lineWidth=5;c.stroke();
 for(const sign of [-1,1]){c.fillStyle='#d8e9cc';c.strokeStyle='#3b5742';c.lineWidth=1.5;c.beginPath();c.ellipse(sign*x,-25+sign*y,3,2.6,0,0,Math.PI*2);c.fill();c.stroke();}
 c.fillStyle='#efd994';c.beginPath();c.arc(0,-25,5,0,Math.PI*2);c.fill();c.stroke();
}
// 两股水弧从独立喷口出发，水滴沿二次曲线落向覆盖边缘，不把动画烘焙为静态图。
function drawSprinklerWater(c,pose){
 c.save();c.lineCap='round';
 for(const sign of [-1,1]){
  const dx=Math.cos(pose.angle)*sign,dy=Math.sin(pose.angle)*sign,reach=sprinklerReach(pose.angle);
  const start={x:dx*19,y:-25+dy*8},end={x:dx*SPRINKLER.cellWidth*reach*pose.pressure,y:dy*SPRINKLER.cellHeight*reach*pose.pressure};
  const control={x:(start.x+end.x)*.5,y:(start.y+end.y)*.5-27};
  c.globalAlpha=pose.pressure*.75;c.strokeStyle='#63b8c7';c.lineWidth=2.6;c.beginPath();c.moveTo(start.x,start.y);c.quadraticCurveTo(control.x,control.y,end.x,end.y);c.stroke();
  c.fillStyle='#d2f0df';
  for(let i=0;i<6;i++){const t=(pose.elapsed*1.8+i/6)%1,u=1-t,x=u*u*start.x+2*u*t*control.x+t*t*end.x,y=u*u*start.y+2*u*t*control.y+t*t*end.y;c.beginPath();c.ellipse(x,y,1.5,2.2,0,0,Math.PI*2);c.fill();}
  c.globalAlpha=pose.pressure*.45;c.strokeStyle='#7cc7cd';c.lineWidth=1.4;c.beginPath();c.ellipse(end.x,end.y,5+Math.sin(pose.elapsed*12)*1.5,2.5,0,0,Math.PI*2);c.stroke();
 }
 c.restore();
}
// 每台设备只在真实事务成功后播放一轮旋转浇水，静态图标与放置预览保持安静。
export function drawProductionDevice(c,item,time=0,reduced=false,spray=null){
 c.save();c.translate(item.x,item.y);c.strokeStyle='#3b5742';c.lineWidth=2;c.lineJoin='round';c.fillStyle='#294c3c28';c.beginPath();c.ellipse(4,3,22,8,0,0,Math.PI*2);c.fill();
 if(item.carried)c.translate(0,-18);
 if(item.kind==='sprinkler'){
  const pose=sprinklerPose(item,time,item.carried?null:spray,reduced);
  c.fillStyle='#8eaa77';c.beginPath();c.ellipse(0,-2,17,8,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#e7d8a6';c.beginPath();c.roundRect(-5,-25,10,25,3);c.fill();c.stroke();
  if(pose.active&&!reduced)drawSprinklerWater(c,pose);
  drawSprinklerHead(c,pose.angle);
 }else{
  c.fillStyle='#96744b';for(const x of [-20,14]){c.beginPath();c.roundRect(x,-15,6,19,2);c.fill();c.stroke();}
  c.fillStyle='#f0dfaa';c.beginPath();c.roundRect(-25,-21,50,13,4);c.fill();c.stroke();
  c.fillStyle='#c7ab79';c.beginPath();c.roundRect(-21,-28,22,8,3);c.fill();c.stroke();c.fillStyle='#88a876';c.beginPath();c.roundRect(6,-43,15,23,5);c.fill();c.stroke();c.fillStyle='#eadaac';c.fillRect(8,-38,11,7);c.strokeRect(8,-38,11,7);c.beginPath();c.moveTo(13,-43);c.lineTo(13,-49);c.lineTo(23,-49);c.stroke();
  c.fillStyle='#d39b60';c.beginPath();c.ellipse(-10,-28,6,3,.2,0,Math.PI*2);c.fill();
 }c.restore();
}
// 控件图标保持独立剪影，全部使用中文无障碍名称由按钮提供。
export function productionIcon(kind){const shapes={sprinkler:'<ellipse cx="24" cy="38" rx="13" ry="5" fill="#8eaa77"/><path d="M21 36V17h6v19M10 17h28" fill="#efdda5"/>',bench:'<path d="M8 30h32v7H8zm3 7v7m26-7v7" fill="#efdda5"/><rect x="27" y="10" width="11" height="20" rx="3" fill="#8eaa77"/><path d="M32 10V5h10M10 25h12"/>',meal:'<rect x="7" y="14" width="34" height="26" rx="7" fill="#efdda5"/><path d="M7 24h34M24 24v16"/><path d="M13 30h5m-5 5h5m13-6 4 6"/>',juice:'<path d="M15 15h18l-2 26H17z" fill="#d7bd72"/><path d="M25 31V6h10M15 23h18"/>',oil:'<path d="M18 13h12v7l6 5v16H12V25l6-5z" fill="#e4c67c"/><path d="M18 10h12M17 31h14"/>'};return `<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke="#3b5742" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">${shapes[kind]||shapes.meal}</g></svg>`;}
