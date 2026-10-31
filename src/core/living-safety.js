import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 安宁边界统一约束出生、追击、投射物与伤害，不影响章节或秘境。
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {moveBody} from '../physics/motion.js';
import {WORLD,nearest,worldDistance} from '../world/coordinates.js';
import {clearingSite} from '../progression/clearing-site.js';
import {CLEARING_HUD_RADIUS_SCALE} from '../config/clearing.js';
// 常规森林只有明确接取巡护后才累计自动波次；安全范围冻结计时。
export function livingWaveAllowed(game){if(game.campDefense||game.story||game.realm||game.fireActive||game.arrivalCinematic||game.workshopTrial)return false;return !livingForest(game)?game.mapId!=='jiuzhaigou':!!game.progress.living.patrolActive&&!game.livingBattle&&!livingSafePoint(game.player)&&worldDistance(game.player,clearingSite(game.progress))<=clearingSite(game.progress).radius;}
// 清缴展示范围扩大50%，安全区和其他活动仍优先；不改变刷怪与领主挑战条件。
export function clearingCombatActive(game){
 const site=clearingSite(game.progress);
 return livingForest(game)&&!!game.progress.living.patrolActive&&!game.livingBattle&&!livingSafePoint(game.player)&&worldDistance(game.player,site)<=site.radius*CLEARING_HUD_RADIUS_SCALE;
}
// 安宁地点不会成为战斗目标；从危险支路走回聚落仍有完整伤害保护。
export function livingProtected(game){return livingForest(game)&&livingSafePoint(game.player);}
// 敌人遇到安全边界转向离开；不记击杀、不发奖，也不在镜头内凭空消失。
export function retreatLivingEnemy(game,enemy,dt){
  if(!livingForest(game)||(!livingSafePoint(enemy)&&!livingSafePoint(game.player)))return false;
  const p=nearest(game.player,enemy);let dx=enemy.x-p.x,dy=enemy.y-p.y;
  if(Math.hypot(dx,dy)<1){dx=1;dy=1;}
  // 出生点也在安全地带的历史存档沿最近可离开的射线退走。
  if(!enemy.livingRetreat){let best=null;
    for(let i=0;i<16;i++)for(let distance=100;distance<=900;distance+=100){const a=i*Math.PI/8,point={x:enemy.x+Math.cos(a)*distance,y:enemy.y+Math.sin(a)*distance};if(!livingSafePoint(point)){if(!best||distance<best.distance)best={...point,distance};break;}}
    enemy.livingRetreat=best||{x:enemy.x+dx,y:enemy.y+dy};}
  const target=enemy.livingRetreat,distance=Math.hypot(target.x-enemy.x,target.y-enemy.y);
  if(distance>GAMEPLAY_VALUES.living.retreatReach)moveBody(enemy,(target.x-enemy.x)/distance*GAMEPLAY_VALUES.living.retreatSpeed*dt,(target.y-enemy.y)/distance*GAMEPLAY_VALUES.living.retreatSpeed*dt,WORLD,enemy.radius||12,game.trees);
  enemy.flash=Math.max(0,(enemy.flash||0)-dt);return true;
}
