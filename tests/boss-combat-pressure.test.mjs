import {summonClearingBossAtNode as summonBossAtNode} from './helpers/clearing-scene.mjs';
import {forestReward} from '../src/config/economy.js';
// Boss 重击分级、显式召唤招式与波次归属回归，使用生产命中、弹道与地形逻辑。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';
import { stepBodies } from '../src/physics/motion.js';
import { updateBossSupport, beginBossSupport } from '../src/core/battle/boss-reinforcements.js';
import { BOSS_SUPPORT } from '../src/config/boss-combat.js';
import { fireBallistics, updateBallistics } from '../src/combat/ballistics.js';
import { capturePatrol } from '../src/core/battle/patrol-session.js';
import { applyBossImpact } from '../src/rendering/boss-impact.js';
import { BOSSES } from '../src/config/bosses.js';
import {waveDifficulty} from '../src/config/waves.js';

// 固定随机使援兵间隔可预测，关闭自动攻击，保留实际领主与循环地图。
function arena(index = 0, atSite = false) {
  const p = freshProgress(); p.bosses = index; p.restoration.cottageRested = true;
  const g = new Game(p, () => 0.5); g.start();
  g.trees = []; g.enemies = []; g.kills = 12; g.wave = 8;
  g.attackTimer = 999; g.player.invincible = 999;
  assert.ok(summonBossAtNode(g));
  Object.assign(g.boss, { x: 1400, y: 400, hp: 1e6, maxHp: 1e6, attack: 999, speed: 0 });
  if (!atSite) { g.player.x = 1600; g.player.y = 400; }
  else Object.assign(g.boss, { x:g.player.x-100, y:g.player.y });
  g.setViewport(390, 844);
  return g;
}

// 逐帧推进援兵调度，不偷偷推进主线波次或复用测试专用出生方法。
function supportFor(g, seconds) {
  for (let t = 0; t < seconds - 1e-8; t += 0.05) updateBossSupport(g, 0.05);
}

test('普通枪保持小幅位移，狙击与脉冲依次增强且30/120帧一致，不打断全部领主技能', () => {
  for (let index = 0; index < BOSSES.length; index++) {
    const distances = [];
    for (const [kind, force] of [['pistol', 32], ['sniper', 110], ['pulse', 165]]) {
      const fpsDistances = [];
      for (const fps of [30, 120]) {
        const g = arena(index), b = g.boss;
        b.ai = { phase: 'cast', elapsed: 0.4, dx: 1, dy: 0, length: 300 };
        const ai = structuredClone(b.ai), hp = b.hp;
        g.hit(b, 10, false, { kind, direction: { x: 0, y: 1 }, impulse: force });
        assert.equal(b.hp, hp - 10);
        for (let i = 0; i < fps; i++) stepBodies([b], 1 / fps, WORLD);
        assert.deepEqual(b.ai, ai);
        assert.equal(b.knockTime, 0); assert.equal(b.z, 0); assert.equal(b.rollAngle, 0);
        fpsDistances.push(b.y - 400);
        if (kind !== 'pistol') {
          assert.ok(b.heavyHit > 0);
          assert.ok(g.fx.items.some(p => p.kind === 'pressure' && p.size >= 64));
        }
      }
      assert.ok(Math.abs(fpsDistances[0] - fpsDistances[1]) < 0.2);
      distances.push(fpsDistances[0]);
    }
    assert.ok(distances[0] > 1 && distances[0] < 3);
    assert.ok(distances[1] > distances[0] * 4 && distances[1] < 16);
    assert.ok(distances[2] > distances[1] * 1.5 && distances[2] < 27);
  }
});

test('在途挂载狙击弹沿用实际枪械能力，切到普通枪后仍有重击；减少动态不形变', () => {
  const g = arena(), b = g.boss;
  const weapon = { ...g.weapon(8), weaponIndex: 12 };
  // 归属浮游炮的狙击弹，不能被当前手枪或熟练度归属编号误认成普通攻击。
  fireBallistics(g, weapon, { x: 1200, y: 380 }, { x: 1, y: 0 }, 10, false, true);
  g.progress.weapon = 0;
  for (let i = 0; i < 100 && b.hp === b.maxHp; i++) updateBallistics(g, 0.01);
  assert.equal(b.hp, b.maxHp - 10);
  assert.equal(b.heavyKind, 'sniper'); assert.ok(b.pushX > 55);
  const c = { translate() { throw Error('减少动态不应位移'); }, scale() { throw Error('不应形变'); } };
  applyBossImpact(c, b, true);
  let changed = 0;
  applyBossImpact({ translate() { changed++; }, scale() { changed++; } }, b);
  assert.equal(changed, 2);
});

test('重击集火有上限与特效限流，结束后普通枪恢复原击退强度', () => {
  const g = arena(), b = g.boss;
  let bursts = 0;
  const burst = g.fx.bossImpact.bind(g.fx);
  g.fx.bossImpact = (...args) => { bursts++; burst(...args); };
  for (let i = 0; i < 50; i++)
    g.hit(b, 1, false, { kind: 'pulse', direction: { x: 0.6, y: 0.8 }, impulse: 165 });
  assert.ok(Math.hypot(b.pushX, b.pushY) <= 180.0001);
  assert.equal(bursts, 1); assert.ok(g.fx.items.length <= 260);
  for (let i = 0; i < 120; i++) stepBodies([b], 1 / 120, WORLD);
  g.hit(b, 1, false, { kind: 'pistol', direction: { x: 1, y: 0 }, impulse: 32 });
  assert.ok(b.pushX < 18 && b.pushX > 17);
  g.pause(); const pos = [b.x, b.y, b.heavyHit];
  g.update(0.05); assert.deepEqual([b.x, b.y, b.heavyHit], pos);
});

test('援兵仅招式触发并预警2秒，附近逐只接敌，低血量三只且有数量与间隔上限', () => {
  const g = arena(0, true), events = []; g.onEvent = (t, d) => events.push([t, d]);
  supportFor(g, 30); assert.equal(g.enemies.length, 0);
  assert.ok(beginBossSupport(g));
  supportFor(g, 0.1); assert.ok(g.boss.support.warning > 1.8);
  assert.equal(events[0][0], 'boss-support'); assert.equal(events[0][1].count, 2);
  supportFor(g, 1.8); assert.equal(g.enemies.length, 0);
  supportFor(g, 0.2); assert.equal(g.enemies.length, 1);
  supportFor(g, 0.8); assert.equal(g.enemies.length, 2);
  assert.ok(g.enemies.every(e => e.bossOwner === g.boss.id && e.wave === 0 && e.rank === 0 && !e.flying && e.species==='ironwood-bulwark' && e.name==='铁甲木卫'));
  assert.ok(g.enemies.every(e => worldDistance(e, g.player) >= BOSS_SUPPORT.minDistance && worldDistance(e, g.player) <= BOSS_SUPPORT.maxDistance));
  supportFor(g, 8); assert.equal(g.enemies.length, 2);
  g.boss.hp *= 0.4; assert.ok(beginBossSupport(g)); supportFor(g, 4); assert.equal(g.enemies.length, 5);
  assert.ok(beginBossSupport(g)); supportFor(g, 4); assert.equal(g.enemies.length, BOSS_SUPPORT.cap);
  assert.equal(g.waveSpawned, waveDifficulty(8).total); assert.equal(g.waveKills, waveDifficulty(8).total); assert.equal(g.wave, 8);
});

test('援兵击杀有正常奖励但不推进波次，胜利撤走余兵且不误清主线怪', () => {
  const g = arena(0, true), waveEnemy = g.spawnEnemy(0, 200);
  const waveState = [g.wave, g.waveKills, g.waveSpawned];
  assert.ok(beginBossSupport(g)); supportFor(g, 4); const add = g.enemies.find(e => e.bossOwner);
  assert.ok(add);
  const kills = g.kills, coins = g.progress.coins, addReward=forestReward('enemy',add.reward,g.progress);
  g.hit(add, 1e9); g.hit(add, 1e9);
  assert.equal(g.kills, kills + 1); assert.equal(g.progress.coins, coins + addReward.coins);
  assert.deepEqual([g.wave, g.waveKills, g.waveSpawned], waveState);
  const beforeBossCoins = g.progress.coins,reward=forestReward('boss',0,g.progress).coins;
  g.hit(g.boss, 1e9);
  assert.equal(g.progress.coins, beforeBossCoins + reward);
  assert.ok(g.enemies.includes(waveEnemy)); assert.ok(!g.enemies.some(e => e.bossOwner));
  assert.deepEqual([g.wave, g.waveKills, g.waveSpawned], waveState);
  supportFor(g, 40); assert.equal(g.enemies.length, 1);
});

test('暂停与死亡冻结援兵，刷新保留Boss血量与主线进度并重新给准备时间', () => {
  const g = arena(0, true); assert.ok(beginBossSupport(g)); supportFor(g, 1);
  g.pause(); const s = structuredClone(g.boss.support);
  supportFor(g, 20); assert.deepEqual(g.boss.support, s);
  g.pause(); g.boss.hp = g.progress.bossChallenge.maxHp - 100;
  g.progress.patrol = capturePatrol(g);
  const loaded = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(loaded.boss.hp, g.boss.hp); assert.equal(loaded.wave, g.wave);
  assert.equal(loaded.enemies.length, 0); assert.equal(loaded.boss.support.timer, 0);
  g.state = 'dead'; supportFor(g, 20); assert.deepEqual(g.boss.support, s);
});

test('主线怪太多时延后增援，空出位置才预警；无安全落点不贴身兜底', () => {
  const g = arena(0, true);
  for (let i = 0; i < 12; i++) g.spawnEnemy(i, 300);
  supportFor(g, 15); assert.equal(g.boss.support.pending, 0); assert.equal(g.enemies.length, 12);
  g.enemies = [];
  assert.ok(beginBossSupport(g));
  supportFor(g, 0.05); assert.ok(g.boss.support.warning > 0);
  g.trees = [{...g.player, hp:100, radius:1000}];
  supportFor(g, 4); assert.equal(g.enemies.length, 0);
  supportFor(g, 1); g.trees = []; assert.ok(beginBossSupport(g)); supportFor(g, 4); assert.equal(g.enemies.length, 2);
});

// 后期波次及飞行载具仍统一召唤木卫，不随机替换成飞行或远程兵种。
test('六种领主与飞行载具均召唤铁甲木卫，特殊活动和离场不刷援兵',()=>{
 for(let index=0;index<BOSSES.length;index++){
  const g=arena(index,true);g.wave=50;g.random=()=>.99;g.player.flying=true;
  assert.ok(beginBossSupport(g));supportFor(g,4);assert.equal(g.enemies.length,2);
  assert.ok(g.enemies.every(e=>e.rank===0&&!e.tough&&!e.flying&&e.species==='ironwood-bulwark'&&e.name==='铁甲木卫'));
 }
 for(const key of ['story','realm','campDefense','workshopTrial']){
  const g=arena(0,true);g[key]={};assert.equal(beginBossSupport(g),false);supportFor(g,20);assert.equal(g.enemies.length,0);
 }
 const g=arena(0,true);g.player.x+=500;assert.equal(beginBossSupport(g),false);supportFor(g,20);assert.equal(g.enemies.length,0);
});
