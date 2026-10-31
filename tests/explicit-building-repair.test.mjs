// 非任务修复必须由明确意图发起：覆盖路过、重叠区、重复提交和失败后不自动扣费。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS,RESTORATION_SECONDS} from '../src/config/town-restoration.js';
import {updateRestoration,repairFacility,restorationStatus} from '../src/core/town-restoration.js';
import {nearbyInteraction} from '../src/core/nearby-interaction.js';

// 仅准备材料与进度，实际费用及施工均走生产方法。
function scene(){const g=new Game(freshProgress(),()=>.5);g.start();g.progress.wood=9999;g.progress.restoration.repaired=[];g.restorationPersist=()=>true;g.mainlineSpeech=null;return g;}
test('未到修复任务时路过设施和原地停留都不投料，连修完后也不会顺带修下一座',()=>{
 const g=scene();
 for(const f of TOWN_RESTORATIONS){Object.assign(g.player,f.site);for(let i=0;i<100;i++)updateRestoration(g,.05);assert.equal(g.progress.restoration.build,null);assert.equal(g.progress.wood,9999);}
 const f=TOWN_RESTORATIONS.find(f=>f.id==='cottage');Object.assign(g.player,f.site);
 assert.ok(repairFacility(g,f.id).ok);assert.equal(repairFacility(g,f.id).ok,false);
 updateRestoration(g,RESTORATION_SECONDS);for(const next of TOWN_RESTORATIONS){Object.assign(g.player,next.site);updateRestoration(g,5);}
 assert.deepEqual(g.progress.restoration.repaired,['cottage']);assert.equal(g.progress.wood,9999-f.wood);
});
test('材料不足或目标离开范围时，不转而修复脚边较便宜的设施',()=>{
 const g=scene(),chosen=TOWN_RESTORATIONS.find(f=>f.id==='cottage'),other=TOWN_RESTORATIONS.find(f=>f.id==='clearing');
 Object.assign(g.player,other.site);g.progress.wood=chosen.wood-1;
 assert.ok(restorationStatus(g,other.id).canRepair);assert.equal(repairFacility(g,chosen.id).ok,false);
 updateRestoration(g,10);assert.equal(g.progress.restoration.build,null);assert.equal(g.progress.wood,chosen.wood-1);
 Object.assign(g.player,chosen.site);g.progress.wood=9999;assert.ok(repairFacility(g,chosen.id).ok);
 assert.equal(g.progress.restoration.build.id,chosen.id);assert.equal(g.progress.wood,9999-chosen.wood);
});
test('保存失败后站立不自动重试扣料，明确重试成功仅扣一次；离开区域拒绝旧目标',()=>{
 const g=scene(),f=TOWN_RESTORATIONS.find(f=>f.id==='cottage');Object.assign(g.player,f.site);g.restorationPersist=()=>false;
 assert.equal(repairFacility(g,f.id).ok,false);g.restorationPersist=()=>true;updateRestoration(g,5);assert.equal(g.progress.wood,9999);
 assert.equal(nearbyInteraction(g).key,f.id);g.player.x+=1000;assert.equal(repairFacility(g,f.id).ok,false);assert.equal(g.progress.wood,9999);
 Object.assign(g.player,f.site);assert.ok(repairFacility(g,f.id).ok);assert.equal(repairFacility(g,f.id).ok,false);assert.equal(g.progress.wood,9999-f.wood);
});
