// 死亡金币结算专项：真实致命伤、零金币、边界、读档、回城事件及重复点击。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {deathCoinLoss,settleDeathPenalty} from '../src/core/death-penalty.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {clearingSite} from '../src/progression/clearing-site.js';
import {GAMEPLAY_VALUES} from '../src/config/gameplay-values.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {createGameEventHandler} from '../src/app/game-events.js';

// 真实清缴地点允许受伤，营地安全区不属于死亡测试。
function battle(coins){const p=freshProgress();p.coins=coins;p.living.patrolActive=true;const g=new Game(p,()=>.5);g.start();Object.assign(g.player,clearingSite(g.progress));g.vehicle.active=false;g.player.invincible=0;return g;}
// 与生产保存相同，将金币和死亡收据写入同一个JSON记录后重建。
function reload(g){g.progress.patrol=capturePatrol(g);return new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);}

test('死亡扣除10%向下取整且仅扣一次，零金币和上限保持有效',()=>{
 for(const coins of [0,1,9,10,19,999,12345,RESOURCE_CAP]){const g=battle(coins),wood=g.progress.wood,loss=Math.floor(coins/10);assert.equal(deathCoinLoss(coins),loss);g.hurt(1e9);assert.equal(g.state,'dead');assert.equal(g.deathPenaltyCoins,loss);assert.equal(g.progress.coins,coins-loss);g.player.invincible=0;g.hurt(1e9);settleDeathPenalty(g);assert.equal(g.progress.coins,coins-loss);assert.equal(g.progress.wood,wood);}
});
test('死亡前后反复刷新和开始不重复扣款，再次死亡独立结算',()=>{
 let g=battle(12345);g.hurt(1e9);g=reload(reload(g));assert.equal(g.deathPenaltyCoins,1234);assert.equal(g.progress.coins,11111);
 const events=[];g.onEvent=(type,data)=>events.push({type,data});g.start();g.start();assert.equal(g.progress.coins,11111);assert.equal(events.filter(e=>e.data?.deathPenalty).length,1);assert.deepEqual(events[0].data.deathPenalty,{coinsLost:1234,coinsRemaining:11111});
 assert.deepEqual({x:g.player.x,y:g.player.y},g.progress.living.position);assert.equal(g.player.x,GAMEPLAY_VALUES.player.spawnX);assert.equal(g.player.hp,g.maxHp());
 g=reload(reload(g));g.start();Object.assign(g.player,clearingSite(g.progress));g.player.invincible=0;g.hurt(1e9);assert.equal(g.progress.coins,10000);assert.equal(g.deathPenaltyCoins,1111);
});
test('外地图死亡回森林营地，旧版死亡档只补结算一次',()=>{
 let g=battle(100);g.mapId=g.progress.mapId='jiuzhaigou';g.hurt(1e9);g.start();assert.equal(g.mapId,'forest');assert.equal(g.player.mapId,'forest');assert.equal(g.progress.coins,90);
 g=battle(100);g.state='dead';g.player.hp=0;g=reload(g);assert.equal(g.deathPenaltyCoins,null);g.start();g.start();assert.equal(g.progress.coins,90);
});
test('普通受伤、安全区和重复开始不触发死亡惩罚，回城提示与保存对应一次事件',()=>{
 const g=battle(100);g.hurt(1);assert.equal(g.progress.coins,100);g.start();assert.equal(g.progress.coins,100);Object.assign(g.player,{x:900,y:700,invincible:0});g.hurt(1e9);assert.equal(g.state,'playing');assert.equal(g.progress.coins,100);
 const notices=[],saved=[];const handler=createGameEventHandler({root:{getElementById:()=>({})},audio:{play(){}},input:{reset(){}},toast:{show:(...args)=>notices.push(args)},save:()=>{saved.push(true);return true;}});
 handler('start');handler('start',{deathPenalty:{coinsLost:10,coinsRemaining:90}});assert.equal(saved.length,2);assert.equal(notices.length,1);assert.match(notices[0][0],/死亡惩罚：损失 10 金币（10%）/);assert.equal(notices[0][1],6000);
});
