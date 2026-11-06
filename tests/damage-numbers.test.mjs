// 散弹展示专项：发射归组、实弹扣血一致、多目标分离和自动回收。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {showDamageNumber} from '../src/combat/damage-numbers.js';
import {updateCombatTraces} from '../src/combat/transient-effects.js';
// 正式散弹枪与无障碍测试位置，不替换命中或伤害实现。
function setup(){const p=freshProgress();p.weapons[3]=1;p.weapon=3;const g=new Game(p,()=>.5);g.state='playing';g.magazines[3]={ammo:1,remaining:0};Object.assign(g.player,{x:1600,y:400});g.trees=[];g.enemies=[];g.numbers=[];return g;}
test('同一枪实弹命中累计为一个数，数值严格等于实际扣血',()=>{
 const g=setup();g.spawnEnemy(0,80);const e=g.enemies[0];e.hp=e.maxHp=10000;g.attack();
 assert.ok(g.projectiles.length>1);const group=g.projectiles[0].damageGroup;assert.ok(group);assert.ok(g.projectiles.every(p=>p.damageGroup===group));
 g.updateProjectiles(.3);const hits=g.numbers.filter(n=>n.damageGroup===group);assert.equal(hits.length,1);assert.equal(hits[0].amount,10000-e.hp);assert.ok(hits[0].amount>g.damage());
});
test('跨帧累计不跳位置续寿，暴击保留金色标识，下一枪与不同目标独立',()=>{
 const g=setup(),a={x:1600,y:400},b={x:1604,y:400},group={};
 showDamageNumber(g,a,18,false,group);updateCombatTraces(g,.1);const first=g.numbers[0],y=first.y,life=first.life;
 showDamageNumber(g,a,27,true,group);assert.equal(first.text,'45!');assert.equal(first.color,'#ffe396');assert.equal(first.y,y);assert.equal(first.life,life);
 showDamageNumber(g,b,18,false,group);showDamageNumber(g,a,18,false,{});assert.equal(g.numbers.length,3);assert.equal(new Set(g.numbers.map(n=>n.y)).size,3);
 updateCombatTraces(g,1);assert.equal(g.numbers.length,0);
});
test('普通枪伤害和资源飘字保留原语义，密集射击仍遵守65条预算',()=>{
 const g=setup(),e={x:1600,y:400};showDamageNumber(g,e,18,false,null);g.float(1600,400,'','#fff',false,{parts:1});
 assert.equal(g.numbers[0].text,'18');assert.deepEqual(g.numbers[1].resources,{parts:1});
 for(let i=0;i<100;i++)showDamageNumber(g,e,18,false,{});assert.equal(g.numbers.length,65);
});
