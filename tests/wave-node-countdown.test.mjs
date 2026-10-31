import {BOSS_CLEARING} from '../src/config/settlements.js';
// 节点圆环只反映现有倒计时；覆盖初始、休整衔接、暂停、刷新及领主边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveCountdownState,waveProgressState} from '../src/ui/wave-progress.js';
import {waveDifficulty,WAVE_REST_SECONDS} from '../src/config/waves.js';
import {WAVE_WARNING_SECONDS} from '../src/core/wave-manager.js';
import {capturePatrol} from '../src/core/patrol-session.js';
// 固定当前波数量以独立检查计时展示，不重跑战斗平衡。
function game(){const g=new Game(clearingProgress(),()=>.5);g.start();return g;}
// 进入正式清波结算，使用已消灭名额夹具避免射击时长干扰。
function clearWave(g){g.enemies=[];g.waveWarning=0;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.updateWaves(.01);}
test('首次预警从空环开始，半程同步真实计时，结束后不再显示倒计时',()=>{
 const g=game();assert.deepEqual(waveCountdownState(g),{wave:1,progress:0});
 g.updateWaves(WAVE_WARNING_SECONDS/2);assert.equal(waveCountdownState(g).progress,.5);
 assert.equal(g.waveSpawned,0);g.updateWaves(WAVE_WARNING_SECONDS/2);assert.equal(waveCountdownState(g),null);
 assert.equal(g.waveWarning,0);
});
test('波间仅三秒，下一波节点填满一次，结束没有第二段预警',()=>{
 const g=game();clearWave(g);assert.deepEqual(waveCountdownState(g),{wave:2,progress:0});
 assert.equal(waveProgressState(g).nodes[0].state,'done');
 g.updateWaves(WAVE_REST_SECONDS/2);assert.equal(waveCountdownState(g).progress,.5);
 g.updateWaves(WAVE_REST_SECONDS/2);assert.equal(g.wave,2);assert.equal(g.waveWarning,0);
 assert.equal(waveCountdownState(g),null);assert.equal(g.waveSpawned,0);
 g.updateWaves(.01);assert.equal(g.waveSpawned,1);
});

test('暂停冻结，刷新遵循原独立预警，休整存档恢复后仍连贯',()=>{
 let g=game();clearWave(g);g.updateWaves(1);
 const before=waveCountdownState(g);g.pause();g.updateWaves(10);assert.deepEqual(waveCountdownState(g),before);
 g.progress.patrol=capturePatrol(g);g=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
 assert.deepEqual(waveCountdownState(g),before);g.start();g.updateWaves(2);assert.equal(waveCountdownState(g),null);assert.equal(g.wave,2);assert.equal(g.waveWarning,0);
 g.updateWaves(1);g.progress.patrol=capturePatrol(g);g=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
 assert.equal(g.waveWarning,WAVE_WARNING_SECONDS);
 assert.deepEqual(waveCountdownState(g),{wave:2,progress:0});
});
test('领主等待与战斗没有自动圆环，新组第一节点承接胜利休整，剧情秘境不混入',()=>{
 const g=game();g.wave=g.bossWave;clearWave(g);assert.equal(g.bossReady,true);assert.equal(waveCountdownState(g),null);
 assert.ok(g.boss);assert.equal(waveCountdownState(g),null);
 const boss=g.boss;g.hit(boss,1e9);g.hit(boss,1e9);
 assert.deepEqual(waveCountdownState(g),{wave:g.waveGroupStart,progress:0});
 assert.equal(waveProgressState(g).nodes[0].state,'pending');
 g.story={};assert.equal(waveCountdownState(g),null);g.story=null;g.realm={};assert.equal(waveCountdownState(g),null);
});

// 节点测试使用已接取任务的真实清缴场，不能在安全营地推进怪潮。
function clearingProgress(){const p=freshProgress();p.living.patrolActive=true;p.living.position={x:BOSS_CLEARING.x,y:BOSS_CLEARING.y};return p;}
