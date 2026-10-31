// 角色经验、旧档、任务及猫窝获取均走正式规则，防止免费升级或重复扣款。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {awardHeroXp,heroExperience,HERO_MAX_LEVEL} from '../src/progression/hero-experience.js';
import {awardCampXp,countCampActivity} from '../src/progression/camp-level.js';
import {awardMainline} from '../src/progression/mainline-reward.js';
import {MAINLINE_TASKS,MAINLINE_SITES} from '../src/config/mainline.js';
import {completeMainline} from '../src/core/mainline-manager.js';
import {rewardReceipt} from '../src/progression/reward-receipt.js';
import {mainlineConditionCost} from '../src/progression/mainline-cost.js';
import {transactProgress} from '../src/progression/transactions.js';
import {Game} from '../src/core/game.js';
import {adoptCat} from '../src/core/cat-home.js';
import {CAT_HOME} from '../src/config/cat-home.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WORKSHOP_INTERIORS,interiorShopkeeper,interiorFurniture} from '../src/config/workshop-interiors.js';
import {updateCottage} from '../src/core/cottage.js';
import {blocked} from '../src/physics/motion.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {farmLandReason} from '../src/world/farm-land.js';
// 完成入职且没有演出，让真实房间和击杀规则可独立验证。
function setup(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=p.wood=10000;const g=new Game(p);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;return g;}
test('经验连续升级、独立角色与满级封顶，不消耗资源',()=>{
 const p=freshProgress(),coins=p.coins,wood=p.wood;p.heroes[1]=1;awardHeroXp(p,350);assert.equal(p.heroes[0],3);assert.equal(p.heroXp[0],50);assert.equal(p.heroes[1],1);p.hero=1;awardHeroXp(p,70);assert.equal(p.heroXp[1],70);assert.equal(p.heroXp[0],50);assert.equal(p.coins,coins);assert.equal(p.wood,wood);awardHeroXp(p,1e8);assert.equal(p.heroes[1],HERO_MAX_LEVEL);assert.deepEqual(heroExperience(p),{level:HERO_MAX_LEVEL,xp:0,next:null});assert.equal(awardHeroXp(p,100).gained,0);
});
test('旧档等级不降，未拥有角色不能存经验，刷新保留有效进度',()=>{
 const p=freshProgress();p.heroes[0]=12;delete p.heroXp;const old=validateProgress(p);assert.equal(old.heroes[0],12);assert.equal(old.heroXp[0],0);old.heroXp=[75,900,NaN,-2,Infinity];const next=validateProgress(old);assert.equal(next.heroXp[0],75);assert.equal(next.heroXp[1],0);assert.ok(next.heroXp.every(Number.isFinite));next.heroXp[0]=1300;assert.equal(validateProgress(next).heroes[0],13);
});
test('任务经验在营地满级后仍有效；伐木不给角色经验，重复交付无效',()=>{
 const p=freshProgress();p.campLevel.xp=10800;awardCampXp(p,'living');assert.equal(p.heroXp[0],80);countCampActivity(p,'trees',300);assert.equal(p.heroXp[0],80);const task=MAINLINE_TASKS[0];p.mainline.currentId=task.id;const r=awardMainline(p,task.id);assert.ok(r);assert.equal(p.heroes[0],2);assert.equal(p.heroXp[0],40);const before=structuredClone(p);assert.equal(awardMainline(p,task.id),null);assert.deepEqual(p,before);
});
test('任务交付保存失败不发角色经验，重试收据仅记录一次真实升级',()=>{
 const g=setup(),task=MAINLINE_TASKS[0];g.enemies=[];g.boss=null;g.progress.restoration.cottageRested=true;g.progress.mainline.currentId=task.id;g.progress.mainline.phase='report';g.progress.heroXp[0]=60;Object.assign(g.player,MAINLINE_SITES[task.site]);g.player.arena=null;const before=structuredClone(g.progress);g.mainlinePersist=()=>false;assert.equal(completeMainline(g),false);assert.deepEqual(g.progress,before);g.mainlinePersist=()=>true;assert.equal(completeMainline(g),true);assert.equal(g.progress.heroes[0],2);assert.equal(g.progress.heroXp[0],20);assert.equal(rewardReceipt(before,g.progress,'交付').heroExperience.gained,60);assert.equal(completeMainline(g),false);
});
test('真实击杀只发一次经验，升级不治疗、不改变车辆耐久和弹药',()=>{
 const g=setup();g.progress.heroXp[0]=95;g.player.hp=40;const hulls=JSON.stringify(g.vehicles);const enemy=g.spawnEnemy(0,0,{x:1500,y:900});enemy.tough=false;g.hit(enemy,1e6);assert.equal(g.progress.heroes[0],2);assert.equal(g.progress.heroXp[0],5);assert.equal(g.player.hp,40);assert.equal(JSON.stringify(g.vehicles),hulls);g.hit(enemy,1e6);assert.equal(g.progress.heroXp[0],5);const dummy=g.spawnEnemy(0,0,{x:1510,y:900});dummy.workshopTarget=true;g.hit(dummy,1e6);assert.equal(g.progress.heroXp[0],5);
});
test('手动升级被拒绝，获取只在猫窝，保存失败及重复获取不扣款',()=>{
 const g=setup();assert.equal(g.transact('heroes',0,'upgrade'),false);assert.equal(transactProgress(g.progress,'heroes',1,'buy'),false);assert.equal(adoptCat(g,1).ok,false);g.cottage={kind:'cat-home',outside:{x:280,y:854,mapId:'forest'}};g.state='paused';const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(adoptCat(g,1).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(adoptCat(g,1).ok);assert.equal(g.progress.heroes[1],1);assert.equal(g.progress.hero,0);assert.equal(g.progress.heroXp[1],0);const coins=g.progress.coins;assert.equal(adoptCat(g,1).ok,false);assert.equal(g.progress.coins,coins);assert.ok(g.transact('heroes',1,'equip'));assert.equal(g.progress.hero,1);
});
test('角色经验目标不再要求金币，主线没有角色付费升级入口',()=>{
 const p=freshProgress();assert.deepEqual(mainlineConditionCost(p,{path:'progress.heroes.0',min:5}),{coins:0,wood:0,parts:0,crystal:0,core:0});for(const task of MAINLINE_TASKS)for(const step of task.guide.steps)assert.notEqual(step.operation?.type,'hero');
});
test('猫窝墙体、入口通路、柜台和一秒进出使用正式系统',()=>{
 const g=setup(),room=WORKSHOP_INTERIORS['cat-home'],body={mapId:'forest',livingCollision:true};assert.ok(planQuestRoute({...body,x:390,y:700},room.door,g.trees,24000).reachable);assert.ok(blocked(CAT_HOME.x,CAT_HOME.y-40,12,g.trees,body));for(const p of [room.door,room.outside])assert.equal(blocked(p.x,p.y,12,g.trees,body),false);assert.match(farmLandReason(g,CAT_HOME),/建筑|路面/);Object.assign(g.player,room.door,{vx:0,vy:0});for(let i=0;i<20;i++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage?.kind,'cat-home');assert.equal(interiorShopkeeper(g.cottage).label,'猫窝管理员');assert.equal(interiorFurniture(g).filter(f=>f.type==='counter').length,1);Object.assign(g.player,room.exit);for(let i=0;i<20;i++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage,null);
});
