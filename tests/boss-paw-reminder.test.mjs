// 领主提醒按清波计数触发，动画只读取镜头，不改变战场与点击命中。
import test from 'node:test';
import assert from 'node:assert/strict';
import { BossHint, bossPawOrigin, bossPawFrames } from '../src/ui/boss-hint.js';
import { Game } from '../src/core/game.js';
import { waveDifficulty } from '../src/config/waves.js';

test('首次就绪和每次清波提醒一次，下一波开始或反复刷新不重复', () => {
  let time = 0;
  const hint = new BossHint(() => time);
  const g = new Game(); g.start(); g.kills = 12;
  // 与 HUD 一致：休整阶段代表当前波已结束，开战阶段代表上一波已结束。
  const status = () => ({ available: !g.boss && g.kills - g.bossKillsAt >= 12,
    key: `${g.bossKillsAt}:${g.progress.bosses}`, playing: g.state === 'playing',
    completedWave: g.waveRest > 0 ? g.wave : g.wave - 1 });
  assert.equal(hint.update(status()), true); assert.equal(hint.sequence, 1);
  time = 2400; assert.equal(hint.update(status()), false);
  g.waveKills = waveDifficulty(g.wave, g.recoveryRun).total; g.enemies = [];
  g.updateWaves(.01); assert.ok(g.waveRest > 0);
  assert.equal(hint.update(status()), true); assert.equal(hint.sequence, 2);
  time += 2400; assert.equal(hint.update(status()), false);
  g.updateWaves(g.waveRest); assert.equal(g.wave, 2);
  assert.equal(hint.update(status()), false); assert.equal(hint.sequence, 2);
  g.waveKills = waveDifficulty(2, g.recoveryRun).total; g.updateWaves(.01);
  assert.equal(hint.update(status()), true); assert.equal(hint.sequence, 3);
});

test('重叠的就绪与清波只保留最新一轮，暂停收起，未出现的清波提醒等待恢复', () => {
  let time = 0; const hint = new BossHint(() => time);
  const s = {available:true,key:'0:0',playing:true,completedWave:0};
  hint.update(s); time = 400;
  assert.equal(hint.update({...s,completedWave:1}),true);
  assert.equal(hint.sequence,2); assert.equal(hint.until,2800);
  assert.equal(hint.update({...s,completedWave:1,playing:false}),false);
  assert.equal(hint.update({...s,completedWave:1}),false);
  assert.equal(hint.update({...s,completedWave:2,playing:false}),false);
  assert.equal(hint.update({...s,completedWave:2}),true);
  assert.equal(hint.sequence,3);
  assert.equal(hint.update({...s,available:false,completedWave:3}),false);
});

test('源点来自角色而非屏幕中心，兼容 CSS 缩放与脉冲偏移视野', () => {
  const player={x:900,y:700}, view={x:650,y:100,width:390,height:844,zoom:.6};
  const canvas={left:30,top:40,width:195,height:422}, paw={left:60,top:100,width:34,height:40};
  assert.deepEqual(bossPawOrigin(player,view,canvas,paw),{x:28,y:91.6});
  const frames=bossPawFrames({x:100,y:250});
  assert.match(frames[0].transform,/translate\(100px, 250px\)/);
  assert.equal(frames.at(-1).opacity,0);
  assert.ok(bossPawFrames({x:100,y:250},true).every(frame=>!frame.transform.includes('translate')));
});
