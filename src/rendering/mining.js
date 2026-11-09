import {drawActionCountdown} from './action-countdown.js';
import {oreCount} from '../config/mine-freight.js';
import {mineCargoDisplay,MINE_ORE_COLORS} from './mine-cargo.js';
import {clipEraSeat} from './vehicle-eras.js';
import {eraVehicle} from '../config/vehicle-eras.js';
import {drawAmbientFish} from './ambient-fish.js';
import {mineRockDamage} from '../core/mining/mine-rocks.js';
import {drawOutdoorFishing,outdoorFishingView} from './outdoors.js';
import {drawMineArmedCat,drawMineCombat} from './mine-combat.js';
import {drawMineBoundary} from './mine-boundary.js';
import {productionDigSeconds} from '../config/farm-production.js';
// 地下正式绘制器：矿道、轨道、轮毂、矿锄与真实猫身体分层，不新增位图缓存。
import {MINING as M,MINE_DIRECTIONS,MINE_CART_BOARDING,mineCell,mineKey,minePoint,mineFreightCell} from '../config/mining.js';
import {mineTarget,parseKey} from '../core/mining/mining.js';
import {box,oval,poly} from './primitives.js';
import {drawCat,drawRiderWeapon} from './characters.js';
import {PLAYER_SCALE} from '../combat/recoil.js';
import {currentMineLayer} from '../core/mining/mine-layers.js';
import {mineInsideBounds,mineCellArea,mineTerrain,mineCellOpen} from '../config/mine-ecology.js';
import {drawMineTerrain,drawMineLandscape,drawMineAnimal,drawMineBolts} from './mine-ecology.js';
import {drawVehicleTracks,drawVehicleArmor} from './vehicle.js';
import {riderPosition} from '../config/vehicle-rider.js';
import {drawMineLandscapeGround} from './mine-landscape-ground.js';
import {drawMineRail} from './mine-rails.js';
import {mineLandscapeAnchor} from '../world/mine-surface.js';
import {calendarView} from '../world/living-calendar.js';
import {mineEntrances,mineEntranceMarkers} from '../world/mine-entrances.js';

// 小屋梯井在地板层绘制，入口脚底不设置阻挡，踏步保持独立轮廓。
export function drawBasementHatch(c,night){const {x,y}=M.hatch;drawLadder(c,x,y,night,'地下室 ↓');}
// 地表洞口按真实入口排序，低矮石拱留出中间通道，不生成不可穿越的假山墙。
export function drawMineShaft(c,item,night){
 const {x,y}=item;c.save();c.translate(x,y);c.scale(1.35,1.15);c.translate(-x,-y);oval(c,x,y+5,43,16,'#36534244');
 poly(c,[[x-40,y+7],[x-37,y-22],[x-20,y-46],[x+12,y-48],[x+35,y-25],[x+39,y+7]],night?'#6d8272':'#a5ad89','#385d47',2.5);
 poly(c,[[x-24,y+5],[x-22,y-20],[x-9,y-33],[x+12,y-31],[x+24,y-14],[x+24,y+6]],'#314c43','#476447',2);
 box(c,x-19,y-10,38,20,5,'#c9b389','#547153',1.5);for(let i=0;i<3;i++)box(c,x-17,y-6+i*6,34,3,1,'#f1d5a2');
 oval(c,x-26,y-28,14,5,night?'#688466':'#92b07b');label(c,`矿洞 ${item.number||''} ↓`,x,y-56,12);c.restore();
}
// 共用木梯入口，文字由运行时绘制，不烘焙到静态图片。
function drawLadder(c,x,y,night,text){
 box(c,x-30,y-28,60,48,7,night?'#314a43':'#425d48','#2e523f',2);
 for(let i=0;i<4;i++)box(c,x-22+i*2,y-20+i*9,44-i*4,5,2,'#ceae79','#7d704f',1);
 for(const dx of [-27,23])box(c,x+dx,y-29,4,52,2,'#e8cf98','#506949',1);
 if(text)label(c,text,x,y+38,12);
}
// 简洁奶油文字牌统一标注梯口与路线，不遮挡猫的身体。
function label(c,text,x,y,size=12){c.font=`bold ${size}px sans-serif`;c.textAlign='center';const w=c.measureText(text).width+16;box(c,x-w/2,y-14,w,21,5,'#f1e5bd','#4c6b50',1.5);c.fillStyle='#315c43';c.fillText(text,x,y+1);}
// 当前层号立于木梯上沿，双木脚落在梯框上，原通行格与方向标签保持独立。
function drawMineLayerSign(c,point,depth){
 for(const dx of [-22,22])box(c,point.x+dx-2,point.y-51,4,25,1,'#b89b6b','#4c6b50',1);
 label(c,`地下 ${depth} 层`,point.x,point.y-48,12);
}
// 灯笼和路牌落在格子左侧，脚底可自由通行，灯光限制为局部范围。
function decoration(c,cell,type,night){
 const p=minePoint(cell),x=p.x-23,y=p.y+8;oval(c,x+3,y+5,10,4,'#2548383d');
 box(c,x-2,y-31,5,37,2,'#a78b60','#436447',1.5);
 if(type==='lamp'){
  if(night)oval(c,x+6,y-23,21,23,'#ead39b22');
  box(c,x-2,y-35,16,22,4,'#e0ba76','#3d6049',2);box(c,x+2,y-31,8,13,2,night?'#ffe3a0':'#f4d79a');
 }else{poly(c,[[x-12,y-35],[x+12,y-35],[x+22,y-27],[x+12,y-19],[x-12,y-19]],'#e4cc94','#426447',2);c.fillStyle='#476549';c.font='10px sans-serif';c.textAlign='center';c.fillText('矿道',x+2,y-24);}
}
// 车轮按真实行驶距离转动，车厢保持固定轮廓，驾驶员沿用原角色图集。
function cartBody(c,cart,front=false){
 const {x,y}=cart;
 if(!front){oval(c,x+2,y+6,29,11,'#294e3a44');for(const dx of [-23,23]){c.save();c.translate(x+dx,y+3);oval(c,0,0,7,9,'#516c57','#2d5140',2);c.rotate(cart.wheel||0);c.strokeStyle='#b9c2a0';c.lineWidth=2;c.beginPath();c.moveTo(-5,0);c.lineTo(5,0);c.moveTo(0,-6);c.lineTo(0,6);c.stroke();c.restore();}box(c,x-25,y-26,50,29,5,'#7f9b80','#315b43',2);box(c,x-20,y-22,40,20,3,'#3e604b');
 const minerals=mineCargoDisplay(cart.cargo);
 for(const [i,key] of minerals.entries()){const row=Math.floor(i/4),cx=x-15+i%4*9+(row%2)*2,cy=y-14-row*5;poly(c,[[cx-5,cy],[cx-2,cy-6],[cx+3,cy-5],[cx+5,cy+1]],MINE_ORE_COLORS[key],'#415448',1);}
 return minerals;
}
 else{poly(c,[[x-24,y-10],[x+24,y-10],[x+20,y+7],[x-20,y+7]],'#b9c497','#365e45',2);box(c,x-27,y-13,54,6,2,'#dfd6a5','#426247',1.5);oval(c,x,y-1,4,3,'#e4ca83','#5f7553',1);}
}
// 矿锄和手独立于身体，挥动只改变手臂与柄的角度，不变形角色图集。
// 地下挥镐与来信定格共用镐头、手柄和持握位置。
export function drawMiningPickaxe(c,g){
 const room=g.cottage,p=g.player,work=room.dig?.elapsed||room.shaftWork||room.strike||0,phase=work?Math.sin(work/productionDigSeconds(g.progress,M.digSeconds)*Math.PI*2):0,d=MINE_DIRECTIONS[room.direction],side=d.x<0?-1:1;
 c.save();c.translate(p.x+side*13,p.y-17);c.rotate(side*(-.35+phase*.65));
 box(c,-2,-27,5,39,2,'#bb9767','#466448',1.5);poly(c,[[-15,-26],[-9,-33],[9,-33],[17,-25],[8,-27],[-8,-27]],'#becbb6','#3c624a',2);
 oval(c,1,0,6,5,'#efc997','#4c684d',1.5);c.restore();
}
// 镜头只绘制可见网格，地图再大也不遍历历史矿道，地图铺满画布，手机操作悬浮于地图上。
export function drawMining(renderer,g=renderer.game){
 const {c,width:w,height:h,dpr}=renderer,night=calendarView(g.progress.living.calendar).id==='night',top=0,bottom=h,baseZoom=Math.min(1.05,w/360),cx=w/2,cy=h/2;
 const camera=outdoorFishingView(g,{x:g.player.x-cx/baseZoom,y:g.player.y-cy/baseZoom,zoom:baseZoom},w,h),zoom=camera.zoom;
 renderer.cottageView=null;renderer.actionCountdownView=null;renderer.mineCartRiderReview=null;renderer.mineView={...camera,top,bottom,width:w,height:h};
 const v=renderer.mineView,m=currentMineLayer(g);
 c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=night?'#263f38':'#3c5945';c.fillRect(0,0,w,h);
 c.save();c.beginPath();c.rect(0,top,w,Math.max(30,bottom-top));c.clip();c.translate(-v.x*zoom,-v.y*zoom);c.scale(zoom,zoom);
 const first=mineCell({x:v.x-64,y:v.y+top/zoom-64}),last=mineCell({x:v.x+w/zoom+64,y:v.y+bottom/zoom+64});let tiles=0;const railKinds={};
 const landscapeTime=renderer.reduced.matches?0:m.age;drawMineLandscapeGround(renderer,m,first,last,night,landscapeTime);
 renderer.ambientFishReview=drawAmbientFish(c,g,{x:v.x,y:v.y,w:w/zoom,h:h/zoom},renderer.reduced.matches,night?1:0,m);
 renderer.mineBoundaryReview=drawMineBoundary(c,m,{x:v.x,y:v.y+top/zoom,w:w/zoom,h:(bottom-top)/zoom},night);
 for(let y=first.y;y<=last.y;y++)for(let x=first.x;x<=last.x;x++){
  tiles++;const cell={x,y},key=mineKey(cell),p=minePoint(cell);
  if(!mineInsideBounds(m,p.x,p.y))continue;
  if(!mineCellOpen(cell,m))continue;
  drawMineTerrain(c,cell,m,night,m.age);
  if(m.rails[key]){const kind=drawMineRail(c,cell,m,night);railKinds[kind]=(railKinds[kind]||0)+1;}
 }
 const targetCell=mineTarget(g),target=minePoint(targetCell);if((g.cottage.tool||g.cottage.autoDig)&&mineInsideBounds(m,target.x,target.y)){c.strokeStyle='#f6df9b';c.lineWidth=2;c.setLineDash([6,4]);c.strokeRect(target.x-29,target.y-29,58,58);c.setLineDash([]);}
 const depth=g.cottage.depth||1,entry=minePoint(parseKey(m.entry)),layerSigns=[entry];drawLadder(c,entry.x,entry.y,night,m.descent===m.entry?'上行 ↑ · 下层 ↓':depth===1?'小屋 ↑':`地下 ${depth-1} 层 ↑`);
 if(m.descent&&m.descent!==m.entry){const down=minePoint(parseKey(m.descent));drawLadder(c,down.x,down.y,night,`地下 ${depth+1} 层 ↓`);layerSigns.push(down);}
 const entities=layerSigns.map(point=>({y:point.y-24,kind:'layer-sign',point})),displayedCargo=[];
 for(let y=first.y;y<=last.y;y++)for(let x=first.x;x<=last.x;x++){const cell={x,y},key=mineKey(cell);if(mineCellOpen(cell,m))entities.push({y:mineLandscapeAnchor(cell,mineTerrain(cell,m).hash,m).y,kind:'landscape',cell});if(m.decor[key])entities.push({y:minePoint(cell).y+8,kind:'decor',cell,value:m.decor[key]});}
 const visibleShafts=mineEntrances(m).filter(p=>p.x>v.x-80&&p.x<v.x+w/zoom+80&&p.y>v.y+top/zoom-80&&p.y<v.y+bottom/zoom+80);
 for(const p of visibleShafts)drawLadder(c,p.x,p.y,night,`矿洞 ${p.number} · 地面 ↑`);
 // 车头与所有挂车共用镜头的显示时刻，停放车辆继续使用存档坐标。
 for(const stored of m.carts){const cart=g.mineCarts?.get(stored.id)||stored;if(Math.abs(cart.x-g.player.x)<w/zoom&&Math.abs(cart.y-g.player.y)<h/zoom)entities.push({y:cart.y,kind:'cart',cart});}
 for(const animal of g.cottage.ecologyActors||[])entities.push({y:animal.y,kind:'animal',animal});
 if(!g.cottage.ride)entities.push({y:g.player.y,kind:'player'});
 const depot=minePoint(mineFreightCell(m,g.cottage.depth||1));
 if((g.cottage.depth||1)===1)drawLadder(c,depot.x,depot.y,night,'');
 box(c,depot.x-30,depot.y+16,60,15,3,'#e8dcac','#53664b',1);
 c.save();c.font='bold 10px sans-serif';c.fillStyle='#315943';c.textAlign='center';c.fillText((g.cottage.depth||1)===1?'仓库升井':'货运中转',depot.x,depot.y+27);c.restore();
 for(const cart of m.carts){const parent=cart.leader&&m.carts.find(c=>c.id===cart.leader);if(parent){c.beginPath();c.moveTo(cart.x,cart.y-6);c.lineTo(parent.x,parent.y-6);c.strokeStyle='#736c52';c.lineWidth=4;c.stroke();}}
 for(const e of entities.sort((a,b)=>a.y-b.y)){
  if(e.kind==='landscape'){
   // 高景物遮住角色时只淡化前景实体，地形、水流和真实脚底排序保持不变。
   const anchor=mineLandscapeAnchor(e.cell,mineTerrain(e.cell,m).hash,m),overlap=anchor.y>=g.player.y&&anchor.y-g.player.y<95&&Math.abs(anchor.x-g.player.x)<55;
   c.save();if(overlap)c.globalAlpha=.48;drawMineLandscape(c,e.cell,m,night,landscapeTime,renderer.reduced.matches,mineRockDamage(g,mineKey(e.cell)));c.restore();
  }
  else if(e.kind==='layer-sign')drawMineLayerSign(c,e.point,depth);
  else if(e.kind==='animal')drawMineAnimal(c,e.animal,m.age,renderer.reduced.matches);
  else if(e.kind==='decor')decoration(c,e.cell,e.value,night);
  else if(e.kind==='player'){
   if(g.vehicle.active)drawVehicleTracks(c,g.player,g.vehicle,renderer.reduced.matches,g.time,g.progress);
   const rider=g.vehicle.active?riderPosition(g.player,g.vehicle):g.player;
   const era=g.vehicle.active&&eraVehicle(g.vehicle.index);c.save();clipEraSeat(c,g.player,g.vehicle);
   if(!era&&!g.fishing&&g.cottage.weaponReady&&!g.cottage.strike)drawMineArmedCat(c,g,rider.x,rider.y);else drawCat(c,rider.x,rider.y,g.progress.hero,g.player.angle,PLAYER_SCALE,0,0,null,renderer.reduced.matches?.35:1,null,0,false,false,g.player.bodyAnimation,0,null,0,true);
   c.restore();
   if(g.vehicle.active)drawVehicleArmor(c,g.player,g.vehicle,g.progress,g.time,renderer.reduced.matches);else if(g.fishing)drawOutdoorFishing(c,g,rider,night?1:0);else if(!g.cottage.weaponReady||g.cottage.strike)drawMiningPickaxe(c,g);
   if(era&&g.cottage.weaponReady)drawRiderWeapon(c,rider,g.progress.hero,g.loadout.weapon,{scale:PLAYER_SCALE,parts:g.weapon().parts,modChoice:g.weapon().modChoice});
  }
  else{const minerals=cartBody(c,e.cart);displayedCargo.push({id:e.cart.id,colors:minerals.map(key=>MINE_ORE_COLORS[key])});if(e.cart.id===g.cottage.ride){
   if(g.cottage.weaponReady)drawMineArmedCat(c,g,e.cart.x,e.cart.y-8);else drawCat(c,e.cart.x,e.cart.y-8,g.progress.hero,0,PLAYER_SCALE,0,0,null,renderer.reduced.matches?.35:1,null,0,false,false,g.player.bodyAnimation,0,null,0,true);
   // 验收读取实际绘制锚点；保留真实待机连续帧，不以静帧掩盖位移抖动。
   renderer.mineCartRiderReview={id:e.cart.id,x:e.cart.x,y:e.cart.y,wheel:e.cart.wheel,screenX:(e.cart.x-v.x)*zoom,screenY:(e.cart.y-8-v.y)*zoom,seatOffset:-8,cameraError:Math.hypot(e.cart.x-g.player.x,e.cart.y-g.player.y),idleTime:g.player.bodyAnimation.idleTime,moveWeight:g.player.bodyAnimation.moveWeight};
  }cartBody(c,e.cart,true);}
 }
 drawMineCombat(c,g,renderer.reduced.matches);drawMineBolts(c,g.cottage.bolts);
 // 入口文字在实体之后绘制；猫和怪物经过时仍能识别同一地表洞口编号。
 for(const p of visibleShafts)label(c,`矿洞 ${p.number} · 地面 ↑`,p.x,p.y+38,12);
 const work=g.cottage.dig?g.cottage.dig.elapsed/productionDigSeconds(g.progress,M.digSeconds):g.cottage.shaftWork/M.shaftSeconds;
 if(work){box(c,g.player.x-23,g.player.y-66,46,6,3,'#345841');box(c,g.player.x-22,g.player.y-65,44*Math.min(1,work),4,2,'#f0d48b');}
 const shipment=g.cottage.shipment;
 if(shipment){const age=g.time-shipment.time;if(age>=0&&age<1.2){for(const q of shipment.points){for(let i=0;i<4;i++){
  const t=Math.max(0,Math.min(1,(age-i*.08)/.9));if(t<=0||t>=1)continue;
  oval(c,q.x+(shipment.station.x-q.x)*t+i*2,q.y+(shipment.station.y-q.y)*t-18-55*Math.sin(t*Math.PI/2),4,3,'#d7ba89','#53664b',1);
 }}}}
 c.restore();
 // 头顶徽记在屏幕坐标绘制，手机缩放不缩小数字，也不遮住猫脸与工具栏。
 const boarding=g.cottage.cartBoarding;if(boarding&&!g.cottage.ride){const progress=boarding.elapsed/MINE_CART_BOARDING.wait,x=Math.max(44,Math.min(w-44,(g.player.x-v.x)*zoom)),y=Math.max(100,Math.min((renderer.mineControlsTop||h)-28,(g.player.y-v.y)*zoom-85)),label=Math.max(1,Math.ceil(MINE_CART_BOARDING.wait-boarding.elapsed))+'秒';renderer.actionCountdownView={x,y,width:90,height:34,icon:'vehicle',label,progress};c.save();c.setTransform(dpr,0,0,dpr,0,0);c.translate(x,y);drawActionCountdown(c,{progress,label,icon:'vehicle',width:90});c.restore();}
 renderer.mineReview={freight:{station:{...depot},loads:m.carts.map(cart=>oreCount(cart.cargo)),cargo:displayedCargo,shipping:!!shipment&&g.time-shipment.time<1.2},layerSigns:layerSigns.map(point=>({...point,depth})),weaponReady:!!g.cottage.weaponReady,weapon:g.weapon().id,ammo:g.magazines[g.loadout.weapon].ammo,projectiles:g.cottage.combat?.projectiles.length||0,tiles,night,railKinds,visibleShafts:visibleShafts.map(p=>({key:p.key,number:p.number})),shaftMarkers:mineEntranceMarkers(m,mineCell(g.player)),cartCount:m.carts.length,toolIndependent:true,depth:g.cottage.depth||1,seed:m.seed,naturalLandscape:true,prebuiltRoads:false,selectedTool:g.cottage.tool,coverage:m.coverage,biomes:9,animals:(g.cottage.ecologyActors||[]).map(a=>({kind:a.kind,phase:a.phase,clock:a.clock})),vehicle:g.vehicle.active};
}
// 固定范围小地图显示天然洞厅、已挖区域、轨道、洞口和小屋方向，远处小屋以边缘箭头定位。
export function drawMineMap(canvas,g){
 const c=canvas.getContext('2d'),s=112,scale=5,center=mineCell(g.player),m=currentMineLayer(g);c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,s,s);box(c,1,1,110,110,12,'#efe3bc','#47694e',2);
 c.save();c.beginPath();c.rect(10,21,92,78);c.clip();
 for(let y=-8;y<=8;y++)for(let x=-9;x<=9;x++){const key=mineKey({x:center.x+x,y:center.y+y});const cell={x:center.x+x,y:center.y+y};if(!mineCellArea(cell,m))box(c,54+x*scale,58+y*scale,scale,scale,0,'#8d997e');else if(mineCellOpen(cell,m))box(c,54+x*scale,58+y*scale,scale,scale,0,m.rails[key]?'#80976c':mineTerrain(cell,m).water&&!m.bridges[key]?'#729c99':'#c0b38c');}
 c.restore();
 const dx=-center.x,dy=-center.y,factor=Math.min(1,38/Math.max(1,Math.abs(dx*scale)),32/Math.max(1,Math.abs(dy*scale))),hx=56+dx*scale*factor,hy=60+dy*scale*factor;
 poly(c,[[hx-5,hy],[hx,hy-6],[hx+5,hy],[hx+4,hy+5],[hx-4,hy+5]],'#ddaa62','#42644a',1);
 // 层间坡道超出小地图时也显示在边缘，黄色房子仍指向原地表小屋。
 for(const [key,color] of [[(g.cottage.depth||1)===1?mineKey(mineFreightCell(m,1)):m.entry,'#527ca0'],[m.descent,'#ab765b']])if(key){const p=parseKey(key),dx=(p.x-center.x)*scale,dy=(p.y-center.y)*scale,f=Math.min(1,36/Math.max(1,Math.abs(dx)),30/Math.max(1,Math.abs(dy))),x=56+dx*f,y=60+dy*f;box(c,x-3,y-3,6,6,1,color,'#315c43',1);}
 // 地表洞口不随局部地形一起裁切，边缘箭头指向实际坐标，编号与地表一致。
 for(const p of mineEntranceMarkers(m,center)){c.strokeStyle='#527ca0';c.lineWidth=1;c.beginPath();c.moveTo(p.targetX,p.targetY);c.lineTo(p.x,p.y);c.stroke();box(c,p.x-5,p.y-5,10,10,2,'#527ca0','#315c43',1);c.fillStyle='#fff0c5';c.font='bold 8px sans-serif';c.textAlign='center';c.fillText(String(p.number),p.x,p.y+3);if(p.edge){const a=p.angle;c.save();c.translate(p.x+Math.cos(a)*8,p.y+Math.sin(a)*8);c.rotate(a);poly(c,[[3,0],[-2,-3],[-2,3]],'#527ca0');c.restore();}}
 const d=MINE_DIRECTIONS[g.cottage.direction];c.save();c.translate(56,60);c.rotate(Math.atan2(d.y,d.x));poly(c,[[6,0],[-4,-4],[-2,0],[-4,4]],'#345e46');c.restore();
 c.fillStyle='#315c43';c.textAlign='center';c.font='bold 10px sans-serif';c.fillText('北 ↑',56,14);c.fillText('西',7,62);c.fillText('东',105,62);c.fillText('南',56,107);
}
