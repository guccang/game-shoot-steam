// 未击败领主的暂停、购弹与恢复专项，使用正式游戏、存档及交易事务。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {prepareBossNode} from './helpers/boss-node.mjs';
import {setLivingPatrol} from '../src/core/living-world.js';
import {clearingPostReason,acceptClearingPost} from '../src/core/clearing-guide.js';
import {bossCombatActive,updateBossEngagement} from '../src/core/boss-engagement.js';
import {updateBoss} from '../src/combat/bosses.js';
import {enterWorkshop} from '../src/core/cottage.js';
import {canConverse,converseWithNpc} from '../src/core/npc-dialogue.js';
import {requestShopkeeperService,shopkeeperApproach} from '../src/core/workshop-display-entry.js';
import {tradeSupply} from '../src/core/supplies.js';
import {attackTargetKnown} from '../src/combat/perception.js';
import {worldDistance} from '../src/world/coordinates.js';
// 独立野外 Boss，所有弹药耗尽，角色已完成入职且已修复商店。
function scene(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.coins=1000;p.living.patrolActive=true;p.living.clearingSite={x:2000,y:2000,radius:300,origin:{x:1000,y:2000}};p.supplies.hand.light=0;p.supplies.vehicles.forEach(s=>s.light=0);
 const g=new Game(validateProgress(p),()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.enemies=[];g.livingPersist=()=>true;Object.assign(g.player,{x:2000,y:2000});prepareBossNode(g);assert.ok(g.summonBoss());Object.assign(g.boss,{x:1900,y:2000,hp:321,speed:0});g.attackTimer=g.spawnTimer=g.fireClock=99999;return g;
}
// 只移到真实告示牌，保持 Boss 仍存活，不提前清除其战斗状态。
function returnToPost(g){Object.assign(g.player,CLEARING_APPROACH);g.state='paused';}
test('告示牌弹窗暂停清缴成功，当前血量、场地和波次一次保存，领主攻击与援兵取消',()=>{
 const g=scene(),b=g.boss,site=structuredClone(g.progress.living.clearingSite);let saved;g.livingPersist=p=>{saved=structuredClone(p);return true;};
 b.ai={phase:'windup',elapsed:1};g.hazards=[{owner:b.id}];g.enemies=[{id:900,bossOwner:b.id,hp:10}];g.enemyBolts=[{owner:900}];returnToPost(g);
 const result=setLivingPatrol(g,false);assert.ok(result.ok,result.message);assert.equal(g.boss,b);assert.equal(b.hp,321);assert.equal(b.disengaged,true);assert.equal(g.progress.living.patrolActive,false);assert.equal(saved.patrol.bossHp,321);assert.equal(saved.patrol.wave,g.wave);assert.equal(saved.patrol.bossDisengaged,true);assert.deepEqual(saved.living.clearingSite,site);assert.equal(g.progress.bosses,0);assert.equal(g.hazards.length,0);assert.equal(g.enemies.length,0);assert.equal(g.enemyBolts.length,0);
});
test('保存失败不暂停任务、不清除攻击、不改变血量或存档，恢复也先保存',()=>{
 const g=scene();returnToPost(g);g.livingPersist=()=>false;g.hazards=[{owner:g.boss.id}];const before=structuredClone(g.progress),boss=structuredClone(g.boss);
 assert.equal(setLivingPatrol(g,false).ok,false);assert.deepEqual(g.progress,before);assert.deepEqual(g.boss,boss);assert.equal(g.hazards.length,1);
 g.livingPersist=()=>true;assert.ok(setLivingPatrol(g,false).ok);const paused=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(acceptClearingPost(g).ok,false);assert.deepEqual(g.progress,paused);
});
test('暂停后即使回到原 Boss 身边也不会自动开战，重新接取继续同一血量和场地',()=>{
 const g=scene(),b=g.boss;returnToPost(g);assert.ok(setLivingPatrol(g,false).ok);const site=structuredClone(g.progress.living.clearingSite),wave=g.wave;
 g.state='playing';Object.assign(g.player,{x:b.x+100,y:b.y});updateBossEngagement(g);const clock=b.attack;updateBoss(g,1);assert.equal(bossCombatActive(g),false);assert.equal(attackTargetKnown(g,b),false);assert.equal(b.attack,clock);g.hit(b,999999);assert.equal(b.hp,321);assert.equal(g.progress.bosses,0);
 returnToPost(g);assert.equal(clearingPostReason(g),'');assert.ok(acceptClearingPost(g).ok);assert.equal(g.boss,b);assert.equal(b.hp,321);assert.equal(g.wave,wave);assert.deepEqual(g.progress.living.clearingSite,site);assert.equal(g.progress.living.clearingNotice,'arrival');
 g.state='playing';Object.assign(g.player,{x:b.x+100,y:b.y});updateBossEngagement(g);assert.equal(bossCombatActive(g),true);assert.equal(b.hp,321);
});
test('暂停立即刷新不会丢失 Boss，再进店与售货员交谈可买到猫猫及载具弹药',()=>{
 const g=scene();returnToPost(g);assert.ok(setLivingPatrol(g,false).ok);const saved=structuredClone(g.progress),h= new Game(saved,()=>.5);h.state='playing';h.vehicle.active=false;h.mainlineSpeech=null;h.livingPersist=()=>true;
 assert.equal(h.boss.hp,321);assert.equal(h.progress.living.patrolActive,false);assert.ok(worldDistance(g.boss,h.boss)<1);assert.equal(h.wave,g.wave);
 Object.assign(h.player,WORKSHOP_INTERIORS.ammo.door);assert.ok(enterWorkshop(h,'ammo'));Object.assign(h.player,shopkeeperApproach(h.cottage));assert.ok(requestShopkeeperService(h));assert.ok(canConverse(h,'shop:ammo'));assert.ok(converseWithNpc(h,'shop:ammo',()=>.5).ok);
 const coins=h.progress.coins;assert.ok(tradeSupply(h,{kind:'ammo',id:'light',target:'hand'}).ok);assert.ok(tradeSupply(h,{kind:'ammo',id:'light',target:'vehicle'}).ok);assert.equal(h.progress.coins,coins-60);assert.equal(h.progress.supplies.hand.light,300);assert.equal(h.progress.supplies.vehicles[h.vehicle.index].light,300);assert.equal(h.boss.hp,321);
});
test('仍在交战中不能远程取消，脱战后可暂停；其他活动不借暂停解除战斗',()=>{
 const g=scene();assert.equal(setLivingPatrol(g,false).ok,false);assert.equal(g.progress.living.patrolActive,true);
 g.player.x=g.boss.x+750;updateBossEngagement(g);assert.ok(setLivingPatrol(g,false).ok);
 for(const flag of ['story','realm','campDefense','fireActive','workshopTrial','arrivalCinematic']){const h=scene();returnToPost(h);Object.defineProperty(h,flag,{value:{},configurable:true});assert.equal(setLivingPatrol(h,false).ok,false);}
});
