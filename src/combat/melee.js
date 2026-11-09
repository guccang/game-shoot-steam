import {weaponTerrainTargets} from './terrain-targets.js';
import {heldChainsawSegment} from './chainsaw-geometry.js';
import {riderPosition} from '../config/vehicle-rider.js';
import {statisticsSource} from './statistics-source.js';
// 近战切割使用真实短线段接触，不生成飞行子弹；手持与独立挂载共用命中规则。
import { traceTargets } from './collision.js';

// 每次切割只命中锯链前方第一个实体，树干遮挡后方怪物，避免隔物采集和重复奖励。
export function cutWithChainsaw(game, weapon, muzzle, direction, amount, critical, independent) {
  // 手持锯链沿角色朝向延伸，不能把远程弹丸从枪口回瞄产生的偏角用于短距离接触。
  if (!independent) direction = { x: Math.cos(game.player.angle), y: Math.sin(game.player.angle) };
  // 手持判定沿实际锯链，左右瞄准、后坐和骑乘高度都与画面保持一致。
  if(independent&&Number.isFinite(weapon.sawAngle))direction={x:Math.cos(weapon.sawAngle),y:Math.sin(weapon.sawAngle)};
  const mountedRadius=9*(weapon.sawScale||.75);
  const segment=independent?{
    start:{x:muzzle.x-direction.x*17,y:muzzle.y-direction.y*17},
    end:{x:muzzle.x+direction.x*(weapon.range-17-mountedRadius),y:muzzle.y+direction.y*(weapon.range-17-mountedRadius)},
    radius:mountedRadius,
  }:heldChainsawSegment(riderPosition(game.player,game.vehicle),weapon.range,game.reducedMotion);
  const {start,end}=segment;
  if(game.clipCombatLine)Object.assign(end,game.clipCombatLine(start,end));
  const vehicleMounted = !!(weapon.vehicleMounted || game.vehicleMounted);
  const terrain = weaponTerrainTargets(game, (!independent || vehicleMounted) && weapon.id === 'chainsaw', vehicleMounted);
  const targets = [...terrain, ...game.enemies, ...(game.boss ? [game.boss] : [])];
  const hit = traceTargets(start, end, targets, segment.radius)[0];
  if (!hit) return;
  // 接触事件只驱动锯链负载音色，手持、载具和浮游炮共用真实命中结果。
  game.onEvent('chainsaw-contact',{source:weapon.audioSource});
  const tree = hit.target.type === 'tree';
  game.hit(hit.target, Math.round(amount * (tree ? weapon.treeMultiplier : 1)), critical, {
    ...hit, direction, impulse: weapon.impulse, pushLimit: weapon.pushLimit, groundedPush: weapon.groundedPush, weaponIndex: weapon.weaponIndex, power: 0.7,
    masteryOwnerIndex: weapon.masteryOwnerIndex,
    statisticsSource:statisticsSource(game,weapon),
    audioSource:weapon.audioSource||'primary',
  });
  // 木屑跟随接触点抛出；沿用有上限的粒子池和既有死亡碎块。
  for (let i = 0; i < 3; i++) {
    const side = i - 1;
    game.fx.add(tree ? 'chip' : 'spark', hit.x, hit.y, 0.25, {
      vx: -direction.x * 45 - direction.y * side * 75,
      vy: -direction.y * 45 + direction.x * side * 75,
      vz: 70 + i * 12, z: 4, size: tree ? 3 : 2, spin: side * 8,
      color: tree ? '#dbb579' : '#ffdf92', material: tree ? 'wood' : 'slime',
    });
  }
}
