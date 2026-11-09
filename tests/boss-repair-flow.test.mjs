// 本轮回归：生命增幅及旧档比例、提前修复闭环、道路选择取消后的目标推进。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {TOWN_RESTORATIONS,facilityOpen,pendingRestoration} from '../src/config/town-restoration.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {repairFacility,updateRestoration} from '../src/core/camp/town-restoration.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
import {mainlineObjective,mainlineSteps} from '../src/core/story/mainline-manager.js';
import {requestWorldNavigation,worldNavigationObjective} from '../src/core/navigation/world-navigation.js';
import {clearingBossHealth} from '../src/config/clearing-boss.js';
import {clearingDifficulty} from '../src/config/clearing-difficulty.js';
import {CAMP_GATES,campDefenseBoss} from '../src/config/camp-defense.js';
import {validateCampDefense} from '../src/progression/camp/camp-defense.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story/story-posts.js';
import {runStoryActions,updateStory} from '../src/core/story/story-manager.js';
import {spawnStoryBoss} from '../src/core/story/story-encounters.js';

// 使用未推进主线的新进度，修复和故事仍由正式核心方法进入。
function scene(){const g=new Game(freshProgress(),()=>.5);g.start();g.vehicle.active=false;g.enemies=[];g.boss=null;g.restorationPersist=()=>true;return g;}
// 独立章节仅解锁前置和回信驿，再走真实故事入口。
function chapter(id){const g=scene(),def=STORY_CAMPAIGN[id];g.progress.restoration.repaired=['story'];for(const key of def.requires||[])g.progress.story.chapters[key].completed=true;Object.assign(g.player,storyPostApproach(storyPostForChapter(g,id)));assert.ok(g.enterStory(id));g.advanceStoryDialogue(true);g.chooseStoryLoadout(def.loadouts[0].id);g.startStoryStage();return g;}

test('第一章野猪额外增加50%生命，兽潮与清缴前五轮原倍率保持，旧兽潮按剩余比例只迁移一次',()=>{
 for(const n of [0,1,2,7,20,30]){
  assert.equal(clearingBossHealth(n),Math.round(Math.round(clearingDifficulty(n).bossHealth*115/100)*1.5)*(n>=7?4:1));
  assert.equal(campDefenseBoss(n).hp,Math.round(Math.round(1900*1.05**n)*115/100));
 }
 const g=chapter('sunleaf-01'),spec=STORY_CAMPAIGN['sunleaf-01'].encounters.bosses.boar;
 Object.assign(g.player,{x:STORY_CAMPAIGN['sunleaf-01'].world.sites.BOSS.x,y:STORY_CAMPAIGN['sunleaf-01'].world.sites.BOSS.y+300});
 runStoryActions(g,[{type:'stage',id:'Q60'}]);spawnStoryBoss(g,'boar');
 assert.equal(g.boss.maxHp,1725);assert.equal(g.boss.hp,1725);assert.equal(g.boss.damage,spec.stats.damage);assert.equal(g.boss.speed,spec.stats.speed);
 const oldMax=Math.round(1900*1.05**5),raw={runs:5,run:{gateId:CAMP_GATES[0].id,rounds:5,growthVersion:2,phase:'boss',bossHp:Math.floor(oldMax*.4)}};
 const migrated=validateCampDefense(raw);assert.equal(migrated.run.bossHp,Math.round(raw.run.bossHp/oldMax*campDefenseBoss(5).hp));assert.deepEqual(validateCampDefense(migrated),migrated);
 const p=freshProgress();p.bossChallenge={bosses:0,kind:'boar',maxHp:650,clearingHealthVersion:7,damage:18,blastDamage:30,speed:34};p.patrol={...(g.progress.patrol||{}),bossHp:325};
 const saved=validateProgress(p);assert.equal(saved.bossChallenge.maxHp,1122);assert.deepEqual(validateProgress(saved),saved);
});

test('靠近未来小屋可看资源、提前修复；主线到达后不再出现修复步骤',()=>{
 const g=scene(),f=TOWN_RESTORATIONS.find(f=>f.id==='cottage');Object.assign(g.player,f.site);g.progress.wood=20;
 const hint=nearbyInteraction(g);assert.equal(hint.key,'cottage');assert.match(hint.detail,/20\/80/);assert.match(hint.detail,/还差60/);assert.match(hint.detail,/点击修复/);
 assert.equal(repairFacility(g,f.id).ok,false);g.progress.wood=100;assert.ok(repairFacility(g,f.id).ok);assert.equal(g.progress.restoration.build.id,f.id);assert.equal(g.progress.wood,20);
 for(let i=0;i<70;i++)updateRestoration(g,.05);assert.equal(facilityOpen(g.progress,f.id),true);assert.equal(g.progress.wood,20);
 assert.equal(repairFacility(g,f.id).ok,false);
 g.progress.restoration.repaired.push(...TOWN_RESTORATIONS.filter(item=>item.order<f.order).map(item=>item.id));g.progress.mainline.completed=MAINLINE_IDS.slice(0,f.order);g.progress.mainline.currentId=f.before;g.progress.mainline.phase='doing';
 assert.equal(pendingRestoration(g.progress),null);assert.equal(mainlineObjective(g).restoration,undefined);assert.ok(mainlineSteps(g).every(s=>s.operation?.type!=='restoration'));
 assert.equal(facilityOpen(validateProgress(g.progress),'cottage'),true);
});

test('主动选择未来设施时导航不被当前主线修复抢走',()=>{
 const g=scene(),f=TOWN_RESTORATIONS.find(f=>f.id==='fire');g.progress.mainline.completed=['first-map'];g.progress.mainline.currentId='first-patrol';g.progress.mainline.phase='doing';
 assert.equal(pendingRestoration(g.progress).id,'clearing');requestWorldNavigation(g,f.site,'提前修复消防站',{direct:true});assert.equal(worldNavigationObjective(g).site.x,f.site.x);
 Object.assign(g.player,f.site);g.progress.wood=f.wood;assert.ok(repairFacility(g,f.id).ok);assert.equal(g.progress.restoration.build.id,'fire');
 assert.equal(mainlineObjective(g).label,'正在修复森林消防站');
});

test('第一章不再选路，直接给沿途战斗目标；旧待选路存档仍可续接',()=>{
 const g=chapter('sunleaf-01');runStoryActions(g,[{type:'dialogue',id:'sign'}]);g.advanceStoryDialogue(true);
 assert.equal(g.story.phase,'active');assert.equal(g.state,'playing');assert.equal(g.storyObjective().site,'ROAD1');assert.equal(g.chooseStoryRoute('short'),false);
 Object.assign(g.player,STORY_CAMPAIGN['sunleaf-01'].world.sites.ROAD1);updateStory(g,.1);assert.equal(g.story.combat.site,'ROAD1');
 g.story.phase='prepare';g.story.routeId=null;g.syncStory();const restored=new Game(structuredClone(g.progress),()=>.5);assert.equal(restored.story.phase,'active');assert.equal(restored.storyObjective().site,'ROAD1');
});

test('所有章节没有道路选择页，第六章直接到目标且旧路口存档可继续',()=>{
 for(const def of Object.values(STORY_CAMPAIGN))for(const node of Object.values(def.nodes)){assert.ok(!node.routeChoice);assert.notEqual(node.panel?.type,'route');}
 const g=chapter('sunleaf-06');assert.equal(g.story.stageId,'ROUTE');assert.equal(g.story.phase,'active');assert.equal(g.storyObjective().site,'WEST');
 g.story.phase='prepare';g.syncStory();const restored=new Game(structuredClone(g.progress),()=>.5);assert.equal(restored.story.phase,'active');assert.equal(restored.storyObjective().site,'WEST');
 restored.state='playing';for(const site of ['WEST','EAST','FAR']){Object.assign(restored.player,STORY_CAMPAIGN['sunleaf-06'].world.sites[site]);updateStory(restored,.1);}assert.equal(restored.story.stageId,'ARRIVE');
});
