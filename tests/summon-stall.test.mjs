// 机械猫与金杯猫卡住回归：真实脚底半径、挡刀树木及地面追击共用正式规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {summonGroundReachable} from '../src/combat/summons/reachability.js';
import {updateMechanical} from '../src/combat/mechanical.js';
import {blocked} from '../src/physics/motion.js';
import {updateCatCrew} from '../src/combat/cat-crew.js';
import {vehicleCompanionContext} from '../src/combat/vehicle-companions.js';

// 平台隔离随机地形；护栏、树木弹道、正式索敌与近战命中仍由运行模块处理。
function scene(){const p=freshProgress();p.weapons[15]=1;p.weapon=15;const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.trees=[];g.boss=null;Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:600}});return g;}
// 每一帧推进实际时间，确保分帧路径规划持续执行。
function tick(g,seconds){for(let i=0;i<seconds*60;i++){g.time+=1/60;updateMechanical(g,1/60);}}

for(const radius of [9,10])test(`半径${radius}的伙伴贴障碍站立时不会被玩家半径误判不可达`,()=>{
 const g=scene(),node={x:2000,y:2000,radius,arena:g.player.arena};
 g.player.worldBarriers=[{x:1980,y:2000,width:18,height:150}];
 const target={x:2100,y:2000,radius:12,hp:100,id:99};
 assert.equal(blocked(node.x,node.y,radius,[],{...node,worldBarriers:g.player.worldBarriers}),false);
 let reachable=false;for(let i=0;i<120;i++){g.time+=1/60;reachable=summonGroundReachable(g,node,target,30)||reachable;}
 assert.equal(reachable,true);
});

test('近战目标被树挡住时绕到可命中位置，不在原地反复蓄力空挥',()=>{
 const g=scene();tick(g,3);
 const base=g.weapon();g.weapon=()=>({...base,summonCount:1});
 const n=g.mechanical.nodes[0];Object.assign(n,{x:2040,y:2000,ready:true,spawned:true,cooldown:0,windup:0});
 const enemy=g.spawnEnemy(0,0,{x:2080,y:2000});Object.assign(enemy,{hp:10000,maxHp:10000,speed:0,damage:0,radius:16});
 g.trees=[{type:'tree',id:90001,x:2060,y:2000,hp:10000,radius:10}];
 tick(g,6);assert.ok(enemy.hp<10000,`目标未受到攻击，状态${n.mode}，位置${n.x},${n.y}`);
});

test('金杯猫沿同一修复路径绕开挡刀树，补给和车辆状态不被重置',()=>{
 const p=freshProgress();p.vehicleHulls[7]=1;p.vehicleIndex=7;
 const g=new Game(p,()=>.5);g.state='playing';g.workshopTrial=true;g.trees=[];g.enemies=[];g.boss=null;
 Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:600}});assert.ok(g.summonVehicle());
 const local=vehicleCompanionContext(g),weapon=local.weapon();local.weapon=()=>({...weapon,summonCount:1});
 for(let i=0;i<120;i++){g.time+=1/60;updateCatCrew(local,1/60);}
 const n=local.mechanical.nodes[0];Object.assign(n,{x:2140,y:2000,emerge:0,cooldown:0,windup:0});
 const e=g.spawnEnemy(0,0,{x:2180,y:2000});Object.assign(e,{hp:10000,maxHp:10000,speed:0,damage:0,radius:16});
 g.trees=[{type:'tree',id:90001,x:2160,y:2000,hp:10000,radius:10}];
 const ammo=g.vehicle.module.magazine.ammo;
 for(let i=0;i<360;i++){g.time+=1/60;updateCatCrew(local,1/60);}
 assert.ok(e.hp<10000);assert.equal(g.vehicle.active,true);assert.equal(g.vehicle.module.magazine.ammo,ammo);assert.ok(n.bodyAnimation.moveTime>0);
});

test('完整围栏封住目标时不隔墙挥击，也不穿过碰撞边界',()=>{
 const g=scene(),node={x:2000,y:2000,radius:10,arena:g.player.arena};
 g.player.worldBarriers=[{x:2100,y:2000,width:60,height:60}];
 const target={x:2100,y:2000,radius:12,hp:100,id:99};
 for(let i=0;i<120;i++){g.time+=1/60;assert.equal(summonGroundReachable(g,node,target,30),false);}
});
