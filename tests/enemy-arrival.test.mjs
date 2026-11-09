import {clearingArena,enterClearing,summonClearingBossAtNode as summonBossAtNode} from './helpers/clearing-scene.mjs';
// 波次入场回归覆盖预警、镜头边界、河岸修正、循环地图和高波次错峰。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import {waveDifficulty,WAVE_ARRIVAL} from '../src/config/waves.js';
import {CLEARING_DENSITY} from '../src/config/clearing-difficulty.js';
import { findArrivalSpot, arrivalRecycleRadius } from '../src/core/battle/enemy-arrival.js';
import { worldDistance } from '../src/world/coordinates.js';
import { isWaterBlocked } from '../src/world/river-geometry.js';
import { capturePatrol } from '../src/core/battle/patrol-session.js';

// 测试视口采用浮游炮广角，并保留真实地形和怪物工厂。
function arena(width = 390, height = 844) {
  let seed = 971;
  const p=freshProgress();p.restoration.repaired.push('clearing');const g=new Game(p,()=>((seed=(seed*1664525+1013904223)>>>0)/2**32));g.start();enterClearing(g);g.enemies=[];g.trees=[];g.attackTimer=999;
  g.setViewport(width, height);
  g.arrivalView = { left: -width / 1.2, right: width / 1.2, top: -height / 1.2,
    bottom: height / 1.2, width, height };
  return g;
}

test('首次和波中续游预警三秒；暂停及Boss战冻结，波间休整后不重复预警', () => {
  const g = arena();
  assert.equal(g.enemies.length, 0);
  g.updateWaves(1); assert.equal(g.waveWarning, 2);
  g.pause(); g.updateWaves(9); assert.equal(g.waveWarning, 2); g.pause();
  g.kills = 12; assert.ok(summonBossAtNode(g)); g.updateWaves(9); assert.equal(g.waveWarning, 2);
  g.boss = null;g.bossReady=false;g.waveKills=g.waveSpawned=0;g.bossWave=4; g.updateWaves(2); assert.equal(g.enemies.length, 0);
  g.updateWaves(2); assert.ok(g.enemies.length>0&&g.enemies.length<=4);
  g.progress.patrol = capturePatrol(g);
  const loaded = new Game(g.progress);
  assert.equal(loaded.enemies.length, 0); assert.equal(loaded.waveWarning, 3);
  assert.equal(loaded.wave, g.wave); assert.equal(loaded.waveKills, g.waveKills);
  loaded.updateWaves(10);assert.equal(loaded.waveWarning,3);
  loaded.start();enterClearing(loaded);loaded.updateWaves(3);assert.equal(loaded.enemies.length,0);
  loaded.updateWaves(.5);assert.ok(loaded.enemies.length>0&&loaded.enemies.length<=4);
  g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.waveRest = 0.01;g.enemies=[];g.updateWaves(0.01);
  assert.equal(g.wave, 2); assert.equal(g.waveWarning, 0);
  g.updateWaves(.01);assert.ok(g.enemies.length>0&&g.enemies.length<=4);
});

test('领主援军在320至宽屏、镜头偏移和跨边界下从画外出生，校验河岸与树干', () => {
  for (const width of [320, 390, 580, 1280]) {
    const g = arena(width, 844), v = g.arrivalView;
    v.left += 90; v.right += 90; v.top -= 50; v.bottom -= 50;
    for (const p of [{ x: 900, y: 700 }, { x: 3590, y: 2790 }, { x: 630, y: 900 }]) {
      Object.assign(g.player, p); g.enemies = [];
      for (let i = 0; i < 25; i++) {
        const spot = findArrivalSpot(g); assert.ok(spot);
        const x = spot.x - p.x, y = spot.y - p.y;
        assert.ok(x <= v.left - 80 || x >= v.right + 80 || y <= v.top - 80 || y >= v.bottom + 80);
        assert.ok(worldDistance(spot, p) >= 440);
        assert.equal(isWaterBlocked(spot.x, spot.y, 28), false);
        assert.ok(worldDistance(spot, p) < arrivalRecycleRadius(g));
        g.trees = [{ ...spot, radius: 22, hp: 55 }];
        const next = findArrivalSpot(g); assert.ok(next);
        assert.ok(worldDistance(spot, next) >= 54);
        g.waveSpawned++;
      }
    }
  }
});

test('高波次按小队入场，低帧率最多补一组；前期逐步增加密度', () => {
  const g = arena(); g.wave = 25; g.waveWarning = 0; g.spawnTimer = 0;
  for (let i = 0; i < 60; i++) {
    const before = g.waveSpawned; g.updateWaves(0.1);
    assert.ok(g.waveSpawned - before <= CLEARING_DENSITY.batch);
    assert.ok(g.enemies.length <= Math.min(CLEARING_DENSITY.maxAlive,CLEARING_DENSITY.openingAlive+Math.floor(g.waveElapsed*CLEARING_DENSITY.alivePerSecond)));
  }
  assert.ok(g.waveSpawned >= 5 && g.waveSpawned <= 20);
  const before = g.waveSpawned; g.updateWaves(10);
  assert.ok(g.waveSpawned-before<=CLEARING_DENSITY.batch);
  for(let i=0;i<30;i++)g.updateWaves(1);
  assert.ok(g.enemies.length<=24);assert.equal(g.waveSpawned,g.enemies.length);
});

test('没有安全落点则稍后再试，不消耗出生配额或贴脸兜底', () => {
  const g = arena();
  // 普通怪使用近距选点，不再由画外视口控制；实体障碍封住整圈候选位置。
  g.trees=[{x:g.player.x,y:g.player.y,radius:400,hp:100}];
  g.waveWarning = 0; g.spawnTimer = 0;
  g.updateWaves(2);
  assert.equal(g.waveSpawned, 0); assert.equal(g.enemies.length, 0);
  g.trees=[];g.updateWaves(CLEARING_DENSITY.spawnInterval);
  assert.ok(g.waveSpawned>0&&g.waveSpawned<=4);
  const distance=worldDistance(g.player,g.enemies[0]);assert.ok(distance>=WAVE_ARRIVAL.minDistance&&distance<=WAVE_ARRIVAL.maxDistance);
});
