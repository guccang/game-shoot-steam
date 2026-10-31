// 正式弹道的发声归属快照：换枪不改已发射弹丸，伙伴伤害不叠加主武器命中提示。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {updateMechanical} from '../src/combat/mechanical.js';
import {updateSpider} from '../src/combat/spider.js';
import {updateFunnel} from '../src/combat/funnel.js';
import {cutWithChainsaw} from '../src/combat/melee.js';
import {createGameEventHandler} from '../src/app/game-events.js';

// 空地高耐久目标隔离随机波次，伤害、弹道、伙伴攻击使用正式入口。
function arena(index=0){
 const p=freshProgress();p.weapons.fill(1);p.weapon=index;
 const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};
 Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});
 const e=g.spawnEnemy(0,0,{x:1010,y:750});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,flying:false,arena:g.player.arena});
 return g;
}
test('主枪飞弹命中才播放提示，伙伴与激光快照正确，空枪不响命中',()=>{
 for(const source of ['primary','companion'])for(const index of [0,1]){
  const g=arena(index),events=[];g.onEvent=(type,data)=>events.push({type,data});
  fireBallistics(g,{...g.weapon(),audioSource:source},{x:950,y:740},{x:1,y:0},25,false,true);
  if(index===0)assert.equal(events.length,0);
  g.progress.weapon=9;for(let i=0;i<20;i++)g.updateProjectiles(1/120);
  assert.ok(g.enemies[0].hp<1e8);assert.equal(events.filter(e=>e.type==='weapon-hit').length,source==='primary'?1:0);
 }
});
// 用真实切割和事件适配验证静音不影响伤害，主角命中也不会泄漏通用提示音。
test('真实电锯切割仍造成伤害，主角与伙伴接触均无声音',()=>{
 for(const source of ['primary','companion']){
  const g=arena(14),sounds=[],events=[],target=g.enemies[0];
  const handle=createGameEventHandler({root:{getElementById:()=>({})},audio:{play:type=>sounds.push(type)},toast:{show(){}},input:{reset(){}},save(){}});
  g.onEvent=(type,data)=>{events.push({type,data});handle(type,data);};
  cutWithChainsaw(g,{...g.weapon(),weaponIndex:14,audioSource:source},{x:target.x-10,y:target.y},{x:1,y:0},25,false,true);
  assert.ok(target.hp<1e8);assert.ok(events.some(e=>e.type==='chainsaw-contact'));
  if(source==='primary')assert.equal(events.find(e=>e.type==='weapon-hit')?.data.kind,'chainsaw');
  assert.deepEqual(sounds,[]);
 }
});
test('猫、蜘蛛、无人机、浮游炮的射击和部署事件都标为伙伴来源',()=>{
 for(const [index,update] of [[12,updateFunnel],[13,updateFunnel],[15,updateMechanical],[16,updateSpider]]){
  const g=arena(index),events=[];g.onEvent=(type,data)=>{if(['shot','weapon-sound'].includes(type))events.push(data);};
  for(let i=0;i<900;i++)update(g,1/60);
  assert.ok(events.length>0,String(index));assert.ok(events.every(e=>e.source==='companion'),String(index));
 }
});
