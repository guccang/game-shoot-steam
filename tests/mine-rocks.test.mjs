import {oreCount} from '../src/config/mine-freight.js';
// 使用真实景观、正式伤害入口和存档事务验证山体破坏，不伪造矿石奖励。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {openBasement} from '../src/progression/mining/mining.js';
import {MINING,mineKey,minePoint} from '../src/config/mining.js';
import {mineRockSite,hitMineRock,mineRockDamage} from '../src/core/mining/mine-rocks.js';
import {mineOccupancy,mineLineClear} from '../src/physics/mine-motion.js';
import {enterMine,updateMining} from '../src/core/mining/mining.js';
import {harvestMine} from '../src/core/mining/mine-ecology.js';
let location;
// 寻找能从南侧靠近的天然石柱，保留真实水界和墙体。
function setup(){
 const p=freshProgress();p.homeDecor.basement=true;openBasement(p.mining);p.mining.seed=1847;
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.livingPersist=()=>true;g.cottage={kind:'cottage',floor:0,outside:MINING.home};Object.assign(g.player,MINING.hatch.goal);enterMine(g);g.cottage.scanWait=99999;g.cottage.tool='pick';g.cottage.autoDig=true;g.magazines[0].ammo=12;g.magazines[0].remaining=0;
 if(!location)outer:for(let y=-8;y<35;y++)for(let x=-8;x<35;x++){const rock=mineRockSite(g.progress.mining,{x,y});if(rock&&mineOccupancy(g,rock.x,rock.y+55)&&mineLineClear(g,rock,{x:rock.x,y:rock.y+55})){location={x,y};break outer;}}
 assert.ok(location);const rock=mineRockSite(g.progress.mining,location);Object.assign(g.player,{x:rock.x,y:rock.y+55});return {g,rock};
}
// 固定步长只推进实际地下玩法，不通过菜单直接领奖。
function tick(g,n,input={x:0,y:0}){for(let i=0;i<n;i++)updateMining(g,.05,input);}
test('三次矿镐伤害破坏景观，恰好奖励6矿石且不会重复结算',()=>{
 const {g,rock}=setup(),before=oreCount(g.progress.mining.bagOre);
 assert.ok(hitMineRock(g,rock,20));assert.equal(mineRockDamage(g,rock.key).hp,40);assert.equal(oreCount(g.progress.mining.bagOre),before);
 hitMineRock(g,rock,20);assert.ok(hitMineRock(g,rock,20));assert.equal(oreCount(g.progress.mining.bagOre),before+6);assert.equal(g.progress.production.minedOre,6);
 assert.equal(mineRockSite(g.progress.mining,rock.cell),null);assert.equal(hitMineRock(g,rock,100),false);assert.equal(oreCount(g.progress.mining.bagOre),before+6);
});
test('保存失败保持山体可重试，不扣地图也不奖励；读档保留破坏与再生时间',()=>{
 const {g,rock}=setup(),before=structuredClone(g.progress.mining);g.livingPersist=()=>false;
 assert.equal(hitMineRock(g,rock,100),false);assert.deepEqual(g.progress.mining,before);assert.equal(mineRockDamage(g,rock.key).hp,1);
 g.livingPersist=()=>true;assert.ok(hitMineRock(g,rock,100));g.progress=validateProgress(g.progress);assert.equal(mineRockSite(g.progress.mining,rock.cell),null);
 const due=g.progress.mining.harvested[rock.key];g.progress.mining.age=due;assert.ok(mineRockSite(g.progress.mining,rock.cell));assert.equal(mineRockDamage(g,rock.key),null);
});
test('推动矿镐真实挥动、松手和暂停停止，破坏后可继续行走',()=>{
 const {g,rock}=setup(),y=g.player.y;g.cottage.direction=0;tick(g,8,{x:0,y:-1});assert.ok(g.cottage.dig?.landscape);assert.equal(g.player.y,y);
 tick(g,20);assert.equal(g.progress.mining.harvested[rock.key],undefined);
 g.state='paused';const age=g.progress.mining.age;tick(g,40,{x:0,y:-1});assert.equal(g.progress.mining.age,age);g.state='playing';
 tick(g,43,{x:0,y:-1});assert.ok(g.progress.mining.harvested[rock.key]>age);tick(g,5,{x:0,y:-1});assert.ok(g.player.y<y);
});
test('手枪使用原弹药与弹道击碎山体，选择怪物优先',()=>{
 const {g,rock}=setup();g.cottage.tool=null;g.cottage.autoDig=false;
 const key=mineKey(rock.cell);g.progress.mining.animals[key]={key,kind:'beetle',x:g.player.x,y:g.player.y-16,hp:48,maxHp:48,clock:0,timer:999,phase:'recover'};
 tick(g,1);assert.equal(g.cottage.combat.findAttackTarget().mineRock,undefined);g.progress.mining.animals={};
 for(let i=0;i<120&&!g.progress.mining.harvested[rock.key];i++)tick(g,1);
 assert.ok(g.progress.mining.harvested[rock.key]);assert.ok(g.magazines[0].ammo<12);assert.ok(oreCount(g.progress.mining.bagOre)>=6);
});
test('轨道、路牌、入口和外围岩床不变成可刷矿目标；暂停和钓鱼拒绝伤害',()=>{
 const {g,rock}=setup(),l=g.progress.mining;
 l.rails[rock.key]=true;assert.equal(mineRockSite(l,rock.cell),null);delete l.rails[rock.key];
 l.decor[rock.key]='sign';assert.equal(hitMineRock(g,rock,100),false);delete l.decor[rock.key];
 assert.equal(mineRockSite(l,{x:0,y:0}),null);assert.equal(mineRockSite(l,{x:-10000,y:0}),null);
 g.state='paused';assert.equal(hitMineRock(g,rock,100),false);g.state='playing';g.fishing={};assert.equal(hitMineRock(g,rock,100),false);g.fishing=null;
 Object.assign(g.player,minePoint(rock.cell));assert.ok(harvestMine(g).ok);assert.equal(oreCount(g.progress.mining.bagOre),6);
});
