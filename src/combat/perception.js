import {surfaceTargetVisible} from '../world/surface-vision.js';
import {bossCombatActive} from '../core/battle/boss-engagement.js';
// 首次发现与持续交战分开：画面发现敌人，武器射程决定能否继续攻击。
import {AUTO_AIM_VIEW} from '../config/combat-perception.js';
import {nearest, worldDistance, WORLD} from '../world/coordinates.js';

// 同一半幅地图内先用包围盒排除远目标；接缝与近目标仍走原精确世界距离。
export function attackTargetDistance(game, target, limit) {
 const x = Math.abs(target.x - game.player.x), y = Math.abs(target.y - game.player.y);
 // 外扩一个单位只减少粗筛命中，不扩大实际射程，边界舍入留给原规则处理。
 if (x > limit + 1 && x < WORLD.width / 2 - 1 || y > limit + 1 && y < WORLD.height / 2 - 1) return Infinity;
 return worldDistance(target, game.player);
}

// 正式镜头包含缩放与前场偏移；无画布的离线规则模拟保持原射程。
export function combatView(game){
 const size=game.viewport,provided=game.summonView||game.arrivalView;
 if(!size&&!provided)return null;
 const width=size?.width||provided.width,height=size?.height||provided.height;
 const valid=provided&&(game.summonView||provided.width===width&&provided.height===height);
 const kind=valid?null:game.weapon?.().id,base=width<500?.85:1.05;
 const zoom=['sniper','funnel'].includes(kind)?width<500?.6:.75:kind==='pulse'?base/1.2:base;
 return valid?provided:{left:-width/zoom/2,right:width/zoom/2,top:-height/zoom/2+30,bottom:height/zoom/2+30};
}
// 使用同一世界坐标视口判断敌人是否已进入画面。
export function attackTargetVisible(game,target){
 if(!surfaceTargetVisible(game,target))return false;
 const view=combatView(game);if(!view)return true;
 const observer=game.summonViewOrigin||game.player,p=nearest(target,observer),x=p.x-observer.x,y=p.y-observer.y;
 const radius=target.radius||12,body=target.kind==='boar'?AUTO_AIM_VIEW.boar:{
  halfWidth:radius,above:radius+AUTO_AIM_VIEW.headroom,below:radius,
 },lift=target.z||0;
 return x+body.halfWidth>=view.left&&x-body.halfWidth<=view.right&&
  y-lift+body.below>=view.top&&y-lift-body.above<=view.bottom;
}
// 查询保持只读；已发现或已命中的敌人出屏仍可交战，射程和存活由各武器校验。
export function attackTargetKnown(game,target){
 if(!surfaceTargetVisible(game,target))return false;
 // 已脱战领主不再被远程自动锁定，接战距离由战斗规则统一控制。
 if(target===game.boss&&!bossCombatActive(game))return false;
 return attackTargetVisible(game,target)||target.type!=='tree'&&game.combatSight?.has(target)&&game.combatSight.get(target)===target.id;
}
// 只在正式更新和命中时记忆实体及其编号，避免复用实体或同编号新怪继承旧目标资格。
export function rememberCombatTarget(game,target){
 if(target.type==='tree'||target.hp<=0)return;
 game.combatSight??=new WeakMap();game.combatSight.set(target,target.id);
}
// 每帧观察存活敌人，不把渲染查询变成状态写入，也不记忆未出场的刷怪点。
export function updateCombatPerception(game){
 for(const target of [...game.enemies,...(game.boss?[game.boss]:[])])
  if(target.hp>0&&attackTargetVisible(game,target))rememberCombatTarget(game,target);
}
