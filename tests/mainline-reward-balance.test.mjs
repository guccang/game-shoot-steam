// 主线经济专项：免费体验、低成本成长、旧档资源和一次性交付。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_TASKS,MAINLINE_IDS} from '../src/config/mainline.js';
import {mainlineCondition,recordMainlineTrial,mainlineOperation} from '../src/core/story/mainline-manager.js';
import {workshopGuideCue} from '../src/core/workshop/workshop-guide.js';
import {mainlineReward,RECOMMENDED_ECONOMY,bindEconomy} from '../src/config/economy.js';
import {mainlineConditionCost} from '../src/progression/story/mainline-cost.js';
import {awardMainline} from '../src/progression/story/mainline-reward.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {previewWorkshop} from '../src/progression/workshop/workshop.js';
import {createWorkshopTrial} from '../src/core/workshop/workshop-trial.js';
// 只提供已修复建筑和当前委托，不预置金币、高级装备或演练完成记录。
function scene(id){const p=freshProgress();p.arrival=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.currentId=id;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';return {progress:p};}
// 按稳定身份读取正式内容，不在测试中复制任务目标。
function task(id){return MAINLINE_TASKS.find(t=>t.id===id);}

test('未拥有高级装备也能免费实战，普通试枪不能冒充指定体验',()=>{
 for(const [id,kind,index,record] of [['own-hover','vehicle',3,'hoverTrial'],['own-aircraft','vehicle',2,'aircraftTrial'],['own-controller','weapons',12,'controllerTrial']]){
  const g=scene(id),p=g.progress,before=JSON.stringify([p.coins,p.wood,p.materials,p.weapons,p.vehicleHulls]);
  recordMainlineTrial(g,{kind:'weapons',index:0});assert.equal(mainlineCondition(g,task(id).goal),false);
  assert.equal(mainlineConditionCost(p,task(id).goal).coins,0);
  const s=createWorkshopTrial(previewWorkshop(p,kind,index).progress,kind,index,false,{scene:true});
  // 靶标受击会后退，用正式方向输入跟进，不能原地等待射程外的目标。
  for(let i=0;i<3600&&!s.destroyed;i++){
   const g=s.game,e=g.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y))[0];
   const dx=e.x-g.player.x,dy=e.y-g.player.y,d=Math.hypot(dx,dy);s.advance(1/30,d>70?{x:dx/d,y:dy/d}:{x:0,y:0});
  }
  assert.ok(s.destroyed>0,id+'实际演练必须能击破');recordMainlineTrial(g,{kind,index});
  assert.equal(mainlineCondition(g,task(id).goal),true);assert.equal(p.mainline.seen[record],1);
  assert.equal(JSON.stringify([p.coins,p.wood,p.materials,p.weapons,p.vehicleHulls]),before);
  assert.equal(validateProgress(p).mainline.seen[record],1);
 }
});
test('未购买控制器的候选和引导均保留免费入口',()=>{
 const g=scene('own-controller');g.progress.weapons[12]=1;
 // 已拥有时本项达标；协同教学仍允许选择未购买的机械核心、蜘蛛演练。
 g.progress.mainline.currentId='controller-setup';
 assert.deepEqual(mainlineOperation(g).indices,[12,15,16]);
 const op={type:'trial',kind:'weapons',index:15,owned:false},state={open:true,page:'buy',kind:'weapons',index:15,tool:{},draft:null};
 assert.equal(workshopGuideCue(op,state).source,'#ws-test');
 assert.equal(workshopGuideCue(op,{...state,page:'upgrade'}).source,'#ws-function-buy');
 recordMainlineTrial(g,{kind:'weapons',index:15});assert.ok(mainlineCondition(g,task('controller-setup').goal));
});
test('末段允许初始战车和普通枪成长，不强制高级装备所有权',()=>{
 const g=scene('long-patrol'),p=g.progress;p.weapons[0]=5;p.heroes[0]=3;p.vehicleHulls[0]=4;
 // 正式专属炮身份不与手持武器编号混用。
 const s=createWorkshopTrial(p,'vehicle',0,false,{scene:true});p.vehicleWeapons[s.game.vehicle.weaponIndex]=4;
 assert.ok(mainlineCondition(g,task('long-patrol').goal));assert.equal(p.weapons[12]+p.weapons[15]+p.weapons[16],0);
});
test('新旧档未领奖使用新奖励；钱包、完成集合和待领奖阶段保持',()=>{
 const p=scene('controller-setup').progress;p.mainline.phase='report';p.mainline.rewardVersion=3;p.coins=150000;p.weapons[15]=9;
 const restored=validateProgress(p);assert.equal(restored.coins,p.coins);assert.equal(restored.weapons[15],9);assert.deepEqual(restored.mainline.completed,p.mainline.completed);assert.equal(restored.mainline.phase,'report');
 assert.equal(mainlineReward(task('controller-setup'),restored).coins,600);
 const before=restored.coins;assert.equal(awardMainline(restored,'controller-setup').coins,600);assert.equal(awardMainline(restored,'controller-setup'),null);assert.equal(restored.coins,before+600);
 const custom=structuredClone(RECOMMENDED_ECONOMY);custom.taskRewards['controller-setup'].coins=321;bindEconomy(p,custom);assert.equal(mainlineReward(task('controller-setup'),p).coins,321);
});
