// 清空进度不能沿用普通复活逻辑：所有成长和战场瞬态都必须重置。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshRangerProgress} from '../src/progression/progress.js';
import {Game,freshProgress} from '../src/game.js';

test('游玩、暂停和倒下状态均能清空成长、战场与攻击并回到初始界面',()=>{
  for(const state of ['ready','playing','paused','dead']) {
    const progress=freshProgress();Object.assign(progress,{coins:9000,wood:3000,hero:1,weapon:2,bosses:4,heroes:[5,7],weapons:[4,2,3,1,2,5]});
    const g=new Game(progress,()=>.5);g.state=state;g.kills=50;g.roundBosses=4;g.chopped=20;g.time=200;
    g.player.hp=0;g.player.x=3000;g.boss={hp:10};g.projectiles.push({x:10});g.remnants.push({life:.4});g.hazards.push({life:1});g.fx.add('smoke',0,0,1,{});
    g.resetProgress();
    assert.deepEqual(g.progress,freshRangerProgress());assert.equal(g.state,'ready');assert.equal(g.player.hp,120);assert.equal(g.player.x,freshRangerProgress().arrival.x);assert.equal(g.player.y,freshRangerProgress().arrival.y);
    for(const key of ['kills','roundBosses','chopped','time','bossKillsAt'])assert.equal(g[key],0);
    for(const key of ['projectiles','remnants','hazards','drops','numbers','stumps','shots','particles'])assert.equal(g[key].length,0);
    assert.equal(g.fx.items.length,0);assert.equal(g.boss,null);assert.equal(g.enemies.length,0);assert.equal(g.waveWarning,3);
    g.start();assert.equal(g.state,'playing');g.update(.01);assert.ok(g.player.hp>0);
  }
});
