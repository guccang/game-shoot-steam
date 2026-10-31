import { forestReward } from '../src/config/economy.js';
// 实弹扫掠与特效生命周期回归，重点覆盖高速穿透、重复奖励和暂停恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { segmentCircle, traceTargets } from '../src/combat/collision.js';
import { CombatFX, FX_LIMIT } from '../src/combat/effects.js';
// 建立无环境干扰的可重复战场。
function arena(weapon = 0) {
  const progress = freshProgress(); progress.weapons = [1, 1]; progress.weapon = weapon;
  const g = new Game(progress, () => .5); g.start(); g.trees = []; g.enemies = []; g.attackTimer = g.spawnTimer = 99;
  return g;
}
test('扫圆覆盖起点重叠、切线、高速跨越及无交点', () => {
  assert.equal(segmentCircle({x:0,y:0},{x:200,y:0},{x:100,y:0},10), .45);
  assert.equal(segmentCircle({x:0,y:0},{x:0,y:0},{x:0,y:0},10), 0);
  assert.equal(segmentCircle({x:0,y:10},{x:200,y:10},{x:100,y:0},10), .5);
  assert.equal(segmentCircle({x:0,y:11},{x:200,y:11},{x:100,y:0},10), null);
  assert.equal(segmentCircle({x:0,y:0},{x:0,y:0},{x:100,y:0},10), null);
});
test('手枪先飞行再伤害，帧间跨越目标也只命中一次', () => {
  const g = arena(); g.spawnEnemy(0,180); const e = g.enemies[0], hp = e.hp;
  g.attack(); assert.equal(e.hp,hp); assert.equal(g.numbers.length,0); assert.equal(g.projectiles.length,1);
  g.updateProjectiles(.05); assert.equal(e.hp,hp);
  g.updateProjectiles(.2); assert.equal(e.hp,hp-g.damage()); assert.equal(g.projectiles.length,0);
  g.updateProjectiles(.2); assert.equal(e.hp,hp-g.damage()); assert.equal(g.numbers.length,1);
});
test('手枪命中前方树干即停止，不穿过障碍伤害后方目标', () => {
  const g = arena(); g.addTree(1000,700); g.spawnEnemy(0,200);
  g.attack(); g.updateProjectiles(.5);
  assert.equal(g.trees[0].hp,55-g.damage()); assert.equal(g.enemies[0].hp,g.enemies[0].maxHp);
  assert.equal(g.projectiles.length,0);
});
test('激光按距离递减伤害，贴身重复交点只伤害一次', () => {
  const g=arena(1); g.spawnEnemy(0,40);g.spawnEnemy(0,150);g.spawnEnemy(Math.PI/2,150);
  g.attack(); assert.equal(g.enemies[0].hp,g.enemies[0].maxHp-g.damage());
  assert.equal(g.enemies[1].hp,g.enemies[1].maxHp-Math.round(g.damage()*.5));assert.equal(g.enemies[2].hp,g.enemies[2].maxHp);
  const hits=traceTargets({x:900,y:692},{x:1240,y:692},[...g.enemies].reverse());
  assert.equal(hits[0].target,g.enemies[0]); assert.equal(hits[1].target,g.enemies[1]);
});
test('子弹不追踪移开的目标，射程耗尽回收；击杀不会重复发奖', () => {
  const g=arena();g.spawnEnemy(0,160);const e=g.enemies[0];g.attack();e.y+=100;g.updateProjectiles(1);
  assert.equal(e.hp,e.maxHp);assert.equal(g.projectiles.length,0);
  e.y-=100;e.hp=1;g.attack();g.attack();g.updateProjectiles(.5);
  assert.equal(g.kills,1);assert.equal(g.progress.coins,60+forestReward('enemy',15).coins);assert.equal(g.projectiles.length,0);
});
test('暂停冻结弹体和特效，换枪不改变在途伤害，重生清理瞬态状态', () => {
  const g=arena();g.spawnEnemy(0,180);g.attack();const before=structuredClone(g.projectiles),fx=structuredClone(g.fx.items);
  g.pause();g.update(.05);assert.deepEqual(g.projectiles,before);assert.deepEqual(g.fx.items,fx);g.pause();
  g.transact('weapons',1,'equip');g.updateProjectiles(.3);assert.equal(g.enemies[0].hp,g.enemies[0].maxHp-18);
  // 致死回归应在营地保护区外，安全区不会接受这次伤害。
  Object.assign(g.player,{x:1600,y:400});g.hurt(999);g.start();assert.equal(g.projectiles.length,0);assert.equal(g.fx.items.length,0);
});
test('死亡碎片沿来弹方向喷散，数量受限并在寿命结束后清空', () => {
  const fx=new CombatFX(()=>.5), target={type:'enemy',x:100,y:100};
  fx.impact({target,x:90,y:92},{x:-1,y:0},false,false,true);
  assert.ok(fx.items.filter(p=>p.kind==='chip').every(p=>p.vx<0));
  for(let i=0;i<100;i++)fx.impact({target,x:90,y:92},{x:1,y:0},true,true,true);
  assert.equal(fx.items.length,FX_LIMIT);for(let i=0;i<30;i++)fx.update(.05);assert.equal(fx.items.length,0);
});
