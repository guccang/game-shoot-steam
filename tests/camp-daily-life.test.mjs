// 验证营地日常使用真实地形、运行时人物和交谈坐标，且不推进任务或奖励。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {campResidents,updateCampRoutines,campConversation,campTalkSite} from '../src/core/camp-routines.js';
import {mainlineActors,mainlineObjective,canTalkMainline} from '../src/core/mainline-manager.js';
import {blocked} from '../src/physics/motion.js';
import {worldDistance} from '../src/world/coordinates.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {MAINLINE_TASKS} from '../src/config/mainline.js';
// 建立正式森林并保持玩家选择的自由探索状态。
function world(){const g=new Game(freshProgress(),()=>.5);g.start();g.enemies=[];g.boss=null;g.vehicle.active=false;g.progress.mainline.trackingPaused=true;g.progress.taskTracking={kind:'none'};return g;}
// 固定步长推进日常，不跳过寻路和碰撞，也不依赖墙上时间。
function advance(g,seconds){for(let i=0;i<seconds*25;i++)updateCampRoutines(g,.04);}
test('四位伙伴真实走动劳动，双人抵达后轮流闲聊，进度完全不变',()=>{
 const g=world(),before=JSON.stringify(g.progress),people=campResidents(g),moving=new Set(),working=new Set(),talking=new Set();
 for(let i=0;i<6000;i++){
  const old=people.map(p=>({x:p.x,y:p.y}));updateCampRoutines(g,.04);
  people.forEach((p,j)=>{assert.ok(worldDistance(p,old[j])<=1.93,'不瞬移');assert.equal(blocked(p.x,p.y,12,g.trees,p),false,'不穿建筑树木');if(p.moving){moving.add(p.id);assert.ok(p.motion.moveTime>0);}if(['sort','repair','watch'].includes(p.action))working.add(p.id);});
  const line=campConversation(g);if(line){talking.add(line.actor.id);const pair=g.campRoutine.chat.spec.ids.map(id=>g.campActors.get(id));assert.ok(worldDistance(...pair)<65);assert.ok(pair.every(p=>!p.moving));}
 }
 assert.equal(moving.size,4);assert.equal(working.size,4);assert.equal(talking.size,4);assert.equal(JSON.stringify(g.progress),before);assert.equal(mainlineObjective(g),null);assert.ok(people.every(p=>g.campActors.get(p.id)===p));
});
test('主动追踪交谈时原地等候，导航和距离使用伙伴当前位置',()=>{
 const g=world();advance(g,10);const p=g.campActors.get('mint'),before={x:p.x,y:p.y};
 g.progress.mainline.currentId='first-map';g.progress.mainline.phase='meet';g.progress.mainline.trackingPaused=false;g.progress.taskTracking={kind:'mainline'};
 advance(g,30);assert.equal(p.x,before.x);assert.equal(p.y,before.y);assert.equal(mainlineObjective(g).site,p);assert.equal(campTalkSite(g,{npc:'mint',site:'camp'}),p);
 Object.assign(g.player,before);assert.ok(canTalkMainline(g));g.player.x+=400;assert.equal(canTalkMainline(g),false);
 g.progress.mainline.trackingPaused=true;advance(g,30);assert.ok(worldDistance(p,before)>20);
});
test('暂停、室内和专属活动冻结日常，返回沿用人物身份',()=>{
 const g=world();advance(g,9);const people=campResidents(g),before=JSON.stringify(people);
 for(const [key,value] of [['state','paused'],['cottage',{}],['story',{}],['realm',{}],['fireRescue',{phase:'active'}],['campDefense',{}],['workshopTrial',{}],['mapId','jiuzhaigou']]){
  const old=g[key];g[key]=value;advance(g,3);assert.equal(JSON.stringify(people),before);if(key!=='state')assert.equal(mainlineActors(g).length,0);g[key]=old;
 }
 advance(g,1);assert.equal(campResidents(g)[0],people[0]);assert.notEqual(JSON.stringify(people),before);
});
test('伙伴被玩家叫住时取消双人会面，不留下聊天或追赶路径',()=>{
 const g=world();advance(g,26);assert.ok(g.campRoutine.chat);
 // 使用实际 NPC 归属的委托，避免测试伪造不在配置中的任务。
 const {spec}=g.campRoutine.chat;g.progress.mainline.currentId=MAINLINE_TASKS.find(t=>t.npc===spec.ids[0]).id;g.progress.mainline.phase='meet';g.progress.mainline.trackingPaused=false;g.progress.taskTracking={kind:'mainline'};
 advance(g,1);assert.equal(g.campRoutine.chat,null);assert.equal(campConversation(g),null);
});
test('夜间作息仍会散步、维护和聊天，重建不补算离线时间',()=>{
 const g=world();g.progress.living.calendar={day:1,elapsed:1100000};advance(g,60);assert.ok(g.campActors.get('lumi').clock>=59);assert.ok(g.campRoutine.time<61);
 const loaded=new Game(structuredClone(g.progress),()=>.5);loaded.start();updateCampRoutines(loaded,.04);assert.ok(loaded.campRoutine.time<1);assert.equal(loaded.campActors.size,4);
});
test('正式表现快照对脚底、身体和劳动时钟一起插值',()=>{
 const g=world();advance(g,9);const render=createRenderInterpolation(),actor=g.campActors.get('mint'),before=actor.x;render.beforeStep(g);updateCampRoutines(g,.04);const view=render.sample(g,.5).campActors.get('mint');
 assert.ok(Math.abs(view.x-(before+actor.x)/2)<.001);assert.ok(view.clock<actor.clock);assert.ok(view.motion.moveTime<actor.motion.moveTime);
});
