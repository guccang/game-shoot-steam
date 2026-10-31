// 重现蜘蛛近身走停与归队/分离冲突，使用正式母体和二十只小蛛更新。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {updateSpider,resetSpiderFormation} from '../src/combat/spider.js';
import {worldDistance,WORLD} from '../src/world/coordinates.js';
import {spiderEscortHome} from '../src/combat/summons/spider-escort.js';

// 在开放平台按正常两秒出舱满编，能源仅在准备阶段充足，采样期间不补给。
function arena(){
 const p=freshProgress();p.weapons.fill(1);p.weapon=16;p.weaponParts[16].coordination=13;
 const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.trees=[];g.boss=null;
 Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:8000}});
 for(let i=0;i<2700;i++){g.magazines[16].ammo=100;updateSpider(g,1/60);}
 return g;
}

for(const hz of [30,60,120])test(`近身直行连续跟随，停车自然收步，二十只不反复归位/推出 ${hz}Hz`,()=>{
 const g=arena(),nodes=[g.spider.mother,...g.spider.nodes],dt=1/hz;
 let switches=0,reverse=0;const energy=g.magazines[16].ammo;
 for(let i=0;i<hz*6;i++){
  g.player.x+=100*dt;const before=nodes.map(n=>({x:n.x,m:n.moving,angle:n.angle}));updateSpider(g,dt);
  if(i>hz*2)nodes.forEach((n,j)=>{switches+=n.moving!==before[j].m?1:0;reverse+=n.x<before[j].x-.01?1:0;
   assert.ok(Math.abs(Math.atan2(Math.sin(n.angle-before[j].angle),Math.cos(n.angle-before[j].angle)))<=7*dt+1e-8);
  });
 }
 assert.equal(switches,0);assert.equal(reverse,0);assert.equal(g.magazines[16].ammo,energy);
 let drift=0;
 for(let i=0;i<hz*6;i++){const before=nodes.map(n=>({x:n.x,y:n.y}));updateSpider(g,dt);if(i>hz*3)nodes.forEach((n,j)=>{drift+=worldDistance(n,before[j]);});}
 assert.ok(drift<.1,`停驻抖动累计位移 ${drift}`);assert.ok(nodes.every(n=>!n.moving));
 assert.ok(g.spider.nodes.every(n=>worldDistance(n,g.spider.mother)>=63.9));
});

test('母体避让目标使用循环最近镜像，死亡母体不保留禁入圈',()=>{
 const mother={x:WORLD.width-5,y:500,ready:true,hp:100},node={index:4},state={mother};
 const point=spiderEscortHome(state,node,{x:10,y:500});assert.ok(Math.abs(worldDistance(point,mother)-80)<1e-8);
 const far={x:120,y:500};assert.equal(spiderEscortHome(state,node,far),far);
 mother.hp=0;const home={x:10,y:500};assert.equal(spiderEscortHome(state,node,home),home);
});

test('暂停与回收不补血弹，满编急转后收稳，近身降速不妨碍远追',()=>{
 const g=arena(),nodes=[g.spider.mother,...g.spider.nodes];
 for(let i=0;i<480;i++){g.player[i<240?'x':'y']+=360/60;const before=nodes.map(n=>({x:n.x,y:n.y}));updateSpider(g,1/60);
  nodes.forEach((n,j)=>{assert.ok(worldDistance(n,before[j])<15);assert.ok(worldDistance(n,g.player)<390);});}
 const before=JSON.stringify(g.spider);g.state='paused';g.update(.1,{x:1,y:0});assert.equal(JSON.stringify(g.spider),before);
 g.state='playing';const hp=nodes.map(n=>n.hp),energy=g.magazines[16].ammo;resetSpiderFormation(g.spider);updateSpider(g,1/60);
 assert.deepEqual(nodes.map(n=>n.hp),hp);assert.equal(g.magazines[16].ammo,energy);
});
