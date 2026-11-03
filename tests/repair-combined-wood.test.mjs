// 房屋材料回归：背包与仓库合计、原子扣料、首次工坊和建筑公司共用规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {constructionWood,spendConstructionWood} from '../src/progression/resource-wallet.js';
import {repairWoodStatus,woodTaskStatus} from '../src/core/wood-task-status.js';
import {restorationStatus,repairFacility,updateRestoration} from '../src/core/town-restoration.js';
import {mainlineSteps,mainlineObjective} from '../src/core/mainline-manager.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {WORKSHOP} from '../src/world/workshop.js';
import {arrivalWorkshopObjective} from '../src/core/ranger-arrival.js';
import {buildHome} from '../src/core/home-construction.js';
import {HOME_BUILD_PRICES} from '../src/config/home-construction.js';
// 真实修复现场具备当前任务和保存接口，不跳过施工核心。
function scene(id='clearing'){const f=TOWN_RESTORATIONS.find(f=>f.id===id),p=freshProgress();p.mainline.completed=MAINLINE_IDS.slice(0,f.order);p.mainline.phase='doing';p.restoration.repaired=TOWN_RESTORATIONS.slice(0,TOWN_RESTORATIONS.indexOf(f)).map(f=>f.id);const g=new Game(p,()=>.5);g.start();Object.assign(g.player,f.site);g.vehicle.active=false;g.enemies=[];g.boss=null;g.attackTimer=999;g.restorationPersist=()=>true;return {g,f};}
// 两处库存都经过正式归一化后再检查守恒，车载木材保持原样。
function stock(g,warehouse,bag){g.progress.wood=warehouse;g.progress.logistics.bagWood=bag;g.progress.vehicleHulls[0]=1;g.progress.logistics.builds[0].wood=999;}

test('扣料优先背包，仓库补差额；不足和非法金额不改变库存',()=>{const p=freshProgress();p.wood=20;p.logistics.bagWood=30;assert.equal(constructionWood(p),50);for(const n of [51,-1,NaN,1.5]){const before=structuredClone(p);assert.equal(spendConstructionWood(p,n),false);assert.deepEqual(p,before);}assert.ok(spendConstructionWood(p,40));assert.equal(p.wood,10);assert.equal(p.logistics.bagWood,0);});
test('背包单独足够、仓库单独足够以及两者合计足够均可修复',()=>{for(const mode of ['bag','warehouse','mixed']){const {g,f}=scene('cottage'),bag=mode==='bag'?f.wood+3:mode==='mixed'?17:0,warehouse=mode==='bag'?0:f.wood-(mode==='mixed'?17:0);stock(g,warehouse,bag);assert.ok(restorationStatus(g,f.id).canRepair,mode);assert.ok(repairFacility(g,f.id).ok);assert.equal(g.progress.logistics.bagWood,mode==='bag'?3:0);assert.equal(g.progress.wood,0);assert.equal(g.progress.logistics.builds[0].wood,999);assert.equal(repairFacility(g,f.id).ok,false);}});
test('合计不足时进度只差实际余额，不把货舱算作可投料，主线不强制入库',()=>{const {g,f}=scene();stock(g,f.wood-11,10);const s=restorationStatus(g,f.id);assert.equal(s.enough,false);assert.equal(s.wood.progress,`${f.wood-1}/${f.wood}`);assert.match(s.wood.hint,/还差 1 木头/);assert.equal(repairFacility(g,f.id).ok,false);assert.ok(mainlineSteps(g).every(s=>!s.label.includes('存入')));g.progress.logistics.bagWood++;assert.ok(restorationStatus(g,f.id).canRepair);assert.deepEqual(mainlineSteps(g).map(s=>s.label),['修复'+f.name]);assert.equal(mainlineObjective(g).site.x,f.site.x);});
test('修复保存失败和异常均保留两处库存，重试只投料一次并可读档',()=>{for(const persist of [()=>false,()=>{throw Error('保存失败');}]){const {g,f}=scene();stock(g,f.wood-20,25);const before=structuredClone(g.progress);g.restorationPersist=persist;assert.equal(repairFacility(g,f.id).ok,false);assert.deepEqual(g.progress,before);g.restorationPersist=()=>true;updateRestoration(g,.05);assert.equal(constructionWood(g.progress),5);for(let i=0;i<70;i++)updateRestoration(g,.05);assert.ok(g.progress.restoration.repaired.includes(f.id));const p=validateProgress(structuredClone(g.progress));assert.equal(constructionWood(p),5);assert.equal(p.logistics.builds[0].wood,999);}});
test('首次工坊用混合木材直接导航修复，失败不扣料，重试后不重复扣除',()=>{const p=freshRangerProgress();Object.assign(p.arrival,{phase:'gather',keys:true,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=RANGER.repairWood-13;p.logistics.bagWood=13;const g=new Game(p);g.start();g.attackTimer=999;assert.equal(arrivalWorkshopObjective(g).key,'arrival-gather');assert.match(arrivalWorkshopObjective(g).label,/修复/);g.arrivalPersist=()=>false;g.update(.01);assert.equal(constructionWood(g.progress),RANGER.repairWood);assert.equal(g.arrivalError,true);g.arrivalPersist=()=>true;g.advanceArrival();g.update(.01);assert.equal(g.progress.arrival.phase,'repairing');assert.equal(constructionWood(g.progress),0);g.update(.05);assert.equal(constructionWood(g.progress),0);});
test('建筑公司共用合计余额，保存失败不扣，成功同时扣币和木材',()=>{const {g}=scene(),cost=HOME_BUILD_PRICES.basement;g.cottage={kind:'construction'};g.progress.coins=cost.coins;stock(g,cost.wood-9,12);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(buildHome(g,'basement').ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(buildHome(g,'basement').ok);assert.equal(g.progress.coins,0);assert.equal(constructionWood(g.progress),3);assert.equal(g.progress.logistics.bagWood,0);assert.ok(g.progress.homeDecor.basement);});
test('修复提示合计背包，普通购买任务仍保留原入库规则',()=>{const {g}=scene();stock(g,0,30);const repair=repairWoodStatus(g,30);assert.equal(repair.ready,true);assert.equal(repair.destination,null);assert.match(repair.breakdown,/仓库 0 · 背包 30/);assert.equal(woodTaskStatus(g,30).ready,false);});
