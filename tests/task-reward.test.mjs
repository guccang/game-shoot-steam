// 奖励通知只在成功结算后产生，验证真实数额、失败重试和重复交付边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {rewardReceipt} from '../src/progression/reward-receipt.js';
import {acceptLivingRequest,interactLivingRequest,livingRequestTarget,updateLivingWorld} from '../src/core/living-world.js';
import {LIVING_REQUESTS} from '../src/config/living-world.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {storyPostApproach} from '../src/core/story-posts.js';
import {claimStoryCollection} from '../src/progression/story-rewards.js';
import {TOWN_RESTORATIONS,RESTORATION_SECONDS,facilityOpen} from '../src/config/town-restoration.js';
import {repairFacility,updateRestoration} from '../src/core/town-restoration.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {CAMP_ACTIVITY_XP} from '../src/config/camp-level.js';
// 正式事件收集器不伪造领奖结果，任务条件仍由核心入口检查。
function setup(){const events=[],g=new Game(freshProgress(),()=>.5,(type,data)=>{if(type==='task-reward')events.push(data);});g.start();updateLivingWorld(g,.05);return {g,events};}
test('收据只显示实际增加的资源和首次拥有的装备，不把等级提高当作新装备',()=>{
 const before=freshProgress(),after=structuredClone(before);after.coins+=5;after.wood-=2;after.materials.parts+=3;after.vehicleHulls[4]=1;after.weapons[0]++;
 const receipt=rewardReceipt(before,after,'谢礼');assert.deepEqual(receipt,{title:'谢礼',reward:{coins:5,parts:3},equipment:[{kind:'vehicle',index:4}]});assert.equal(before.vehicleHulls[4],0);
});
test('邻居交付失败不弹奖励，成功只通知一次，数量等于钱包差额',()=>{
 const {g,events}=setup(),spec=LIVING_REQUESTS.find(q=>q.id==='neighbors-lunch');
 const facility=TOWN_RESTORATIONS.find(f=>f.id==='neighbors'),post=STORY_POSTS.find(p=>p.id==='monster-neighbors');
 // 新存档的委托板默认损坏：先验证锁定，再通过正式投料与施工解锁，不能跳过接取前置。
 Object.assign(g.player,storyPostApproach(post));const locked=structuredClone(g.progress),denied=acceptLivingRequest(g,spec.id);
 assert.equal(denied.ok,false);assert.match(denied.message,/修复邻里委托板/);assert.deepEqual(g.progress,locked);
 g.progress.wood=facility.wood;g.restorationPersist=()=>true;Object.assign(g.player,facility.site);
 const repair=repairFacility(g,facility.id);assert.equal(repair.ok,true,repair.message);
 assert.equal(facilityOpen(g.progress,facility.id),false);assert.equal(acceptLivingRequest(g,spec.id).ok,false);
 updateRestoration(g,RESTORATION_SECONDS);assert.equal(facilityOpen(g.progress,facility.id),true);assert.equal(g.progress.wood,0);assert.equal(events.length,0);
 Object.assign(g.player,storyPostApproach(post));const accepted=acceptLivingRequest(g,spec.id);assert.equal(accepted.ok,true,accepted.message);
 while(g.progress.living.requests[spec.id].stage<spec.steps.length-1){Object.assign(g.player,livingRequestTarget(g,spec));const result=interactLivingRequest(g,spec.id);assert.equal(result.ok,true,result.message);assert.equal(events.length,0);}
 Object.assign(g.player,livingRequestTarget(g,spec));const before=structuredClone(g.progress);
 // 存储明确拒绝或抛出异常都不得提前交付、发奖或改变任务阶段。
 for(const persist of [()=>false,()=>{throw Error('模拟存储失败');}]){
  g.livingPersist=persist;const failed=interactLivingRequest(g,spec.id);
  assert.equal(failed.ok,false);assert.match(failed.message,/没有保存成功/);assert.equal(events.length,0);assert.deepEqual(g.progress,before);
 }
 g.livingPersist=()=>true;assert.equal(interactLivingRequest(g,spec.id).ok,true);assert.equal(events.length,1);assert.deepEqual(events[0],rewardReceipt(before,g.progress,spec.title));
 assert.deepEqual(events[0].reward,STORY_CAMPAIGN[spec.id].reward);assert.equal(events[0].challenge.gained,CAMP_ACTIVITY_XP.living);
 assert.equal(g.progress.living.requests[spec.id].completed,true);assert.equal(g.progress.story.chapters[spec.id].rewardClaimed,true);
 const completed=structuredClone(g.progress);assert.equal(interactLivingRequest(g,spec.id).ok,false);assert.equal(events.length,1);assert.deepEqual(g.progress,completed);
});
test('整组赠礼只展示实际装备或重复折算金币，重复点击不会再弹',()=>{
 const post=STORY_POSTS.find(p=>p.id==='sunleaf-post'),option=post.collection.options.find(o=>o.kind==='weapons');
 for(const owned of [false,true]){
  const {g,events}=setup();Object.assign(g.player,storyPostApproach(post));for(const id of post.chapters)Object.assign(g.progress.story.chapters[id],{completed:true,rewardClaimed:true});
  g.progress.weapons[option.index]=owned?3:0;g.storyPersist=()=>false;assert.equal(claimStoryCollection(g,post.id,option.id).ok,false);assert.equal(events.length,0);
  g.storyPersist=()=>true;assert.equal(claimStoryCollection(g,post.id,option.id).ok,true);assert.equal(events.length,1);
  assert.deepEqual(events[0].equipment,owned?[]:[{kind:'weapon',index:option.index}]);assert.deepEqual(events[0].reward,owned?{coins:post.collection.duplicateCoins}:{});
  assert.equal(claimStoryCollection(g,post.id,option.id).ok,false);assert.equal(events.length,1);
 }
});
