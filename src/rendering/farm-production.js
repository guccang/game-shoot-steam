// 生产设施正式Canvas绘制：矮底座、独立喷嘴、台面与压榨罐共享森林配色。
import {SPRINKLER_OFFSETS} from '../config/farm-production.js';
import {nearest} from '../world/coordinates.js';
// 设施以脚底参与现有深度排序，不增加图片或独立画布。
export function productionObjects(game){const s=game.progress.production;if(!s)return [];return [...s.sprinklers.map(p=>({...p,type:'farm-production',kind:'sprinkler'})),...(s.bench?[{...s.bench,type:'farm-production',kind:'bench'}]:[])].filter(p=>p.mapId===game.mapId);}
// 地面预览只画四个真实覆盖格，放置前玩家能判断对齐与范围。
export function drawProductionGround(c,game,view){
 const cursor=game.productionCursor;if(!cursor||cursor.point?.mapId!==game.mapId)return;
 const p=nearest(cursor.point,{x:view.x+view.w/2,y:view.y+view.h/2});c.save();c.translate(p.x,p.y);c.strokeStyle=cursor.reason?'#a35f45':'#527754';c.fillStyle=cursor.reason?'#b9724d33':'#a6c48b55';c.lineWidth=2;c.setLineDash([5,4]);
 for(const [x,y] of cursor.kind==='sprinkler'?SPRINKLER_OFFSETS:[[0,0]]){c.beginPath();c.roundRect(x-25,y-18,50,36,7);c.fill();c.stroke();}c.setLineDash([]);c.restore();
 drawProductionDevice(c,{...p,kind:cursor.kind},game.time,true);
}
// 局部喷水只在真实自动浇水后一秒内出现，暂停使用冻结的游戏时钟。
export function drawProductionDevice(c,item,time=0,reduced=false,spray=false){
 c.save();c.translate(item.x,item.y);c.strokeStyle='#3b5742';c.lineWidth=2;c.lineJoin='round';c.fillStyle='#294c3c28';c.beginPath();c.ellipse(4,3,22,8,0,0,Math.PI*2);c.fill();
 if(item.kind==='sprinkler'){
  c.fillStyle='#8eaa77';c.beginPath();c.ellipse(0,-2,17,8,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#e7d8a6';c.beginPath();c.roundRect(-5,-25,10,25,3);c.fill();c.stroke();
  c.fillStyle='#91b6a4';c.beginPath();c.roundRect(-20,-29,40,8,4);c.fill();c.stroke();c.fillStyle='#efd994';c.beginPath();c.arc(0,-25,5,0,Math.PI*2);c.fill();c.stroke();
  if(spray&&!reduced){c.strokeStyle='#8ac6d0';c.lineWidth=1.8;const pulse=Math.sin(time*10)*3;for(const [x,y] of SPRINKLER_OFFSETS){c.beginPath();c.moveTo(0,-25);c.quadraticCurveTo(x*.6,y*.5-35-pulse,x,y);c.stroke();}}
 }else{
  c.fillStyle='#96744b';for(const x of [-20,14]){c.beginPath();c.roundRect(x,-15,6,19,2);c.fill();c.stroke();}
  c.fillStyle='#f0dfaa';c.beginPath();c.roundRect(-25,-21,50,13,4);c.fill();c.stroke();
  c.fillStyle='#c7ab79';c.beginPath();c.roundRect(-21,-28,22,8,3);c.fill();c.stroke();c.fillStyle='#88a876';c.beginPath();c.roundRect(6,-43,15,23,5);c.fill();c.stroke();c.fillStyle='#eadaac';c.fillRect(8,-38,11,7);c.strokeRect(8,-38,11,7);c.beginPath();c.moveTo(13,-43);c.lineTo(13,-49);c.lineTo(23,-49);c.stroke();
  c.fillStyle='#d39b60';c.beginPath();c.ellipse(-10,-28,6,3,.2,0,Math.PI*2);c.fill();
 }c.restore();
}
// 控件图标保持独立剪影，全部使用中文无障碍名称由按钮提供。
export function productionIcon(kind){const shapes={sprinkler:'<ellipse cx="24" cy="38" rx="13" ry="5" fill="#8eaa77"/><path d="M21 36V17h6v19M10 17h28" fill="#efdda5"/>',bench:'<path d="M8 30h32v7H8zm3 7v7m26-7v7" fill="#efdda5"/><rect x="27" y="10" width="11" height="20" rx="3" fill="#8eaa77"/><path d="M32 10V5h10M10 25h12"/>',meal:'<rect x="7" y="14" width="34" height="26" rx="7" fill="#efdda5"/><path d="M7 24h34M24 24v16"/><path d="M13 30h5m-5 5h5m13-6 4 6"/>',juice:'<path d="M15 15h18l-2 26H17z" fill="#d7bd72"/><path d="M25 31V6h10M15 23h18"/>',oil:'<path d="M18 13h12v7l6 5v16H12V25l6-5z" fill="#e4c67c"/><path d="M18 10h12M17 31h14"/>'};return `<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke="#3b5742" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">${shapes[kind]||shapes.meal}</g></svg>`;}
