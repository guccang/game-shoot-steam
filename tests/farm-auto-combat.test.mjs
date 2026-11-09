// 自动迎敌使用正式射程与农活事务，确保战斗前后队列和收益连续。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {farmMode,farmWorking,farmThreat,farmInteractionBlocked,setFarmTool,queueFarmWork,updateFarmWork,FARM_ACTION_TIMING} from '../src/core/farming/farm.js';
import {farmApproach} from '../src/world/farm-land.js';
import {WORLD} from '../src/world/coordinates.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
import {FARM_CROPS,FARM_SEED_DOOR} from '../src/config/farm.js';
import {FARM_COMBAT_RESUME_DELAY} from '../src/config/farm-tools.js';

// 正式世界夹具保留武器、弹道、碰撞和农活动作，只移除额外刷怪与任务演出。
function scene(){
 const p=freshProgress();p.arrival=null;p.mainline.completed=MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];
 p.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:893+id*56,y:2752,crop:0,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=2;
 const g=new Game(p);g.state='playing';g.vehicle.active=false;g.trees=[];g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.updateWaves=()=>{};
 Object.assign(g.player,{x:893,y:2814,hp:100,invincible:9999});setFarmTool(g,'harvest');for(const plot of p.farm.plots)assert.ok(queueFarmWork(g,'harvest',{plot:plot.id}).ok);return g;
}
// 只在单元测试中固定动作位，完成过程使用正式时序和结算入口。
function finish(g){for(let i=0;i<200&&(g.farmWork?.job||g.farmWork?.queue.length);i++){const job=g.farmWork.job||g.farmWork.queue[0];if(!job.hit)Object.assign(g.player,farmApproach(g,job.point,job.action));updateFarmWork(g,.05,{x:0,y:0});}}
// 低层状态测试只需要真实目标资格；开火测试另用正式刷怪入口。
function enemy(g,offset=100){return {id:987,type:'enemy',x:g.player.x+offset,y:g.player.y,hp:100,radius:12};}
// 用小步有效游玩时间等待警戒结束，不通过直接改状态跳过恢复流程。
function recover(g){for(let i=0;i<Math.ceil(FARM_COMBAT_RESUME_DELAY/.05);i++)updateFarmWork(g,.05,{x:0,y:0});}

// 盾量和伤害不改变防具的非攻击性质；贴身怪物也不能把播种等事务切入迎敌。
for(const action of ['plant','water','harvest'])for(const broken of [false,true])test(`护盾${broken?'耗尽':'有效'}时贴身遇敌不打断${action}`,()=>{
 const g=scene();g.progress.weapons[18]=1;g.progress.weapon=18;g.player.invincible=0;
 if(broken)g.magazines[18].ammo=0;
 const now=Date.now();setFarmTool(g,action==='plant'?'seed':action);
 for(const p of g.progress.farm.plots)Object.assign(p,{crop:action==='plant'?null:1,plantedAt:now-1000,readyAt:action==='harvest'?now-1:now+120000});
 g.progress.farm.seeds[1]=2;
 for(let id=0;id<2;id++)assert.ok(queueFarmWork(g,action,{plot:id,crop:1}).ok);
 Object.assign(g.player,farmApproach(g,g.farmWork.queue[0].point,action));
 updateFarmWork(g,.01,{x:0,y:0});const work=g.farmWork,job=work.job,elapsed=job.elapsed;
 g.enemies=[enemy(g,0)];g.boss={...enemy(g,0),id:988,type:'boss'};
 assert.equal(farmThreat(g),false);assert.equal(farmInteractionBlocked(g),false);
 const hp=g.player.hp;g.hurt(20,g.enemies[0]);
 assert.equal(g.magazines[18].ammo,broken?0:460);assert.equal(g.player.hp,hp-(broken?20:0));
 updateFarmWork(g,.05,{x:0,y:0});assert.equal(work.autoCombat,false);assert.equal(work.job,job);assert.ok(job.elapsed>elapsed);assert.equal(farmWorking(g),true);
 finish(g);assert.equal(work.job,null);assert.equal(work.queue.length,0);
 if(action==='plant'){assert.equal(g.progress.farm.seeds[1],0);assert.ok(g.progress.farm.plots.every(p=>p.crop===1));}
 if(action==='water')assert.ok(g.progress.farm.plots.every(p=>p.watered));
 if(action==='harvest')assert.ok(g.progress.farm.plots.every(p=>p.crop===null));
});

test('迎敌中换盾立即继续农活并清除旧目标，换回攻击武器仍可迎敌',()=>{
 const g=scene(),e=enemy(g);g.enemies=[e];updateFarmWork(g,.05,{x:0,y:0});const work=g.farmWork;
 assert.equal(work.autoCombat,true);assert.equal(work.combatTargets.size,1);
 g.progress.weapons[18]=1;g.progress.weapon=18;updateFarmWork(g,.05,{x:0,y:0});
 assert.equal(work.autoCombat,false);assert.equal(work.combatTargets.size,0);assert.equal(work.combatRecovery,0);assert.ok(work.job);assert.equal(work.queue.length,1);
 g.progress.weapon=0;updateFarmWork(g,.05,{x:0,y:0});assert.equal(work.autoCombat,true);assert.equal(work.combatTargets.size,1);
});

test('射程内活怪触发，树木、死怪和射程外目标不触发，包含Boss与周期镜像',()=>{
 const g=scene(),range=g.weapon().range,e=enemy(g,range+11);g.enemies=[e];assert.equal(farmThreat(g),true);
 e.x=g.player.x+range+13;assert.equal(farmThreat(g),false);e.x=g.player.x+100;e.hp=0;assert.equal(farmThreat(g),false);
 e.hp=100;e.type='tree';assert.equal(farmThreat(g),false);g.enemies=[];g.boss={...e,type:'boss',x:g.player.x+100+WORLD.width};assert.equal(farmThreat(g),true);
 g.boss=null;g.viewport={width:100,height:100};g.enemies=[enemy(g,range-1)];assert.equal(farmThreat(g),false);
});

test('自动迎敌冻结走近与动作计时，受伤和战斗走位不清空队列',()=>{
 const g=scene();updateFarmWork(g,.05,{x:0,y:0});const work=g.farmWork,job=structuredClone(work.job),queue=structuredClone(work.queue);g.enemies=[enemy(g)];
 for(let i=0;i<300;i++){g.player.hp-=.01;assert.deepEqual(updateFarmWork(g,.05,{x:1,y:0}),{x:1,y:0});}
 assert.equal(g.farmWork,work);assert.equal(farmMode(g),true);assert.equal(farmWorking(g),false);assert.equal(work.autoCombat,true);assert.deepEqual(work.job,job);assert.deepEqual(work.queue,queue);assert.equal(g.progress.coins,60);
 g.enemies=[];g.player.x+=55;updateFarmWork(g,.05,{x:0,y:0});assert.equal(work.autoCombat,true);recover(g);assert.equal(work.autoCombat,false);assert.equal(farmWorking(g),true);assert.equal(work.job.hit,false);finish(g);
 assert.ok(g.progress.farm.plots.filter(p=>p.id<2).every(p=>p.crop===null));assert.equal(g.progress.coins,60+2*FARM_CROPS[0].value);
});

test('落锄或收割命中之后遇敌只暂停收势，不重复结算',()=>{
 const g=scene(),before=g.progress.coins;updateFarmWork(g,FARM_ACTION_TIMING.harvest.hit,{x:0,y:0});assert.equal(g.farmWork.job.hit,true);assert.equal(g.progress.coins,before+FARM_CROPS[0].value);
 g.enemies=[enemy(g)];updateFarmWork(g,.05,{x:0,y:0});g.enemies=[];finish(g);assert.equal(g.progress.coins,before+2*FARM_CROPS[0].value);
});

test('目标持续远离脱战范围后续作，手动退出仍能明确取消队列',()=>{
 const g=scene(),e=enemy(g);g.enemies=[e];updateFarmWork(g,.05,{x:0,y:0});assert.ok(g.farmWork.autoCombat);
 e.x+=2000;for(let i=0;i<61;i++)updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.autoCombat,true);recover(g);assert.equal(g.farmWork.autoCombat,false);assert.ok(g.farmWork.job);
 setFarmTool(g,null);g.enemies=[];updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork,null);assert.ok(g.progress.farm.plots.filter(p=>p.id<2).every(p=>p.crop===0));
});

test('正式Game更新无需受伤就自动开火，杀敌后继续两块田并各结算一次',()=>{
 const g=scene(),before=g.progress.coins;g.spawnEnemy(0,80,{x:g.player.x+80,y:g.player.y});const target=g.enemies.at(-1);Object.assign(target,{hp:100000,maxHp:100000,speed:0,damage:0,mass:1000000});
 for(let i=0;i<100;i++)g.update(.05);assert.ok(target.hp<100000);assert.ok(g.farmWork.autoCombat);assert.equal(g.progress.coins,before);assert.ok(g.progress.farm.plots.filter(p=>p.id<2).every(p=>p.crop===0));
 g.hit(target,target.hp+1);for(let i=0;i<400&&(g.farmWork.job||g.farmWork.queue.length);i++)g.update(.05);
 assert.equal(g.farmWork.autoCombat,false);assert.equal(g.progress.coins,before+2*FARM_CROPS[0].value);assert.ok(g.progress.farm.plots.filter(p=>p.id<2).every(p=>p.crop===null));
});

test('自动迎敌仍属于种田模式，附近建筑提示不会抢占田地',()=>{
 const g=scene();Object.assign(g.player,FARM_SEED_DOOR);g.enemies=[enemy(g)];updateFarmWork(g,.05,{x:0,y:0});assert.equal(nearbyInteraction(g),null);
 setFarmTool(g,null);assert.ok(nearbyInteraction(g));
});

// 每种事务在动作命中前后各暂停一次，保证恢复不会吞任务或重复消耗。
for(const action of ['dig','plant','water'])for(const afterHit of [false,true])test(action+'在'+(afterHit?'命中后':'命中前')+'迎敌，恢复后只结算一次',()=>{
 const g=scene(),now=Date.now();setFarmTool(g,action==='dig'?'hoe':action==='plant'?'seed':'water');
 if(action==='dig')g.progress.farm.plots=[];
 else for(const p of g.progress.farm.plots)Object.assign(p,{crop:action==='plant'?null:1,plantedAt:now,readyAt:now+120000});
 g.progress.farm.seeds[1]=2;
 for(let id=0;id<2;id++)assert.ok(queueFarmWork(g,action,action==='dig'?{point:{x:893+id*56,y:2752,mapId:'forest'}}:{plot:id,crop:1}).ok);
 const point=g.farmWork.queue[0].point;Object.assign(g.player,farmApproach(g,point,action));
 updateFarmWork(g,afterHit?FARM_ACTION_TIMING[action].hit:.01,{x:0,y:0});const saved=structuredClone(g.progress),work=g.farmWork,job=structuredClone(work.job);
 g.enemies=[enemy(g)];for(let i=0;i<40;i++)updateFarmWork(g,.05,{x:0,y:0});assert.deepEqual(g.progress,saved);assert.deepEqual(work.job,job);
 g.enemies=[];finish(g);assert.equal(work.queue.length,0);assert.equal(work.job,null);assert.equal(g.progress.farm.plots.length,2);
 if(action==='plant'){assert.equal(g.progress.farm.seeds[1],0);assert.ok(g.progress.farm.plots.every(p=>p.crop===1));}
 if(action==='water')for(const p of g.progress.farm.plots){assert.equal(p.watered,true);assert.equal(p.readyAt,now+90000);}
});

// 多次击退出射程后等待怪物回返，不能在间隙推进农活或切出战斗。
test('已交战怪物在射程边缘往返和长时间停留仍持枪，击杀后原队列续作',()=>{
 const g=scene(),e=enemy(g),queue=structuredClone(g.farmWork.queue);g.enemies=[e];updateFarmWork(g,.05,{x:0,y:0});
 for(let round=0;round<4;round++)for(let i=0;i<80;i++){
  e.x=g.player.x+g.weapon().range+e.radius+(i<60?45:-30);updateFarmWork(g,.05,{x:0,y:0});assert.ok(g.farmWork.autoCombat);assert.equal(farmWorking(g),false);assert.deepEqual(g.farmWork.queue,queue);assert.equal(g.farmWork.job,null);
 }
 e.hp=0;finish(g);assert.equal(g.farmWork.autoCombat,false);assert.equal(g.progress.coins,60+2*FARM_CROPS[0].value);
});

test('超远击退期间不计脱战，落地后远离3秒才释放，返回缓冲区清零计时',()=>{
 const g=scene(),e=enemy(g);g.enemies=[e];updateFarmWork(g,.05,{x:0,y:0});e.x+=2000;e.knockTime=1;
 for(let i=0;i<100;i++)updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.combatTargets.get(e).away,0);assert.ok(g.farmWork.autoCombat);
 e.knockTime=0;for(let i=0;i<40;i++)updateFarmWork(g,.05,{x:0,y:0});assert.ok(g.farmWork.autoCombat);
 e.x=g.player.x+g.weapon().range+40;updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.combatTargets.get(e).away,0);
 e.x+=2000;for(let i=0;i<40;i++)updateFarmWork(g,.05,{x:0,y:0});assert.ok(g.farmWork.autoCombat);
 for(let i=0;i<21;i++)updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.autoCombat,true);recover(g);assert.equal(g.farmWork.autoCombat,false);assert.ok(g.farmWork.job);
});

test('多目标与Boss分别保留，未参战远怪不触发，实体移除或编号复用不继承交战',()=>{
 const g=scene(),first=enemy(g),boss={...enemy(g,110),id:988,type:'boss'},remote=enemy(g,g.weapon().range+80);remote.id=989;g.enemies=[first,remote];g.boss=boss;
 updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.combatTargets.size,2);first.hp=0;boss.x+=80;updateFarmWork(g,.05,{x:0,y:0});assert.ok(g.farmWork.autoCombat);
 g.boss=null;updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.autoCombat,true);assert.equal(g.farmWork.combatTargets.size,0);recover(g);assert.equal(g.farmWork.autoCombat,false);
 first.hp=10;first.x=g.player.x+50;updateFarmWork(g,.05,{x:0,y:0});assert.ok(g.farmWork.autoCombat);
 first.x=g.player.x+g.weapon().range+80;first.id=990;updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.autoCombat,true);recover(g);assert.equal(g.farmWork.autoCombat,false);
});

test('最后一只怪死亡后先持枪警戒，期间不推进农活且新增威胁重置等待',()=>{
 const g=scene(),first=enemy(g);g.enemies=[first];updateFarmWork(g,.05,{x:0,y:0});
 const queue=structuredClone(g.farmWork.queue),before=structuredClone(g.progress);first.hp=0;
 for(let i=0;i<20;i++)updateFarmWork(g,.05,{x:0,y:0});
 assert.equal(g.farmWork.autoCombat,true);assert.equal(farmWorking(g),false);assert.equal(g.farmWork.job,null);
 assert.deepEqual(g.farmWork.queue,queue);assert.deepEqual(g.progress,before);
 const second=enemy(g);second.id++;g.enemies.push(second);updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.combatRecovery,0);
 second.hp=0;for(let i=0;i<20;i++)updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork.autoCombat,true);
 recover(g);assert.equal(g.farmWork.autoCombat,false);finish(g);assert.equal(g.progress.coins,before.coins+2*FARM_CROPS[0].value);
});

test('警戒使用游玩时间，暂停不推进，手动退出不留下延迟恢复',()=>{
 const g=scene(),e=enemy(g);g.enemies=[e];updateFarmWork(g,.05,{x:0,y:0});e.hp=0;updateFarmWork(g,.25,{x:0,y:0});
 const remaining=g.farmWork.combatRecovery,work=g.farmWork;g.state='paused';for(let i=0;i<20;i++)g.update(.05);
 assert.equal(g.farmWork,work);assert.equal(work.combatRecovery,remaining);assert.equal(farmWorking(g),false);
 g.state='playing';setFarmTool(g,null);for(let i=0;i<40;i++)updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.farmWork,null);
});
