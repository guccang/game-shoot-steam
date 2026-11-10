// 小屋建成后的导航、睡眠回血和存档失败回滚专项检查。
import test from 'node:test';
import assert from 'node:assert/strict';
import {bindEconomy,economyFor,RECOMMENDED_ECONOMY} from '../src/config/economy.js';
import {defeatBoss} from '../src/core/battle/boss-manager.js';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {COTTAGE} from '../src/config/cottage.js';
import {enterCottage,leaveCottage,updateCottage,sleepInCottage} from '../src/core/home/cottage.js';
import {cottageRestGuideActive} from '../src/core/camp/cottage-guide.js';
import {mainlineObjective,updateMainline} from '../src/core/story/mainline-manager.js';
import {worldNavigationObjective} from '../src/core/navigation/world-navigation.js';
import {repairFacility,updateRestoration} from '../src/core/camp/town-restoration.js';
// 只准备教学前置与落点，建造和睡眠均调用正式核心入口。
function scene(repaired=true){
 const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.restoration.repaired=repaired?['clearing','cottage']:['clearing'];
 const g=new Game(p,()=>.5);g.start();g.vehicle.active=false;g.player.hp=27;Object.assign(g.player,COTTAGE.door);g.restorationPersist=()=>true;g.livingPersist=()=>true;return g;
}
// 重试先离开床边解除闩锁，再用正式候停进入睡眠。
function startSleep(g){const at={x:g.player.x,y:g.player.y};Object.assign(g.player,{x:220,y:220});updateCottage(g,0,{x:0,y:0});Object.assign(g.player,at);updateCottage(g,0,{x:0,y:0});for(let i=0;i<20;i++)updateCottage(g,.05,{x:0,y:0});return sleepInCottage(g);}
// 睡眠动画使用正式控制器结算，不通过修改生命绕开事务。
function finish(g){updateCottage(g,1.3,{x:0,y:0});}
test('小屋完工后出现一次休息指引，读档保留，原主线暂不推进',()=>{
 const g=scene(false);g.progress.wood=1000;assert.equal(cottageRestGuideActive(g),false);
 assert.equal(repairFacility(g,'cottage').ok,true);updateRestoration(g,4);
 assert.equal(cottageRestGuideActive(g),true);assert.equal(mainlineObjective(g).cottageRest,true);
 assert.deepEqual(worldNavigationObjective(g).site,{...COTTAGE.door,mapId:'forest',name:'巡林小屋门前'});
 const phase=g.progress.mainline.phase;updateMainline(g,10);assert.equal(g.progress.mainline.phase,phase);
 assert.equal(validateProgress(g.progress).restoration.cottageRested,false);
 g.vehicle.active=true;assert.match(mainlineObjective(g).label,/停稳1秒.*下车进屋/);
});
test('选时睡眠恢复当前猫猫最大生命，存档保存回血和首次休息记录',()=>{
 for(const mode of ['morning']){
  const g=scene();const economy=structuredClone(RECOMMENDED_ECONOMY);bindEconomy(g.progress,economy);g.progress.hero=1;g.progress.heroes[1]=3;const hero=g.progress.hero;const phase=g.progress.mainline.phase;
  assert.ok(enterCottage(g));assert.equal(mainlineObjective(g)?.cottageRest,undefined);Object.assign(g.player,COTTAGE.bed);
  let saved;g.livingPersist=p=>{saved=structuredClone(p);return true;};assert.ok(startSleep(g));assert.equal(g.player.hp,27);finish(g);
  assert.equal(economyFor(g.progress),economy);assert.equal(g.player.hp,g.maxHp());assert.equal(saved.patrol.playerHp,g.maxHp());assert.equal(saved.restoration.cottageRested,true);
  assert.equal(validateProgress(saved).restoration.cottageRested,true);assert.equal(g.progress.hero,hero);assert.equal(g.progress.mainline.phase,phase);
  assert.equal(cottageRestGuideActive(g),false);assert.equal(g.cottage.restResult,`HP 已恢复至满值（${g.maxHp()}/${g.maxHp()}）`);assert.ok(leaveCottage(g));assert.notEqual(mainlineObjective(g)?.cottageRest,true);
 }
});
test('保存失败不回血不跳时不完成教学，离开床边后可以重试；后续睡眠仍回血',()=>{
 const g=scene();assert.ok(enterCottage(g));Object.assign(g.player,COTTAGE.bed);const calendar=structuredClone(g.progress.living.calendar);
 g.livingPersist=()=>false;assert.ok(startSleep(g));finish(g);
 assert.equal(g.player.hp,27);assert.deepEqual(g.progress.living.calendar,calendar);assert.equal(g.progress.restoration.cottageRested,false);assert.match(g.cottage.restResult,/没保存成功/);
 g.livingPersist=()=>true;assert.ok(startSleep(g));finish(g);g.player.hp=10;assert.ok(startSleep(g));finish(g);assert.equal(g.player.hp,g.maxHp());
});
test('未建成、战斗和其他活动不触发小屋教学，满血休息也能完成',()=>{
 const g=scene(false);assert.equal(cottageRestGuideActive(g),false);g.progress.restoration.repaired.push('cottage');
 g.boss={};assert.equal(cottageRestGuideActive(g),false);g.boss=null;g.progress.living.patrolActive=true;assert.equal(cottageRestGuideActive(g),false);g.progress.living.patrolActive=false;
 g.player.hp=g.maxHp();assert.ok(enterCottage(g));Object.assign(g.player,COTTAGE.bed);assert.ok(startSleep(g));finish(g);assert.equal(g.player.hp,g.maxHp());assert.equal(cottageRestGuideActive(g),false);
});

// 普通巡游等待、胜利与换装都不能替代小屋休息。
test('普通巡游安全等待不会自动回血，换猫与拒绝手动升级不附送生命',async()=>{
 const g=scene();g.progress.restoration.cottageRested=true;g.progress.coins=999999;g.progress.heroes[1]=1;g.mainlineSpeech=null;
 g.enemies=[];g.spawnTimer=999;g.fireClock=999;Object.assign(g.player,{x:900,y:800});
 for(let i=0;i<100;i++)g.update(.05,{x:0,y:0});assert.equal(g.player.hp,27);
 g.progress.residentCats=[0,1];g.progress.homeDecor.floors=3;g.cottage={kind:'cottage',floor:2,residentTalk:1,outside:{x:900,y:800}};
 Object.assign(g.player,(await import('../src/config/cottage-residents.js')).RESIDENT_VISITOR);
 assert.ok(g.transact('heroes',1,'equip'));assert.equal(g.player.hp,27);
 // 角色现在只靠经验升级，旧购买升级入口应拒绝且不回血。
 assert.equal(g.transact('heroes',1,'upgrade'),false);assert.equal(g.player.hp,27);
});
test('普通巡游击败领主不自动回满生命',()=>{
 const g=scene();g.progress.restoration.cottageRested=true;g.boss={};defeatBoss(g);assert.equal(g.player.hp,27);
});
