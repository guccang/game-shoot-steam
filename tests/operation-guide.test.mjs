// 操作指引专项：状态解释、配置绑定、真实进度与草稿隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {workshopGuideCue} from '../src/core/workshop/workshop-guide.js';
import {MAINLINE_OPERATIONS} from '../src/config/mainline-operations.js';
import {MAINLINE_TASKS,MAINLINE_IDS} from '../src/config/mainline.js';
import {mainlineOperation,mainlineAction} from '../src/core/story/mainline-manager.js';
import {freshProgress} from '../src/progression/progress.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
const operation={type:'upgrade',kind:'weapons',index:0,part:'capacity'};
// 默认夹具代表打开真实部件页但尚未发生任何交易。
const state=(extra={})=>({open:true,kind:'weapons',index:0,turret:null,tray:'components',draft:null,affordable:true,tool:{placed:false,pointer:false},weaponTarget:17,...extra});

test('功能页签先导航到可见按钮，车载主炮从升级页直接定位',()=>{
 assert.equal(workshopGuideCue(operation,state({page:'buy'})).source,'#ws-function-upgrade');
 assert.equal(workshopGuideCue({type:'buy',kind:'weapons',index:0},state({page:'unlock'})).source,'#ws-function-buy');
 assert.equal(workshopGuideCue({type:'trial',kind:'weapons',index:0},state({page:'unlock'})).source,'#ws-function-upgrade');
 assert.equal(workshopGuideCue({type:'modify',kind:'weapons',index:0},state({page:'upgrade'})).source,'#ws-function-modify');
 const op={type:'upgrade',kind:'vehicle',index:0,part:'damage',native:true,turret:17};
 assert.equal(workshopGuideCue(op,state({kind:'vehicle',page:'upgrade'})).source,'#ws-kits-tab');
 assert.equal(workshopGuideCue(op,state({kind:'vehicle',page:'modify',tray:'kits',choice:17})).source,'#ws-function-upgrade');
 assert.equal(workshopGuideCue(op,state({kind:'vehicle',page:'upgrade',turret:17})).source,'[data-ws-upgrade="damage"]');
});

// 筛选后目标不在当前货架时先切页，空目录不高亮不存在的装备或交易按钮。
test('按拥有状态筛选后，主线仍能跨页定位任务武器',()=>{
 assert.equal(workshopGuideCue(operation,state({page:'buy',index:3})).source,'#ws-function-upgrade');
 assert.equal(workshopGuideCue({type:'buy',kind:'weapons',index:3},state({page:'modify'})).source,'#ws-function-buy');
 assert.equal(workshopGuideCue({type:'equip',kind:'weapons',index:0},state({page:'buy',index:null,empty:true})).source,'#ws-function-upgrade');
 assert.equal(workshopGuideCue(operation,state({page:'upgrade',index:null,empty:true})).source,'#ws-empty-action');
});
test('任务操作表与原条件逐项对齐，不增加独立进度',()=>{
 assert.equal(Object.keys(MAINLINE_OPERATIONS).length,MAINLINE_TASKS.length);
 for(const task of MAINLINE_TASKS){assert.equal(MAINLINE_OPERATIONS[task.id].length,task.guide.steps.length,task.id);assert.equal(task.guide.steps.length,(task.goal.all||[task.goal]).length);}
 assert.deepEqual(JSON.parse(JSON.stringify(MAINLINE_OPERATIONS)),MAINLINE_OPERATIONS);
});
test('武器点选自动试装后提示长按，载具共用长按确认指引',()=>{
 let cue=workshopGuideCue(operation,state());assert.equal(cue.source,'[data-ws-upgrade="capacity"]');assert.equal(cue.target,null);assert.equal(cue.prepare,undefined);
 assert.equal(workshopGuideCue(operation,state({busy:true})).id,'assembly');
 const draft={action:'part',part:'capacity'};
 cue=workshopGuideCue(operation,state({draft}));assert.equal(cue.source,'#ws-hold');
 const vehicle=workshopGuideCue({...operation,kind:'vehicle'},state({kind:'vehicle',draft}));assert.equal(vehicle.source,'#ws-hold');assert.equal(vehicle.target,null);
 assert.equal(workshopGuideCue(operation,state({draft,tool:{placed:true}})).source,'#ws-hold');
 assert.equal(workshopGuideCue(operation,state({dragging:true})).preserve,true);
 assert.equal(workshopGuideCue(operation,state({tool:{pointer:true}})).preserve,true);
});
test('缺料、旧件对比与其他草稿不能误提示提交，关闭后停止指引',()=>{
 assert.equal(workshopGuideCue(operation,state({affordable:false})).source,'#ws-resources');
 assert.equal(workshopGuideCue(operation,state({before:true})).source,'#ws-part-after');
 assert.equal(workshopGuideCue(operation,state({draft:{part:'damage'}})).source,'#ws-change-part');
 assert.equal(workshopGuideCue(operation,state({open:false})),null);
});
test('错装备先定位货架，专属主炮明确经过主炮选择与部件页',()=>{
 assert.equal(workshopGuideCue(operation,state({index:3})).source,'[data-ws-item="0"]');
 const op={type:'upgrade',kind:'vehicle',index:0,part:'damage',native:true,turret:2};
 const vehicle={kind:'vehicle',weaponTarget:2};
 assert.equal(workshopGuideCue(op,state(vehicle)).source,'#ws-kits-tab');
 assert.equal(workshopGuideCue(op,state({...vehicle,tray:'kits'})).source,'#ws-kits-tab');
 assert.equal(workshopGuideCue(op,state({...vehicle,weaponTarget:0})).source,'#ws-native-turret');
 assert.equal(workshopGuideCue(op,state({...vehicle,turret:2})).source,'[data-ws-upgrade="damage"]');
 assert.equal(workshopGuideCue(op,state({...vehicle,draft:{part:'armor'}})).id,'other-draft');
});
test('完成等级后切换操作，毕业整备可沿用普通主力武器',()=>{
 const progress=freshProgress(),game={progress};progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pistol-upgrade'));
 // 本用例只检查装备操作，已完成对应建筑修复，不停留在前置修复目标。
 progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);progress.restoration.cottageRested=true;
 assert.equal(mainlineOperation(game).part,'damage');assert.equal(mainlineAction(game).kind,'weapons');
 progress.weapons[0]=3;assert.equal(mainlineOperation(game).type,'hero');assert.equal(mainlineAction(game).id,'heroes-button');
 progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('long-patrol'));progress.weapons[16]=1;progress.weapon=0;
 // 末段先完成主炮与角色目标，再检查普通武器与车体步骤。
 progress.vehicleHulls[0]=1;progress.vehicleWeapons[17]=12;progress.heroes[0]=12;
 assert.equal(mainlineOperation(game).index,0);assert.equal(mainlineAction(game).index,0);
 progress.weapons[0]=5;assert.equal(mainlineOperation(game).part,'armor');assert.equal(mainlineAction(game).kind,'vehicle');
});

// 已完成摘要不能遮住后续步骤，返回按钮必须匹配新演练页。
test('连续升级、演练返回与载具跨页均定位可见控件',()=>{
 assert.equal(workshopGuideCue(operation,state({completed:true})).source,'#ws-change-part');
 assert.equal(workshopGuideCue(operation,state({trial:true})).source,'#weapon-trial-close');
 assert.equal(workshopGuideCue({type:'drive',kind:'vehicle',index:0},state({kind:'vehicle',page:'buy'})).source,'#ws-function-upgrade');
});

// 改装与挂载必须指向可见的长按按钮，门槛及旧件对比不会误导扣费。
test('点选改装与挂载共用长按指引，取消安装圈和即时确认提示',()=>{
 for(const kind of ['weapons','vehicle']){
  const op={type:'modify',kind,index:0},base={kind,page:'modify',tray:'kits'},draft={action:kind==='vehicle'?'mount':'modify'};
  const pick=workshopGuideCue(op,state(base));assert.equal(pick.source,kind==='vehicle'?'[data-ws-part]:not([data-ws-part="17"])':'[data-ws-part="1"]');assert.equal(pick.target,null);
  assert.equal(workshopGuideCue(op,state({...base,draft})).source,'#ws-hold');
  assert.equal(workshopGuideCue(op,state({...base,draft,before:true})).source,'#ws-before');
  assert.equal(workshopGuideCue(op,state({...base,draft,affordable:false,reason:'已是当前配置'})).text,'已是当前配置');
 }
});
