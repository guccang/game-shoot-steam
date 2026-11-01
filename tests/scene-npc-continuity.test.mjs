// 人物现场连续性：实际主线切换、章节结束和重开不能复活任务或复制人物。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {mainlineActors,mainlineTask,completeMainline} from '../src/core/mainline-manager.js';
import {storyObjects} from '../src/rendering/story-props.js';
import {createSceneNpcContinuity,sceneNpcObjects} from '../src/rendering/scene-npc-continuity.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
import {STORY_ID} from '../src/config/story.js';
// 只准备已开放营地，使用正式交付与章节入口，渲染视野覆盖人物现场。
function setup(){const p=freshProgress();p.arrival={phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;const g=new Game(p);g.state='playing';g.enemies=[];g.mainlinePersist=()=>true;return g;}
// 视口按人物真实坐标取景，不改变业务或实体位置。
function view(point){return {x:point.x-200,y:point.y-200,w:400,h:400};}
test('主线交付切换人物时，前一个 NPC 保留在原地且不复制任务道具',()=>{const g=setup();const i=MAINLINE_IDS.indexOf('first-map');g.progress.mainline.completed=MAINLINE_IDS.slice(0,i);g.progress.mainline.currentId='first-map';g.progress.mainline.phase='report';Object.assign(g.player,MAINLINE_SITES[mainlineTask(g).site]);const cache=createSceneNpcContinuity(),before=mainlineActors(g)[0],v=view(before);sceneNpcObjects(cache,g,mainlineActors(g),v);assert.ok(completeMainline(g));const after=sceneNpcObjects(cache,g,[],v);assert.equal(after.length,1);assert.equal(after[0].x,before.x);assert.equal(after[0].y,before.y);assert.equal(g.progress.mainline.completed.includes('first-map'),true);});
test('章节交付后只保留镜头内人物，道具照常清理且离开区域后清理留驻记录',()=>{const g=setup();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,STORY_ID)));assert.ok(g.enterStory());Object.assign(g.story,{stageId:'Q80',phase:'prepare',dialogue:null,routeId:'road',readLines:['ending']});g.story.flags.silenced=true;const objects=storyObjects(g),actor=objects.find(o=>o.sceneNpcId),v=view(actor),cache=createSceneNpcContinuity();sceneNpcObjects(cache,g,objects,v);assert.ok(g.claimStory());assert.deepEqual(storyObjects(g),[]);const after=sceneNpcObjects(cache,g,[],v);assert.equal(after.length,objects.filter(o=>o.sceneNpcId).length);assert.ok(after.every(o=>o.sceneNpcId));assert.ok(after.some(o=>o.sceneNpcId===actor.sceneNpcId));assert.deepEqual(sceneNpcObjects(cache,g,[],{x:5000,y:5000,w:400,h:400}),[]);});
test('相同身份仅一份，重开、地图与活动隔离，不保留旧实体',()=>{const g=setup(),cache=createSceneNpcContinuity(),actor={sceneNpcId:'npc:mint',kind:'mint',x:200,y:200},v=view(actor);sceneNpcObjects(cache,g,[actor],v);assert.equal(sceneNpcObjects(cache,g,[{...actor,x:210}],v).length,1);g.combatSight=new WeakMap();assert.equal(sceneNpcObjects(cache,g,[],v).length,0);sceneNpcObjects(cache,g,[actor],v);g.realm={};assert.deepEqual(sceneNpcObjects(cache,g,[],v),[]);g.realm=null;sceneNpcObjects(cache,g,[actor],v);g.mapId='jiuzhaigou';assert.deepEqual(sceneNpcObjects(cache,g,[],v),[]);});
