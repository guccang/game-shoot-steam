// 未完成的领主挑战与当前交战分开：远离或回营可整备，原血量和挑战资格继续保留。
import {BOSS_ENGAGEMENT} from '../config/boss-combat.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {worldDistance} from '../world/coordinates.js';
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';

// 所有生活交互读取同一判定；剧情、秘境和有封闭场地的战斗仍由原玩法管理。
export function bossCombatActive(game){
 const boss=game.boss;if(!boss||boss.hp<=0)return false;
 if(!livingForest(game))return true;
 // 主动暂停的清缴挑战不因玩家再次靠近而开战，须先在告示牌恢复。
 if(boss.livingChallenge&&!game.progress.living.patrolActive)return false;
 if(!game.player||!Number.isFinite(boss.x)||!Number.isFinite(boss.y))return true;
 if(game.cottage||livingSafePoint(game.player))return false;
 return worldDistance(game.player,boss)<(boss.disengaged?BOSS_ENGAGEMENT.returnDistance:BOSS_ENGAGEMENT.leaveDistance);
}

// 脱战取消未完成技能和所属援兵，不结算击杀、回血或清空波次；重返时重新给予预警。
export function updateBossEngagement(game){
 const boss=game.boss;if(!boss||boss.hp<=0||!livingForest(game)||game.state!=='playing')return;
 const disengaged=!bossCombatActive(game);if(!!boss.disengaged===disengaged)return;
 changeBossEngagement(game,disengaged);
}
// 清缴暂停事务提交后可在弹窗暂停状态立即清除攻击；保存失败不得调用。
export function pauseClearingBoss(game){
 if(game.boss?.livingChallenge&&livingForest(game)&&!game.progress.living.patrolActive)changeBossEngagement(game,true);
}
// 脱战与主动暂停共用清理，保留 Boss 实体、血量、位置及挑战资格。
function changeBossEngagement(game,disengaged){
 const boss=game.boss;boss.disengaged=disengaged;
 boss.ai={phase:'chase',elapsed:0};boss.attack=GAMEPLAY_VALUES.boss.firstAttackDelay;
 boss.pushX=boss.pushY=boss.knockTime=0;
 game.hazards=game.hazards.filter(h=>h.owner!==boss.id);
 if(boss.support)Object.assign(boss.support,{timer:0,warning:0,pending:0,spacing:0,remaining:0});
 if(disengaged){
  const summons=new Set(game.enemies.filter(e=>e.bossOwner===boss.id).map(e=>e.id));
  game.enemies=game.enemies.filter(e=>!summons.has(e.id));
  game.enemyBolts=game.enemyBolts.filter(b=>!summons.has(b.owner));
  game.aimLock=null;
 }
}
