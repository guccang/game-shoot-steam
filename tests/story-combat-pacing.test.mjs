// 任务配装节奏回归：数值范围、实际击杀耗时、旧档恢复与赠礼身份共同验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {storyPostApproach} from '../src/core/story/story-posts.js';
import {claimStoryCollection} from '../src/progression/story/story-rewards.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
import {failStory} from '../src/core/story/story-manager.js';
import {LIVING_PLACES,LIVING_BATTLE_ENEMY_HP} from '../src/config/living-world.js';
import {interactLivingRequest} from '../src/core/camp/living-world.js';
import {validateStoryDefinition} from '../src/core/story/story-schema.js';
import {beginStoryWave,spawnStoryEnemy} from '../src/core/story/story-encounters.js';
import {pacingGame,measureStoryBoss,measureStoryEnemy} from './helpers/story-combat-pacing.mjs';

for(const id of ['line-patrol','tide-arc','frost-guard'])test(id+'借装持续有效输出10～15秒击败野猪王，走位与半血援兵可正常交付',t=>{
 for(const seed of [42,91]){
  const focused=measureStoryBoss(id,seed,true),row=measureStoryBoss(id,seed);t.diagnostic(JSON.stringify({focused,row}));
  assert.equal(focused.hp,1000);assert.equal(focused.failed,false);assert.ok(focused.seconds>=10&&focused.seconds<=15,JSON.stringify(focused));
  assert.equal(row.failed,false);assert.ok(row.seconds>=10&&row.seconds<=25,JSON.stringify(row));
  assert.ok(row.clearSeconds<=30);assert.equal(row.stage,'Q70');
 }
});

for(const id of ['line-patrol','tide-arc','frost-guard','little-team','canopy-light'])test(id+'任务普通怪与厚甲怪及时击杀',t=>{
 for(const heavy of [false,true]){const row=measureStoryEnemy(id,heavy);t.diagnostic(JSON.stringify(row));assert.equal(row.failed,false);assert.ok(row.seconds!==null&&row.seconds<=3.5,JSON.stringify(row));}
});

test('所有故事实际出生使用短战斗预算，未修改伤害、移速和领主技能',()=>{
 for(const def of Object.values(STORY_CAMPAIGN)){
  validateStoryDefinition(def);
  const node=Object.entries(def.nodes).find(([,n])=>['wave','defense'].includes(n.task.type));if(!node)continue;
  const [stage,n]=node,g=pacingGame(def.id,def.loadouts[0].id,stage),center=def.world.sites[n.task.site];
  Object.assign(g.player,center);g.story.phase='active';beginStoryWave(g,n.task.site,6,4);
  for(const heavy of [false,true]){g.enemies=[];assert.ok(spawnStoryEnemy(g,center,0,heavy,!!n.encounter?.tutorial));const e=g.enemies[0];assert.equal(e.maxHp,heavy?56:n.encounter?.tutorial?40:48);assert.equal(e.hp,e.maxHp);assert.equal(e.damage,heavy?16:n.encounter?.tutorial?8:10);}
 }
});

test('检查点刷新和失败重试采用新Boss预算，永久配装与奖励不变',()=>{
 const g=pacingGame('sunleaf-01','line-patrol','Q60'),weapons=[...g.progress.weapons];g.startStoryStage();g.syncStory();
 const loaded=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);assert.ok(loaded.startStoryStage());assert.equal(loaded.boss.hp,1000);assert.equal(loaded.boss.maxHp,1000);
 assert.equal(loaded.boss.damage,30);assert.equal(loaded.boss.speed,42);assert.deepEqual(loaded.progress.weapons,weapons);
 loaded.hit(loaded.boss,501);loaded.update(.01);assert.equal(loaded.story.support.triggered,true);
 failStory(loaded);assert.ok(loaded.retryStory());assert.ok(loaded.startStoryStage());assert.equal(loaded.boss.hp,1000);
 assert.deepEqual(STORY_CAMPAIGN['sunleaf-01'].reward,{coins:600,wood:240,parts:6});
});

test('谢礼武器与试用身份匹配，一级赠礼正确解锁且不覆盖当前装备',()=>{
 const mappings=[['sunleaf-post','frostbranch','frost-guard'],['monster-neighbors','firefly','line-patrol'],['monster-neighbors','hovercraft','tide-arc']];
 for(const [board,gift,loadout] of mappings){
  const post=STORY_POSTS.find(p=>p.id===board),option=post.collection.options.find(o=>o.id===gift),spec=STORY_CAMPAIGN['sunleaf-01'].loadouts.find(l=>l.id===loadout);
  assert.equal(option.index,option.kind==='weapons'?spec.weapon:spec.vehicle);
  if(option.kind==='vehicle')assert.equal(nativeVehicleWeapon(option.index).weaponIndex,spec.turret);
  const p=freshProgress();p.arrival=null;p.restoration.repaired.push('story','neighbors','garage');
  for(const id of post.chapters)Object.assign(p.story.chapters[id],{completed:true,rewardClaimed:true});
  const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(post));const selected=g.progress.weapon;
  assert.ok(claimStoryCollection(g,post.id,gift).ok);assert.equal(g.progress.weapon,selected);
  assert.equal(option.kind==='weapons'?g.progress.weapons[option.index]:g.progress.vehicleHulls[option.index],1);
  if(option.kind==='vehicle'){assert.equal(g.progress.vehicleWeapons[spec.turret],1);assert.equal(g.progress.vehicleLoadouts[option.index],spec.turret);}
  assert.equal(claimStoryCollection(g,post.id,gift).ok,false);
 }
});

// 当前邻里委托不再进入旧故事场景，护路需单独验证正式出生与进度。
test('夜班护路降低委托怪血量，保留已杀计数且不影响常驻怪',()=>{
 const p=freshProgress();p.arrival=null;p.restoration.repaired.push('neighbors');const g=new Game(p,()=>.5);g.start();
 const id='neighbors-night';Object.assign(g.progress.living.requests[id],{stage:4,battleKills:2});
 Object.assign(g.player,{x:LIVING_PLACES.danger.x,y:LIVING_PLACES.danger.y+40});
 const ambient=g.spawnEnemy(0,0,LIVING_PLACES.danger,{ambient:true}),oldHp=ambient.hp;
 assert.ok(interactLivingRequest(g,id).ok);const enemies=g.enemies.filter(e=>e.livingRequest===id);
 assert.ok(enemies.length>0);for(const e of enemies){assert.equal(e.hp,LIVING_BATTLE_ENEMY_HP);assert.equal(e.maxHp,e.hp);assert.equal(e.reward,0);}
 assert.equal(ambient.hp,oldHp);assert.equal(g.progress.living.requests[id].battleKills,2);
 assert.equal(interactLivingRequest(g,id).ok,false);assert.equal(g.enemies.filter(e=>e.livingRequest===id).length,enemies.length);
 for(const e of enemies)g.hit(e,1e6);g.livingBattle=null;assert.ok(interactLivingRequest(g,id).ok);assert.equal(g.progress.living.requests[id].stage,5);
});
