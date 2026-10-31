// 自然跟随与可见索敌：验证真实移动、窗口变化、循环边界和独立供给。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { updateMechanical } from '../src/combat/mechanical.js';
import { summonTargetPool } from '../src/combat/summons/targets.js';
import { summonTargetVisible } from '../src/combat/summons/perception.js';
import { WORLD,worldDistance } from '../src/world/coordinates.js';

// 开放测试场保留正式步态、分离与战斗状态，不使用真实存档。
function arena(){const p=freshProgress();p.weapons[15]=1;p.weapon=15;p.weaponParts[15].coordination=8;const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.trees=[];g.boss=null;Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:5000}});return g;}
// 单独推进地面核心便于测量走位，能源和玩家状态不由测试伪造补给。
function step(g,seconds){for(let i=0;i<seconds*60;i++)updateMechanical(g,1/60);}

test('十猫在小圈移动时保留驻点，不同步描摹主人轨迹；长距离移动后归队并停稳',()=>{
 const g=arena();step(g,24);const energy=structuredClone(g.magazines[15]);let path=Array(10).fill(0);
 for(let i=0;i<720;i++){const a=i/720*Math.PI*4;g.player.x=2000+24*Math.cos(a);g.player.y=2000+24*Math.sin(a);const old=g.mechanical.nodes.map(n=>({...n}));updateMechanical(g,1/60);g.mechanical.nodes.forEach((n,j)=>path[j]+=worldDistance(n,old[j]));}
 assert.ok(path.filter(d=>d<80).length>=6,JSON.stringify(path));
 for(let i=0;i<240;i++){g.player.x+=3;updateMechanical(g,1/60);}step(g,8);
 const live=g.mechanical.nodes.filter(n=>n.active);assert.ok(live.every(n=>worldDistance(n,g.player)<180));
 const parked=live.map(n=>({...n}));step(g,2);assert.ok(live.every((n,i)=>worldDistance(n,parked[i])<6));assert.deepEqual(g.magazines[15],energy);
});

test('实际镜头含偏移与缩放：边缘目标整身可见才索敌，离屏立即解除',()=>{
 for(const width of [320,390,1280]){const g=arena();g.setViewport(width,844);g.arrivalView={width,height:844,left:-150,right:190,top:-220,bottom:210};
 const visible={id:1,hp:100,radius:12,x:2050,y:2000},hidden={id:2,hp:100,radius:12,x:2200,y:2000};g.enemies=[hidden,visible];
 assert.deepEqual(summonTargetPool(g,g.player,1000).map(t=>t.id),[1]);g.arrivalView.right=40;assert.deepEqual(summonTargetPool(g,g.player,1000),[]);
 }
});

test('远程、领主和树木都受视野过滤，缩屏不能沿用旧宽屏；武器短射程仍有效',()=>{
 const g=arena();g.setViewport(1280,960);g.arrivalView={width:1280,height:960,left:-600,right:600,top:-400,bottom:400};
 const t={id:1,hp:100,radius:12,x:2300,y:2000};g.boss=t;assert.equal(summonTargetPool(g,g.player,500,{bossFirst:true})[0],t);
 assert.equal(summonTargetPool(g,g.player,100,{bossFirst:true}).length,0);g.setViewport(320,844);assert.equal(summonTargetPool(g,g.player,1000,{bossFirst:true}).length,0);
 g.boss=null;g.trees=[t];assert.equal(summonTargetPool(g,g.player,1000).length,0);
});

test('循环地图采用近侧镜像，试射使用自己真实取景而非手机矩形',()=>{
 const g=arena();g.player.arena=null;g.player.x=WORLD.width-20;g.setViewport(390,844);g.arrivalView={width:390,height:844,left:-160,right:160,top:-230,bottom:230};
 assert.ok(summonTargetVisible(g,{x:20,y:g.player.y,radius:12}));
 g.summonView={left:-140,right:420,top:-150,bottom:120,width:600,height:300};assert.ok(summonTargetVisible(g,{x:g.player.x+365,y:g.player.y+18,radius:15}));
});

// 守护支架不把自己的底座误当成镜头中心，避免远侧支架锁定真实屏外敌人。
test('守护支架沿真实玩家镜头筛选，仍按支架自身武器射程判断',()=>{
 const g=arena();g.setViewport(390,844);g.arrivalView={width:390,height:844,left:-160,right:160,top:-240,bottom:240};
 const observer={...g.player};g.player={...g.player,x:2200};g.summonViewOrigin=observer;
 g.enemies=[{id:1,hp:100,radius:12,x:2100,y:2000},{id:2,hp:100,radius:12,x:2300,y:2000}];
 assert.deepEqual(summonTargetPool(g,g.player,250).map(t=>t.id),[1]);
});
