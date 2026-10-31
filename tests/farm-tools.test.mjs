// 农具动作回归：刀刃命中、蓄力节奏、暂停与表现插值不改变真实结算。
import test from 'node:test';
import assert from 'node:assert/strict';
import {FARM_ACTION_TIMING,FARM_CROP_SIZE,farmToolPose} from '../src/config/farm-tools.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';

test('锄片与镰刀在正式命中时刻触及四向目标，短停保持接触',()=>{
 const player={x:100,y:100};
 for(const action of ['dig','harvest'])for(const target of [{x:100,y:38},{x:46,y:94},{x:154,y:94},{x:100,y:148}]){
  const hit=FARM_ACTION_TIMING[action].hit;
  for(const t of [hit,hit+.02,hit+.04]){const p=farmToolPose(action,t,player,target);assert.equal(p.phase,'contact');assert.ok(Math.hypot(p.contact.x-target.x,p.contact.y-target.y)<1e-8);}
  const idle=farmToolPose(action,0,player,target,false),end=farmToolPose(action,FARM_ACTION_TIMING[action].end,player,target);
  assert.ok(Math.hypot(idle.x-end.x,idle.y-end.y)<1e-8);assert.ok(Math.abs(idle.angle-end.angle)<1e-8);
 }
});

test('挥落后段加速且动作阶段连续，不能匀速扫过或跳过接触',()=>{
 for(const action of ['dig','harvest']){
  const player={x:100,y:100},target={x:142,y:100},at=t=>farmToolPose(action,t,player,target),hit=FARM_ACTION_TIMING[action].hit;
  assert.ok(Math.abs(at(hit-.01).angle-at(hit-.05).angle)>Math.abs(at(.23).angle-at(.19).angle)*3);
  for(const t of [.18,hit,hit+.045,action==='dig'?.52:.59]){
   const before=at(t-1e-7),after=at(t+1e-7);assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.001);assert.ok(Math.abs(before.angle-after.angle)<.001);
  }
 }
});

test('播种图案高度小于猫脸距离，三阶段分别保持尺寸预算',()=>{
 assert.ok(FARM_CROP_SIZE[0].height<=14);assert.ok(FARM_CROP_SIZE[0].width<=18);
 assert.ok(FARM_CROP_SIZE[1].height<FARM_CROP_SIZE[2].height);assert.equal(FARM_CROP_SIZE[2].height,67);
});

test('农活时钟跟随人物一起插值，队列、命中和存档仍保留权威状态',()=>{
 const render=createRenderInterpolation(),job={elapsed:.2,farmPoseTime:.2,hit:false},game={state:'playing',mapId:'forest',player:{x:100,y:100},farmWork:{tool:'hoe',job,queue:[]},progress:{coins:0}};
 render.beforeStep(game);job.elapsed=.24;job.farmPoseTime=.24;job.hit=true;game.player.x=104;
 const view=render.sample(game,.5);assert.equal(view.player.x,102);assert.ok(Math.abs(view.farmWork.job.farmPoseTime-.22)<1e-8);
 assert.equal(view.farmWork.job.elapsed,.24);assert.equal(view.farmWork.job.hit,true);assert.equal(view.progress,game.progress);
 game.state='paused';assert.equal(render.sample(game,.1).farmWork.job.farmPoseTime,.24);
 game.farmWork=null;assert.equal(render.sample(game,.5).farmWork,null);
});
