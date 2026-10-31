import {statisticsSource} from './statistics-source.js';
// 手持枪与独立炮口共用发射表现和弹道，特殊穿透、喷流及连锁不复制实现。
import { fireBallistics } from './ballistics.js';
import { gatlingShotColor } from './weapon-heat.js';
import { cutWithChainsaw } from './melee.js';
import { fireTidePair } from './tide-cannon.js';

// 伤害与来源由调用方快照；炮体使用独立炮口，避免角色到炮口的幽灵命中。
export function emitWeaponAttack(
  game,
  weapon,
  muzzle,
  direction,
  amount,
  critical,
  independentMuzzle = false,
  magazine = null,
) {
  weapon={...weapon,statisticsSource:statisticsSource(game,weapon)};
  if(weapon.id==='hover-tide'){
    fireTidePair(game,weapon,muzzle,direction,amount,critical,magazine);
    return;
  }
  if (weapon.attackKind === 'melee') {
    cutWithChainsaw(game, weapon, muzzle, direction, amount, critical, independentMuzzle);
    return;
  }
  // 只快照表现色，各种持有方式共享真实弹夹，其他弹道参数保持原值。
  if (weapon.id === 'gatling') weapon = { ...weapon, color: gatlingShotColor(weapon, magazine) };
  if(['tank-125','wolf-256'].includes(weapon.id)){
    const angle=Math.atan2(direction.y,direction.x);
    game.fx.add('pressure',muzzle.x,muzzle.y,.3,{size:58,angle,color:'#f4dca0'});
    if(!game.reducedMotion)for(let i=0;i<5;i++)game.fx.add('smoke',muzzle.x,muzzle.y,.35+i*.035,{vx:direction.x*(30+i*12),vy:direction.y*(30+i*12),size:7+i*2,color:'#b8bea1'});
  }
  if (!['funnel', 'drone','tank-125','wolf-256','gravity-gun'].includes(weapon.id))
    game.fx.fire(muzzle, Math.atan2(direction.y, direction.x), weapon.id === 'laser', weapon.id);
  fireBallistics(game, weapon, muzzle, direction, amount, critical, independentMuzzle);
}
