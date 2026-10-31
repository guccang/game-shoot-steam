import {enterFarmVehicle} from '../src/core/farm-vehicle.js';
// 故事农活回归：永久田地与章节会话共存，收成保存不被退出或重试回滚。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {FARM_CROPS,FARM_SEED_DOOR} from '../src/config/farm.js';
import {FARM_COMBAT_RESUME_DELAY} from '../src/config/farm-tools.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
import {storyDefinition} from '../src/core/story-definition.js';
import {syncStory} from '../src/core/story-manager.js';
import {canUseFarm,farmAction,farmMode,farmWorking,setFarmTool,queueFarmWork,updateFarmWork} from '../src/core/farm.js';
import {farmObjects,farmVisible} from '../src/rendering/farm.js';
import {farmCovers} from '../src/world/farm-land.js';
import {canBuyFarmSeeds} from '../src/core/farm-seeds.js';

// 走正式章节入口和整备流程，农田保留在独立于故事阶段的永久进度中。
function scene(chapter='sunleaf-01'){
 const p=freshProgress();p.arrival=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.story.chapters['sunleaf-01'].completed=true;
 p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.plots=[{id:0,mapId:'forest',x:893,y:2752,crop:null,plantedAt:0,readyAt:0,watered:false}];p.farm.nextId=1;p.farm.seeds[0]=5;
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,chapter)));assert.ok(g.enterStory(chapter));
 assert.equal(canUseFarm(g),false);g.advanceStoryDialogue(true);assert.ok(g.chooseStoryLoadout(storyDefinition(g).loadouts[0].id));assert.ok(g.startStoryStage());
 Object.assign(g.player,{x:893,y:2814});g.enemies=[];g.boss=null;g.trees=[];assert.ok(enterFarmVehicle(g).ok);return g;
}
for(const chapter of ['sunleaf-01','sunleaf-02'])test(`${chapter}自由行动支持完整农活，刷新和暂离保留收成与田地`,()=>{
 const g=scene(chapter),stage=g.story.stageId,coins=g.progress.coins,now=100000;
 assert.ok(canUseFarm(g));assert.ok(farmVisible(g));assert.ok(farmCovers(g,{x:893,y:2752}));
 assert.ok(farmAction(g,'plant',{plot:0,crop:0,now}).ok);assert.ok(farmAction(g,'water',{plot:0,now:now+1000}).ok);assert.ok(farmObjects(g).some(o=>o.type==='farm-crop'));
 const ready=g.progress.farm.plots[0].readyAt;assert.ok(farmAction(g,'harvest',{plot:0,now:ready}).ok);assert.equal(g.progress.coins,coins+FARM_CROPS[0].value);
 Object.assign(g.player,{x:1005,y:2814});assert.ok(farmAction(g,'dig',{point:{x:1005,y:2752,mapId:'forest'},now:ready}).ok);
 const farm=structuredClone(g.progress.farm);syncStory(g);const saved=validateProgress(structuredClone(g.progress)),loaded=new Game(saved,()=>.5);
 assert.deepEqual(loaded.progress.farm,farm);assert.equal(g.story.stageId,stage);assert.ok(g.leaveStory());assert.deepEqual(g.progress.farm,farm);assert.equal(g.progress.coins,coins+FARM_CROPS[0].value);
});
test('故事对白、试用、调查和独立副本仍锁定农活，种子商店与探索许可一致',()=>{
 const g=scene();Object.assign(g.player,FARM_SEED_DOOR);assert.ok(canBuyFarmSeeds(g));
 for(const patch of [{phase:'dialogue'},{trial:{}},{interacting:1}]){const before={...g.story};Object.assign(g.story,patch);assert.equal(canUseFarm(g),false);assert.equal(canBuyFarmSeeds(g),false);g.story=before;}
 g.realm={mode:'tower'};assert.equal(canUseFarm(g),false);assert.equal(farmVisible(g),false);assert.equal(farmCovers(g,{x:893,y:2752}),false);
});
test('故事途中种田遇敌切回战斗，脱战后继续队列',()=>{
 const g=scene();setFarmTool(g,'hoe');assert.ok(queueFarmWork(g,'plant',{plot:0,crop:0}).ok);
 g.enemies=[{id:987,type:'enemy',x:g.player.x+60,y:g.player.y,hp:100,radius:12}];updateFarmWork(g,.05,{x:0,y:0});
 assert.ok(farmMode(g));assert.equal(farmWorking(g),false);assert.equal(g.farmWork.queue.length,1);
 g.enemies=[];for(let i=0;i<Math.ceil(FARM_COMBAT_RESUME_DELAY/.05)+1;i++)updateFarmWork(g,.05,{x:0,y:0});assert.ok(farmWorking(g));
});
