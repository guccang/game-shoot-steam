// 种地期间飞行伙伴仍跟随，攻击暂停与自动迎敌沿用正式游戏帧循环。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {farmWorking,setFarmTool} from '../src/core/farm.js';

// 关闭额外刷怪和剧情演出，保留移动、农活、伙伴飞控和真实弹道。
function scene(index){
 const p=freshProgress();p.arrival=null;p.mainline.completed=MAINLINE_IDS.slice();p.mainline.phase='complete';p.weapon=index;p.weapons[index]=1;
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.trees=[];g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.updateWaves=()=>{};
 Object.assign(g.player,{x:893,y:2814,invincible:9999});g.setViewport(390,844);g.reducedMotion=false;setFarmTool(g,'hoe');assert.ok(farmWorking(g));return g;
}
// 用正式上限步长连续推进，暂停也经过相同入口。
function tick(g,seconds,input={x:0,y:0}){for(let i=0;i<Math.round(seconds/.05);i++)g.update(.05,input);}
// 采集相对位置，防止只因玩家位移造成的视觉跟随掩盖飞控冻结。
function positions(state){return state.nodes.map(n=>({x:n.x,y:n.y}));}

for(const [index,kind] of [[12,'funnel'],[13,'drone']]){
 test(`${kind}种地待机和移动继续飞行，暂停冻结，退出恢复`,()=>{
  const g=scene(index),s=g[kind],before=positions(s);let shots=0;g.onEvent=type=>{if(type==='shot')shots++;};
  tick(g,1);assert.ok(farmWorking(g));assert.notDeepEqual(positions(s),before);assert.ok(s.time>.9);assert.ok(s.nodes.every(n=>n.targetId===null));
  const start={x:g.player.x,y:g.player.y},moving=positions(s);tick(g,1,{x:1,y:0});assert.ok(Math.hypot(g.player.x-start.x,g.player.y-start.y)>20);assert.notDeepEqual(positions(s),moving);assert.ok(s.nodes.every(n=>Math.hypot(n.x,n.y)<270));assert.equal(shots,0);
  g.state='paused';const paused=structuredClone(s);tick(g,1);assert.deepEqual(s,paused);
  g.state='playing';setFarmTool(g,null);tick(g,.5);assert.ok(s.time>paused.time);assert.equal(g.farmWork,null);
 });
 test(`${kind}种地遇敌恢复开火，脱战后继续待机飞行`,()=>{
  const g=scene(index);let shots=0;g.onEvent=type=>{if(type==='shot')shots++;};
  tick(g,.5);g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y});const e=g.enemies.at(-1);Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0});
  tick(g,4);assert.ok(g.farmWork.autoCombat);assert.ok(shots>0);e.hp=0;g.enemies=[];tick(g,5);assert.ok(farmWorking(g));
  const before=positions(g[kind]),count=shots;tick(g,1);assert.notDeepEqual(positions(g[kind]),before);assert.equal(shots,count);assert.ok(g[kind].nodes.every(n=>n.targetId===null));
 });
}
