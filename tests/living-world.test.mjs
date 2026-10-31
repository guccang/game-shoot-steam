// 常驻生活专项覆盖历法、现场委托、事务回滚、身份、作息、交通和安全边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {LIVING_DAY_MS,LIVING_ROADS,LIVING_PLACES,LIVING_REQUESTS} from '../src/config/living-world.js';
import {calendarView,advanceLivingCalendar,projectLivingCalendar} from '../src/world/living-calendar.js';
import {durationFor} from '../src/world/environment-timing.js';
import {seasonRemaining} from '../src/world/seasons.js';
import {livingResidents,residentSchedule,updateLivingWorld,acceptLivingRequest,interactLivingRequest,livingRequestTarget,restLivingWorld,setLivingPatrol} from '../src/core/living-world.js';
import {livingSafePoint,livingBoltBlocked,livingFacilityBlocked} from '../src/world/living-spaces.js';
import {terrainLineClear} from '../src/physics/terrain-navigation.js';
import {worldDistance} from '../src/world/coordinates.js';
import {updateWaves} from '../src/core/wave-manager.js';
import {updateEncounters} from '../src/core/encounter-manager.js';
import {normalizeChronicle} from '../src/world/play-chronicle.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {livingObjects} from '../src/rendering/living-world.js';
import {updateBossHazards} from '../src/combat/bosses.js';
import {breakTreesAlong} from '../src/combat/boss-terrain.js';
// 历史普通档跳过入职流程，使用真实核心和持久化事务。
function world(){const g=new Game(freshProgress(),()=>.5);g.start();g.livingPersist=()=>true;updateLivingWorld(g,.05);return g;}
// 单元测试显式到达目标，浏览器验收另外覆盖真实走位与点击。
function finish(g,id){const spec=LIVING_REQUESTS.find(q=>q.id===id);Object.assign(g.player,{x:650,y:1840});assert.equal(acceptLivingRequest(g,id).ok,true);
  while(!g.progress.living.requests[id].completed){const t=livingRequestTarget(g,spec);Object.assign(g.player,{x:t.x,y:t.y});let result=interactLivingRequest(g,id);assert.equal(result.ok,true);
    if(result.battle){for(const e of g.enemies.filter(e=>e.livingRequest===id))g.hit(e,1e6);result=interactLivingRequest(g,id);assert.equal(result.ok,true);}}
}
// 正式时长跨过每个昼夜边界后，仍由同一日期推进季节与年份。
test('正式历法5分钟一天，一日换季，4日进年，不依赖壁钟或旧档统计',()=>{
  const g=world(),c=g.progress.living.calendar,legacy=normalizeChronicle({version:2,years:6,days:24});
  advanceLivingCalendar(c,150000);assert.equal(calendarView(c).id,'dusk');advanceLivingCalendar(c,50000);assert.equal(calendarView(c).id,'night');
  advanceLivingCalendar(c,100000);assert.deepEqual(c,{day:1,elapsed:0});advanceLivingCalendar(c,LIVING_DAY_MS*3);assert.equal(calendarView(c).year,2);assert.equal(calendarView(c).season,'spring');
  const env={};projectLivingCalendar(env,c,0);projectLivingCalendar(env,c,999999999);assert.equal(c.day,4);assert.equal(legacy.years,6);
  assert.deepEqual(validateProgress(structuredClone(g.progress)).living.calendar,c);
});
// 验证第五分钟的精确换季边界、季末集市及独立的昼夜天气时长。
test('每季五分钟，读档和环境圆环一致，昼夜与天气时长不变',()=>{
  const calendar={day:0,elapsed:0},environment={};
  for(const season of ['spring','summer','autumn','winter']){
    projectLivingCalendar(environment,calendar,0);
    assert.equal(environment.forestSeason,season);
    assert.equal(durationFor(environment,'season'),300000);
    assert.equal(seasonRemaining(environment,0),300000);
    assert.deepEqual(['day','dusk','night','weather'].map(key=>durationFor(environment,key)),[150000,50000,100000,120000]);
    assert.equal(calendarView(calendar).market,true);
    advanceLivingCalendar(calendar,299999);projectLivingCalendar(environment,calendar,0);
    assert.equal(environment.forestSeason,season);assert.equal(seasonRemaining(environment,0),1);
    const saved=freshProgress();saved.living.calendar={...calendar};
    assert.deepEqual(validateProgress(saved).living.calendar,calendar);
    advanceLivingCalendar(calendar,1);
  }
  assert.equal(calendarView(calendar).year,2);assert.equal(calendarView(calendar).season,'spring');
});
test('安全休息推进时段，活动委托保留；巡护、危险区域与死亡不允许休息',()=>{
  const g=world();assert.equal(restLivingWorld(g).ok,true);assert.equal(calendarView(g.progress.living.calendar).id,'dusk');
  g.progress.living.patrolActive=true;assert.equal(restLivingWorld(g).ok,false);g.progress.living.patrolActive=false;
  Object.assign(g.player,{x:940,y:2100});assert.equal(restLivingWorld(g).ok,false);g.state='dead';Object.assign(g.player,{x:900,y:850});assert.equal(restLivingWorld(g).ok,false);
});
test('三条现场委托共享旧奖励账本，市场前置及存档失败不能绕过',()=>{
  const g=world();Object.assign(g.player,{x:650,y:1840});assert.equal(acceptLivingRequest(g,'neighbors-market').ok,false);
  const before=JSON.stringify(g.progress);g.livingPersist=()=>false;assert.equal(acceptLivingRequest(g,'neighbors-lunch').ok,false);assert.equal(JSON.stringify(g.progress),before);g.livingPersist=()=>true;
  const coins=g.progress.coins;finish(g,'neighbors-lunch');assert.equal(g.progress.coins,coins+300);assert.ok(!g.story);
  assert.equal(interactLivingRequest(g,'neighbors-lunch').ok,false);finish(g,'neighbors-night');finish(g,'neighbors-market');
  assert.equal(g.progress.coins,coins+1100);assert.equal(g.progress.campLevel.xp,180);const restored=validateProgress(structuredClone(g.progress));assert.equal(restored.story.chapters['neighbors-market'].rewardClaimed,true);assert.equal(restored.living.requests['neighbors-market'].completed,true);
});
test('旧已完成故事直接显示后续，旧未完成邻里会话迁为现场请求',()=>{
  const p=freshProgress();p.story.chapters['neighbors-lunch'].completed=true;p.story.chapters['neighbors-lunch'].rewardClaimed=true;
  const migrated=validateProgress(p);assert.equal(migrated.living.requests['neighbors-lunch'].completed,true);assert.equal(migrated.coins,p.coins);
  const def=STORY_CAMPAIGN['neighbors-night'];p.story.run={chapterId:def.id,definitionVersion:def.version,stageId:Object.keys(def.nodes)[0]};
  const pending=validateProgress(p);assert.equal(pending.story.run,null);assert.equal(pending.living.requests['neighbors-night'].stage,0);assert.equal(pending.story.chapters['neighbors-night'].rewardClaimed,false);
});
test('任务推进与最后领奖均能回滚，远距离无法交付',()=>{
  const g=world();Object.assign(g.player,{x:650,y:1840});acceptLivingRequest(g,'neighbors-lunch');Object.assign(g.player,{x:2500,y:2000});assert.equal(interactLivingRequest(g,'neighbors-lunch').ok,false);
  const q=LIVING_REQUESTS[0],target=livingRequestTarget(g,q);Object.assign(g.player,target);g.livingPersist=()=>false;assert.equal(interactLivingRequest(g,q.id).ok,false);assert.equal(g.progress.living.requests[q.id].stage,0);
});
test('居民身份去重、雨天避雨、洗碗与轮班按完成日期产生',()=>{
  const g=world();assert.equal(livingResidents(g).length,6);g.progress.hero=1;assert.ok(!livingResidents(g).some(r=>r.id==='mint'));g.progress.hero=4;assert.ok(!livingResidents(g).some(r=>r.id==='snow'));g.progress.hero=0;
  const boar=livingResidents(g).find(r=>r.id==='boar');g.progress.living.requests['neighbors-lunch']={stage:4,completed:true,completedDay:0};g.progress.living.calendar={day:1,elapsed:100000};assert.equal(residentSchedule(g,boar).action,'wash');
  g.livingWeather='rain';assert.equal(residentSchedule(g,boar).action,'shelter');
});
test('道路按最大常用地面车体半径连续可达，工作点不在湖山中',()=>{
  for(const road of LIVING_ROADS)for(let i=1;i<road.length;i++)assert.ok(terrainLineClear(road[i-1],road[i],32),JSON.stringify([road[i-1],road[i]]));
  for(const road of LIVING_ROADS)for(let i=1;i<road.length;i++){const a=road[i-1],b=road[i],steps=Math.ceil(worldDistance(a,b)/8);for(let n=0;n<=steps;n++)assert.ok(!livingFacilityBlocked(a.x+(b.x-a.x)*n/steps,a.y+(b.y-a.y)*n/steps,32),'设施阻挡道路：'+JSON.stringify([a,b,n]));}
  for(const p of Object.values(LIVING_PLACES))assert.ok(terrainLineClear({x:p.x,y:p.y+40},{x:p.x,y:p.y+45},12),p.name);
});
test('作息切换真实移动，刷新保留位置，暂停不推进工作时钟',()=>{
  const g=world(),mint=livingResidents(g).find(r=>r.id==='mint'),before={x:mint.x,y:mint.y};g.progress.living.calendar.elapsed=150000;
  updateLivingWorld(g,.05);assert.ok(worldDistance(mint,before)<4);for(let i=0;i<500;i++)updateLivingWorld(g,.05);assert.ok(worldDistance(mint,before)>150);
  const restored=new Game(validateProgress(structuredClone(g.progress)));assert.ok(worldDistance(livingResidents(restored).find(r=>r.id==='mint'),mint)<1);
  g.state='paused';const clock=mint.clock;updateLivingWorld(g,1);assert.equal(mint.clock,clock);
});
test('安全地点冻结怪潮和遭遇、阻挡伤害与跨边界弹丸，野外显式巡护才刷怪',()=>{
  const g=world();g.waveWarning=0;g.spawnTimer=0;g.encounterTimer=0;updateWaves(g,1);updateEncounters(g,1,true);assert.equal(g.enemies.length,0);
  g.player.invincible=0;const hp=g.player.hp;g.hurt(100);assert.equal(g.player.hp,hp);
  assert.ok(livingBoltBlocked(g,{x:400,y:1850,vx:800,vy:0},1));assert.ok(!livingSafePoint(LIVING_PLACES.danger));
  assert.equal(setLivingPatrol(g,true).ok,true);Object.assign(g.player,{x:1600,y:400});updateWaves(g,1);assert.ok(g.enemies.length>0);
  g.player.invincible=0;g.hurt(5);assert.ok(g.player.hp<hp);
});
test('故事和秘境往返不会用旧森林快照覆盖居民与已提交的生活结果',()=>{
  const g=world(),actors=g.livingActors;assert.equal(g.enterStory('sunleaf-01'),true);g.progress.living.calendar.day=10;g.leaveStory();assert.equal(g.livingActors,actors);assert.equal(g.progress.living.calendar.day,10);
  for(let i=1;i<=6;i++)g.progress.story.chapters['sunleaf-0'+i].completed=true;
  g.progress.story.run=null;
  const restored=new Game(validateProgress(structuredClone(g.progress)));updateLivingWorld(restored,0);
  assert.deepEqual(livingObjects(restored).find(o=>o.id==='camp').results,['supply','timber','radio']);assert.deepEqual(livingObjects(restored).find(o=>o.id==='relay').results,['repair','tools','beacon']);
});

test('返回营地取消领主技能，生活道路内树木不受领主破坏',()=>{
  const g=world(),tree={x:900,y:850,hp:55,radius:12};g.trees=[tree];breakTreesAlong(g,{x:850,y:850},{x:950,y:850},20);assert.equal(tree.hp,55);
  g.hazards=[{kind:'feather',age:0,warmup:0,duration:2,x:850,y:850,dx:1,dy:0,speed:500}];updateBossHazards(g,.1);assert.equal(g.hazards.length,0);
});

test('整日作息无需玩家接任务，所有居民在时段内走到工作点；雨天进入有棚设施',()=>{
  const g=world(),seen=new Set();
  // 加速输入只用于规则覆盖；并不替代自然五分钟观察与实机验收。
  for(let second=0;second<300;second++){advanceLivingCalendar(g.progress.living.calendar,1000);updateLivingWorld(g,1);for(const r of livingResidents(g))seen.add(r.id+':'+r.action);
    if([140,190,290].includes(second))for(const r of livingResidents(g))assert.ok(worldDistance(r,residentSchedule(g,r))<6,r.id+':'+second);}
  for(const key of ['mint:repair','mint:eat','mint:watch','bat:rest','bat:handover','boar:pottery','cook:cook'])assert.ok(seen.has(key),key);
  g.livingWeather='rain';for(const r of livingResidents(g))assert.ok(['kitchen','relay','roost'].includes(residentSchedule(g,r).place));
});
