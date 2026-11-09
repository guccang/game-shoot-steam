// 兽潮主动退出的事务边界：不领奖、不推进教学、失败不丢失战场。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {startCampDefense,leaveCampDefense,syncCampDefense,spawnCampBoss,rescueCampDefense} from '../src/core/camp/camp-defense.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {createGameEventHandler} from '../src/app/game-events.js';
// 使用正式入场入口保留森林玩家、载具、弹药与波次快照。
function setup(){const g=new Game(freshProgress(),()=>.4);g.state='playing';Object.assign(g.player,{x:120,y:729});g.wave=4;g.waveKills=2;g.magazines[0].ammo=3;g.player.hp=73;return g;}
for(const phase of ['waves','boss-ready','boss','rescue'])test(phase+' 阶段退出还原森林现场，不发奖不推进教学',()=>{
 const g=setup(),player=g.player,trees=g.trees,vehicle=g.vehicle,magazines=g.magazines;
 const before=structuredClone(g.progress);assert.ok(startCampDefense(g,'left'));
 const r=g.campDefense;if(phase==='boss'){r.phase='boss-ready';spawnCampBoss(g);}else if(phase==='rescue')rescueCampDefense(g,'death');else r.phase=phase;
 Object.assign(r,{cleared:6,kills:150});syncCampDefense(g);g.player.hp=1;let stored;
 g.campDefensePersist=next=>{stored=structuredClone(next);return true;};
 assert.ok(leaveCampDefense(g));assert.equal(leaveCampDefense(g),false);
 assert.equal(g.campDefense,null);assert.equal(g.progress.campDefense.run,null);assert.equal(g.state,'playing');
 assert.equal(g.player,player);assert.equal(g.trees,trees);assert.equal(g.vehicle,vehicle);assert.equal(g.magazines,magazines);
 assert.equal(g.player.hp,73);assert.equal(g.magazines[0].ammo,3);assert.equal(g.player.arena,undefined);
 assert.equal(g.wave,4);assert.equal(g.waveKills,2);assert.equal(g.boss,null);
 assert.equal(g.progress.coins,before.coins);assert.equal(g.progress.wood,before.wood);assert.deepEqual(g.progress.materials,before.materials);
 assert.deepEqual(g.progress.mainline,before.mainline);assert.equal(g.progress.campDefense.runs,before.campDefense.runs);
 const reload=new Game(stored,()=>.4);assert.equal(reload.campDefense,null);assert.equal(reload.wave,4);
 assert.deepEqual(capturePatrol(g),g.progress.patrol);
});

test('退出保存返回失败或抛出异常都保留本轮，重试成功才清除',()=>{
 for(const persist of [()=>false,()=>{throw Error('存储不可用');}]){
  const g=setup();startCampDefense(g,'left');const r=g.campDefense,player=g.player,progress=structuredClone(g.progress);
  g.campDefensePersist=persist;assert.equal(leaveCampDefense(g),false);assert.equal(g.campDefense,r);assert.equal(g.player,player);
  assert.deepEqual(g.progress,progress);assert.match(r.error,/保存失败/);
  g.campDefensePersist=()=>true;assert.equal(leaveCampDefense(g),true);
 }
});

test('已完成结算不能通过退出入口丢弃待领取奖励',()=>{
 const g=setup();startCampDefense(g,'left');g.campDefense.phase='result';
 assert.equal(leaveCampDefense(g),false);assert.equal(g.campDefense.phase,'result');
});

test('退出事件重置输入并保存，不播放完成奖励音效',()=>{
 let resets=0,saves=0,sounds=0;
 const handler=createGameEventHandler({root:{getElementById:()=>null},audio:{play:()=>sounds++},input:{reset:()=>resets++},save:()=>saves++});
 handler('camp-defense-exit');assert.equal(resets,1);assert.equal(saves,1);assert.equal(sounds,0);
});
