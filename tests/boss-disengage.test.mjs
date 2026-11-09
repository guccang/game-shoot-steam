// 森林领主脱战：覆盖距离、交互、技能取消、续战与存档，使用正式游戏及购买事务。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {BOSS_ENGAGEMENT} from '../src/config/boss-combat.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {bossCombatActive,updateBossEngagement} from '../src/core/battle/boss-engagement.js';
import {updateBoss,updateBossHazards} from '../src/combat/bosses.js';
import {beginBossSupport} from '../src/core/battle/boss-reinforcements.js';
import {prepareBossNode} from './helpers/boss-node.mjs';
import {canEnterCottage,enterWorkshop} from '../src/core/home/cottage.js';
import {canInspectBuilding} from '../src/core/camp/building-entry.js';
import {tradeSupply} from '../src/core/vehicles/supplies.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {canTalkMainline,mainlineTask} from '../src/core/story/mainline-manager.js';
import {campTalkSite} from '../src/core/camp/camp-routines.js';
import {attackTargetKnown} from '../src/combat/perception.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {residentFor,acceptLivingRequest,interactLivingRequest,livingRequestTarget} from '../src/core/camp/living-world.js';
import {LIVING_REQUESTS} from '../src/config/living-world.js';

// 已接取并清空波次的普通森林，明确使用野外落点，不把营地安全区当交战区域。
function scene(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.living.patrolActive=true;p.living.clearingSite={x:2000,y:2000,radius:300,origin:{x:1000,y:2000}};p.coins=1000;
 const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;Object.assign(g.player,{x:2000,y:2000});prepareBossNode(g);assert.ok(g.summonBoss());Object.assign(g.boss,{x:1900,y:2000,hp:321,maxHp:1000,speed:0});g.attackTimer=g.spawnTimer=g.fireClock=999;return g;
}

test('远离700单位解除锁定，Boss和技能停止且不产生击杀奖励，其他敌人保留',()=>{
 const g=scene(),b=g.boss;assert.equal(bossCombatActive(g),true);assert.equal(canEnterCottage(g),false);assert.equal(canInspectBuilding(g),false);
 b.ai={phase:'windup',elapsed:.2};b.support={pending:2,warning:1};g.hazards=[{owner:b.id,kind:'slam'},{owner:999,kind:'slam'}];g.enemies=[{id:300,bossOwner:b.id,hp:10},{id:301,hp:20}];g.enemyBolts=[{owner:300},{owner:301}];const before={kills:g.kills,coins:g.progress.coins,wave:g.wave,hp:b.hp,bosses:g.progress.bosses};
 Object.assign(g.player,{x:b.x+BOSS_ENGAGEMENT.leaveDistance,y:b.y});updateBossEngagement(g);assert.equal(b.disengaged,true);assert.equal(bossCombatActive(g),false);assert.equal(attackTargetKnown(g,b),false);assert.equal(canEnterCottage(g),true);assert.equal(canInspectBuilding(g),true);
 assert.deepEqual(g.enemies.map(e=>e.id),[301]);assert.deepEqual(g.enemyBolts.map(e=>e.owner),[301]);assert.deepEqual(g.hazards.map(h=>h.owner),[999]);assert.equal(b.support.pending,0);assert.equal(beginBossSupport(g),false);
 const location={x:b.x,y:b.y},attack=b.attack;for(let i=0;i<30;i++)updateBoss(g,.05);assert.deepEqual({x:b.x,y:b.y},location);assert.equal(b.attack,attack);assert.deepEqual({kills:g.kills,coins:g.progress.coins,wave:g.wave,hp:b.hp,bosses:g.progress.bosses},before);
});
test('500至700单位的缓冲带不反复接战，进入500内保留血量重新预警',()=>{
 const g=scene(),b=g.boss;g.player.x=b.x+701;updateBossEngagement(g);g.player.x=b.x+600;updateBossEngagement(g);assert.equal(bossCombatActive(g),false);assert.equal(b.hp,321);
 g.player.x=b.x+499;updateBossEngagement(g);assert.equal(bossCombatActive(g),true);assert.equal(b.disengaged,false);assert.equal(b.ai.phase,'chase');assert.ok(b.attack>0);assert.equal(b.hp,321);
 g.player.x=b.x+600;updateBossEngagement(g);assert.equal(bossCombatActive(g),true);
});
test('回营安全区立即脱战，正式进入弹药铺并购买，室内坐标不能误触发续战',()=>{
 const g=scene(),door=WORKSHOP_INTERIORS.ammo.door;Object.assign(g.player,door);Object.assign(g.boss,{x:door.x+120,y:door.y});g.hazards=[{owner:g.boss.id,kind:'slam'}];updateBossEngagement(g);assert.equal(bossCombatActive(g),false);assert.equal(g.hazards.length,0);
 assert.equal(enterWorkshop(g,'ammo'),true);Object.assign(g.boss,{x:g.player.x,y:g.player.y});assert.equal(bossCombatActive(g),false);const coins=g.progress.coins,stock=g.progress.supplies.hand.light;assert.ok(tradeSupply(g,{kind:'ammo',id:'light',target:'hand'}).ok);assert.equal(g.progress.coins,coins-30);assert.equal(g.progress.supplies.hand.light,stock+300);assert.equal(g.boss.hp,321);
});
test('营地任务交谈不受远处未完成Boss锁定',()=>{
 const g=scene();g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('supply-ammo'));g.progress.mainline.currentId='supply-ammo';g.progress.mainline.phase='doing';Object.assign(g.player,campTalkSite(g,mainlineTask(g)));updateBossEngagement(g);assert.equal(canTalkMainline(g),true);assert.equal(g.progress.living.patrolActive,true);assert.ok(g.boss);
});
test('脱战后可现场接取并推进邻里请求，未完成Boss与血量仍保留',()=>{
 const g=scene(),request=LIVING_REQUESTS.find(q=>q.id==='neighbors-lunch');Object.assign(g.player,residentFor(g,request.host));updateBossEngagement(g);
 assert.ok(acceptLivingRequest(g,request.id).ok);const target=livingRequestTarget(g,request),stage=g.progress.living.requests[request.id].stage;Object.assign(g.player,target);updateBossEngagement(g);
 const result=interactLivingRequest(g,request.id);assert.ok(result.ok,result.message);assert.equal(g.progress.living.requests[request.id].stage,stage+1);assert.equal(g.boss.hp,321);assert.equal(g.progress.living.patrolActive,true);
});
test('回营保存重建保留Boss战区位置、HP和脱战状态，离店不会把Boss带到玩家身边',()=>{
 const g=scene(),position={x:g.boss.x,y:g.boss.y};Object.assign(g.player,WORKSHOP_INTERIORS.ammo.door);updateBossEngagement(g);assert.ok(enterWorkshop(g,'ammo'));g.progress.patrol=capturePatrol(g);const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
 assert.ok(restored.boss);assert.equal(restored.boss.hp,321);assert.ok(worldDistance(restored.boss,position)<.001);assert.equal(restored.boss.disengaged,true);assert.equal(bossCombatActive(restored),false);assert.equal(canEnterCottage(restored),true);assert.equal(restored.wave,g.wave);assert.equal(restored.waveKills,g.waveKills);assert.equal(restored.progress.bosses,g.progress.bosses);
 restored.state='playing';Object.assign(restored.player,{x:position.x+100,y:position.y});updateBossEngagement(restored);assert.equal(bossCombatActive(restored),true);assert.equal(restored.boss.hp,321);
});
test('循环地图按最短距离判断，剧情秘境守门等独立战斗不允许借远离脱战',()=>{
 const g=scene();Object.assign(g.boss,{x:WORLD.width-30,y:3000});Object.assign(g.player,{x:30,y:3000});assert.equal(bossCombatActive(g),true);
 for(const flag of ['realm','story','campDefense','fireActive','workshopTrial','arrivalCinematic']){const other={...g,[flag]:{},player:{...g.player,x:2000,y:2000}};assert.equal(bossCombatActive(other),true);updateBossEngagement(other);assert.notEqual(other.boss.disengaged,true);}
});
test('正式游戏帧先释放交互锁，暂停不推进Boss；撤退中的危险区不会继续伤害',()=>{
 const g=scene(),b=g.boss;g.player.x=b.x+701;g.hazards=[{owner:b.id,kind:'slam',x:g.player.x,y:g.player.y,radius:100,warmup:0,duration:10,damage:999}];const hp=g.player.hp;updateBossHazards(g,.05);assert.equal(g.hazards.length,0);assert.equal(g.player.hp,hp);
 Object.assign(g.player,WORKSHOP_INTERIORS.ammo.door);g.update(.05,{x:0,y:0});assert.equal(g.boss.disengaged,true);assert.equal(canEnterCottage(g),true);const attack=b.attack;g.state='paused';g.player.x=b.x+100;g.player.y=b.y;updateBoss(g,2);assert.equal(b.attack,attack);assert.equal(b.disengaged,true);
});
