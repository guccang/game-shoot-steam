// 用正式战斗验证新手手枪开局、渐进压力与旧秘境检查点兼容。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {realmStageSpec} from '../src/config/realms.js';
import {syncRealm} from '../src/core/realm-manager.js';

// 固定随机序列保留真实地形、怪物、弹药与伤害，不解锁或升级任何装备。
function beginner(seed){
  const g=new Game(freshProgress(),()=>((seed=(seed*1664525+1013904223)>>>0)/2**32));
  g.start();g.setViewport(390,844);g.enterRealm('guardian');g.continueRealm();return g;
}

test('初始手枪无需额外炮台即可完成第一波，保持真实供给和女神承伤',()=>{
  for(const seed of [3,23,91]){
    const g=beginner(seed);let peak=0,time=0;
    assert.equal(g.progress.weapon,0);assert.equal(g.progress.weapons[0],1);
    assert.equal(g.realm.defenses.length,0);assert.equal(g.vehicle.active,false);
    while(g.realm.phase==='combat'&&time<90){g.update(.05,{x:0,y:0});time+=.05;peak=Math.max(peak,g.enemies.filter(e=>e.hp>0).length);}
    assert.equal(g.realm.phase,'rest');assert.equal(g.realm.kills,12);
    assert.ok(g.realm.goddess.hp>0&&g.player.hp>0);assert.ok(peak<=4);
    assert.equal(g.realm.restRemaining,20);assert.ok(time>20&&time<90);
  }
});

test('前五波12/18/24/30/36只，名额平滑增长且后期有硬上限',()=>{
  const early=[1,2,3,4,5].map(n=>realmStageSpec('guardian',n));
  assert.deepEqual(early.map(s=>s.total),[12,18,24,30,36]);
  assert.deepEqual(early.map(s=>s.alive),[4,6,8,10,12]);
  assert.equal(early[0].spacing,1.8);assert.equal(early[4].boss,true);
  let previous=early[0];
  for(let stage=2;stage<=150;stage++){
    const next=realmStageSpec('guardian',stage);
    assert.ok(next.total>previous.total&&next.alive>=previous.alive&&next.alive<=72);
    assert.ok(next.spacing<=previous.spacing&&next.spacing>=.35);previous=next;
  }
});

test('旧局刷新使用新配额，不继承90只旧配置或重复奖励',()=>{
  const g=beginner(23);syncRealm(g);
  const save=structuredClone(g.progress),coins=save.coins;
  save.realms.run.spec={total:90,alive:54,spacing:.08};
  const restored=new Game(save,()=>.45);
  assert.equal(restored.realm.stage,1);assert.equal(restored.realm.spec.total,12);
  assert.equal(restored.realm.spec.alive,4);assert.equal(restored.realm.spawned,0);
  assert.equal(restored.progress.coins,coins);assert.equal(restored.realm.defenses.length,0);
});
