// 屏外兽潮回归：正式镜头、世界镜像、出生配额与真实移动共用运行时实现。
import test from 'node:test';
import assert from 'node:assert/strict';
import {hordeGame} from './helpers/horde-wave-pacing.mjs';
import {CombatCamera} from '../src/rendering/camera.js';
import {findCampOffscreenSpawn} from '../src/core/camp/camp-defense-arrival.js';
import {updateCampDefense} from '../src/core/camp/camp-defense.js';
import {updateEnemies} from '../src/core/battle/enemy-manager.js';
import {nearest,worldDistance,WORLD} from '../src/world/coordinates.js';
// 正式镜头计算结果投影为运行时提供给出生逻辑的相对视口。
function viewFor(g,width,height){g.setViewport(width,height);const v=new CombatCamera().update(g.player,width,height,null,0,false,{horde:g.campDefense});g.arrivalView={left:v.x-g.player.x,right:v.x+v.w-g.player.x,top:v.y-g.player.y,bottom:v.y+v.h-g.player.y,width,height};return v;}
// 判断团子脚底进入实际画面，而不是只比较出生时的世界距离。
function visible(g,e,margin=0){const p=nearest(e,g.player),v=g.arrivalView,x=p.x-g.player.x,y=p.y-g.player.y;return x>=v.left-margin&&x<=v.right+margin&&y>=v.top-margin&&y<=v.bottom+margin;}
for(const gate of ['left','top'])for(const [width,height]of [[320,740],[390,844],[562,900]])test(gate+' '+width+'：屏外出生后按正式物理走入画面',()=>{
 const g=hordeGame(42,gate);viewFor(g,width,height);const r=g.campDefense;r.timer=0;updateCampDefense(g,.01);const e=g.enemies[0];assert.ok(!visible(g,e,60),'身体与标签应完全在屏幕外');assert.ok(worldDistance(e,r.arena)+e.radius<r.arena.radius);
 let entered=false,elapsed=0;while(elapsed<18){const before={x:e.x,y:e.y};updateEnemies(g,1/30,g.player);assert.ok(worldDistance(e,before)<8,'入场不得瞬移');elapsed+=1/30;if(visible(g,e)){entered=true;break;}}
 assert.ok(entered,'团子应连续走入画面');assert.ok(elapsed>0);
});
test('每三只优先屏外入场，其余仍在前场带，镜头平移及世界镜像不改变配额',()=>{
 const g=hordeGame(91,'left');g.player.x+=WORLD.width;g.player.y+=WORLD.height;viewFor(g,390,844);const r=g.campDefense;r.timer=0;
 for(let ordinal=0;ordinal<6;ordinal++){g.enemies=[];r.spawnTimer=0;updateCampDefense(g,.001);const e=g.enemies[0],p=nearest(e,r.barrier),depth=r.barrier.x-p.x;if(ordinal%3===0)assert.ok(!visible(g,e,60));else assert.ok(depth>=305&&depth<=375);}
 assert.equal(r.spawned,6);
});
test('全景覆盖战区、无有效视口或屏外道路被阻挡时仍能推进出生配额',()=>{
 const g=hordeGame(42,'left'),r=g.campDefense;assert.equal(findCampOffscreenSpawn(g),null);viewFor(g,390,844);
 g.arrivalView.left=-2000;g.arrivalView.right=2000;g.arrivalView.top=-2000;g.arrivalView.bottom=2000;assert.equal(findCampOffscreenSpawn(g),null);r.timer=0;updateCampDefense(g,.01);assert.equal(r.spawned,1);
 g.enemies=[];viewFor(g,390,844);g.trees=[{...r.arena,radius:1000,hp:100}];assert.equal(findCampOffscreenSpawn(g),null);
});
