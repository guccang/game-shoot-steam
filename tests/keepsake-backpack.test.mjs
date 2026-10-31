// 重要物品与手机专项：正式交接事务、旧档迁移、电话只读及居民导航。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {normalizeKeepsakes,ownsKeepsake} from '../src/progression/keepsakes.js';
import {KEEPSAKES} from '../src/config/keepsakes.js';
import {skipArrivalJourney,updateArrival,completeArrivalLetter} from '../src/core/ranger-arrival.js';
import {RANGER_STAGES} from '../src/config/ranger-arrival.js';
import {phoneContacts,callNeighbor,navigatePhone} from '../src/core/patrol-phone.js';
import {worldNavigationObjective} from '../src/core/world-navigation.js';
import {LIVING_PHASES} from '../src/config/living-world.js';
const ids=KEEPSAKES.map(item=>item.id);
// 仅初始化正式场景；电话和导航仍调用生产入口，不替换业务函数。
function scene(progress=freshProgress()){const g=new Game(progress,()=>.5);g.start();g.mainlineSpeech=null;return g;}

test('新入职背包为空，历史交接档补齐、去重并清理未知物品',()=>{
 const p=freshRangerProgress();assert.deepEqual(p.keepsakes.items,[]);assert.equal(ownsKeepsake(p,'patrol-phone'),false);
 assert.deepEqual(validateProgress(p).keepsakes.items,[]);
 for(const arrival of [null,{version:3,phase:'gather',keys:true},{version:3,phase:'complete',keys:true}]){
  const raw={...freshProgress(),arrival};delete raw.keepsakes;assert.deepEqual(validateProgress(raw).keepsakes.items,ids);
 }
 assert.deepEqual(normalizeKeepsakes({items:['elder-letter','elder-letter','fake']},null).items,ids);
 assert.deepEqual(normalizeKeepsakes({items:ids},p.arrival).items,[]);
 assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(freshProgress()))).keepsakes.items,ids);
});
test('正常交接与跳过接送均原子保存三件物品，失败不提前入包',()=>{
 for(const skip of [false,true]){
  const g=scene(freshRangerProgress());if(!skip){g.progress.arrival.phase='handover';g.progress.arrival.elapsed=0;}
  const before=structuredClone(g.progress);g.arrivalPersist=()=>false;
  if(skip)assert.equal(skipArrivalJourney(g),false);else updateArrival(g,RANGER_STAGES.handover.seconds);
  assert.deepEqual(g.progress.keepsakes.items,[]);assert.equal(g.progress.arrival.keys,false);
  let saved;g.arrivalPersist=p=>{saved=structuredClone(p);return true;};g.arrivalError=false;
  if(skip)assert.equal(skipArrivalJourney(g),true);else updateArrival(g,.01);
  assert.deepEqual(saved.keepsakes.items,ids);assert.deepEqual(g.progress.keepsakes.items,ids);assert.equal(before.arrival.keys,false);
  if(skip){assert.equal(completeArrivalLetter(g),true);assert.deepEqual(g.progress.keepsakes.items,ids);assert.equal(completeArrivalLetter(g),false);}
 }
});
test('通讯录排除自己，电话读取作息和委托且不改变奖励或进度',()=>{
 const g=scene();g.progress.hero=1;assert.equal(phoneContacts(g).some(r=>r.id==='mint'),false);
 g.progress.living.requests['neighbors-lunch'].stage=0;const before=structuredClone(g.progress);
 const call=callNeighbor(g,'cook');assert.ok(call.ok);assert.match(call.message,/领取生日午餐/);assert.equal(call.status,'通话已接通');assert.deepEqual(g.progress,before);
 g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id==='night').start;
 assert.equal(callNeighbor(g,'cook').status,'语音留言');assert.equal(callNeighbor(g,'missing').ok,false);
});
test('手机导航跟随邻居移动，不传送，战斗和特殊场景有明确拒绝原因',()=>{
 const g=scene(),before={x:g.player.x,y:g.player.y};
 assert.ok(navigatePhone(g,'cook').ok);let target=worldNavigationObjective(g);assert.equal(target.site.id,'cook');
 const resident=phoneContacts(g).find(r=>r.id==='cook');resident.x+=60;target=worldNavigationObjective(g);assert.equal(target.site.x,resident.x);
 assert.deepEqual({x:g.player.x,y:g.player.y},before);assert.ok(navigatePhone(g,'home').ok);assert.equal(worldNavigationObjective(g).site.id,'cottage');
 g.progress.living.patrolActive=true;assert.match(navigatePhone(g,'home').message,/结束当前战斗/);
 g.mapId='jiuzhaigou';assert.equal(callNeighbor(g,'cook').ok,false);
 assert.equal(callNeighbor(scene(freshRangerProgress()),'cook').ok,false);
});
