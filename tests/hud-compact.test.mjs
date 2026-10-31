// 资源阈值、伤害展示与真实追敌速度回归，展示取整不改变正式扣血。
import test from 'node:test';
import assert from 'node:assert/strict';
import { compactResource,compactWalletResource } from '../src/ui/resource-number.js';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { spiderMinionWeapon } from '../src/combat/spider.js';
import { walkNode } from '../src/combat/mechanical.js';
import { effectiveWeapon } from '../src/config/weapon-mods.js';
test('金币木头十万前显示完整整数，达到十万后缩写且不提前进位',()=>{
 for(const [n,s] of [[0,'0'],[9999,'9999'],[10000,'10000'],[16000,'16000'],[99999,'99999'],[99999.9,'99999'],[100000,'10w'],[100999,'10w'],[101000,'10.1w'],[99999999,'9999w']])assert.equal(compactWalletResource(n),s);
});

test('资源以指定单位缩写，跨阈值不提前进位，原始数量不变',()=>{
 assert.equal(compactResource(114399),'11.4w');assert.equal(compactResource(115199),'11.5w');
 for(const [n,s] of [[0,'0'],[999,'999'],[1000,'1000'],[2000,'2000'],[9999,'9999'],[10000,'1w'],[10999,'1w'],[11000,'1.1w'],[12500,'1.2w'],[19999,'1.9w'],[20000,'2w'],[107311,'10.7w'],[73634,'7.3w'],[99989999,'9998.9w'],[99990000,'9999w'],[99999999,'9999w'],[100000000,'9999w'],[123456789,'9999w'],[999999999,'9999w']])assert.equal(compactResource(n),s);
});
test('玩家和载具受伤只向下取整飘字，实际扣血保留精度',()=>{
 const g=new Game(freshProgress(),()=>.5);g.state='playing';const text=[];g.float=(x,y,value)=>text.push(value);
 const hp=g.player.hp;g.hurt(28.888222);assert.equal(text.at(-1),'−28');assert.ok(Math.abs(g.player.hp-(hp-28.888222))<1e-8);
 g.player.invincible=0;g.vehicle.active=true;g.vehicle.hp=100;g.hurt(28.888222);assert.equal(text.at(-1),'装甲 −28');assert.ok(Math.abs(g.vehicle.hp-71.111778)<1e-8);
});
test('小蛛每秒推进300且出舱140，母体速度保持105',()=>{
 const p=freshProgress();p.weapons[16]=1;const w=effectiveWeapon(p,16),small=spiderMinionWeapon(w);assert.equal(w.moveSpeed,105);assert.equal(small.emergeSpeed,140);
 const g=new Game(p,()=>.5);g.trees=[];const n={index:0,x:900,y:750,radius:9,walkPhase:0,arena:{x:900,y:750,radius:1000}};
 for(let i=0;i<60;i++)walkNode(g,n,{x:1500,y:750},small.moveSpeed,1/60);
 assert.ok(Math.abs(n.x-1200)<.01);assert.ok(n.walkPhase>0);
});
