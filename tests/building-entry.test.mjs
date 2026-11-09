import {freshProgress} from '../src/progression/progress.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
// 场景入口的候停、暂停、防重复和屏幕锚点专项检查。
import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_ENTRIES} from '../src/config/building-entries.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {canInspectBuilding} from '../src/core/camp/building-entry.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {doorwayInteractionAnchor,projectInteractionAnchor} from '../src/world/interaction-anchors.js';
// 最小正式状态只提供入口实际读取的条件，避免无关战斗时钟参与断言。
function setup(entry=BUILDING_ENTRIES.find(e=>e.id==='clearing')){const progress=freshProgress();progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);return {progress,mapId:'forest',state:'playing',vehicle:{active:false},enemies:[],player:{x:entry.x,y:entry.y,vx:0,vy:0}};}
test('建筑与告示只提供附近点击目标，离开范围取消',()=>{
 for(const e of BUILDING_ENTRIES.filter(e=>e.type!=='realm'||!['fire','tower'].includes(e.key))){const g=setup(e);assert.equal(canInspectBuilding(g),true);assert.equal(nearbyInteraction(g).id,e.id);g.player.x+=300;assert.notEqual(nearbyInteraction(g)?.id,e.id);}
});
test('暂停隐藏附近入口，活动期间禁止检查建筑',()=>{
 const g=setup();assert.equal(nearbyInteraction(g).id,'clearing');
 g.state='paused';assert.equal(nearbyInteraction(g),null);
 for(const key of ['cottage','arrivalCinematic','realm','story','campDefense','fireActive','workshopTrial','boss','livingBattle','mainlineSpeech']){const s=setup();s[key]={};assert.equal(canInspectBuilding(s),false);}
});
test('房屋进出门显示倒计时，结束后清除',()=>{
 const g=setup();g.cottage={restElapsed:2.9,exitElapsed:.5};assert.equal(playerActionCountdown(g).wait,1);assert.equal(playerActionCountdown(g).icon,'exit');g.cottage=null;g.cottageEntry=2.9;assert.equal(playerActionCountdown(g).icon,'home');g.cottageEntry=null;assert.equal(playerActionCountdown(g),null);
});
test('所有缩放下门口徽记绑定出口，玩家走动不改变锚点',()=>{
 const g={cottage:{kind:'cottage'},player:{x:180,y:338}},anchor=doorwayInteractionAnchor(g);
 g.player.x+=15;g.player.y-=8;assert.deepEqual(doorwayInteractionAnchor(g),anchor);
 for(const zoom of [.65,.8333,1,1.33,1.5,2]){const room={x:20,y:76,zoom},point=projectInteractionAnchor(anchor,null,room);assert.equal(point.x,20+anchor.x*zoom);assert.equal(point.y,76+anchor.y*zoom);}
});
