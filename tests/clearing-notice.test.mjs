// 清缴自动提示覆盖真实接取事务、进场边界、续接、持久化与不重复展示。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {acceptClearingPost} from '../src/core/clearing-guide.js';
import {setLivingPatrol,acceptNextClearing} from '../src/core/living-world.js';
import {claimClearingNotice} from '../src/core/clearing-notice.js';
import {createGameEventHandler} from '../src/app/game-events.js';

// 使用完成入职的真实森林，避开与展示无关的教程及建筑锁定。
function scene(){
 let seed=6;const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
 const g=new Game(p,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));g.start();g.mainlineSpeech=null;
 Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});assert.ok(acceptClearingPost(g).ok);return g;
}
// 只改变位置，场地半径不能覆盖角色碰撞半径。
function arrive(g){const site=g.progress.living.clearingSite;Object.assign(g.player,{x:site.x,y:site.y});}

test('赶路不提示，第一次进入实际清缴范围才展示，边界往返和波次变化不重弹',()=>{
 const g=scene(),site=g.progress.living.clearingSite;let events=0;g.onEvent=t=>{if(t==='clearing-notice-shown')events++;};
 assert.equal(claimClearingNotice(g),false);
 Object.assign(g.player,{x:site.x+site.radius+10,y:site.y});assert.equal(claimClearingNotice(g),false);
 arrive(g);assert.equal(claimClearingNotice(g),true);assert.equal(g.state,'playing');assert.equal(events,1);
 Object.assign(g.player,CLEARING_APPROACH);assert.equal(claimClearingNotice(g),false);arrive(g);g.wave++;
 assert.equal(claimClearingNotice(g),false);assert.equal(events,1);
});

test('暂停、对白及其他玩法不消费展示资格，恢复后只展示一次',()=>{
 const g=scene();arrive(g);
 for(const [key,value] of [['state','paused'],['mainlineSpeech',{}],['realm',{}],['livingBattle','neighbors-lunch']]){
  const before=g[key];g[key]=value;assert.equal(claimClearingNotice(g),false);assert.equal(g.progress.living.clearingNotice,'arrival');g[key]=before;
 }
 assert.equal(claimClearingNotice(g),true);assert.equal(claimClearingNotice(g),false);
});

test('展示标记随存档保存，重新接取成功才重新获得提示资格',()=>{
 const g=scene();arrive(g);assert.ok(claimClearingNotice(g));
 const loaded=new Game(validateProgress(structuredClone(g.progress)));loaded.start();loaded.mainlineSpeech=null;arrive(loaded);
 assert.equal(claimClearingNotice(loaded),false);
 Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});assert.ok(setLivingPatrol(g,false).ok);
 assert.ok(acceptClearingPost(g).ok);assert.equal(g.progress.living.clearingNotice,'arrival');arrive(g);assert.ok(claimClearingNotice(g));
});

test('续接成功后立即显示一次，即使在范围外；失败保存不能重置已看提示',()=>{
 const g=scene();arrive(g);assert.ok(claimClearingNotice(g));g.progress.bosses=1;g.pendingClearingRound=1;g.progress.living.patrolActive=false;
 g.livingPersist=()=>false;assert.equal(acceptNextClearing(g,1).ok,false);assert.equal(g.progress.living.clearingNotice,'seen');
 g.livingPersist=()=>true;Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});assert.ok(acceptNextClearing(g,1).ok);
 assert.equal(g.progress.living.clearingNotice,'continue');assert.ok(claimClearingNotice(g));assert.equal(claimClearingNotice(g),false);
});

test('自动提示事件保存标记，不清空移动输入、不播放强制提醒',()=>{
 let saves=0,resets=0;const handle=createGameEventHandler({root:{getElementById:()=>null},audio:{},toast:{},save:()=>saves++,input:{reset:()=>resets++}});
 handle('clearing-notice-shown');assert.equal(saves,1);assert.equal(resets,0);
});
