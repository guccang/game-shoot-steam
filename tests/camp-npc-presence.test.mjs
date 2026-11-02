// 常驻伙伴与任务指引解耦：检查交付、刷新、换追踪、修复和专属场景边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {MAINLINE_NPCS,MAINLINE_SITES} from '../src/config/mainline.js';
import {CAMPAIGN_TASK_IDS} from '../src/config/mainline-pacing.js';
import {mainlineActors,mainlineObjective,updateMainline,completeMainline,canTalkMainline} from '../src/core/mainline-manager.js';
import {selectMainlineTask} from '../src/core/mainline-selection.js';
import {livingResidents,updateLivingWorld} from '../src/core/living-world.js';
import {createSceneNpcContinuity,sceneNpcObjects} from '../src/rendering/scene-npc-continuity.js';
// 使用正式游戏实例，保存入口只捕获本测试进度。
function world(){const g=new Game(freshProgress(),()=>.5);g.start();g.mainlinePersist=()=>true;g.enemies=[];g.boss=null;g.vehicle.active=false;return g;}
// 角色身份必须唯一，数量与正式配置一致。
function assertResidents(g){const people=mainlineActors(g);assert.equal(people.length,Object.keys(MAINLINE_NPCS).length);assert.equal(new Set(people.map(p=>p.sceneNpcId)).size,people.length);return people;}
test('正式交付后四位伙伴仍在场，指引对白保持关闭且刷新可重建',()=>{
 const g=world();Object.assign(g.player,MAINLINE_SITES.camp);g.progress.mainline.currentId='first-map';g.progress.mainline.phase='report';g.progress.mainline.seen.map=1;g.progress.mainline.distance=80;
 assertResidents(g);assert.ok(completeMainline(g));const after=assertResidents(g);assert.equal(mainlineObjective(g),null);assert.equal(canTalkMainline(g),false);
 updateMainline(g,5);assert.equal(g.mainlineSpeech,null);g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.deepEqual(assertResidents(g),after);
});
test('未修设施、通关、自选体验与邻里追踪都不隐藏常驻伙伴',()=>{
 const g=world();g.progress.mainline.currentId='first-patrol';assertResidents(g);
 assert.ok(selectMainlineTask(g,'football-day'));const before=assertResidents(g);assert.ok(selectMainlineTask(g));assert.deepEqual(assertResidents(g),before);
 g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};g.progress.living.requests['neighbors-lunch'].stage=0;assertResidents(g);
 g.progress.mainline.completed=[...CAMPAIGN_TASK_IDS];g.progress.mainline.currentId=null;g.progress.mainline.phase='complete';
 for(const p of assertResidents(g)){const id=p.sceneNpcId.split(':')[1];assert.equal(p.x,MAINLINE_SITES[MAINLINE_NPCS[id].home].x);}
 updateLivingWorld(g,.05);assert.equal(livingResidents(g).length,6);
});
test('主动追踪恢复原交谈位置，人物目录不代接任务或发奖',()=>{
 const g=world();assert.ok(selectMainlineTask(g,'football-day'));const before=JSON.stringify(g.progress),lumi=assertResidents(g).find(p=>p.sceneNpcId==='mainline:lumi');
 assert.equal(lumi.x,MAINLINE_SITES.footballEntry.x);assert.equal(lumi.y,MAINLINE_SITES.footballEntry.y);assert.equal(JSON.stringify(g.progress),before);
 assert.ok(mainlineObjective(g));
});
test('室内、剧情与专属活动不混入常驻人物缓存，回营立即恢复',()=>{
 const g=world(),cache=createSceneNpcContinuity(),v={x:0,y:0,w:3000,h:3000};sceneNpcObjects(cache,g,assertResidents(g),v);
 for(const key of ['story','realm','cottage','campDefense','workshopTrial']){g[key]={};assert.deepEqual(mainlineActors(g),[]);assert.deepEqual(sceneNpcObjects(cache,g,mainlineActors(g),v),[]);g[key]=null;sceneNpcObjects(cache,g,assertResidents(g),v);}
 g.mapId='jiuzhaigou';assert.deepEqual(mainlineActors(g),[]);g.mapId='forest';assertResidents(g);
});
