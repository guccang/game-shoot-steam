import {workMineRock} from './mine-rocks.js';
import {resetMineCombat} from './mine-combat.js';
import {nextCartExit} from '../config/mine-rail-routes.js';
import {setMineCartDirection} from './mine-cart-directions.js';
// 地下玩法独立处理挖掘、铺轨和驾驶；复用正式输入、角色时钟与存档事务。
import {PRODUCTION as PRODUCTION_RULES,productionDigSeconds} from '../config/farm-production.js';
import {MINING as M,MINE_DIRECTIONS,mineCell,mineKey,minePoint,mineOre} from '../config/mining.js';
import {miningCommit as commit,mineNotice as notice} from './mine-transactions.js';
import {currentMineLayer,travelMineLayer} from './mine-layers.js';
import {mineOccupancy,mineBodyRadius} from '../physics/mine-motion.js';
import {mineCellArea,mineTerrain,mineCellOpen,mineInsideBounds} from '../config/mine-ecology.js';
import {updateMineEcology} from './mine-ecology.js';
import {vehicleSpeed} from '../config/vehicles.js';
import {advanceVehicleWheels} from '../combat/vehicle-motion.js';
import {updateCatMotion} from './cat-motion.js';
import {blocked} from '../physics/motion.js';
import {worldDistance} from '../world/coordinates.js';
import {MINE_ENTRANCE,mineEntrances,mineEntranceFarmBlocked} from '../world/mine-entrances.js';
import {movementLoadFactor} from '../progression/load-weight.js';

// 地下操作只能在活着且运行中的矿区进行，暂停不接受施工和挖掘。
function active(game){return game.cottage?.kind==='mine'&&game.state==='playing'&&game.player.hp>0;}
// 朝向用于挖掘目标与岔路选择，沿用移动输入，不替换身体帧。
export function faceMine(game,direction){if(!active(game)||!MINE_DIRECTIONS[direction])return false;if(game.cottage.ride)return setMineCartDirection(game,direction).ok;game.cottage.direction=direction;game.cottage.dig=null;return true;}
// 目标永远是脚下格的相邻格，不能远程开矿或越过实体墙。
export function mineTarget(game){const cell=mineCell(game.player),d=MINE_DIRECTIONS[game.cottage?.direction??1];return {x:cell.x+d.x,y:cell.y+d.y};}
// 地下墙体使用脚底圆周采样，视觉网格与实体碰撞同源。
export function mineBlocked(game,x,y){return !mineOccupancy(game,x,y);}
// 入口保留地表安全点，返回小屋使用固定门槛，避免将地下坐标传给室内。
export function enterMine(game,shaft=null){
 const room=game.cottage;
 if(game.state!=='playing'||game.player.hp<=0||(!shaft&&game.vehicle.active)||!game.progress.homeDecor.basement)return false;
 if(shaft){if(room||!game.progress.mining.shafts.includes(shaft)||worldDistance(game.player,minePoint(parseKey(shaft)))>30)return false;}
 else if(room?.kind!=='cottage'||room.floor!==0||room.sleep||room.balcony||Math.hypot(game.player.x-M.hatch.goal.x,game.player.y-M.hatch.goal.y)>28)return false;
 const point=shaft?minePoint(parseKey(shaft)):M.home,outside=shaft?{x:game.player.x,y:game.player.y}:room.outside;
 game.cottage={kind:'mine',depth:1,outside,returnRoom:shaft?null:room,direction:1,tool:null,autoDig:false,dig:null,shaftWork:0,ride:null,running:false,notice:game.vehicle.active?'战车已进入矿道。沿天然洞厅和宽通道行驶，主炮自动迎敌；开回地表后可以下车挖路。':'已装备武器自动迎敌；选择矿镐或铺轨即可作业，再点「拿起武器」恢复射击。'};
 game.mineEntranceWait=0;game.mineEntranceKey=null;game.sceneApproach=null;game.parking=null;Object.assign(game.player,point,{vx:0,vy:0,pushX:0,pushY:0});game.onEvent?.('cottage-change');return true;
}
// 稳定网格键还原为整数坐标，仅消费本模块或已验证存档产生的键。
export function parseKey(key){const [x,y]=key.split(',').map(Number);return {x,y};}
// 地表洞口必须能完整站立，并避开树干、建筑、水界及其他洞口。
export function canOpenShaft(game){
 const key=mineKey(mineCell(game.player)),point=minePoint(mineCell(game.player));
 if([...(game.progress.farm?.plots||[]),...(game.progress.production?.sprinklers||[]),game.progress.production?.bench].filter(Boolean).some(plot=>mineEntranceFarmBlocked({shafts:[key]},plot)))return false;
 if((game.cottage?.depth||1)!==1||mineCellArea(mineCell(game.player),currentMineLayer(game))<4096||mineTerrain(mineCell(game.player),currentMineLayer(game)).water||key==='0,0'||game.progress.mining.shafts.some(k=>worldDistance(minePoint(parseKey(k)),point)<128))return false;
 const body={...game.player,mapId:'forest',flying:false,amphibious:false,treePass:false,arena:null,livingCollision:true};
 return [[0,0],[0,38],[34,0],[-34,0],[0,-34]].every(([x,y])=>!blocked(point.x+x,point.y+y,18,game.trees,body));
}
// 同一按钮可以开始或取消向上开洞；完成前再次检查地表与费用。
export function startMineShaft(game){
 if(!active(game)||game.cottage.ride)return notice(game,'请先停稳并下车。');
 const room=game.cottage;if(room.shaftWork){room.shaftWork=0;return notice(game,'已取消向上开洞。',true);}
 if(!canOpenShaft(game))return notice(game,'上方有建筑、树木、水域、田块、生产设施或已有洞口，请换一块空地。');
 if(!afford(game,'shaft'))return notice(game,'开洞需要 5 矿石、8 木材。');
 room.autoDig=false;room.tool=null;room.dig=null;room.shaftKey=mineKey(mineCell(game.player));room.shaftWork=.001;return notice(game,'正在向上开洞，移动可取消。',true);
}
// 洞口只有站在原格并完整施工四秒才提交，失败不扣资源。
function finishShaft(game){
 if(!canOpenShaft(game)||!afford(game,'shaft'))return notice(game,'上方暂不可通行或材料不足，开洞已取消。');
 const key=game.cottage.shaftKey;return commit(game,(m,p)=>{pay(m,p,'shaft');m.shafts.push(key);for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const cell=mineCell(minePoint(parseKey(key)));cell.x+=x;cell.y+=y;if(mineCellArea(cell,m)>0){m.dug[mineKey(cell)]=true;if(mineTerrain(cell,m).water)m.bridges[mineKey(cell)]=true;}}},'洞口已打通，站在梯口点击「返回地面」。');
}
// 小屋地下入口和地表洞口分别核验距离，不能在矿道中远程传送。
export function leaveMine(game){
 if(!active(game)||game.cottage.ride)return notice(game,'请先停稳并下车。');
 const cell=mineCell(game.player),key=mineKey(cell),point=minePoint(cell),room=game.cottage;
 if((room.depth||1)>1)return travelMineLayer(game,-1);
 if(Math.hypot(game.player.x-point.x,game.player.y-point.y)>28)return notice(game,'请走到梯口中央。');
 if(key==='0,0'){
  if(game.vehicle.active)return notice(game,'战车请从地表矿洞坡道返回，不能进入小屋木梯。');
  resetMineCombat(game);game.cottage=room.returnRoom||{kind:'cottage',floor:0,outside:{x:M.home.x+50,y:M.home.y+30},sleep:null};
  Object.assign(game.cottage,{basementLatch:true,basementElapsed:0,notice:'从地下室回来了。',exitElapsed:0});Object.assign(game.player,M.hatch.goal,{vx:0,vy:0});
 }else if(game.progress.mining.shafts.includes(key)){
  const body={...game.player,mapId:'forest',flying:false,amphibious:false,treePass:false,arena:null,livingCollision:true};
  Object.assign(body,{flying:game.player.flying,amphibious:game.player.amphibious,treePass:game.player.treePass});
  if(blocked(point.x,point.y,mineBodyRadius(game),game.trees,body))return notice(game,'地表出口暂时被挡住，请从其他梯口返回。');
  resetMineCombat(game);game.cottage=null;game.mineEntranceLatch=key;Object.assign(game.player,point,{vx:0,vy:0});
 }else return notice(game,'请沿小地图返回小屋梯口，或在这里向上开洞。');
 game.sceneApproach=null;game.onEvent?.('cottage-change');return {ok:true,message:'已离开矿区。'};
}
// 保持持续挖掘开关；暂停自动冻结，不生成后台奖励。
export function toggleMineDig(game){if(!active(game)||game.cottage.ride||game.vehicle.active)return false;game.cottage.tool=null;game.cottage.autoDig=!game.cottage.autoDig;game.cottage.dig=null;game.cottage.shaftWork=0;return true;}
// 矿镐和铺轨为移动作业模式，再点取消；其他快捷按钮仅执行一次明确施工。
export function selectMineTool(game,tool){
 if(!active(game)||game.cottage.ride||game.vehicle.active)return notice(game,'请停车并步行使用工具。');
 const r=game.cottage;if(!['pick','rail','cart','lamp','sign','shaft'].includes(tool))return notice(game,'请选择有效工具。');
 if(tool==='pick'||tool==='rail'){r.tool=r.tool===tool?null:tool;r.autoDig=!!r.tool;r.dig=null;r.shaftWork=0;r.autoBuildKey=null;return notice(game,r.tool?(tool==='pick'?'矿镐已选中 · 推动方向靠近岩壁自动开采。':'铺轨已选中 · 移动自动开采并铺轨，每格消耗 1 矿石、2 木材。'):'已放下工具，可自由行走。',true);}
 if(tool==='shaft')return startMineShaft(game);
 r.tool=null;r.autoDig=false;r.dig=null;r.shaftWork=0;return buildMine(game,tool);
}
// 只有实际推动方向才连续施工；已有设施跳过，失败立即停止，避免逐帧尝试扣费。
function movementMineWork(game){
 const r=game.cottage,l=currentMineLayer(game),cell=mineCell(game.player),key=mineKey(cell);
 if(game.vehicle.active){r.tool=null;r.autoDig=false;}
 if(r.tool==='rail'&&!l.rails[key]){const result=buildMine(game,'rail');if(!result.ok){r.tool=null;r.autoDig=false;r.dig=null;return;}}
 // 勘探天然地块只记录开发面积，不发放矿石、不改变天然景观。
 if(!currentMineLayer(game).dug[key]&&mineCellOpen(cell,currentMineLayer(game))){const result=commit(game,(m,p,layer)=>{layer.dug[key]=true;},r.notice);if(!result.ok)r.surveyWait=1;}
}
// 工具完整挥动后才开通一格；已挖空格不能重复掉矿。
function digStep(game,dt){
 const room=game.cottage,target=mineTarget(game),key=mineKey(target),point=minePoint(target);
 if(room.autoDig&&!mineInsideBounds(currentMineLayer(game),point.x,point.y)){room.dig=null;notice(game,'外围是坚硬岩层，无法开采或铺轨。');return;}
 if(game.vehicle.active||!room.autoDig||mineCellOpen(target,currentMineLayer(game))||mineCellArea(target,currentMineLayer(game))<=0||Math.hypot(point.x-game.player.x,point.y-game.player.y)>M.tile+8){room.dig=null;return;}
 if(room.dig?.key!==key)room.dig={key,elapsed:0};room.dig.elapsed+=dt;
 if(room.dig.elapsed<productionDigSeconds(game.progress,M.digSeconds))return;
 const amount=mineOre(target),r=commit(game,(m,p,l)=>{l.dug[key]=true;m.ore+=amount;p.production.minedOre+=amount;if(p.production.effects.meal>0){p.production.effects.meal--;p.production.mealDigs++;}},`挖通矿道，获得 ${amount} 矿石。`);room.dig=null;if(!r.ok){room.autoDig=false;room.tool=null;}
}
// 所有设施报价来自同一配置，矿石为矿区建造材料，木材沿用正式仓库。
function afford(game,kind){const price=M.prices[kind];return game.progress.mining.ore>=price.ore&&game.progress.wood>=price.wood;}
// 费用与设施共同写入候选存档，不发生先扣费后保存。
function pay(m,p,kind){m.ore-=M.prices[kind].ore;p.wood-=M.prices[kind].wood;}
// 铺轨和装点可放脚下或前方一格，允许天然洞厅与已挖通区域。
export function buildMine(game,kind,ahead=false){
 if(!active(game)||game.cottage.ride)return notice(game,'请下车后再施工。');
 if(!['rail','cart','lamp','sign'].includes(kind))return notice(game,'请选择有效设施。');
 const cell=ahead?mineTarget(game):mineCell(game.player),key=mineKey(cell),m=currentMineLayer(game);
 if(!mineInsideBounds(m,minePoint(cell).x,minePoint(cell).y))return notice(game,'外围是坚硬岩层，无法开采或铺轨。');
 if(mineTerrain(cell,m).water&&!m.bridges?.[key])return notice(game,'水面需要先建桥，再铺轨和装点。');
 if(!mineCellOpen(cell,m))return notice(game,'先挖通这块岩壁，再布置路线。');
 if(kind==='rail'&&m.rails[key]||['lamp','sign'].includes(kind)&&m.decor[key])return notice(game,'这里已经放置了同类设施。');
 if(kind==='cart'&&(!m.rails[key]||m.carts.some(c=>mineKey(mineCell(c))===key)))return notice(game,'请在没有矿车的轨道格造车。');
 if(!afford(game,kind))return notice(game,`材料不足，需要 ${M.prices[kind].ore} 矿石、${M.prices[kind].wood} 木材。`);
 return commit(game,(next,p,l)=>{pay(next,p,kind);l.dug[key]=true;if(kind==='rail')l.rails[key]=true;else if(kind==='cart')l.carts.push({id:l.nextCart++,...minePoint(cell),previous:null,wheel:0,heading:game.cottage.direction,departure:null});else l.decor[key]=kind;},kind==='rail'?'轨道已铺好，相邻轨道自动连接。':kind==='cart'?'矿车已建好，靠近后可乘坐。':'路线装点已放好。');
}
// 玩家登乘最近的真实矿车；停止后下车，无需等待固定车站。
export function rideMineCart(game){
 if(!active(game)||game.vehicle.active)return false;const room=game.cottage;
 if(room.ride){room.running=false;room.ride=null;commit(game,()=>{},'已停车并下车。');return true;}
 const cart=currentMineLayer(game).carts.find(c=>nearMineCart(game,c));
 if(!cart){notice(game,'请靠近矿车，或先在脚下轨道造一辆。');return false;}
 const boarded=commit(game,(_m,p)=>{p.production.rodeCart=true;},'已乘坐矿车。');if(!boarded.ok)return false;
 room.ride=cart.id;room.direction=cart.heading??room.direction;room.running=false;room.autoDig=false;room.tool=null;room.dig=null;room.shaftWork=0;Object.assign(game.player,{x:cart.x,y:cart.y,vx:0,vy:0});return true;
}
// 登车线段逐步检查脚底，防止隔着未开掘岩壁登上邻近的矿车。
function nearMineCart(game,cart){
 const p=game.player,dx=cart.x-p.x,dy=cart.y-p.y,distance=Math.hypot(dx,dy);if(distance>40)return false;
 const steps=Math.max(1,Math.ceil(distance/4));for(let i=0;i<=steps;i++)if(mineBlocked(game,p.x+dx*i/steps,p.y+dy*i/steps))return false;return true;
}
// 急停立即冻结轮毂相位和行驶位置，再次开车从原段继续。
export function toggleMineCart(game){if(!active(game)||!game.cottage.ride)return false;game.cottage.running=!game.cottage.running;if(!game.cottage.running)commit(game,()=>{},'矿车已停止，可继续开车或下车。');return true;}
// 矿车以实际行驶朝向选路，停车选择只覆盖一次起步，路口设置持续生效。
function cartStep(game,dt){
 const room=game.cottage,cart=currentMineLayer(game).carts.find(c=>c.id===room.ride);if(!cart){room.ride=null;return;}
 if(room.running){
  if(!cart.target){
   const key=mineKey(mineCell(cart)),next=nextCartExit(currentMineLayer(game),cart,room.direction);
   if(!next){room.running=false;notice(game,'轨道还没有连通，请下车继续铺轨。');return;}
   cart.target=next.key;cart.from=key;cart.heading=next.i;cart.departure=null;
  }
  room.direction=cart.heading??room.direction;
  const target=minePoint(parseKey(cart.target));
  if(!mineInsideBounds(currentMineLayer(game),target.x,target.y)){room.running=false;cart.target=null;notice(game,'前方是坚硬岩层，矿车已停车。');return;}
  const dx=target.x-cart.x,dy=target.y-cart.y,distance=Math.hypot(dx,dy),boostSeconds=Math.min(dt,cart.lubrication||0),step=Math.min(distance,M.cartSpeed*(dt+boostSeconds*(PRODUCTION_RULES.oilSpeed-1)));
  const other=currentMineLayer(game).carts.some(c=>c.id!==cart.id&&Math.hypot(c.x-(cart.x+dx/Math.max(1,distance)*step),c.y-(cart.y+dy/Math.max(1,distance)*step))<38);
  if(other){room.running=false;notice(game,'前方有矿车，已安全停车。');return;}
  if(step>0&&cart.lubrication>0)cart.lubrication=Math.max(0,cart.lubrication-Math.min(dt,step/(M.cartSpeed*PRODUCTION_RULES.oilSpeed)));
  cart.x+=dx/Math.max(1,distance)*step;cart.y+=dy/Math.max(1,distance)*step;cart.wheel=(cart.wheel+step/8)%(Math.PI*2);
  if(distance<=step+.001){cart.x=target.x;cart.y=target.y;cart.previous=cart.from;cart.target=null;}
 }
 game.player.x=cart.x;game.player.y=cart.y;
}
// 地下主循环只推进可见游戏时间，移动挖掘、轨道与角色局部动作保持一致。
export function updateMining(game,dt,input){
 if(game.cottage?.kind!=='mine')return false;if(!active(game))return true;
 // 垂钓锁定作业与位移，怪物和世界时钟继续运行。
 if(game.fishing)input={x:0,y:0};
 const room=game.cottage,p=game.player,before={x:p.x,y:p.y},length=Math.hypot(input.x,input.y);dt=Math.max(0,Math.min(.05,dt));
 room.surveyWait=Math.max(0,(room.surveyWait||0)-dt);
 if(length>.01)room.direction=Math.abs(input.x)>Math.abs(input.y)?input.x>0?1:3:input.y>0?2:0;
 if(room.ride)cartStep(game,dt);
 else{
  if(length>.01){room.direction=Math.abs(input.x)>Math.abs(input.y)?input.x>0?1:3:input.y>0?2:0;room.shaftWork=0;}
  const rockWork=workMineRock(game,dt,length>.01);
  if(room.shaftWork){room.shaftWork+=dt;if(room.shaftWork>=M.shaftSeconds){room.shaftWork=0;finishShaft(game);}}
  else if(!rockWork){if(!room.tool||length>.01)digStep(game,dt);else room.dig=null;}
  // 铺轨沿主方向移动，避免斜跨格角造成两段轨道不相连；放下工具即可自由斜行。
  const rail=room.tool==='rail'&&!game.vehicle.active,axis=MINE_DIRECTIONS[room.direction],move=rail?{x:axis.x*Math.min(1,length),y:axis.y*Math.min(1,length)}:{x:input.x/Math.max(1,length),y:input.y/Math.max(1,length)};
  const speed=(game.vehicle.active?vehicleSpeed(game.progress,game.vehicle.index):M.speed*(1+(PRODUCTION_RULES.juiceSpeed-1)*Math.min(dt,game.progress.production.effects.juice)/Math.max(.001,dt)))*movementLoadFactor(game),dx=rockWork?0:move.x*speed*dt,dy=rockWork?0:move.y*speed*dt;
  if(!mineBlocked(game,p.x+dx,p.y))p.x+=dx;if(!mineBlocked(game,p.x,p.y+dy))p.y+=dy;
  if(length>.01&&!rockWork&&!room.surveyWait)movementMineWork(game);
 }
 if(!room.ride&&!game.vehicle.active&&Math.hypot(p.x-before.x,p.y-before.y)>.001)game.progress.production.effects.juice=Math.max(0,game.progress.production.effects.juice-dt);
 p.vx=(p.x-before.x)/Math.max(.001,dt);p.vy=(p.y-before.y)/Math.max(.001,dt);if(!game.fishing&&(!room.weaponTarget||room.tool||room.autoDig))p.angle=room.direction*Math.PI/2-Math.PI/2;
 if(game.vehicle.active){advanceVehicleWheels(game.vehicle,p,before);p.walkPhase+=(Math.hypot(p.x-before.x,p.y-before.y)/12);}
 updateMineEcology(game,dt);
 updateCatMotion(p.bodyAnimation,dt,room.ride?0:Math.hypot(p.vx,p.vy),!room.ride);game.time+=dt;return true;
}
// 地表洞口按原世界最近镜像候停进入；离开后需先移开，避免反复进出。
export function updateMineEntrance(game,dt,input){
 if(game.cottage||game.state!=='playing')return false;
 const eligible=game.mapId==='forest'&&game.player.hp>0&&game.progress.homeDecor.basement&&!game.realm&&!game.story&&!game.farmWork?.tool;
 const shaft=eligible&&game.progress.mining?.shafts.find(k=>worldDistance(game.player,minePoint(parseKey(k)))<=MINE_ENTRANCE.radius);
 if(game.mineEntranceLatch&&!shaft)game.mineEntranceLatch=null;
 if(!shaft||game.mineEntranceLatch===shaft||Math.hypot(input.x,input.y)>.01||Math.hypot(game.player.vx||0,game.player.vy||0)>3){game.mineEntranceWait=0;game.mineEntranceKey=null;return false;}
 if(game.mineEntranceKey!==shaft){game.mineEntranceKey=shaft;game.mineEntranceWait=0;}
 game.mineEntranceWait=(game.mineEntranceWait||0)+Math.max(0,Number.isFinite(dt)?dt:0);
 if(game.mineEntranceWait+1e-9<MINE_ENTRANCE.wait)return false;return enterMine(game,shaft);
}
// 正式地表绘制器消费洞口实体，不另造脱离实际通路的预览。
export function mineShaftObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?mineEntrances(game.progress.mining).map(site=>({...site,type:'mine-shaft'})):[];}
