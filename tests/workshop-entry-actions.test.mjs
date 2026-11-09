// 工坊升级按钮和步行候门回归，使用正式游戏状态与三秒倒计时。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {WORKSHOP_INTERIORS,interiorLayout} from '../src/config/workshop-interiors.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
import {updateCottage,leaveCottage} from '../src/core/home/cottage.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
// 门前中线避开车位，所有修复状态在用例中明确配置。
function scene(kind){const g=new Game(freshProgress(),()=>.5);g.start();g.vehicle.active=false;g.enemies=[];g.mainlineSpeech=null;g.progress.restoration.repaired=['garage','cottage'];const door=interiorLayout({kind}).door;Object.assign(g.player,{x:door.x,y:door.y+20,vx:0,vy:0});return g;}
// 固定小步推进候门，不依赖渲染帧率。
function step(g,seconds,input={x:0,y:0}){for(let i=0;i<Math.round(seconds/.05);i++)updateCottage(g,.05,input);}
test('三栋建筑仅下车站定三秒进入，显示正式倒计时',()=>{
 for(const kind of ['cottage','weapons','vehicle']){const g=scene(kind);step(g,2.9);assert.equal(g.cottage,null);assert.equal(playerActionCountdown(g).icon,'home');step(g,.1);assert.equal(g.cottage.kind,kind);assert.equal(playerActionCountdown(g),null);assert.ok(leaveCottage(g));step(g,4);assert.equal(g.cottage,null);}
});
test('移动、离开门口和上车取消等待，暂停不累计；战斗与破败建筑不入内',()=>{
 for(const kind of ['cottage','weapons','vehicle']){const g=scene(kind);step(g,1);step(g,.1,{x:1,y:0});assert.equal(g.cottageEntry,null);step(g,1);g.state='paused';step(g,4);assert.ok(g.cottageEntry<1.01);g.state='playing';g.vehicle.active=true;step(g,4);assert.equal(g.cottage,null);assert.equal(g.cottageEntry,null);assert.equal(playerActionCountdown(g),null);g.vehicle.active=false;step(g,1);g.player.x+=100;step(g,.1);assert.equal(g.cottageEntry,null);}
 const g=scene('vehicle');g.progress.restoration.repaired=[];step(g,4);assert.equal(g.cottage,null);g.progress.restoration.repaired=['garage'];g.campDefense={};step(g,4);assert.equal(g.cottage,null);
});
test('工坊只保留升级页入口，未修复车库显示材料，小屋没有点击进入按钮',()=>{
 for(const kind of ['weapons','vehicle']){const g=scene(kind);assert.equal(nearbyInteraction(g).type,'workshop');assert.equal(nearbyInteraction(g).label,kind==='vehicle'?'升级载具':'升级武器');g.vehicle.active=true;g.vehicle.index=8;assert.equal(nearbyInteraction(g).type,'workshop');}
 const g=scene('vehicle');g.progress.restoration.repaired=[];g.progress.wood=20;assert.equal(nearbyInteraction(g).type,'restoration');assert.match(nearbyInteraction(g).detail,/20\/160/);assert.notEqual(nearbyInteraction(scene('cottage'))?.type,'room');
});
