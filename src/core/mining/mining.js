import {WORKSHOP_INTERIORS} from '../../config/workshop-interiors.js';
import {minePortals} from '../../world/mine-portals.js';
import {cancelMineWorkCombat,updateMineWorkCombat} from './mine-work-combat.js';
import {mineTrain,moveWagons,mineCartCanDrive,reverseMineTrain,MINE_CART_DRIVER_NOTICE} from './mine-train.js';
import {ORE_KEYS,oreCount} from '../../config/mine-freight.js';
import {WAREHOUSE} from '../../config/warehouse.js';
import {townStandingPoint} from '../camp/town-layout.js';
import {canUseWarehouse} from '../inventory/warehouse.js';
import {workMineRock} from './mine-rocks.js';
import {resetMineCombat} from './mine-combat.js';
import {nextCartExit} from '../../config/mine-rail-routes.js';
import {setMineCartDirection,steerStoppedMineCart,mineInputDirection} from './mine-cart-directions.js';
// 地下玩法独立处理挖掘、铺轨和驾驶；复用正式输入、角色时钟与存档事务。
import {PRODUCTION as PRODUCTION_RULES,productionDigSeconds} from '../../config/farm-production.js';
import {MINING as M,MINE_DIRECTIONS,MINE_CART_BOARDING,mineCell,mineKey,minePoint,mineOre,mineFreightCell} from '../../config/mining.js';
import {miningCommit as commit,mineNotice as notice,mineFreightReward,unloadMineFreight,autoLoadMineFreight} from './mine-transactions.js';
import {currentMineLayer,travelMineLayer} from './mine-layers.js';
import {mineOccupancy,mineBodyRadius,mineLineClear} from '../../physics/mine-motion.js';
import {mineCellArea,mineTerrain,mineCellOpen,mineInsideBounds} from '../../config/mine-ecology.js';
import {updateMineEcology} from './mine-ecology.js';
import {vehicleSpeed} from '../../config/vehicles.js';
import {advanceVehicleWheels} from '../../combat/vehicle-motion.js';
import {updateCatMotion} from '../battle/cat-motion.js';
import {blocked} from '../../physics/motion.js';
import {worldDistance} from '../../world/coordinates.js';
import {MINE_ENTRANCE,mineEntrances,mineEntranceFarmBlocked} from '../../world/mine-entrances.js';
import {movementLoadFactor} from '../../progression/inventory/load-weight.js';

// 地下操作只能在活着且运行中的矿区进行，暂停不接受施工和挖掘。
function active(game){return game.cottage?.kind==='mine'&&game.state==='playing'&&game.player.hp>0;}
// 朝向用于挖掘目标与岔路选择，沿用移动输入，不替换身体帧。
export function faceMine(game,direction){if(!active(game)||!MINE_DIRECTIONS[direction])return false;if(game.cottage.ride)return setMineCartDirection(game,direction).ok;game.cottage.direction=direction;game.cottage.dig=null;return true;}
// 目标永远是脚下格的相邻格，不能远程开矿或越过实体墙。
export function mineTarget(game){const cell=mineCell(game.player),d=MINE_DIRECTIONS[game.cottage?.direction??1];return {x:cell.x+d.x,y:cell.y+d.y};}
// 地下墙体使用脚底圆周采样，视觉网格与实体碰撞同源。
export function mineBlocked(game,x,y){return !mineOccupancy(game,x,y);}
// 入口保留地表安全点，返回小屋使用固定门槛，避免将地下坐标传给室内。
export function enterMine(game,shaft=null,warehouse=false){
 const room=game.cottage;
 if(game.state!=='playing'||game.player.hp<=0||(!shaft&&game.vehicle.active)||!game.progress.homeDecor.basement)return false;
 if(warehouse){if(room||!canUseWarehouse(game)||game.vehicle.active)return false;}
 else if(shaft){if(room||!game.progress.mining.shafts.includes(shaft)||worldDistance(game.player,minePoint(parseKey(shaft)))>30)return false;}
 else if(room?.kind!=='cottage'||room.floor!==0||room.sleep||room.balcony||Math.hypot(game.player.x-M.hatch.goal.x,game.player.y-M.hatch.goal.y)>28)return false;
 const point=warehouse?minePoint(mineFreightCell(game.progress.mining,1)):shaft?minePoint(parseKey(shaft)):M.home,outside=(shaft||warehouse)?{x:game.player.x,y:game.player.y}:room.outside;
 game.cottage={kind:'mine',depth:1,outside,warehouse,returnRoom:(shaft||warehouse)?null:room,direction:1,tool:null,autoDig:false,dig:null,shaftWork:0,ride:null,running:false,notice:game.vehicle.active?'战车已进入矿道。沿天然洞厅和宽通道行驶，主炮自动迎敌；开回地表后可以下车挖路。':'已装备武器自动迎敌；点击「挖矿」开始作业，遇敌自动拿起武器，安全后继续挖矿。'};
 game.mineWarehouseIntent=false;game.cottage.portalLatch='1:'+mineKey(mineCell(point));game.mineEntranceWait=0;game.mineEntranceKey=null;game.sceneApproach=null;game.parking=null;Object.assign(game.player,point,{vx:0,vy:0,pushX:0,pushY:0});game.onEvent?.('cottage-change');return true;
}
// 稳定网格键还原为整数坐标，仅消费本模块或已验证存档产生的键。
export function parseKey(key){const [x,y]=key.split(',').map(Number);return {x,y};}
// 地表洞口必须能完整站立，并避开树干、建筑、水界及其他洞口。
export function canOpenShaft(game){
 const key=mineKey(mineCell(game.player)),point=minePoint(mineCell(game.player));
 if([...(game.progress.farm?.plots||[]),...(game.progress.production?.sprinklers||[]),game.progress.production?.bench].filter(Boolean).some(plot=>mineEntranceFarmBlocked({shafts:[key]},plot)))return false;
 if((game.cottage?.depth||1)!==1||mineCellArea(mineCell(game.player),currentMineLayer(game))<4096||mineTerrain(mineCell(game.player),currentMineLayer(game)).water||key==='0,0'||key===mineKey(mineFreightCell(game.progress.mining,1))||game.progress.mining.shafts.some(k=>worldDistance(minePoint(parseKey(k)),point)<128))return false;
 const body={...game.player,mapId:'forest',flying:false,amphibious:false,treePass:false,arena:null,livingCollision:true};
 return [[0,0],[0,38],[34,0],[-34,0],[0,-34]].every(([x,y])=>!blocked(point.x+x,point.y+y,18,game.trees,body));
}
// 同一按钮可以开始或取消向上开洞；完成前再次检查地表与费用。
export function startMineShaft(game){
 if(!active(game)||game.cottage.ride)return notice(game,'请先停稳并下车。');
 const room=game.cottage;cancelMineWorkCombat(room);if(room.shaftWork){room.shaftWork=0;return notice(game,'已取消向上开洞。',true);}
 if(!canOpenShaft(game))return notice(game,'上方有建筑、树木、水域、田块、生产设施或已有洞口，请换一块空地。');
 if(!afford(game,'shaft'))return notice(game,'开洞需要 5 矿石、8 木材。');
 room.autoDig=false;room.tool=null;room.dig=null;room.shaftKey=mineKey(mineCell(game.player));room.shaftWork=.001;return notice(game,'正在向上开洞，移动可取消。',true);
}
// 洞口只有站在原格并完整施工四秒才提交，失败不扣资源。
function finishShaft(game){
 if(!canOpenShaft(game)||!afford(game,'shaft'))return notice(game,'上方暂不可通行或材料不足，开洞已取消。');
 const key=game.cottage.shaftKey;return commit(game,(m,p)=>{pay(m,p,'shaft');m.shafts.push(key);for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const cell=mineCell(minePoint(parseKey(key)));cell.x+=x;cell.y+=y;if(mineCellArea(cell,m)>0){m.dug[mineKey(cell)]=true;if(mineTerrain(cell,m).water)m.bridges[mineKey(cell)]=true;}}},'洞口已打通，点击梯口走近，站定1秒返回地面。');
}
// 小屋地下入口和地表洞口分别核验距离，不能在矿道中远程传送。
export function leaveMine(game){
 if(!active(game)||game.cottage.ride)return notice(game,'请先停稳并下车。');
 const cell=mineCell(game.player),key=mineKey(cell),point=minePoint(cell),room=game.cottage;
 if((room.depth||1)>1)return travelMineLayer(game,-1);
 if(Math.hypot(game.player.x-point.x,game.player.y-point.y)>28)return notice(game,'请走到梯口中央。');
 if(key===mineKey(mineFreightCell(game.progress.mining,1))){
  if(game.vehicle.active)return notice(game,'请从地表矿洞坡道驾驶战车返回。');
  const outside=townStandingPoint(game,room.warehouse?room.outside:{x:WAREHOUSE.x,y:WAREHOUSE.y+60});
  if(!outside)return notice(game,'仓库门外暂时没有安全落脚点，请稍后再试。');
  resetMineCombat(game);game.cottage=null;Object.assign(game.player,outside,{vx:0,vy:0});
  game.sceneApproach=null;game.onEvent?.('cottage-change');return {ok:true,message:'已返回小屋仓库。'};
 }else if(key==='0,0'){
  if(game.vehicle.active)return notice(game,'战车请从地表矿洞坡道返回，不能进入小屋木梯。');
  resetMineCombat(game);game.cottage=room.returnRoom||{kind:'cottage',floor:0,outside:{x:M.home.x+50,y:M.home.y+30},sleep:null};
  Object.assign(game.cottage,{basementLatch:true,basementElapsed:0,notice:'从地下室回来了。',exitElapsed:0});Object.assign(game.player,M.hatch.goal,{vx:0,vy:0});
 }else if(game.progress.mining.shafts.includes(key)){
  const body={...game.player,mapId:'forest',flying:false,amphibious:false,treePass:false,arena:null,livingCollision:true};
  Object.assign(body,{flying:game.player.flying,amphibious:game.player.amphibious,treePass:game.player.treePass});
  if(blocked(point.x,point.y,mineBodyRadius(game),game.trees,body))return notice(game,'地表出口暂时被挡住，请从其他梯口返回。');
  resetMineCombat(game);game.cottage=null;game.mineEntranceLatch=key;Object.assign(game.player,point,{vx:0,vy:0});
 }else return notice(game,'请到小屋楼梯、仓库升井或已开通的地表洞口返回。');
 game.sceneApproach=null;game.onEvent?.('cottage-change');return {ok:true,message:'已离开矿区。'};
}
// 保持持续挖掘开关；暂停自动冻结，不生成后台奖励。
export function toggleMineDig(game){if(!active(game)||game.cottage.ride||game.vehicle.active)return false;cancelMineWorkCombat(game.cottage);game.cottage.tool=null;game.cottage.autoDig=!game.cottage.autoDig;game.cottage.dig=null;game.cottage.shaftWork=0;return true;}
// 矿镐和铺轨为移动作业模式，再点取消；其他快捷按钮仅执行一次明确施工。
export function selectMineTool(game,tool){
 if(!active(game)||game.cottage.ride||game.vehicle.active)return notice(game,'请停车并步行使用工具。');
 const r=game.cottage;if(!['pick','rail','cart','lamp','sign','shaft'].includes(tool))return notice(game,'请选择有效工具。');
 const selected=r.combatWork?.tool||r.tool;cancelMineWorkCombat(r);
 if(tool==='pick'||tool==='rail'){r.tool=selected===tool?null:tool;r.autoDig=!!r.tool;r.dig=null;r.shaftWork=0;r.autoBuildKey=null;return notice(game,r.tool?(tool==='pick'?'矿镐已选中 · 推动方向靠近岩壁自动开采。':'铺轨已选中 · 移动自动开采并铺轨，每格消耗 1 矿石、2 木材。'):'已放下工具，可自由行走。',true);}
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

  const amount=mineOre(target),r=mineFreightReward(game,amount,(m,p,l)=>{l.dug[key]=true;p.production.minedOre+=amount;if(p.production.effects.meal>0){p.production.effects.meal--;p.production.mealDigs++;}},'挖通矿道',{cell:target});room.dig=null;if(!r.ok){room.autoDig=false;room.tool=null;}
}
// 铺轨和造矿车共享背包原矿补差规则，报价校验和实际扣料必须一致。
function usesBagOre(kind){return kind==='rail'||kind==='cart';}
// 所有设施报价来自同一配置，矿石为矿区建造材料，木材沿用正式仓库。
function afford(game,kind){const price=M.prices[kind],m=game.progress.mining;return m.ore+(usesBagOre(kind)?oreCount(m.bagOre):0)>=price.ore&&game.progress.wood>=price.wood;}
// 费用与设施共同写入候选存档，不发生先扣费后保存。
function pay(m,p,kind){
 const price=M.prices[kind],stored=Math.min(m.ore,price.ore);
 m.ore-=stored;p.wood-=price.wood;
 // 背包原矿只补齐铺轨或造车的差额，先用石矿，再按铜、铁、稀有顺序使用。
 if(usesBagOre(kind)){
  let needed=price.ore-stored;
  for(const key of ORE_KEYS){
   if(!needed)break;
   const count=m.bagOre?.[key]||0,used=Math.min(count,needed);
   if(used){needed-=used;if(used===count)delete m.bagOre[key];else m.bagOre[key]-=used;}
  }
 }
}
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
 if(!afford(game,kind))return notice(game,`材料不足，需要 ${M.prices[kind].ore} 矿石${usesBagOre(kind)?'（可用背包原矿补齐）':''}、${M.prices[kind].wood} 木材。`);
 return commit(game,(next,p,l)=>{pay(next,p,kind);l.dug[key]=true;if(kind==='rail')l.rails[key]=true;else if(kind==='cart')l.carts.push({id:l.nextCart++,...minePoint(cell),previous:null,wheel:0,heading:game.cottage.direction,departure:null});else l.decor[key]=kind;},kind==='rail'?'轨道已铺好，相邻轨道自动连接。':kind==='cart'?'矿车已建好，靠近后可乘坐。':'路线装点已放好。');
}
// 玩家登乘最近的真实矿车；停止后下车，无需等待固定车站。
export function rideMineCart(game,cartId=null){
 if(!active(game)||game.vehicle.active)return false;const room=game.cottage;
 if(room.ride){const id=room.ride;if(!commit(game,()=>{},'已停车并下车。').ok)return false;room.running=false;room.ride=null;room.cartBoarding=null;room.cartBoardingBlocked={id,depth:room.depth||1};return true;}
 const cart=currentMineLayer(game).carts.filter(c=>(cartId===null||c.id===cartId)&&nearMineCart(game,c)).sort((a,b)=>Math.hypot(a.x-game.player.x,a.y-game.player.y)-Math.hypot(b.x-game.player.x,b.y-game.player.y))[0];
 if(!cart){notice(game,'请靠近矿车，或先在脚下轨道造一辆。');return false;}
 const layer=currentMineLayer(game);
 const middle=cart.leader&&layer.carts.some(c=>c.leader===cart.id);
 const boarded=commit(game,(_m,p,l)=>{
  p.production.rodeCart=true;
  if(!middle)reverseMineTrain(l,l.carts.find(c=>c.id===cart.id));
 },middle?'已乘坐中间车厢；请到首端或尾端开车。':'已乘坐矿车，首尾均可开车。');if(!boarded.ok)return false;
 cancelMineWorkCombat(room);room.cartBoarding=null;room.cartBoardingBlocked=null;room.cartInputDirection=null;room.ride=cart.id;room.direction=currentMineLayer(game).carts.find(c=>c.id===cart.id).heading??room.direction;room.running=false;room.autoDig=false;room.tool=null;room.dig=null;room.rockWork=null;room.shaftWork=0;Object.assign(game.player,{x:cart.x,y:cart.y,vx:0,vy:0});return true;
}
// 登车线段逐步检查脚底，防止隔着未开掘岩壁登上邻近的矿车。
function nearMineCart(game,cart){
 const p=game.player,dx=cart.x-p.x,dy=cart.y-p.y,distance=Math.hypot(dx,dy);if(!Number.isFinite(distance)||distance>MINE_CART_BOARDING.radius)return false;
 const steps=Math.max(1,Math.ceil(distance/4));for(let i=0;i<=steps;i++)if(mineBlocked(game,p.x+dx*i/steps,p.y+dy*i/steps))return false;return true;
}
// 任意车厢均可登乘，挖矿模式也可候停；施工、钓鱼和迎敌保留当前操作。
export function mineCartBoardingTarget(game){
 const room=game.cottage;if(room?.kind!=='mine'||room.ride||room.portalWait||game.sceneApproach?.id?.startsWith('underground:')||game.vehicle.active||game.player.hp<=0||game.mainlineSpeech||game.fishing||(room.tool&&room.tool!=='pick')||room.shaftWork||room.combatWork||room.weaponTarget)return null;
 const layer=currentMineLayer(game);return layer.carts.filter(c=>nearMineCart(game,c)).sort((a,b)=>Math.hypot(a.x-game.player.x,a.y-game.player.y)-Math.hypot(b.x-game.player.x,b.y-game.player.y)||a.id-b.id)[0]||null;
}
// 候停属于当前房间而非存档；失败需先走开再重试，避免连续每帧写盘。
export function updateMineCartBoarding(game,dt){
 const room=game.cottage;if(room?.kind!=='mine')return false;const depth=room.depth||1;
 const blocked=room.cartBoardingBlocked;if(blocked){const cart=blocked.depth===depth&&currentMineLayer(game).carts.find(c=>c.id===blocked.id);if(!cart||!nearMineCart(game,cart))room.cartBoardingBlocked=null;}
 const target=mineCartBoardingTarget(game),old=room.cartBoarding;
 if(!target||room.cartBoardingBlocked||!['playing','paused'].includes(game.state)){room.cartBoarding=null;return false;}
 const same=old?.id===target.id&&old.depth===depth&&old.x===target.x&&old.y===target.y;
 if(game.state==='paused'){if(!same)room.cartBoarding=null;return false;}
 const elapsed=same?old.elapsed+(Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0):0;
 room.cartBoarding={id:target.id,depth,x:target.x,y:target.y,elapsed};
 if(elapsed+1e-9<MINE_CART_BOARDING.wait)return false;
 room.cartBoarding=null;const result=rideMineCart(game,target.id);if(!result)room.cartBoardingBlocked={id:target.id,depth};return result;
}
// 急停立即冻结轮毂相位和行驶位置，再次开车从原段继续。
export function toggleMineCart(game){
 if(!active(game)||!game.cottage.ride)return false;const room=game.cottage;
 if(!room.running){
  if(!mineCartCanDrive(game)){notice(game,MINE_CART_DRIVER_NOTICE);return false;}
  const cart=currentMineLayer(game).carts.find(c=>c.id===room.ride);
  if(cart.leader){const result=commit(game,(_m,_p,l)=>reverseMineTrain(l,l.carts.find(c=>c.id===room.ride)),'已从尾端准备开车。');if(!result.ok)return false;room.direction=currentMineLayer(game).carts.find(c=>c.id===room.ride).heading;}
 }
 room.running=!room.running;if(!room.running)commit(game,()=>{},'矿车已停止，可继续开车或下车。');else notice(game,'行驶中 · 推动摇杆或方向键选路，松开恢复自动。',true);return true;
}
// 到尽头只停车并保留朝向、车位和挂接关系，返程由玩家重新选向启动。
function stopCartAtRailEnd(game){game.cottage.running=false;notice(game,'已到达铁路尽头，矿车已停止。可选择方向返程，或下车继续铺轨。');}
// 行驶输入只在轨道连接点参与选路，不改写持久路口，也不在轨段中间横移。
function cartStep(game,dt,input){
 const room=game.cottage,cart=currentMineLayer(game).carts.find(c=>c.id===room.ride);if(!cart){room.ride=null;return;}
 if(cart.leader&&room.running){room.running=false;notice(game,mineCartCanDrive(game)?'请选择方向，从当前端重新开车。':MINE_CART_DRIVER_NOTICE);}
 if(room.running){
  const layer=currentMineLayer(game),train=mineTrain(layer,cart);
  const boostSeconds=Math.min(dt,cart.lubrication||0);
  let remaining=M.cartSpeed*(dt+boostSeconds*(PRODUCTION_RULES.oilSpeed-1));
  // 到达接点只消耗走过的路程；余量在本步继续走下一段，整列过格时保持同速。
  while(remaining>0){
   if(!cart.target){
    const key=mineKey(mineCell(cart)),next=nextCartExit(layer,cart,room.direction,mineInputDirection(input));
    if(!next){stopCartAtRailEnd(game);break;}
    if(train.slice(1).some(c=>mineKey(mineCell(c))===next.key)){room.running=false;notice(game,'列车已停车。请下车，到另一端上车返程。');break;}
    cart.target=next.key;cart.from=key;cart.heading=next.i;cart.departure=null;
   }
   room.direction=cart.heading??room.direction;
   const target=minePoint(parseKey(cart.target));
   if(!mineInsideBounds(layer,target.x,target.y)){room.running=false;cart.target=null;notice(game,'前方是坚硬岩层，矿车已停车。');break;}
   const dx=target.x-cart.x,dy=target.y-cart.y,distance=Math.hypot(dx,dy),step=Math.min(distance,remaining);
   const fraction=distance?step/distance:0,nextX=cart.x+dx*fraction,nextY=cart.y+dy*fraction;
   const other=layer.carts.some(c=>!train.includes(c)&&Math.hypot(c.x-nextX,c.y-nextY)<38);
   if(other){room.running=false;notice(game,'前方有矿车，已停车。要把两辆车连起来，请点「加挂矿车」。');break;}
   if(step>0&&cart.lubrication>0)cart.lubrication=Math.max(0,cart.lubrication-Math.min(dt,step/(M.cartSpeed*PRODUCTION_RULES.oilSpeed)));
   moveWagons(train,step);
   cart.x=nextX;cart.y=nextY;cart.wheel=(cart.wheel+step/8)%(Math.PI*2);
   if(distance<=step+.001){
    cart.x=target.x;cart.y=target.y;cart.previous=cart.from;cart.target=null;
    // 即使本帧路程刚好用完，也在抵达的当帧停止，不能把余量用于自动折返。
    if(!nextCartExit(layer,cart,room.direction)){stopCartAtRailEnd(game);break;}
   }
   remaining-=step;
  }
 }
 game.player.x=cart.x;game.player.y=cart.y;
}
// 任一节车进入升井旁的一圈轨道便可整列卸货；步行到站也能收回停放列车的货物。
function receiveStationFreight(game,room){
 if(room.freightRetry>game.time)return;
 const layer=currentMineLayer(game),station=minePoint(mineFreightCell(layer,room.depth||1));
 const radius=M.tile*1.5,distance=p=>Math.hypot(p.x-station.x,p.y-station.y);
 const inReach=c=>distance(c)<=radius&&mineLineClear(game,c,station);
 if(!room.ride&&distance(game.player)>radius)return;
 if(!oreCount(game.progress.mining.bagOre)&&!layer.carts.some(c=>oreCount(c.cargo)))return;
 const playerNear=inReach(game.player);
 if(!playerNear&&(!room.ride||!mineTrain(layer,layer.carts.find(c=>c.id===room.ride)).some(inReach)))return;
 const carry=Boolean(room.ride)||distance(game.player)<20;
 const carts=[];
 for(const head of layer.carts){
  if(head.leader)continue;
  const train=mineTrain(layer,head);
  if(train.some(c=>oreCount(c.cargo))&&train.some(inReach))carts.push(...train);
 }
 unloadMineFreight(game,carts,station,carry);
}
// 地下主循环只推进可见游戏时间，移动挖掘、轨道与角色局部动作保持一致。
export function updateMining(game,dt,input){
 if(game.cottage?.kind!=='mine')return false;if(!active(game)){updateMineCartBoarding(game,0);return true;}
 // 垂钓锁定作业与位移，怪物和世界时钟继续运行。
 if(game.fishing)input={x:0,y:0};
 const room=game.cottage,p=game.player,before={x:p.x,y:p.y},length=Math.hypot(input.x,input.y);dt=Math.max(0,Math.min(.05,dt));
 room.surveyWait=Math.max(0,(room.surveyWait||0)-dt);
 updateMineWorkCombat(game,dt);
 steerStoppedMineCart(game,input);
 if(room.ride)cartStep(game,dt,input);
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
 if(game.vehicle.active){advanceVehicleWheels(game.vehicle,p,before,dt);p.walkPhase+=(Math.hypot(p.x-before.x,p.y-before.y)/12);}
 receiveStationFreight(game,room);
 updateMineEcology(game,dt);
 autoLoadMineFreight(game);
 if(updateMinePortal(game,dt,input))return true;
 updateMineCartBoarding(game,dt);
 const riding = Boolean(room.ride || game.vehicle.active);
 updateCatMotion(p.bodyAnimation,dt,Math.hypot(p.vx,p.vy),!riding,riding);game.time+=dt;return true;
}
// 地表洞口按原世界最近镜像候停进入；离开后需先移开，避免反复进出。
export function updateMineEntrance(game,dt,input){
 if(game.cottage||game.state!=='playing')return false;
 // 仓库通行来自一次明确意图，手动离开后不能保留待触发请求。
 if(!game.sceneApproach&&Math.hypot(input.x,input.y)>.01)game.mineWarehouseIntent=false;
 const eligible=game.mapId==='forest'&&game.player.hp>0&&game.progress.homeDecor.basement&&!game.realm&&!game.story&&!game.farmWork?.tool;
 const warehouse=eligible&&game.mineWarehouseIntent&&!game.vehicle.active&&worldDistance(game.player,WORKSHOP_INTERIORS.warehouse.door)<=MINE_ENTRANCE.radius;
 const shaft=warehouse?'warehouse':eligible&&game.progress.mining?.shafts.find(k=>worldDistance(game.player,minePoint(parseKey(k)))<=MINE_ENTRANCE.radius);
 if(game.mineEntranceLatch&&!shaft)game.mineEntranceLatch=null;
 if(!shaft||game.mineEntranceLatch===shaft||Math.hypot(input.x,input.y)>.01||Math.hypot(game.player.vx||0,game.player.vy||0)>3){game.mineEntranceWait=0;game.mineEntranceKey=null;return false;}
 if(game.mineEntranceKey!==shaft){game.mineEntranceKey=shaft;game.mineEntranceWait=0;}
 game.mineEntranceWait=(game.mineEntranceWait||0)+Math.max(0,Number.isFinite(dt)?dt:0);
 if(game.mineEntranceWait+1e-9<MINE_ENTRANCE.wait)return false;return warehouse?enterMine(game,null,true):enterMine(game,shaft);
}
// 正式地表绘制器消费洞口实体，不另造脱离实际通路的预览。
export function mineShaftObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?mineEntrances(game.progress.mining).map(site=>({...site,type:'mine-shaft'})):[];}

// 真实梯口候停一秒，移动清零、暂停冻结；抵达新层和失败都锁住原入口直到走开。
export function updateMinePortal(game,dt,input={x:0,y:0}){
 const room=game.cottage;if(room?.kind!=='mine'||game.state!=='playing')return false;
 const portals=minePortals(currentMineLayer(game),room.depth||1),near=portals.filter(p=>Math.hypot(p.x-game.player.x,p.y-game.player.y)<=MINE_ENTRANCE.radius);
 const target=near.find(p=>p.id===room.portalIntent)||near[0];
 if(room.portalLatch&&!near.some(p=>room.portalLatch===(room.depth||1)+':'+p.key))room.portalLatch=null;
 if(!target||room.ride||game.fishing||room.shaftWork||game.sceneApproach||Math.hypot(input.x,input.y)>.01||Math.hypot(game.player.vx||0,game.player.vy||0)>3||room.portalLatch===(room.depth||1)+':'+target.key){room.portalWait=null;return false;}
 const wait=room.portalWait?.id===target.id?room.portalWait:{...target,elapsed:0};
 wait.elapsed+=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));room.portalWait=wait;
 if(wait.elapsed+1e-9<MINE_ENTRANCE.wait)return false;
 room.portalWait=null;room.portalIntent=null;room.portalLatch=(room.depth||1)+':'+target.key;
 const result=target.id==='down'?travelMineLayer(game,1):leaveMine(game);return !!result?.ok;
}
