import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {clearingSite} from '../src/progression/clearing-site.js';
// 巡林主线专项：配置、真实操作判定、交付原子性与购买资格，不运行无关战斗回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {validateMainline} from '../src/progression/mainline-progress.js';
import {MAINLINE_TASKS,MAINLINE_IDS,MAINLINE_SITES,MAINLINE_NPCS} from '../src/config/mainline.js';
import {MAINLINE_GATES,mainlinePurchaseReason} from '../src/config/mainline-gates.js';
import {mainlineTask,mainlineCondition,mainlineObjective,updateMainline,completeMainline,markMainline,recordMainlineEvent,canTalkMainline,mainlineSteps,mainlineStep,mainlineAction,advanceMainlineSpeech} from '../src/core/mainline-manager.js';
import {storyRouteState} from '../src/core/story-route.js';
import {blocked} from '../src/physics/motion.js';
import {quoteWorkshop} from '../src/progression/workshop.js';
import {commitWorkshop} from '../src/core/workshop.js';
import {canPurchaseEquipment} from '../src/progression/equipment-goals.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
import {setLivingPatrol} from '../src/core/living-world.js';
import {livingWaveAllowed} from '../src/core/living-safety.js';
import {createWorkshopTrial} from '../src/core/workshop-trial.js';

// 隔离场景从真实Game初始化，只跳过入职，不伪造购买或交付函数。
function setup(id=MAINLINE_IDS[0]){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true; // 原主线专项使用已修复设施，修复闭环单独验证。
 const g=new Game(p,()=>.43);g.state='playing';g.enemies=[];g.boss=null;
 const index=MAINLINE_IDS.indexOf(id);g.progress.mainline.completed=MAINLINE_IDS.slice(0,index);g.progress.mainline.currentId=id;
 Object.assign(g.player,MAINLINE_SITES[mainlineTask(g).site]);g.player.arena=null;return g;
}
// 共用气泡只控制阅读，简短对白的直接操作与失败重试继续使用正式事务。
test('简短主线可暂停继续，主动开始不代做目标，领奖失败重试不重复',()=>{
 const g=setup();updateMainline(g,.1);g.mainlineSpeech.paused=true;
 const elapsed=g.mainlineSpeech.elapsed,time=g.time;updateMainline(g,100);
 assert.equal(g.mainlineSpeech.elapsed,elapsed);assert.equal(g.time,time);
 g.mainlineSpeech.paused=false;updateMainline(g,.2);assert.ok(g.mainlineSpeech.elapsed>elapsed);
 assert.equal(advanceMainlineSpeech(g),true);assert.equal(g.progress.mainline.phase,'doing');
 assert.equal(g.progress.mainline.completed.length,0);assert.equal(advanceMainlineSpeech(g),false);
 markMainline(g,'map');markMainline(g,'navigation');g.progress.mainline.distance=80;updateMainline(g,0);
 const coins=g.progress.coins;g.mainlinePersist=()=>false;
 assert.equal(advanceMainlineSpeech(g),false);assert.equal(g.progress.coins,coins);assert.equal(g.progress.mainline.phase,'report');
 g.mainlinePersist=()=>true;assert.equal(advanceMainlineSpeech(g),true);
 assert.equal(g.progress.mainline.completed.length,1);const paid=g.progress.coins;
 advanceMainlineSpeech(g);assert.equal(g.progress.coins,paid);
});
// 后期配置遍历使用明确的进度夹具，不冒充从零资源的自然通关。
function satisfy(g,c){
 if(c.all){c.all.forEach(v=>satisfy(g,v));return;}
 if(c.any){satisfy(g,c.any[0]);return;}
 if(c.path){const keys=c.path.split('.'),last=keys.pop();let v=g;for(const k of keys)v=v[k]??=(/^\d+$/.test(k)?[]:{});v[last]='equals'in c?c.equals:c.min;return;}
 if('nativeLevel'in c){g.progress.vehicleWeapons[nativeVehicleWeapon(c.nativeLevel).weaponIndex]=c.min;return;}
 if(c.tier){g.progress.bosses=999;return;}
 if(c.controllerReady){g.progress.weapon=12;g.progress.weapons[12]=1;g.progress.mainline.seen.config=1;return;}
 if(c.controllerLevel){g.progress.weapons[12]=c.controllerLevel;return;}
 throw Error('未覆盖条件');
}
test('41步配置可序列化，所有地点可站立，资源不超过三种且无装备奖励',()=>{
 const g=setup();assert.equal(MAINLINE_TASKS.length,41);assert.equal(new Set(MAINLINE_IDS).size,41);
 assert.deepEqual(JSON.parse(JSON.stringify(MAINLINE_TASKS)),MAINLINE_TASKS);
 for(const t of MAINLINE_TASKS){assert.ok(MAINLINE_NPCS[t.npc]);assert.ok(MAINLINE_SITES[t.site]);assert.ok(t.lines.length&&t.finish);assert.ok(Object.keys(t.reward).length<=3);for(const [k,v] of Object.entries(t.reward)){assert.ok(['coins','wood','parts','crystal','core'].includes(k));assert.ok(Number.isInteger(v)&&v>0);}}
 for(const [id,s] of Object.entries(MAINLINE_SITES))assert.equal(blocked(s.x,s.y,12,g.trees,{mapId:s.mapId}),false,id);
 for(const gate of MAINLINE_GATES){assert.ok(MAINLINE_IDS.includes(gate.task));assert.ok(MAINLINE_IDS.indexOf(gate.task)<MAINLINE_IDS.indexOf(gate.kind==='vehicle'?'own-aircraft':'own-controller'));}
});
test('基础存档完整往返，主线无旧档豁免，非法记录规范为连续前缀',()=>{
 const p=freshProgress();assert.equal(p.arrival,null);assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(p))),p);
 assert.deepEqual(validateMainline({completed:{a:1},seen:{drive:Infinity},legacyPermit:true}).completed,[]);
 assert.equal('legacyPermit'in validateMainline({legacyPermit:true}),false);
 assert.deepEqual(validateMainline({completed:['first-map','pistol-upgrade']}).completed,[MAINLINE_IDS[0]]);
 assert.equal(validateMainline({seen:{drive:-20},distance:Infinity}).seen.drive,0);
});
test('到点安全触发头顶对白，暂停不推进，未交谈不能远程交付',()=>{
 const g=setup();g.player.x+=200;assert.equal(updateMainline(g,.1),false);assert.equal(completeMainline(g),false);
 Object.assign(g.player,MAINLINE_SITES.camp);g.enemies=[{x:g.player.x+30,y:g.player.y,hp:1}];assert.equal(canTalkMainline(g),false);g.enemies=[];
 assert.equal(updateMainline(g,.1),true);const elapsed=g.mainlineSpeech.elapsed;g.state='paused';updateMainline(g,100);assert.equal(g.mainlineSpeech.elapsed,elapsed);g.state='playing';
 // 长时间停留不自动接取，必须由玩家主动确认或跳过。
 updateMainline(g,120);assert.ok(g.mainlineSpeech);assert.equal(g.progress.mainline.phase,'meet');
 assert.ok(advanceMainlineSpeech(g));
 assert.equal(g.progress.mainline.phase,'doing');assert.equal(g.progress.mainline.completed.length,0);
 markMainline(g,'map');markMainline(g,'navigation');g.progress.mainline.distance=80;updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');
});
test('资源与完成记录一次性保存，失败重试不重复奖励，不赠装备',()=>{
 const g=setup(),p=g.progress;g.progress.mainline.phase='report';let saved;
 const gear=JSON.stringify([p.weapons,p.vehicleHulls,p.vehicleWeapons]),before=JSON.stringify(p);
 g.mainlinePersist=()=>false;assert.equal(completeMainline(g),false);assert.equal(JSON.stringify(g.progress),before);
 g.mainlinePersist=()=>{throw Error('quota');};assert.equal(completeMainline(g),false);assert.equal(g.progress,p);
 g.mainlinePersist=next=>{saved=JSON.parse(JSON.stringify(next));return true;};assert.equal(completeMainline(g),true);
 assert.equal(g.progress.coins,p.coins+MAINLINE_TASKS[0].reward.coins);assert.equal(g.progress.wood,p.wood+MAINLINE_TASKS[0].reward.wood);assert.equal(saved.mainline.completed.length,1);
 assert.equal(JSON.stringify([g.progress.weapons,g.progress.vehicleHulls,g.progress.vehicleWeapons]),gear);assert.equal(completeMainline(g),false);
});
test('41步逐项满足、回到人物交付与恢复，完成后不再出现目标',()=>{
 const g=setup();let count=0;
 while(mainlineTask(g)){
  const t=mainlineTask(g);g.progress.mainline.phase='doing';satisfy(g,t.goal);assert.equal(mainlineCondition(g,t.goal),true,t.id);
  Object.assign(g.player,MAINLINE_SITES[t.site]);g.mapId='forest';updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report',t.id);
  assert.equal(completeMainline(g),true,t.id);g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));count++;
 }
 assert.equal(count,41);assert.equal(g.progress.mainline.phase,'complete');assert.equal(mainlineObjective(g),null);
});
test('高级购买取消主线和挑战资格，正式事务仍校验资源且升级保持独立',()=>{
 const g=setup(),p=g.progress;p.bosses=0;p.coins=p.wood=999999;p.materials={parts:99999,crystal:99999,core:99999};
 assert.deepEqual(MAINLINE_GATES,[]);assert.equal(mainlinePurchaseReason(p,'weapons',12),'');
 assert.equal(canPurchaseEquipment(p,'weapons',12),true);p.coins=0;assert.equal(canPurchaseEquipment(p,'weapons',12),false);p.coins=999999;
 const before=p.coins;assert.equal(commitWorkshop(g,{kind:'weapons',index:12,action:'buy'},()=>true).ok,true);assert.equal(g.progress.weapons[12],1);assert.ok(g.progress.coins<before);
 g.progress.mainline.completed=[];assert.equal(quoteWorkshop(g.progress,{kind:'weapons',index:12,action:'upgrade'}).ok,true);
});
test('试借不算拥有，正式部件和驾驶条件逐个校验',()=>{
 const g=setup('first-vehicle');g.story={equipment:{...g.progress,vehicleHulls:[10,10,10,10,10,10]}};assert.equal(mainlineCondition(g,mainlineTask(g).goal),false);g.story=null;
 g.progress.vehicleHulls[0]=1;g.progress.mainline.seen.drive=120;assert.equal(mainlineCondition(g,mainlineTask(g).goal),true);
 const t=MAINLINE_TASKS.find(t=>t.id==='pistol-parts');assert.equal(mainlineCondition(g,t.goal),false);satisfy(g,t.goal);assert.equal(mainlineCondition(g,t.goal),true);
});
test('实际事件与浮游炮出场可推进，故事和秘境期间隐藏主线',()=>{
 const g=setup('controller-setup');g.progress.weapons[12]=1;g.progress.weapon=12;g.funnel.primed=true;g.funnel.deploy=0;
 recordMainlineEvent(g,'funnel-config');updateMainline(g,0);assert.equal(g.progress.mainline.seen.companions,1);assert.equal(g.progress.mainline.seen.config,1);
 g.realm={mode:'rogue',blessingCounts:{power:1}};recordMainlineEvent(g,'realm-change');assert.equal(g.progress.mainline.seen.blessing,1);assert.equal(mainlineObjective(g),null);g.realm=null;
 g.mapId='jiuzhaigou';recordMainlineEvent(g,'map-change');assert.equal(g.progress.mainline.seen.valley,1);g.mapId='forest';
 g.story={};assert.equal(mainlineObjective(g),null);g.story=null;g.fireRescue={phase:'active'};assert.equal(mainlineObjective(g),null);
});
test('主线复用光点路线，菜单/对白清理，不替换故事目标',()=>{
 const g=setup();g.player.x+=250;assert.equal(storyRouteState(g).site,'camp');g.mainlineSpeech={};assert.equal(storyRouteState(g),null);g.mainlineSpeech=null;
 g.state='paused';assert.equal(storyRouteState(g),null);g.state='playing';g.realm={};assert.equal(storyRouteState(g),null);
});
test('战场重建不保留对白或交付状态，剧情配置不算永久控制器操作',()=>{
 const g=setup();g.mainlineSpeech={id:MAINLINE_IDS[0],phase:'report',line:0,elapsed:99};g.mainlineTalkDelay=100;g.reset();
 assert.equal(g.mainlineSpeech,null);assert.equal(g.mainlineTalkDelay,0);assert.equal(g.progress.mainline.completed.length,0);
 g.progress.weapon=12;g.progress.weapons[12]=1;g.story={};markMainline(g,'config');assert.equal(g.progress.mainline.seen.config,0);
 g.story=null;markMainline(g,'config');assert.equal(g.progress.mainline.seen.config,1);
});
test('生活圈先在安宁区接取巡护，主线再指向可开波的野外；午餐读取现场请求',()=>{
 const g=setup('first-patrol');g.progress.mainline.phase='doing';assert.equal(mainlineObjective(g).key,'clearing-post');assert.equal(livingWaveAllowed(g),false);
 assert.equal(setLivingPatrol(g,true).ok,true);assert.equal(mainlineObjective(g).key,'boss-clearing');Object.assign(g.player,{x:clearingSite(g.progress).x,y:clearingSite(g.progress).y});assert.equal(livingWaveAllowed(g),true);
 const t=MAINLINE_TASKS.find(t=>t.id==='neighbors');assert.equal(mainlineCondition(g,t.goal),false);g.progress.living.requests['neighbors-lunch'].completed=true;assert.equal(mainlineCondition(g,t.goal),true);
});
test('隔离工坊试射不受安宁区停火或主线对白打断，真实命中仍可击毁靶子',()=>{
 const p=freshProgress();p.weapons[3]=1;const t=createWorkshopTrial(p,'weapons',3,false,{count:1,hp:1});
 for(let i=0;i<450&&!t.destroyed;i++)t.advance(1/30);
 assert.ok(t.destroyed>0);assert.equal(mainlineObjective(t.game),null);assert.equal(t.game.mainlineSpeech,null);
});

// 对白容纳人物动机和转场缘由，操作目标仍保持短句并绑定原条件。
test('轻量引导覆盖41步，情境对白与目标受控，每个原条件都有对应动作',()=>{
 for(const t of MAINLINE_TASKS){
  const g=setup(t.id),conditions=t.goal.all||[t.goal];assert.equal(t.guide.steps.length,conditions.length,t.id);
  assert.ok(t.guide.cue.length<=90&&t.guide.thanks.length<=90,t.id);
  assert.ok(t.guide.steps.every(s=>s.label.length<=20&&s.hint.length<=30),t.id);
  assert.equal(mainlineSteps(g).length,conditions.length);satisfy(g,t.goal);assert.ok(mainlineSteps(g).every(s=>s.done),t.id);assert.equal(mainlineStep(g),null);
 }
});
test('直接开始无需听完，仍须到点，收奖保存失败可重试且不可重复',()=>{
 const g=setup();updateMainline(g,0);assert.equal(advanceMainlineSpeech(g),true);assert.equal(g.progress.mainline.phase,'doing');assert.equal(g.progress.mainline.completed.length,0);
 assert.equal(advanceMainlineSpeech(g),false);markMainline(g,'map');markMainline(g,'navigation');g.progress.mainline.distance=80;updateMainline(g,0);
 g.player.x+=300;assert.equal(advanceMainlineSpeech(g),false);Object.assign(g.player,MAINLINE_SITES.camp);
 g.mainlinePersist=()=>false;assert.equal(advanceMainlineSpeech(g),false);assert.equal(g.progress.coins,60);
 g.mainlinePersist=()=>true;assert.equal(advanceMainlineSpeech(g),true);assert.equal(g.progress.coins,120);assert.equal(advanceMainlineSpeech(g),false);
});
test('当前动作随完成项切换，入口随动作切换，世界操作不误开面板',()=>{
 const g=setup('pistol-upgrade');g.progress.mainline.phase='doing';assert.equal(mainlineAction(g).kind,'weapons');g.progress.weapons[0]=3;
 assert.equal(mainlineStep(g).label,'栗子升到2级');assert.equal(mainlineAction(g).id,'heroes-button');assert.equal(mainlineSteps(g)[0].done,true);
 const map=setup();markMainline(map,'map');map.progress.mainline.distance=35.7;assert.equal(mainlineStep(map).progress,'35/80');assert.equal(mainlineAction(map),null);
 const patrol=setup('first-patrol');patrol.progress.mainline.phase='doing';assert.equal(mainlineObjective(patrol).label,'去清缴告示牌接取');patrol.progress.living.patrolActive=true;assert.equal(mainlineAction(patrol),null);assert.equal(mainlineObjective(patrol).label,'前往本次清缴地点');
});

// 移除武器强化步骤后，低级手枪也可完成领主任务；原任务ID与存档顺序保持一致。
test('首个领主任务不再要求武器5级，旧档可继续交付',()=>{
 const g=setup('first-boss');g.progress.weapons[0]=3;g.progress.weapons[3]=0;g.progress.heroes[0]=5;g.progress.bosses=0;g.progress.mainline.phase='doing';
 assert.deepEqual(mainlineSteps(g).map(s=>s.label),['栗子升到5级','击败森林领主']);
 assert.equal(mainlineCondition(g,mainlineTask(g).goal),false);g.progress.bosses=1;
 const restored=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))));restored.state='playing';
 assert.equal(mainlineTask(restored).id,'first-boss');assert.equal(mainlineCondition(restored,mainlineTask(restored).goal),true);
 updateMainline(restored,.1);assert.equal(restored.progress.mainline.phase,'report');
});
