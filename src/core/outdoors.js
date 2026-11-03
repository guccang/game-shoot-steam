import {FISHING_RODS,FISHING_BAITS,rodOwned,baitCount} from '../config/fishing-tackle.js';
import {fishingSetup,fishingOdds,sampleFishingOdds} from './fishing-tackle.js';
import {mineFishingShore,mineCastWater} from '../world/mine-fishing.js';
import {mineLayer} from '../progression/mine-layers.js';
import {mineLineClear} from '../physics/mine-motion.js';
import {vehicleModel} from '../config/vehicles.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {touchesLandform} from '../world/natural-terrain.js';
import {farmWorking} from './farm.js';
import {bossCombatActive} from './boss-engagement.js';
import {clearingCombatActive} from './living-safety.js';
// 露营和钓鱼的正式状态机；界面只提交操作，费用、鱼获和休息均先保存再兑现。
import {OUTDOOR_GEAR,FISH_SPECIES,OUTDOOR_RULES as R} from '../config/outdoors.js';
import {validateProgress} from '../progression/progress.js';
import {capturePatrol} from './patrol-session.js';
import {campPlacement,fishingShores} from '../world/outdoor-sites.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {cargoAccessible} from './cargo.js';
import {cottageSleepTarget} from './cottage.js';
import {catLoad} from '../progression/load-weight.js';

// 明确拒绝战斗、室内和借用活动；普通暂停菜单允许查看与提交事务。
export function outdoorReason(game,{shop=false,fishing=false}={}){
 if(!['playing','paused'].includes(game.state)||game.player.hp<=0||game.arrivalPending||game.story||game.realm||game.fireActive||game.campDefense||game.workshopTrial)return '请在自由巡林时使用野外装备。';
 if(shop)return game.cottage?.kind==='ammo'?'':'请到弹药补给铺找售货员购买野外装备。';
 if(farmWorking(game))return '请先完成手上的农活。';
 // 地下只开放垂钓，露营与采购仍遵循原有场所规则；地表敌人不影响地下湖岸。
 if(fishing&&game.cottage?.kind==='mine'){
  if(game.cottage.ride)return '请先停稳并下矿车，再到岸边钓鱼。';
  const layer=mineLayer(game.progress.mining,game.cottage.depth||1);
  if(Object.values(layer.animals).some(a=>a.hp>0&&Math.hypot(a.x-game.player.x,a.y-game.player.y)<R.safeRadius&&mineLineClear(game,game.player,a)))return '附近有危险，请先清理怪物再钓鱼。';
  return '';
 }
 if(game.cottage)return '请先走到屋外。';
 // 未完成的清缴或远处脱战领主不代表湖岸仍在交战；与其他生活交互共用现场战斗判定。
 if(bossCombatActive(game)||game.livingBattle||clearingCombatActive(game)||game.enemies.some(e=>e.hp>0&&worldDistance(e,game.player)<R.safeRadius))return '附近有危险，请先脱离战斗再露营或钓鱼。';
 return '';
}
// 当前动作锁定移动与手持武器，暂停不推进动作，也不把整个世界变成无敌区。
export function outdoorBusy(game){return !!(game.fishing||game.campSleep);}
// 所有永久变化同事务落盘，失败保留现场和钱包，可原地重试。
function commit(game,next,message,hp=game.player.hp){
 const snapshot=Object.create(game);snapshot.progress=next;snapshot.player={...game.player,hp};next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'保存失败，物品和金币未改变，请重试。'};
 game.progress=next;game.player.hp=hp;game.outdoorNotice=message;game.onEvent('outdoor-change');return {ok:true,message};
}
// 商店统一出售永久套装和成包鱼饵；满背包时先整理，不隐式丢物品。
export function buyOutdoorGear(game,id){
 const reason=outdoorReason(game,{shop:true}),gear=Object.hasOwn(OUTDOOR_GEAR,id)?OUTDOOR_GEAR[id]:null;if(reason||!gear)return {ok:false,message:reason||'没有这件装备。'};
 if(gear.kind==='tent'&&game.progress.outdoors.tent||gear.kind==='rod'&&rodOwned(game.progress.outdoors,gear.tackleId))return {ok:false,message:'已经拥有这套装备。'};
 if(game.progress.coins<gear.coins)return {ok:false,message:`金币不足，需要 ${gear.coins} 金币。`};
 const next=validateProgress(structuredClone(game.progress)),p=next.outdoors;
 if(gear.kind==='bait'){if(baitCount(p,gear.tackleId)+gear.pack>999)return {ok:false,message:'这种鱼饵已满。'};if(gear.tackleId==='bait')p.bait+=gear.pack;else p.baits[gear.tackleId]+=gear.pack;}
 else if(gear.kind==='rod'){const hadRod=rodOwned(p,p.selectedRod);if(gear.tackleId==='rod')p.rod=true;else p.rods[gear.tackleId]=true;if(!hadRod)p.selectedRod=gear.tackleId;}else p.tent=true;
 const snapshot=Object.assign(Object.create(game),{progress:next});if(catLoad(snapshot).overloaded)return {ok:false,message:'背包空间不足，先整理物品再购买。'};
 next.coins-=gear.coins;return commit(game,next,`已购入${gear.name}，打开「野外」开始使用。`);
}
// 钓具切换先落盘，进行中的抛竿不会被临时换饵或换竿改变概率。
export function equipFishingTackle(game,kind,id){
 if(!['playing','paused'].includes(game.state)||outdoorBusy(game))return {ok:false,message:'请先收竿或结束休息再更换钓具。'};
 const p=game.progress.outdoors,valid=kind==='rod'?FISHING_RODS[id]&&rodOwned(p,id):kind==='bait'?FISHING_BAITS[id]&&baitCount(p,id)>0:false;
 if(!valid)return {ok:false,message:'尚未拥有这件钓具或鱼饵已用完。'};
 const next=validateProgress(structuredClone(game.progress));next.outdoors[kind==='rod'?'selectedRod':'selectedBait']=id;return commit(game,next,'已装备'+(kind==='rod'?FISHING_RODS[id]:FISHING_BAITS[id]).name+'。');
}
// 鱼获只有在正式柜台才兑换金币；收藏统计不随出售清空。
export function sellOutdoorFish(game){
 const reason=outdoorReason(game,{shop:true});if(reason)return {ok:false,message:reason};
 const next=validateProgress(structuredClone(game.progress));let coins=0;
 for(const fish of FISH_SPECIES){coins+=next.outdoors.fish[fish.id]*fish.coins;next.outdoors.fish[fish.id]=0;}
 if(!coins)return {ok:false,message:'鱼护里还没有鱼。'};
 if(next.coins+coins>RESOURCE_CAP)return {ok:false,message:'金币接近上限，请先使用部分金币。'};
 next.coins+=coins;return commit(game,next,`鱼获已售出，获得 ${coins} 金币。`);
}
// 战车驻营不要求购买帐篷；套装可在车旁展开，步行露营则需要自有帐篷。
export function deployCamp(game,mode='tent'){
 const reason=outdoorReason(game);if(reason)return {ok:false,message:reason};
 if(outdoorBusy(game)||game.progress.outdoors.camp)return {ok:false,message:'请先结束动作或收回原营地。'};
 if(!['tent','vehicle'].includes(mode))return {ok:false,message:'请选择帐篷或战车驻营。'};
 if(mode==='tent'&&!game.progress.outdoors.tent)return {ok:false,message:'先到弹药补给铺购买露营套装。'};
 const hull=game.vehicle.index;
 if(mode==='vehicle'&&(!cargoAccessible(game,hull)||vehicleModel(hull).flying||game.vehicle.hp<=0||game.progress.vehicleService[hull]?.phase))return {ok:false,message:'请在完好的自有地面载具旁驻营。'};
 const site=campPlacement(game);if(!site)return {ok:false,message:'这里放不下营地，请找远离城镇、田块和水面的开阔草地。'};
 if(game.vehicle.active&&!game.dismountVehicle())return {ok:false,message:'附近无法安全下车，请移到空地。'};
 const next=validateProgress(structuredClone(game.progress));next.outdoors.camp={...site,mode,hull:mode==='vehicle'?hull:null,kit:next.outdoors.tent};
 return commit(game,next,mode==='vehicle'?'战车已停稳，野外营地搭好了。':'帐篷与天幕已展开，可以在营地休息。');
}
// 营地只允许在现场收回，拆营不会删除车辆或产生第二份装备。
export function packCamp(game){
 const reason=outdoorReason(game),camp=game.progress.outdoors.camp;if(reason)return {ok:false,message:reason};
 if(outdoorBusy(game)||!camp||camp.mapId!==game.mapId||worldDistance(camp,game.player)>R.campReach)return {ok:false,message:'请回到自己的营地旁，结束动作后再收营。'};
 const next=validateProgress(structuredClone(game.progress));next.outdoors.camp=null;
 if(catLoad(Object.assign(Object.create(game),{progress:next})).overloaded)return {ok:false,message:'背包装不下露营套装，请先清理物品。'};
 return commit(game,next,'营地已收好，装备放回背包。');
}
// 睡眠目标在点击时锁定，离开或受威胁会中断，不能远程回血。
export function sleepAtCamp(game,mode='morning'){
 const reason=outdoorReason(game),camp=game.progress.outdoors.camp;if(reason)return {ok:false,message:reason};
 if(!['morning','phase'].includes(mode)||outdoorBusy(game)||!camp||camp.mapId!==game.mapId||worldDistance(camp,game.player)>R.campReach||game.vehicle.active)return {ok:false,message:'走到帐篷或驻车营地旁，再选择休息。'};
 game.campSleep={elapsed:0,hp:game.player.hp,origin:{x:game.player.x,y:game.player.y},bed:nearest({x:camp.x-(camp.kit?60:30),y:camp.y+8},game.player),target:cottageSleepTarget(game.progress.living.calendar,mode),mapId:game.mapId};game.outdoorNotice='躺进睡袋，听一会儿林间的风……';return {ok:true,message:game.outdoorNotice};
}
// 仅在真实湖岸准备鱼竿；未抛竿前不扣鱼饵。
export function beginFishing(game){
 const reason=outdoorReason(game,{fishing:true});if(reason)return {ok:false,message:reason};
 if(outdoorBusy(game))return {ok:false,message:'请先结束当前动作。'};
 const setup=fishingSetup(game);if(setup.reason)return {ok:false,message:setup.reason};
 if(game.vehicle.active)return {ok:false,message:'先下车，站在湖岸再抛竿。'};
 const shore=game.cottage?.kind==='mine'?mineFishingShore(game):fishingShores(game)[0];if(!shore||shore.distance>R.castReach)return {ok:false,message:game.cottage?.kind==='mine'?'请走到开阔水面旁的岸边，再试试钓鱼。':'请沿指引走到湖岸，靠近水面再钓鱼。'};
 game.fishing={rodId:setup.rodId,baitId:setup.baitId,odds:fishingOdds(setup.rodId,setup.baitId,setup.water),phase:'ready',elapsed:0,clock:0,shore,origin:{x:game.player.x,y:game.player.y},mapId:game.mapId,mineRoom:shore.mineDepth?game.cottage:null,mineDepth:shore.mineDepth||0,hp:game.player.hp,charge:0,lean:0,reeling:false,tension:.3,progress:0,message:'按住抛竿蓄力，松手把浮漂送入湖里。'};
 if(shore.mineDepth)Object.assign(game.cottage,{tool:null,autoDig:false,dig:null,shaftWork:0,weaponReady:false,strike:0});
 game.player.angle=Math.atan2(shore.water.y-game.player.y,shore.water.x-game.player.x);return {ok:true,message:'鱼竿已备好。'};
}
// 钓竿操作保留按住、松开和左右控竿，不能通过连点直接领取鱼获。
export function fishingControl(game,action,value=0){
 const f=game.fishing;if(!f||game.state!=='playing')return false;
 if(action==='cancel'){game.fishing=null;game.outdoorNotice='已收竿。';return true;}
 if(action==='lean'){f.lean=Math.max(-1,Math.min(1,Number(value)||0));return true;}
 if(action==='press'){
  if(f.phase==='ready'){f.phase='charging';f.elapsed=0;return true;}
  if(f.phase==='bite'){f.phase='fight';f.reeling=true;f.elapsed=0;f.tension=.3;f.progress=0;f.message='鱼儿上钩！按住收线，红区松手，左右拖动控竿。';game.onEvent('fishing-bite');return true;}
  if(f.phase==='fight'){f.reeling=true;return true;}
  if(['waiting','nibble'].includes(f.phase)){f.phase='missed';f.elapsed=0;f.message='提竿太早，鱼饵还在被试探。';return true;}
 }
 if(action==='release'){
  f.reeling=false;if(f.phase!=='charging')return true;
  const next=validateProgress(structuredClone(game.progress)),baitId=f.baitId||'bait';if(baitCount(next.outdoors,baitId)<1||!f.odds?.length){f.phase='ready';f.message='鱼饵不足或当前搭配没有可钓鱼，请收竿调整。';return false;}if(baitId==='bait')next.outdoors.bait--;else next.outdoors.baits[baitId]--;
  const result=commit(game,next,'鱼饵已挂好，浮漂入水。');if(!result.ok){f.phase='ready';f.message=result.message;return false;}
  // 蓄力越充分，浮漂越靠近湖心；候选点始终校验真实湖水边界。
  const edge=f.shore.water,center=f.mineDepth?edge:nearest(f.shore.lake,edge),dx=center.x-edge.x,dy=center.y-edge.y,length=Math.hypot(dx,dy)||1;
  const water={x:edge.x+dx/length*f.charge*35,y:edge.y+dy/length*f.charge*35};f.water=f.mineDepth?mineCastWater(game,f.shore,f.charge):touchesLandform(f.shore.lake,water.x,water.y)?water:edge;
  f.phase='casting';f.elapsed=0;f.wait=3+(game.random?.()??Math.random())*3;f.species=sampleFishingOdds(f.odds,game.random?.()??Math.random()).index;
  const fish=FISH_SPECIES[f.species];f.size=Math.round((fish.minSize+(game.random?.()??Math.random())*(fish.maxSize-fish.minSize))*10)/10;f.message='浮漂入水，等它稳定下来。';return true;
 }return false;
}
// 上岸后保留或放流由玩家决定，保存失败仍留在待结算阶段以便重试。
export function finishFishing(game,keep){
 const f=game.fishing;if(!f||f.phase!=='landed')return {ok:false,message:'还没有钓起鱼。'};
 if(!keep){game.fishing=null;game.outdoorNotice='鱼儿摆尾游回湖里了。';return {ok:true,message:game.outdoorNotice};}
 const fish=FISH_SPECIES[f.species],next=validateProgress(structuredClone(game.progress));
 if(Object.values(next.outdoors.fish).reduce((a,b)=>a+b,0)>=R.maxFish)return {ok:false,message:'鱼护已满，先出售鱼获或放流。'};
 const record=next.outdoors.collection[fish.id],first=record.count===0;record.count++;record.best=Math.max(record.best,f.size);
 next.outdoors.fish[fish.id]++;next.outdoors.caught++;next.outdoors.best=Math.max(next.outdoors.best,f.size);
 if(catLoad(Object.assign(Object.create(game),{progress:next})).overloaded)return {ok:false,message:'背包负重不足，可以放流或先收好其他物品。'};
 const result=commit(game,next,`${fish.name} ${f.size} 厘米，已放入鱼护。`);if(result.ok){game.fishing=null;result.catch={id:fish.id,size:f.size,first};}return result;
}
// 浮漂、鱼影、张力和竿梢共用这一游戏时钟，菜单、失焦及暂停时完全冻结。
export function updateOutdoors(game,dt){
 const f=game.fishing,s=game.campSleep;if(!f&&!s)return;
 // 进入房间或独立玩法时即撤销野外动作，避免活动提前返回让旧操作条滞留。
 const mineSession=f?.mineDepth&&game.cottage===f.mineRoom&&game.cottage.kind==='mine'&&(game.cottage.depth||1)===f.mineDepth;
 if(game.realm||game.story||(game.cottage&&!mineSession)||(f?.mineDepth&&!mineSession)||game.fireActive||game.campDefense||game.workshopTrial||game.player.hp<=0||game.mapId!==(f||s).mapId){game.fishing=null;game.campSleep=null;return;}
 if(game.state!=='playing'||dt<=0)return;
 const reason=outdoorReason(game,{fishing:!!f});
 if(reason||(f&&game.player.hp<f.hp)||(f&& (f.mapId!==game.mapId||game.vehicle.active||worldDistance(f.origin,game.player)>30))||(s&&(s.mapId!==game.mapId||game.player.hp<s.hp||game.vehicle.active||worldDistance(s.bed,game.player)>R.campReach+60))){game.fishing=null;game.campSleep=null;game.outdoorNotice=reason||'动作已中断，请重新准备。';return;}
 game.player.vx=game.player.vy=0;
 if(s){s.elapsed+=dt;const q=Math.min(1,s.elapsed/.6);game.player.x=s.origin.x+(s.bed.x-s.origin.x)*q;game.player.y=s.origin.y+(s.bed.y-s.origin.y)*q;if(s.elapsed>=R.sleepSeconds){const next=validateProgress(structuredClone(game.progress));next.living.calendar={...s.target};const result=commit(game,next,'睡醒了，生命已恢复，营地还在原处。',game.maxHp());game.outdoorNotice=result.message;game.campSleep=null;}return;}
 f.elapsed+=dt;f.clock+=dt;
 if(f.phase==='charging'){f.charge=Math.min(1,f.elapsed/R.chargeSeconds);return;}
 if(f.phase==='casting'&&f.elapsed>=R.flightSeconds){f.phase='waiting';f.elapsed=0;f.message='等漂 · 轻晃只是试探，下沉再扬竿。';}
 else if(f.phase==='waiting'&&f.elapsed>=f.wait){f.phase='nibble';f.elapsed=0;f.message='鱼在试饵……别急，留意浮漂。';}
 else if(f.phase==='nibble'&&f.elapsed>=1.5){f.phase='bite';f.elapsed=0;f.message='黑漂！现在扬竿！';game.onEvent('fishing-bite');}
 else if(f.phase==='bite'&&f.elapsed>R.biteSeconds){f.phase='missed';f.elapsed=0;f.message='晚了一点，鱼儿已经吐饵。';}
 else if(f.phase==='fight'){
  const fish=FISH_SPECIES[f.species];f.pull=.5+.5*Math.sin(f.elapsed*1.8+f.species);f.direction=Math.sin(f.elapsed*1.3+f.species)>.0?1:-1;
  const counter=f.lean*f.direction<-.25;
  f.tension=Math.max(0,Math.min(1.1,f.tension+dt*(f.reeling?.1+f.pull*.22*fish.strength/(FISHING_RODS[f.rodId]?.control||1)-(counter?.12:0):-.3)));
  f.progress=Math.max(0,Math.min(1,f.progress+dt*(f.reeling&&f.tension<.88?.095+(counter?.025:0):-.018)));
  f.slack=f.tension<.04?(f.slack||0)+dt:0;
  if(f.tension>=1||f.slack>3||f.elapsed>65){f.phase='missed';f.elapsed=0;f.message=f.tension>=1?'鱼线绷断了，下次红区记得松手。':'鱼挣脱了，保持适度张力再试一次。';}
  else if(f.progress>=1){f.phase='landed';f.elapsed=0;f.reeling=false;f.message=`钓到了${fish.name}！${f.size} 厘米，收进鱼护还是放流？`;game.onEvent('fishing-caught');}
  else f.message=f.tension>.76?'绷得太紧！松手放线。':f.pull>.72?`鱼儿向${f.direction>0?'右':'左'}冲刺，适时松线稳住竿梢。`:`按住收线，向${f.direction>0?'左':'右'}压竿抵住鱼的拉力。`;
 }else if(f.phase==='missed'&&f.elapsed>2.3){game.fishing=null;game.outdoorNotice=f.message;}
}
