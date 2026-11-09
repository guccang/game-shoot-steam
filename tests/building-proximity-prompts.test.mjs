// 告示牌附近入口沿用正式距离、权限和建筑投影，不依赖主线任务状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CLEARING_POST,CLEARING_APPROACH} from '../src/config/clearing.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
import {canUseClearingPost} from '../src/core/story/clearing-guide.js';
import {nearbyInteractionAnchor} from '../src/world/interaction-anchors.js';

// 构造已完成入职、未接清缴主线的真实营地，保留正式场景状态。
function camp(){const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p,()=>.5);g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=999;Object.assign(g.player,CLEARING_APPROACH);return g;}

test('清缴提示与接取共用120米范围，未接主线也有入口，离开后撤销',()=>{
 const g=camp();g.player.x+=80;
 assert.ok(canUseClearingPost(g));assert.equal(nearbyInteraction(g)?.id,'clearing');
 g.progress.living.patrolActive=true;assert.equal(nearbyInteraction(g)?.id,'clearing');
 g.player.x=CLEARING_APPROACH.x+CLEARING_POST.radius+1;
 assert.equal(canUseClearingPost(g),false);assert.notEqual(nearbyInteraction(g)?.id,'clearing');
 Object.assign(g.player,CLEARING_APPROACH);g.state='paused';assert.equal(nearbyInteraction(g),null);
});

test('提示锚在告示牌顶外，绕行和任务状态改变均不跟随玩家',()=>{
 const g=camp(),entry=nearbyInteraction(g),anchor=nearbyInteractionAnchor(g,entry);
 assert.deepEqual(anchor,{x:CLEARING_POST.x,y:CLEARING_POST.y-108,space:'world'});
 g.player.x+=60;g.player.y-=15;g.progress.living.patrolActive=true;
 assert.deepEqual(nearbyInteractionAnchor(g,nearbyInteraction(g)),anchor);
});
