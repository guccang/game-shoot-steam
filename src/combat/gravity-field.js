// 引力场由真实弹丸落点产生，牵引只改变战斗敌人的位置，不伪造击杀或奖励。
import {nearest,WORLD,worldDistance} from '../world/coordinates.js';
import {moveBody} from '../physics/motion.js';
import {SpatialGrid} from '../world/spatial-grid.js';
import {hitCenter,traceTargets} from './collision.js';
import {terrainLineClear} from '../physics/terrain-navigation.js';

// 场景身份隔离，切换地图、秘境或故事后不复活旧场地的控制效果。
export function currentGravityFields(game){return (game.gravityFields||[]).filter(f=>f.mapId===game.mapId&&f.scene===(game.realm||game.story||null)&&f.life>0);}
// 只限制场中心离身，允许牵引范围覆盖近敌；挂载炮口不替代真实玩家位置。
export function gravityPointSafe(game,bullet,point=bullet){
 return !bullet.gravityRadius||worldDistance(point,game.player)>=(bullet.gravityMinDistance??150);
}
// 沿真实弹道规划投送长度：近敌在离身圆外就近展开，远敌保持实际命中距离，预览共用。
export function gravityFlightRange(game,weapon,muzzle,direction,targets,independentMuzzle=false){
 const owner=nearest(game.player,muzzle),x=muzzle.x-owner.x,y=muzzle.y-owner.y;
 // 多留10单位给正常移动和帧间变化，防止弹丸每次只差一点而反复延长飞行。
 const projection=x*direction.x+y*direction.y,minimum=(weapon.gravityMinDistance??150)+10;
 // 解射线与离身圆的远交点，覆盖独立炮口从外侧朝玩家射击以及循环地图接缝。
 const exit=Math.max(0,-projection+Math.sqrt(Math.max(0,projection*projection+minimum*minimum-x*x-y*y)));
 const end={x:muzzle.x+direction.x*weapon.range,y:muzzle.y+direction.y*weapon.range};
 // 骑手或长枪口可能已越过贴身怪；仍把这类近敌作为投送依据，独立炮口不借用玩家到炮口的线段。
 const close=!independentMuzzle&&traceTargets(hitCenter(game.player),muzzle,targets,weapon.hitRadius||5).some(h=>h.target.type!=='tree');
 const hit=close?null:traceTargets(muzzle,end,targets,weapon.hitRadius||5).find(h=>h.target.type!=='tree');
 // 略越过接触边界，避免浮点舍入使弹丸在碰撞前耗尽、只建场却漏掉直接伤害。
 return Math.min(weapon.range,Math.max(exit,hit?hit.t*weapon.range+.01:exit));
}
// 一颗引力弹只落地一次，最多保留三处场，密集挂载不会无限累积。
export function landGravityField(game,bullet){
 if(!bullet.gravityRadius||bullet.fieldCreated)return;
 bullet.fieldCreated=true;
 // 玩家在飞行期间追上弹丸时直接消散，不能把落点瞬移到远处或在身边补建场。
 if(!gravityPointSafe(game,bullet))return;
 // 挂载武器使用继承式战斗代理；原地更新共享数组，避免近距离命中把场藏在代理上。
 const fields=game.gravityFields||(game.gravityFields=[]);fields.splice(0,fields.length,...currentGravityFields(game));fields.push({x:bullet.x,y:bullet.y,mapId:game.mapId,scene:game.realm||game.story||null,radius:bullet.gravityRadius,life:bullet.gravityDuration,duration:bullet.gravityDuration,pull:bullet.gravityPull});
 if(fields.length>3)fields.splice(0,fields.length-3);
}
// 每个敌人只承受最强一处场，保留碰撞和领主抗性；死体、居民与玩家不参与。
export function updateGravityFields(game,dt){
 const fields=currentGravityFields(game);game.gravityFields=fields;if(!fields.length||dt<=0)return;
 const trees=new SpatialGrid(game.trees);trees.mineScene=game.trees.mineScene;const targets=[...game.enemies,...(game.boss?[game.boss]:[])];
 for(const target of targets){
  if(target.hp<=0||!['enemy','boss'].includes(target.type))continue;
  let best=null,strength=0;
  for(const field of fields){const point=nearest(field,target),distance=Math.hypot(point.x-target.x,point.y-target.y);
   if(distance>=field.radius||distance<20||game.combatLineClear&&!game.combatLineClear(field,target))continue;
   const force=field.pull*(.35+.65*(1-distance/field.radius));if(force>strength){strength=force;best={point,distance,field};}
  }
  if(!best)continue;
  const distance=Math.min(best.distance-20,strength*(target.type==='boss'?.18:1)*Math.min(dt,best.field.life));
  moveBody(target,(best.point.x-target.x)/best.distance*distance,(best.point.y-target.y)/best.distance*distance,WORLD,target.radius||12,trees);
 }
 for(const field of fields)field.life-=dt;game.gravityFields=fields.filter(f=>f.life>0);
}
// 256毫米重炮在首次碰撞爆破，主目标不重复吃溅射；地形阻挡隔山伤害。
export function explodeHeavyShell(game,bullet,directTarget){
 if(!bullet.blastRadius||bullet.exploded)return;bullet.exploded=true;
 for(const target of [...game.enemies,...(game.boss?[game.boss]:[])]){
  if(target===directTarget||target.hp<=0||worldDistance(hitCenter(target),bullet)>bullet.blastRadius)continue;
  if(game.combatLineClear&&!game.combatLineClear(bullet,hitCenter(target)))continue;
  if(!game.combatLineClear&&(!target.arena||target.arena.terrain==='forest')&&!terrainLineClear(bullet,hitCenter(target),0))continue;
  const at=nearest(hitCenter(target),bullet),distance=Math.max(1,Math.hypot(at.x-bullet.x,at.y-bullet.y));
  game.hit(target,Math.round(bullet.amount*bullet.blastRatio),bullet.critical,{x:at.x,y:at.y,direction:{x:(at.x-bullet.x)/distance,y:(at.y-bullet.y)/distance},impulse:bullet.impulse*.55,power:bullet.impactScale,kind:'wolf-256',weaponIndex:bullet.weaponIndex,statisticsSource:bullet.statisticsSource,audioSource:bullet.audioSource});
 }
 game.fx.add('ring',bullet.x,bullet.y,.45,{size:bullet.blastRadius,color:'#f0c58c'});
 game.fx.add('pressure',bullet.x,bullet.y,.35,{size:bullet.blastRadius*.8,angle:0,color:'#e5a471'});
 game.onEvent('explosion');
}
