import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 余额不足仍可前往工坊查看正式报价，购买事务继续拒绝超额支出。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_TASKS,MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {mainlineOperation} from '../src/core/mainline-manager.js';
import {requestMainlineNavigation,worldNavigationObjective,requestWorldNavigation} from '../src/core/world-navigation.js';
import {storyRouteState} from '../src/core/story-route.js';
import {equipmentRequirements,canPurchaseEquipment} from '../src/progression/equipment-goals.js';
const purchases=MAINLINE_TASKS.filter(t=>t.guide.steps[0].operation?.type==='buy');
// 从正式存档与游戏实例构造购买阶段，余额恰好覆盖当前营地等级的折后需求。
function setup(task,xp=0){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(task.id));p.mainline.phase='doing';p.campLevel.xp=xp;
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,{x:800,y:900});
 const op=mainlineOperation(g),rows=equipmentRequirements(g.progress,op.kind,op.index);
 for(const row of rows)setBalance(g,row,row.need);
 return {g,op,rows};
}
// 金币木材与材料分别存放，测试使用正式需求键修改对应钱包。
function setBalance(g,row,value){if(['coins','wood'].includes(row.key))g.progress[row.key]=value;else g.progress.materials[row.key]=value;}
for(const task of purchases)test(task.id+'：资源不足仍可查看工坊，正式购买继续校验余额',()=>{
 for(const xp of [0,1000]){
  const {g,op,rows}=setup(task,xp);
  for(const row of rows){
   setBalance(g,row,row.need-1);assert.equal(canPurchaseEquipment(g.progress,op.kind,op.index),false);
   requestMainlineNavigation(g);assert.ok(worldNavigationObjective(g),row.key);assert.ok(storyRouteState(g));
   setBalance(g,row,row.need);assert.ok(worldNavigationObjective(g),'补齐资源保留导航');
  }
  assert.equal(canPurchaseEquipment(g.progress,op.kind,op.index),true);requestMainlineNavigation(g);assert.ok(worldNavigationObjective(g));assert.ok(storyRouteState(g));
  setBalance(g,rows[0],rows[0].need-1);assert.ok(storyRouteState(g),'余额变化不阻止查看报价');
  setBalance(g,rows[0],rows[0].need);assert.ok(worldNavigationObjective(g));requestMainlineNavigation(g);assert.ok(worldNavigationObjective(g));
 }
});
test('购买不足不阻止主动访问建筑、会面和交付，也不跳过实际地点检查',()=>{
 const {g,rows}=setup(purchases[0]);setBalance(g,rows[0],0);requestMainlineNavigation(g);assert.ok(worldNavigationObjective(g));
 requestWorldNavigation(g,MAINLINE_SITES.weaponsEntry,'查看武器工坊',{direct:true});assert.equal(worldNavigationObjective(g).key,'visit');
 requestMainlineNavigation(g);assert.ok(worldNavigationObjective(g));
 for(const phase of ['meet','report']){g.progress.mainline.phase=phase;assert.ok(worldNavigationObjective(g));}
});
test('控制器备选装备使用当前选择的实际购买条件',()=>{
 const task=purchases.find(t=>t.guide.steps[0].operation.indices),{g}=setup(task);
 for(const index of task.guide.steps[0].operation.indices){
  g.progress.weapon=index;const op=mainlineOperation(g);assert.equal(op.index,index);
  const rows=equipmentRequirements(g.progress,op.kind,index);for(const row of rows)setBalance(g,row,row.need);
  requestMainlineNavigation(g);assert.ok(worldNavigationObjective(g));setBalance(g,rows[0],rows[0].need-1);assert.ok(worldNavigationObjective(g));
 }
});
