import {statisticsSource} from './statistics-source.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 小蛛每条生命仅结算一次自爆，伤害沿核心实际成长，不影响主人、友军或采集树。
import { SPIDER_DEATH_BURST } from '../config/spider.js';
import { hitCenter } from './collision.js';
import { nearest, worldDistance } from '../world/coordinates.js';

// 在死亡状态写入后调用，先立幂等标记，再逐目标调用正式命中入口，避免连锁重复结算。
export function explodeSpiderling(game, node) {
  if (!node.spider || node.mother || node.deathExploded) return false;
  node.deathExploded = true;
  const core = game.weapon(), center = hitCenter(node), cfg = SPIDER_DEATH_BURST;
  const damage = Math.round(Math.round(game.damage(16) * (core.manualSpawn ? 1 : core.minionDamageRatio)) * cfg.damageMultiplier);
  for (const target of [...game.enemies, ...(game.boss ? [game.boss] : [])]) {
    if (target.hp <= 0) continue;
    const point = nearest(hitCenter(target), center), distance = worldDistance(point, center);
    if (distance > cfg.radius + target.radius) continue;
    const falloff = 1 - GAMEPLAY_VALUES.spider.deathFalloff * Math.min(1, distance / cfg.radius);
    const direction = distance > .001 ? { x: (point.x - center.x) / distance, y: (point.y - center.y) / distance } : { x: 1, y: 0 };
    game.hit(target, Math.max(1, Math.round(damage * falloff)), false,
      { x: point.x, y: point.y, direction, impulse: cfg.impulse * falloff, weaponIndex: 16, statisticsSource:statisticsSource(game,{weaponIndex:16}), power: 1 });
  }
  game.fx.add('blast', center.x, center.y, .5, { size: cfg.radius, color: '#ffbc63' });
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + .4;
    game.fx.add('spark', center.x, center.y, .3, { vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 100, angle, size: 4, color: '#f4dca0' });
  }
  game.onEvent('explosion',{source:'companion'});
  return true;
}
