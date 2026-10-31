import {clearingArena,enterClearing,summonClearingBossAtNode as summonBossAtNode} from './helpers/clearing-scene.mjs';
// 血量调整回归：真实出生、旧领主迁移、反复刷新及死亡回退不丢失累计成长。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress } from '../src/game.js';
import { waveDifficulty, HEALTH_BALANCE_VERSION } from '../src/config/waves.js';
import { capturePatrol } from '../src/core/patrol-session.js';
import { enemyIdentity } from '../src/world/biomes.js';
import {clearingBossHealth,CLEARING_BOSS_HEALTH_VERSION} from '../src/config/clearing-boss.js';
import {clearingDifficulty} from '../src/config/clearing-difficulty.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {worldDistance} from '../src/world/coordinates.js';
import {livingWaveAllowed} from '../src/core/living-safety.js';
import {migrateClearingBossSession} from '../src/progression/clearing-boss-migration.js';

// 构造旧版真实挑战快照，可让保存波次与挑战波次不同以覆盖死亡回退。
function legacySave(challengeWave, savedWave = challengeWave, mapId='jiuzhaigou') {
  const n = challengeWave - 1;
  const progress = freshProgress();
  progress.mapId=mapId;
  // 数值专项已完成告示牌修复，重接时继续验证正式接单流程。
  progress.restoration.repaired=['clearing'];
  delete progress.living;
  Object.assign(progress, { coins: 3456, wood: 789, bosses: 4, weapon: 2 });
  progress.weapons[2] = 8;
  progress.mastery[2] = 90;
  progress.materials.parts = 21;
  const maxHp = Math.round(2250 * (1 + 0.24 * n + 0.025 * n * n) *
    ([0.55, 0.7, 0.85][n] ?? 1));
  progress.bossChallenge = {
    bosses: 4, maxHp,
    damage: Math.round(18 * (1 + 0.16 * n + 0.015 * n * n)),
    blastDamage: Math.round(30 * (1 + 0.16 * n + 0.015 * n * n)),
    speed: 60 * (1 + Math.min(1.4, 0.055 * n)),
  };
  progress.patrol = { version: 1, state: 'active', wave: savedWave, waveKills: 7,
    kills: 180, chopped: 80, roundBosses: 4, bossKillsAt: 165, playerHp: 100,
    bossHp: maxHp * 0.4 };
  return progress;
}

test('第三轮第十三批保留入门生命，伤害按轮数，区域阶级及速度沿用正式属性', () => {
  const g = clearingArena();g.progress.bosses=2;
  g.wave = 13;
  g.waveSpawned = 0;
  const e = g.spawnEnemy(0,0,{x:1700,y:400});
  const identity = enemyIdentity(e.x, e.y, 0.596);
  assert.equal(e.maxHp, Math.round(identity.hp * 2.44));
  assert.ok(e.maxHp / Math.round(identity.hp * 7.48) < 0.34);
  assert.equal(e.damage, Math.round(Math.min(identity.damage,30)*1.04));
  assert.equal(e.speed, identity.speed);
  assert.equal(e.rank, identity.rank);
  assert.equal(e.reward, identity.reward);
  assert.equal(waveDifficulty(1).health, 0.55);
  assert.equal(waveDifficulty(13).total, 10);
  assert.equal(waveDifficulty(13).maxAlive, 10);
  assert.ok(waveDifficulty(30).health < 5, '后期不再出现平方血量膨胀');
});

test('非清缴地图的旧挑战仍按历史曲线迁移，保持血量比例、技能属性及永久进度', () => {
  for (const wave of [1, 2, 3, 4, 13, 30, 100, 100000]) {
    const raw = legacySave(wave);
    const original = structuredClone(raw);
    const restored = validateProgress(raw);
    assert.equal(restored.bossChallenge.maxHp, Math.round(2250 * waveDifficulty(wave).health));
    assert.equal(restored.bossChallenge.healthVersion, HEALTH_BALANCE_VERSION);
    assert.ok(Math.abs(restored.patrol.bossHp / restored.bossChallenge.maxHp - 0.4) < 1e-12);
    for (const key of ['damage', 'blastDamage', 'speed'])
      assert.equal(restored.bossChallenge[key], raw.bossChallenge[key]);
    for (const key of ['coins', 'wood', 'bosses', 'weapons', 'heroes', 'mastery', 'materials'])
      assert.deepEqual(restored[key], raw[key]);
    assert.deepEqual(raw, original, '不修改传入存档');
    assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(restored))), restored);
  }
});

test('缺少生活记录的旧森林领主恢复到清缴场，按胜场迁移并能受伤、重试及继续下一轮', () => {
  const raw=legacySave(13,10,'forest'),original=structuredClone(raw);
  const g = new Game(raw, () => 0.5);
  assert.equal(g.wave, 10);
  assert.equal(g.boss.maxHp,clearingBossHealth(4));
  assert.equal(g.boss.hp,clearingBossHealth(4)*.4);
  assert.equal(g.progress.bossChallenge.clearingHealthVersion,CLEARING_BOSS_HEALTH_VERSION);
  assert.equal(g.progress.living.patrolActive,true);assert.ok(livingWaveAllowed(g));
  assert.ok(worldDistance(g.player,BOSS_CLEARING)<1);assert.ok(worldDistance(g.boss,g.player)<300);
  assert.deepEqual(raw,original);assert.equal(g.state,'paused');
  assert.deepEqual(validateProgress(structuredClone(g.progress)),g.progress,'重复加载不再迁移');
  const expected = structuredClone(g.progress.bossChallenge);
  assert.equal(g.boss.damage,Math.round(18*clearingDifficulty(4).damage));
  g.start();const hp=g.player.hp;g.hurt(1);assert.equal(g.player.hp,hp-1);g.player.invincible=0;
  g.hurt(1e9);
  assert.equal(g.state,'dead');
  g.start();
  assert.equal(g.wave, 10);
  assert.equal(summonBossAtNode(g), true);
  assert.deepEqual(g.progress.bossChallenge, expected);
  assert.equal(g.boss.hp, g.boss.maxHp);
  g.hit(g.boss, 1e9);
  assert.equal(g.progress.living.patrolActive,false);enterClearing(g);g.updateWaves(3);
  assert.equal(g.summonBoss(),false);g.wave=g.bossWave;
  assert.equal(summonBossAtNode(g), true);
  assert.equal(g.boss.maxHp,clearingBossHealth(5));
  g.boss.hp *= 0.5;
  g.progress.patrol = capturePatrol(g);
  const reloaded = new Game(JSON.parse(JSON.stringify(g.progress)), () => 0.5);
  assert.equal(reloaded.boss.maxHp, g.boss.maxHp);
  assert.equal(reloaded.boss.hp, g.boss.hp);
  assert.equal(reloaded.progress.bosses, 5);
});

test('旧领主恢复保留已有位置和死亡状态，无有效战斗或其他场景时不擅自接单',()=>{
  const positioned=legacySave(13,10,'forest');positioned.living={position:{x:1700,y:420},patrolActive:false};
  const moved=validateProgress(positioned);assert.deepEqual(moved.living.position,positioned.living.position);assert.equal(moved.living.patrolActive,true);
  const dead=legacySave(13,10,'forest');dead.patrol.state='dead';const g=new Game(dead,()=>.5);
  assert.equal(g.state,'dead');assert.equal(g.player.hp,0);assert.ok(livingWaveAllowed(g));
  g.start();enterClearing(g);g.updateWaves(.01);assert.ok(g.boss);assert.equal(g.boss.maxHp,clearingBossHealth(4));
  for(const mode of ['no-boss-health','invalid-challenge','other-map']){
    const raw=legacySave(13,10,'forest');
    if(mode==='no-boss-health')raw.patrol.bossHp=null;
    if(mode==='invalid-challenge')raw.bossChallenge.damage=Infinity;
    if(mode==='other-map')raw.mapId='jiuzhaigou';
    const saved=validateProgress(raw);assert.equal(saved.living.patrolActive,false,mode);assert.equal(saved.living.position,null,mode);
  }
  // 专属场景持有外层巡游快照时，迁移不得越过场景归属去接取森林清缴。
  for(const scene of ['story','realms','campDefense']){
    const saved=validateProgress(legacySave(13,10));saved.mapId='forest';saved[scene].run={};
    migrateClearingBossSession(saved);assert.equal(saved.living.patrolActive,false,scene);assert.equal(saved.living.position,null,scene);
  }
});
