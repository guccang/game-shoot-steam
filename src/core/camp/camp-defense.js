import {currentCampDefenseGate} from '../../world/camp-defense-gates.js';
import {findCampOffscreenSpawn} from './camp-defense-arrival.js';
import {facilityOpen} from '../../config/town-restoration.js';
import {awardCampXp} from '../../progression/camp/camp-level.js';
import { creditResource } from '../../progression/economy/resource-wallet.js';
import {recordActivity} from '../../progression/player/game-statistics.js';
import {rewardReceipt} from '../../progression/economy/reward-receipt.js';
// 营地守门会话：原森林整体冻结，独立怪潮与救场仅在本局结算资源。
import {campDefensePost,CAMP_DEFENSE,campDefenseGrade,campDefenseReward,campDefenseWave,campDefenseBoss,CAMP_DEFENSE_GROWTH_VERSION} from '../../config/camp-defense.js';
import {HORDE_GIANT} from '../../config/bosses.js';
import {validateProgress} from '../../progression/progress.js';
import {validateCampDefense} from '../../progression/camp/camp-defense.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {captureRealmVehicles,restoreRealmVehicles} from '../realms/realm-vehicles.js';
import {worldDistance,nearest} from '../../world/coordinates.js';
import {summonVehicle} from '../../combat/vehicle.js';
import {recordMainlineCombat} from '../../progression/story/mainline-combat.js';
import {updateMainline} from '../story/mainline-manager.js';
import {clearWorldNavigation} from '../navigation/world-navigation.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {prepareCampAllies,updateCampAllies} from './camp-rescue.js';
const SHARED=new Set(['progress','random','onEvent','profiler','viewport','campDefense','campDefensePersist']);

// 入口跟随当前站牌，清缴或故事未结束时不切换现场。
export function canStartCampDefense(game,gate){return facilityOpen(game.progress,'defense')&&!!gate&&!game.campDefense&&!game.arrivalCinematic&&!game.story&&!game.realm&&!game.fireActive&&!game.boss&&!game.livingBattle&&!game.progress.living.patrolActive&&game.mapId==='forest'&&['playing','paused'].includes(game.state)&&worldDistance(game.player,campDefensePost(game.progress,gate))<=160;}
// 活动开始与恢复共用数据；断线重建本波未击败配额，不重复已获得的成绩。
export function startCampDefense(game,gateId,saved=null){
 const gate=currentCampDefenseGate(game.progress,gateId);if(!gate||!saved&&!canStartCampDefense(game,gate))return false;
 // 读档先恢复冻结的森林车库，避免局内换车或损毁覆盖退出后的驾驶状态。
 if(saved?.forestVehicles)restoreRealmVehicles(game,saved.forestVehicles);
 const forestVehicles=captureRealmVehicles(game);
 const patrol=capturePatrol(game),forest=Object.fromEntries(Object.entries(game).filter(([key])=>!SHARED.has(key)));
 game.reset();
 const rounds=saved?.rounds??game.progress.campDefense.runs;
 const barrier={type:'camp-barricade',x:gate.x+gate.nx*65,y:gate.y+gate.ny*65,radius:30,attackRadius:24};
 const arena={x:barrier.x+gate.nx*170,y:barrier.y+gate.ny*170,radius:CAMP_DEFENSE.radius,terrain:'forest',campProgress:{campLand:game.progress.campLand,campLayout:game.progress.campLayout}};
 game.campDefense={gateId,rounds,wave:1,cleared:0,waveKills:0,kills:0,gateHp:CAMP_DEFENSE.gateHp,elapsed:0,phase:'waves',reason:null,bossDefeated:false,bossHp:campDefenseBoss(rounds).hp,allies:[],...saved,forest,patrol,gate,barrier,arena,timer:CAMP_DEFENSE.rest,spawnTimer:0,rescueTime:0,helpers:[],error:''};
 const r=game.campDefense;r.forestVehicles=forestVehicles;r.spawned=r.waveKills;r.barrier.hp=r.gateHp;r.barrier.maxHp=CAMP_DEFENSE.gateHp;
 game.trees=game.trees.filter(t=>worldDistance(t,arena)>arena.radius+80);
 game.player.arena=arena;game.player.livingCollision=false;
 Object.assign(game.player,{x:barrier.x+gate.nx*90,y:barrier.y+gate.ny*90,hp:game.maxHp()});game.state='playing';
 // 恢复本局车型、乘坐、耐久和供给；旧档缺少局内检查点时沿用入场前的驾驶姿态。
 if(saved?.vehicles)restoreRealmVehicles(game,saved.vehicles);
 else if(forest.vehicle?.active)summonVehicle(game);
 if(['boss-ready','boss'].includes(r.phase))spawnCampBoss(game);
 if(r.phase==='rescue')prepareCampAllies(game);
 if(r.phase==='result')game.state='paused';
 if(!saved)recordActivity(game.progress,'defense');
 syncCampDefense(game);game.onEvent('camp-defense-change');return true;
}
// 本局目标可沿拒马横梁分散，敌人不能从侧面绕进营地。
export function campBarricadeTarget(game,enemy){
 const r=game.campDefense;if(!r||r.phase==='rescue'||r.phase==='result')return null;
 const p=nearest(enemy,r.barrier),t=Math.max(-66,Math.min(66,(p.x-r.barrier.x)*-r.gate.ny+(p.y-r.barrier.y)*r.gate.nx));
 return {...r.barrier,x:r.barrier.x-r.gate.ny*t,y:r.barrier.y+r.gate.nx*t};
}
// 每次攻击只扣一次实体耐久，破坏转入救场，不触发普通死亡或失败。
export function hurtCampBarricade(game,amount){const r=game.campDefense;if(!r||!['waves','boss'].includes(r.phase))return;r.gateHp=Math.max(0,r.gateHp-amount);r.barrier.hp=r.gateHp;r.barrier.flash=.2;if(!r.gateHp)rescueCampDefense(game,'barricade');}
// 全部波次完成后自动开启本轮领主，结算后仍需重新接取。
export function spawnCampBoss(game){const r=game.campDefense;if(!r||!['boss-ready','boss'].includes(r.phase)||game.boss)return false;
 const b=campDefenseBoss(r.rounds);r.phase='boss';r.timer=0;
 game.boss={id:game.nextId++,type:'boss',mapId:'forest',kind:b.kind,campDefense:true,x:r.barrier.x+r.gate.nx*300,y:r.barrier.y+r.gate.ny*300,hp:r.bossHp||b.hp,maxHp:b.hp,radius:HORDE_GIANT.radius,mass:24,flash:0,attack:2,speed:b.speed,damage:b.damage,blastDamage:b.blastDamage,ai:{phase:'chase',elapsed:0},arena:r.arena};
 syncCampDefense(game);game.onEvent('camp-defense-change');return true;}
// 击杀保留正式死亡残块；救场期间冻结玩家成绩，原清缴配额与掉落不增加。
export function campDefenseKill(game,target){const r=game.campDefense;if(!r||!target.campDefense)return false;
 if(r.phase==='spoils'||r.phase==='result')return true;
 if(target.type==='boss' && r.phase==='boss'){
   game.boss=null;
   game.hazards=[];
   r.bossDefeated=true;
   r.phase='spoils';
   r.spoils={x:target.x,y:target.y,elapsed:0};
   syncCampDefense(game);
   game.onEvent('camp-defense-change');
   return true;
 }
 game.remnants.push({...target,flash:0,life:.6,duration:.6,burst:true,burstDelay:0,reactionTime:0});if(game.remnants.length>20)game.remnants.shift();
 if(target.type==='boss'){game.boss=null;game.hazards=[];if(r.phase!=='rescue'){r.bossDefeated=true;finishCampDefense(game);}}
 else if(r.phase!=='rescue'){r.kills++;r.waveKills++;}return true;}
// 旁白与援军出营同时开始；救场不跳过实际射击，也不把敌人直接清空。
export function rescueCampDefense(game,reason){const r=game.campDefense;if(!r||!['death','barricade'].includes(reason)||['rescue','spoils','result'].includes(r.phase))return false;r.reason=reason;r.phase='rescue';r.rescueTime=0;prepareCampAllies(game);syncCampDefense(game);game.onEvent('camp-defense-change');return true;}
// 完成仅进入结算，领取按钮负责一次性资源事务。
function finishCampDefense(game){const r=game.campDefense;r.phase='result';game.state='paused';syncCampDefense(game);game.onEvent('camp-defense-change');}
// 普通波次与拒马耐久共享时钟；场外保存/暂停不推进，击退也不能把怪物推出战区。
export function updateCampDefense(game,dt){const r=game.campDefense;if(!r||game.state!=='playing')return;r.barrier.flash=Math.max(0,(r.barrier.flash||0)-dt);
 if(r.phase==='spoils'){
   r.spoils.elapsed+=dt;
   if(r.spoils.elapsed>=CAMP_DEFENSE.spoils.duration)finishCampDefense(game);
   return;
 }
 if(r.phase==='rescue'){if(updateCampAllies(game,dt))finishCampDefense(game);return;}r.elapsed+=dt;
 for(const e of [...game.enemies,...(game.boss?[game.boss]:[])])if(e.hp>0){const p=nearest(e,r.barrier),front=(p.x-r.barrier.x)*r.gate.nx+(p.y-r.barrier.y)*r.gate.ny;if(front<28){e.x+=r.gate.nx*(28-front);e.y+=r.gate.ny*(28-front);}}
 if(r.phase!=='waves')return;
 if(r.timer>0){r.timer=Math.max(0,r.timer-dt);return;}
 const wave=campDefenseWave(r.wave,r.rounds);r.spawnTimer-=dt;
 while(r.spawnTimer<=0&&r.spawned<wave.count&&game.enemies.filter(e=>e.hp>0).length<CAMP_DEFENSE.limit){
  const lateral=(game.random()-.5)*CAMP_DEFENSE.spawn.width,depth=CAMP_DEFENSE.spawn.depth+game.random()*CAMP_DEFENSE.spawn.depthSpread;
  // 部分名额沿有效视口外沿步行入场，其余沿用已外移的前场出生带。
  const outside=r.spawned%CAMP_DEFENSE.spawn.offscreenEvery===0?findCampOffscreenSpawn(game):null;
  const spot=outside||{x:r.barrier.x+r.gate.nx*depth-r.gate.ny*lateral,y:r.barrier.y+r.gate.ny*depth+r.gate.nx*lateral};
  const e=game.spawnEnemy(0,0,spot,{ambient:true,hordeOrdinal:r.spawned+1});
  // 兽潮等级来自本波配置，覆盖地图出生区域的等级，显示与战斗进度一致。
  Object.assign(e,{level:wave.level,campDefense:true,campRaider:r.spawned%4===0,arena:r.arena,hp:wave.hp,maxHp:wave.hp,damage:wave.damage,speed:wave.speed,reward:0});r.spawned++;r.spawnTimer+=wave.spawnInterval;
 }
 if(r.waveKills>=wave.count&&!game.enemies.some(e=>e.hp>0)){r.cleared=r.wave;if(r.wave>=CAMP_DEFENSE.waves.length){r.phase='boss-ready';spawnCampBoss(game);return;}else{r.wave++;r.waveKills=r.spawned=0;r.timer=CAMP_DEFENSE.rest;r.spawnTimer=0;}syncCampDefense(game);game.onEvent('camp-defense-change');}
}
// 保留本波已击败数量及评分，刷新不重发怪物掉落、不重抽救场装备。
export function syncCampDefense(game){const r=game.campDefense;if(!r)return;const {gateId,rounds,wave,cleared,waveKills,kills,gateHp,elapsed,phase,reason,bossDefeated,allies,rescueRoll,forestVehicles}=r;game.progress.campDefense.run=validateCampDefense({run:{growthVersion:CAMP_DEFENSE_GROWTH_VERSION,gateId,rounds,wave,cleared,waveKills,kills,gateHp,elapsed,phase,reason,bossDefeated,allies,rescueRoll,forestVehicles,vehicles:captureRealmVehicles(game),bossHp:game.boss?.hp??r.bossHp}}).run;}
// 成绩和钱包一次提交，保存失败留在结算页；成功才归还原森林与装备。
export function claimCampDefense(game){const r=game.campDefense;if(!r||r.phase!=='result')return false;
 const before=game.progress,grade=campDefenseGrade(r),reward=campDefenseReward(r),next=validateProgress(structuredClone(game.progress));
 for(const [key,amount] of Object.entries(reward))reward[key]=creditResource(next,key,amount);
 if(r.cleared===CAMP_DEFENSE.waves.length&&r.bossDefeated&&!r.reason)awardCampXp(next,'horde');
 next.campDefense.runs++;next.campDefense.run=null;if(!next.campDefense.best||['B','A','S'].indexOf(grade)>['B','A','S'].indexOf(next.campDefense.best))next.campDefense.best=grade;
 // 当前主线只认指定营门的真实结算；和奖励一起保存，失败或重复领取都不会推进。
 recordMainlineCombat(next,'camp-defense',{gate:r.gateId,won:r.cleared===CAMP_DEFENSE.waves.length&&r.bossDefeated&&!r.reason});
 next.patrol=r.patrol;recordEconomy(next,'income','camp-defense:'+grade,reward);
 // 森林选车随结算一起保存，防止局内换车后界面选择与归还车体不一致。
 next.vehicleIndex=r.forest.vehicle.index;next.vehicleLoadouts=r.forest.vehicles.map(v=>v.weaponIndex);
 let saved=false;try{saved=(game.campDefensePersist?.(next)??true)===true;}catch{}
 if(!saved){r.error='保存失败，奖励尚未领取，请重试。';return false;}
 Object.assign(game,r.forest);game.campDefense=null;game.progress=next;game.state='playing';
 // 成功领取后立即切换主线交付指引，撤销旧营门路线，避免奖励弹窗暂停期间仍提示重打。
 clearWorldNavigation(game);updateMainline(game,0);
 game.onEvent('camp-defense-complete');game.onEvent('task-reward',rewardReceipt(before,next,'营门守卫'));return true;
}

// 主动退出放弃本轮未结算奖励，先保存取消记录，再归还完整森林现场。
export function leaveCampDefense(game){
 const r=game.campDefense;if(!r||r.phase==='result'||r.phase==='spoils')return false;
 const next=validateProgress(structuredClone(game.progress));next.campDefense.run=null;next.patrol=r.patrol;
 // 取消同样恢复入场前的车型选择，保存失败时不修改当前现场。
 next.vehicleIndex=r.forest.vehicle.index;next.vehicleLoadouts=r.forest.vehicles.map(v=>v.weaponIndex);
 let saved=false;try{saved=(game.campDefensePersist?.(next)??true)===true;}catch{}
 if(!saved){r.error='保存失败，尚未退出，请重试。';return false;}
 Object.assign(game,r.forest);game.campDefense=null;game.progress=next;game.state='playing';
 game.onEvent('camp-defense-exit');return true;
}
