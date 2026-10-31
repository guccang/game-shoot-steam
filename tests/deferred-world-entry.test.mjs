// 首页延后建图回归：只检查初始化、续游与清档直接受影响的状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress} from '../src/progression/progress.js';
import {syncRealm} from '../src/core/realm-manager.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {titleSummary} from '../src/ui/title-menu.js';
// 用固定随机数比较立即初始化与点击后初始化的正式结果。
function deferred(progress){return new Game(progress,()=>.5,()=>{},{deferWorld:true});}

test('首页不生成树林或启动入职，进入只创建一次',()=>{
  const game=deferred(freshRangerProgress()),before=structuredClone(game.progress);
  assert.equal(game.worldPending,true);assert.equal(game.trees.length,0);
  assert.equal(game.arrivalScene,undefined);assert.equal(game.time,0);
  assert.deepEqual(game.progress,before);
  assert.equal(game.initializeWorld(),true);assert.ok(game.trees.length>0);assert.ok(game.arrivalScene);
  const trees=game.trees,player=game.player;player.hp=17;
  assert.equal(game.initializeWorld(),false);assert.equal(game.trees,trees);assert.equal(game.player,player);assert.equal(player.hp,17);
});

for(const mapId of ['forest','jiuzhaigou'])test(`${mapId} 的位置、波次与摘要在进入时正确恢复`,()=>{
  const progress=freshProgress();progress.mapId=mapId;
  const live=new Game(progress,()=>.5);live.state='playing';live.wave=9;live.waveGroupStart=9;live.bossWave=13;
  live.waveKills=3;live.player.hp=37;live.progress.patrol=capturePatrol(live);
  const saved=structuredClone(live.progress),game=deferred(saved),normal=new Game(saved,()=>.5);
  assert.equal(game.trees.length,0);assert.equal(game.state,'ready');assert.equal(titleSummary(game),titleSummary(normal));
  game.initializeWorld();
  assert.equal(game.wave,normal.wave);assert.equal(game.waveKills,normal.waveKills);assert.equal(game.player.hp,normal.player.hp);
  assert.equal(game.player.x,normal.player.x);assert.equal(game.player.y,normal.player.y);
  assert.deepEqual(game.trees,normal.trees);assert.equal(game.state,'paused');
});

test('死亡续游延后恢复，不能通过首页绕过死亡状态',()=>{
  const live=new Game(freshProgress());live.state='dead';live.player.hp=0;live.progress.patrol=capturePatrol(live);
  const game=deferred(live.progress);assert.equal(game.state,'ready');game.initializeWorld();
  assert.equal(game.state,'dead');assert.equal(game.player.hp,0);
});

test('故事和秘境存档只展示摘要，点击后才恢复正式场景',()=>{
  for(const kind of ['story','realm']){
    const live=new Game(freshProgress(),()=>.5);
    if(kind==='story'){assert.equal(live.enterStory('sunleaf-01','sunleaf-post'),true);live.syncStory();}
    else {live.enterRealm('rogue');syncRealm(live);}
    const game=deferred(live.progress),normal=new Game(live.progress,()=>.5);
    assert.equal(game.trees.length,0);assert.equal(game[kind],undefined);assert.equal(titleSummary(game),titleSummary(normal));
    game.initializeWorld();assert.equal(game[kind].phase,normal[kind].phase);
    assert.equal(game[kind].chapterId,normal[kind].chapterId);assert.equal(game[kind].mode,normal[kind].mode);
    assert.deepEqual(game.trees,normal.trees);
  }
});

test('首页显式清档不会提前生成旧地图，进入后恢复新入职流程',()=>{
  const progress=freshProgress();progress.mapId='jiuzhaigou';progress.coins=999;
  const game=deferred(progress);game.resetProgress();
  assert.equal(game.worldPending,true);assert.equal(game.trees.length,0);assert.equal(game.arrivalScene,undefined);
  game.initializeWorld();assert.equal(game.mapId,'forest');assert.ok(game.arrivalScene);assert.ok(game.trees.length>0);assert.equal(game.progress.coins,freshRangerProgress().coins);
});
