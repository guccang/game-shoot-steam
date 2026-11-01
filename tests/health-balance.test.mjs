import {clearingArena} from "./helpers/clearing-scene.mjs";
// 血量调整回归：真实出生、旧领主迁移、反复刷新及死亡回退不丢失累计成长。
import test from 'node:test';
import assert from 'node:assert/strict';

import {waveDifficulty} from "../src/config/waves.js";

import { enemyIdentity } from '../src/world/biomes.js';







// 构造旧版真实挑战快照，可让保存波次与挑战波次不同以覆盖死亡回退。


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
