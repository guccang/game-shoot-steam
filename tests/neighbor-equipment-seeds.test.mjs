// 邻里装备委托与首次播种补给：验证真实来源、旧档修复、一次性和原子提交。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS,MAINLINE_SITES,currentMainlineTask} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {completeMainline} from '../src/core/mainline-manager.js';
import {recordMainlineVehiclePractice,recordMainlineCombat} from '../src/progression/mainline-combat.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
import {grantMainlineSeeds} from '../src/progression/mainline-seeds.js';
import {FARM_STOCK_CAP} from '../src/config/farm.js';
// 只准备当前任务和已修复设施，击杀或交付由正式逻辑执行。
function scene(id){const p=freshProgress();p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.trees=[];Object.assign(g.player,MAINLINE_SITES.camp);return g;}
// 以真实主炮来源构造独立命中，正式测试仍由 Game.hit 结算死亡。
function equip(g,index){g.progress.vehicleHulls[index]=1;g.progress.vehicleIndex=index;Object.assign(g.vehicle,{active:true,index});return {weaponIndex:nativeVehicleWeapon(index).weaponIndex,audioSource:'primary'};}

test('购种交付赠三粒并解锁，保存失败不发，重领和读档不增发',()=>{
 const g=scene('neighbor-seed-shop');g.progress.mainline.phase='report';g.progress.mainline.gardening={taskId:'neighbor-seed-shop',purchased:2};g.progress.farm.seeds[0]=2;
 const before=structuredClone(g.progress);g.mainlinePersist=()=>false;assert.equal(completeMainline(g),false);assert.deepEqual(g.progress,before);
 g.mainlinePersist=()=>true;assert.ok(completeMainline(g));assert.equal(g.progress.farm.seeds[0],4);assert.equal(g.progress.farm.unlocked[0],true);
 assert.equal(completeMainline(g),false);assert.equal(validateProgress(structuredClone(g.progress)).farm.seeds[0],4);
});
test('截图所示旧版首次播种空背包补发一次，重新读取不会刷种子',()=>{
 for(const version of [6,7]){
  const p=freshProgress();p.mainline={...p.mainline,version,completed:version===6?['first-map']:MAINLINE_IDS.slice(0,3),phase:'doing'};p.farm.dug=1;
  const next=validateProgress(p);assert.equal(currentMainlineTask(next.mainline).id,'first-farm');assert.equal(next.mainline.phase,'doing');assert.equal(next.farm.seeds[0],3);assert.ok(next.farm.unlocked[0]);
  assert.deepEqual(validateProgress(structuredClone(next)),next);next.farm.seeds[0]=0;assert.equal(validateProgress(structuredClone(next)).farm.seeds[0],0);
 }
});
test('补发不影响新档、已播种或其他任务；满仓领取仍解锁且只记一次',()=>{
 assert.equal(validateProgress(freshProgress()).farm.seeds[0],0);
 for(const id of ['first-farm','vehicle-field']){const p=freshProgress();p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));if(id==='first-farm')p.farm.planted=1;assert.equal(validateProgress(p).farm.seeds[0],0);}
 const g=scene('neighbor-seed-shop'),task=currentMainlineTask(g.progress.mainline);g.progress.farm.seeds[0]=FARM_STOCK_CAP;
 assert.equal(grantMainlineSeeds(g.progress,task),0);assert.ok(g.progress.farm.unlocked[0]);g.progress.farm.seeds[0]=0;assert.equal(grantMainlineSeeds(g.progress,task),0);
});
test('原载具清缴任务只要求胜利，步行且无主炮击杀记录也能完成',()=>{
 for(const id of ['vehicle-field','aircraft-field']){
  const g=scene(id);g.vehicle.active=false;
  assert.equal(recordMainlineCombat(g.progress,'clearing',{won:false}),false);
  assert.equal(g.progress.mainline.combatPractice,null);g.progress=validateProgress(structuredClone(g.progress));assert.equal(recordMainlineCombat(g.progress,'clearing'),true);
 }
});
test('清缴不再产生或依赖专属载具体验记录',()=>{
 const bad=[g=>g.vehicle.active=false,g=>g.vehicle.index=2,g=>g.progress.vehicleHulls[0]=0,g=>g.story={},g=>g.realm={},g=>g.workshopTrial={},g=>g.livingPreview=true,g=>g.progress.mainline.phase='meet',g=>g.progress.living.patrolActive=false];
 for(const alter of bad){const g=scene('vehicle-field'),impact=equip(g,0);g.progress.living.patrolActive=true;alter(g);recordMainlineVehiclePractice(g,{type:'enemy',hp:0},impact);assert.equal(g.progress.mainline.combatPractice,null);}
 for(const impact of [{weaponIndex:0,audioSource:'secondary'},{weaponIndex:16,audioSource:'primary'}]){const g=scene('vehicle-field');equip(g,0);g.progress.living.patrolActive=true;recordMainlineVehiclePractice(g,{type:'enemy',hp:0},impact);assert.equal(g.progress.mainline.combatPractice,null);}
});
test('气垫船只记录西门正式守卫主炮；控制器守门仍须装备自己的控制器',()=>{
 const g=scene('hover-horde'),impact=equip(g,3),target={type:'enemy',hp:0,campDefense:true};
 for(const camp of [{gateId:'right'},{gateId:'left',reason:'death'}]){g.campDefense=camp;recordMainlineVehiclePractice(g,target,impact);assert.equal(g.progress.mainline.combatPractice,null);}
 g.campDefense={gateId:'left',reason:null};recordMainlineVehiclePractice(g,target,impact);assert.equal(g.progress.mainline.combatPractice,'hover-horde');assert.equal(recordMainlineCombat(g.progress,'camp-defense',{gate:'left',won:false}),false);assert.equal(recordMainlineCombat(g.progress,'camp-defense',{gate:'left'}),true);
 const p=scene('controller-horde').progress;assert.equal(recordMainlineCombat(p,'camp-defense',{gate:'left'}),false);p.weapon=12;assert.equal(recordMainlineCombat(p,'camp-defense',{gate:'left'}),false);p.weapons[12]=1;assert.equal(recordMainlineCombat(p,'camp-defense',{gate:'left'}),true);
});
