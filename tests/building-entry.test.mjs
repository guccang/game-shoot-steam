import {freshProgress} from '../src/progression/progress.js';
import {nearbyInteraction} from '../src/core/nearby-interaction.js';
// 场景入口的候停、暂停、防重复和屏幕锚点专项检查。
import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_ENTRIES,BUILDING_ENTRY} from '../src/config/building-entries.js';
import {updateBuildingEntry,latchBuildingEntry} from '../src/core/building-entry.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {doorwayInteractionAnchor,projectInteractionAnchor} from '../src/world/interaction-anchors.js';
// 最小正式状态只提供入口实际读取的条件，避免无关战斗时钟参与断言。
function setup(entry=BUILDING_ENTRIES[0]){return {progress:freshProgress(),mapId:'forest',state:'playing',vehicle:{active:false},enemies:[],player:{x:entry.x,y:entry.y,vx:0,vy:0},buildingEntry:null,buildingEntryLatch:null};}
// 以真实帧长推进并收集唯一返回的入口意图。
function step(g,seconds,input={x:0,y:0},context={}){const events=[];for(let i=0;i<Math.round(seconds/.05);i++){const e=updateBuildingEntry(g,.05,input,context);if(e)events.push(e);}return events;}
test('所有建筑与告示停留十秒都不执行，只显示附近点击目标',()=>{
 for(const e of BUILDING_ENTRIES){const g=setup(e);assert.equal(step(g,10).length,0);assert.equal(g.buildingEntry,null);assert.equal(nearbyInteraction(g).id,e.id);g.player.x+=300;assert.notEqual(nearbyInteraction(g)?.id,e.id);}
});
test('暂停和活动中不自动进入建筑，关闭后不需离开重置',()=>{
 const g=setup();latchBuildingEntry(g,BUILDING_ENTRIES[0]);assert.equal(nearbyInteraction(g).id,BUILDING_ENTRIES[0].id);
 g.state='paused';assert.equal(nearbyInteraction(g),null);
 for(const key of ['cottage','arrivalCinematic','realm','story','campDefense','fireActive','workshopTrial','boss','livingBattle','mainlineSpeech']){const s=setup();s[key]={};assert.equal(step(s,5).length,0);}
});
test('房屋进出门显示倒计时，其他旧存量计时数据不绘制',()=>{
 const g=setup();g.cottage={restElapsed:2.9,exitElapsed:.5};assert.equal(playerActionCountdown(g).wait,1);assert.equal(playerActionCountdown(g).icon,'exit');g.cottage=null;g.cottageEntry=2.9;g.buildingEntry={elapsed:2.9};assert.equal(playerActionCountdown(g).icon,'home');g.cottageEntry=null;assert.equal(playerActionCountdown(g),null);
});
test('所有缩放下门口徽记绑定出口，玩家走动不改变锚点',()=>{
 const g={cottage:{kind:'cottage'},player:{x:180,y:338}},anchor=doorwayInteractionAnchor(g);
 g.player.x+=15;g.player.y-=8;assert.deepEqual(doorwayInteractionAnchor(g),anchor);
 for(const zoom of [.65,.8333,1,1.33,1.5,2]){const room={x:20,y:76,zoom},point=projectInteractionAnchor(anchor,null,room);assert.equal(point.x,20+anchor.x*zoom);assert.equal(point.y,76+anchor.y*zoom);}
});
