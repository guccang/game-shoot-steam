// 领主援兵只由统一召唤招式触发，不再通过后台自动计时叠加刷怪。
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';
import {bossCombatActive} from './boss-engagement.js';
import {BOSS_SUPPORT as RULES} from '../config/boss-combat.js';
import {findNearbyArrivalSpot} from './enemy-arrival.js';
import {livingWaveAllowed} from './living-safety.js';
import {worldDistance} from '../world/coordinates.js';
import {livingForest} from '../world/living-spaces.js';
import {WAVE_ARRIVAL} from '../config/waves.js';

// 调度仅属于本次战斗；读档后重新由三招循环触发，不恢复半次无预警召唤。
export function createBossSupport(){return {timer:0,warning:0,pending:0,spacing:0,remaining:0};}

// 故事、秘境及守门沿用自己的战斗阶段，普通清缴仍受安全区和离场限制。
function supportAllowed(game){
 if(game.state!=='playing'||!game.boss||game.boss.hp<=0||game.workshopTrial||game.arrivalCinematic||game.fireActive)return false;
 if(game.realm)return game.realm.phase==='combat';
 if(game.story)return game.story.phase==='active';
 if(game.campDefense)return game.campDefense.phase==='boss';
 return bossCombatActive(game)&&livingWaveAllowed(game);
}

// 正常两只、半血三只；满员时跳过召唤招式，不无效蓄力，也不额外追加一批。
export function beginBossSupport(game){
 if(!supportAllowed(game))return false;
 const boss=game.boss,s=boss.support||=createBossSupport(),alive=game.enemies.filter(e=>e.hp>0);
 if(s.pending||s.warning)return false;
 const count=Math.min(boss.hp/boss.maxHp<=GAMEPLAY_VALUES.boss.supportEnrageHealth?GAMEPLAY_VALUES.boss.enragedSupportBatch:GAMEPLAY_VALUES.boss.supportBatch,
  RULES.cap-alive.filter(e=>e.bossOwner===boss.id).length,RULES.fieldCap-alive.length);
 if(count<=0)return false;
 Object.assign(s,{pending:count,warning:RULES.warning,spacing:0,remaining:RULES.warning+2.4});
 game.onEvent('boss-support',{count,seconds:RULES.warning});return true;
}

// 场地内的援兵不能越过竞技场边界；找不到安全落点时不贴身兜底。
function supportSpot(game,boss){
 // 清缴领主援兵沿用波次的离岸距离，其他玩法保留各自的出生范围。
 const range=livingForest(game)&&game.progress.living.patrolActive?{...RULES,riverClearance:WAVE_ARRIVAL.riverClearance}:RULES;
 for(let i=0;i<(boss.arena?8:1);i++){
  const spot=findNearbyArrivalSpot(game,game.nextId+i,range);
  if(spot&&(!boss.arena||worldDistance(spot,boss.arena)<=boss.arena.radius-24))return spot;
 }
 return null;
}

// 首领死亡时同时撤走所属援兵，不结算额外击杀，也不误删场上原有怪物。
export function dismissBossSummons(game,owner){
 for(const enemy of game.enemies)if(enemy.bossOwner===owner)enemy.hp=0;
 game.enemies=game.enemies.filter(e=>e.bossOwner!==owner);
}

// 已预警批次逐只入场；暂停冻结，离场取消，召唤窗口结束后不再无限重试。
export function updateBossSupport(game,dt){
 if(game.state!=='playing')return;
 const boss=game.boss;
 if(!boss||boss.hp<=0){
  if(!game.enemies.some(enemy=>enemy.bossSummon))return;
  for(const enemy of game.enemies)if(enemy.bossSummon)enemy.hp=0;
  game.enemies=game.enemies.filter(e=>!e.bossSummon);return;
 }
 const s=boss.support||=createBossSupport();
 if(!supportAllowed(game)){Object.assign(s,createBossSupport());return;}
 if(!s.pending)return;
 s.remaining=Math.max(0,s.remaining-dt);
 if(!s.remaining){Object.assign(s,createBossSupport());return;}
 if(s.warning>0){s.warning=Math.max(0,s.warning-dt);return;}
 const alive=game.enemies.filter(e=>e.hp>0);
 if(alive.filter(e=>e.bossOwner===boss.id).length>=RULES.cap||alive.length>=RULES.fieldCap){Object.assign(s,createBossSupport());return;}
 s.spacing-=dt;if(s.spacing>0)return;
 s.spacing=RULES.spacing;
 const spot=supportSpot(game,boss);if(!spot)return;
 const enemy=game.spawnEnemy(0,0,spot,{bossOwner:boss.id,bossSummon:true});
 enemy.bossSummon=true;
 if(boss.arena)enemy.arena={...boss.arena};
 // 专属活动援兵按该场首领强度缩放，不借用森林波次，也不携带额外通关配额。
 if(game.realm||game.story||game.campDefense){
  enemy.hp=enemy.maxHp=Math.max(enemy.maxHp,Math.round(boss.maxHp*RULES.bossHealthRatio));
  enemy.damage=Math.max(1,Math.round((boss.blastDamage??30)*.35));enemy.reward=0;
  if(game.realm?.mode==='guardian')enemy.goddessTarget=true;
 }
 if(--s.pending===0)Object.assign(s,createBossSupport());
}
