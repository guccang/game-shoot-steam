import { GAMEPLAY_VALUES } from '../../config/gameplay-values.js';
// 守护敌人从主场景外围随机空地入场，不复用固定入口或道路折点。
import { blocked } from '../../physics/motion.js';

// 检查整段进攻通道，防止新出生的敌人被森林树干隔在女神之外。
function clearApproach(game, point, radius) {
  const target=game.realm.goddess, distance=Math.hypot(point.x-target.x,point.y-target.y);
  const steps=Math.ceil(distance/18);
  for(let i=0;i<=steps;i++) {
    const t=i/steps;
    if(blocked(point.x+(target.x-point.x)*t,point.y+(target.y-point.y)*t,radius,game.trees,{arena:game.realm.arena}))return false;
  }
  return true;
}

// 每次刷新重新抽方向和距离；没有安全落点则稍后重试，绝不改为贴脸或祭坛中心出生。
export function guardianSpawnPoint(game, isBoss=false) {
  const a=game.realm.arena, radius=isBoss?GAMEPLAY_VALUES.realm.bossRadius:GAMEPLAY_VALUES.realm.spawnCollisionRadius;
  const start=game.random()*Math.PI*2, band=game.random();
  for(let i=0;i<GAMEPLAY_VALUES.guardian.spawnAttempts;i++) {
    const angle=start+i*2.399963229728653;
    const distance=a.radius*(GAMEPLAY_VALUES.guardian.spawnRadiusRatio+GAMEPLAY_VALUES.guardian.spawnBandRatio*((band+i*.38196601125)%1));
    const p={x:a.x+Math.cos(angle)*distance,y:a.y+Math.sin(angle)*distance};
    if(Math.hypot(p.x-game.player.x,p.y-game.player.y)<GAMEPLAY_VALUES.guardian.spawnPlayerDistance+radius)continue;
    if(game.enemies.some(e=>e.hp>0&&Math.hypot(p.x-e.x,p.y-e.y)<radius+(e.radius||GAMEPLAY_VALUES.realm.normalRadius)+GAMEPLAY_VALUES.guardian.spawnEnemyPadding))continue;
    if(game.boss&&Math.hypot(p.x-game.boss.x,p.y-game.boss.y)<radius+GAMEPLAY_VALUES.guardian.spawnBossPadding)continue;
    if(clearApproach(game,p,radius))return p;
  }
  return null;
}
