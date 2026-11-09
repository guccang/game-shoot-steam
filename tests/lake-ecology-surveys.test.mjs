// 独立水域、可见鱼群、四类控线与调查的事务回归；不替代实机视觉验收。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {FISH_SPECIES} from '../src/config/fish-catalog.js';
import {fishCatchWeight} from '../src/config/fishing-tackle.js';
import {fishStruggle,fishStruggleKind} from '../src/config/fish-struggles.js';
import {surfaceFishLake,mineFishLake,lakeFishPool} from '../src/world/fish-ecology.js';
import {surfaceAmbientFish,mineAmbientFish} from '../src/world/ambient-fish.js';
import {fishingShores} from '../src/world/outdoor-sites.js';
import {WORLD} from '../src/world/coordinates.js';
import {fishingPreview,lakeFishingContext,fishingCastPoint} from '../src/core/fishing/lake-fishing.js';
import {beginFishing,fishingControl,updateOutdoors,finishFishing,acceptFishingSurvey,claimFishingSurvey} from '../src/core/activities/outdoors.js';
import {fishingSurveyProgress,normalizeFishingSurveys} from '../src/progression/fishing/fishing-surveys.js';
// 正式自由巡林环境，进度和金币使用独立测试档。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.outdoors.rod=true;p.outdoors.rods.star=true;p.outdoors.selectedRod='star';p.outdoors.bait=150;const g=new Game(p,()=>.4);g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.progress.living.patrolActive=false;g.livingPersist=()=>true;Object.assign(g.player,fishingShores(g)[0]);return g;}
// 用真实收放线推进完整溜鱼，禁止直接跳过实际力道。
function land(g){for(let i=0;i<300&&g.fishing.phase!=='bite';i++)updateOutdoors(g,.04);assert.equal(g.fishing.phase,'bite');fishingControl(g,'press');for(let i=0;i<1600&&g.fishing.phase==='fight';i++){const f=g.fishing;fishingControl(g,'lean',-(f.direction||1));fishingControl(g,f.tension>.7?'release':f.tension<.4?'press':f.reeling?'press':'release');updateOutdoors(g,.04);}assert.equal(g.fishing.phase,'landed');}
// 通过准备、蓄力和扣饵正式锁定鱼群。
function cast(g){assert.ok(beginFishing(g).ok);fishingControl(g,'press');updateOutdoors(g,.6);assert.ok(fishingControl(g,'release'));}
test('每湖6至12常住鱼，老竿至少两种；镜像、重载与查询顺序不改变鱼池',()=>{
 const g=scene(),all=new Set(),seen=new Set();
 for(const mapId of ['forest','jiuzhaigou']){g.mapId=mapId;for(const shore of fishingShores(g)){const lake=surfaceFishLake(mapId,shore.lake),pool=lakeFishPool(lake);assert.ok(pool.length>=6&&pool.length<=12);assert.ok(pool.filter(i=>FISH_SPECIES[i].tier===1).length>=2);pool.forEach(i=>{assert.ok(FISH_SPECIES[i].waters.includes(mapId));all.add(i);});seen.add(pool.join(','));assert.deepEqual(lakeFishPool(structuredClone(lake)),pool);
  const view={x:shore.lake.x-300,y:shore.lake.y-300,w:600,h:600},fish=surfaceAmbientFish(mapId,view,3).filter(f=>f.lakeId===shore.lake.id);for(const f of fish)assert.ok(pool.includes(f.species));const mirror=surfaceAmbientFish(mapId,{...view,x:view.x+WORLD.width},3).filter(f=>f.lakeId===shore.lake.id);assert.deepEqual(mirror.map(f=>f.species),fish.map(f=>f.species));
 }}assert.ok(seen.size>5);assert.equal(all.size,FISH_SPECIES.filter(f=>f.waters.includes('forest')||f.waters.includes('jiuzhaigou')).length);
});
test('地下天然湖、河、泉按楼层与区域区分，序列化后鱼群不变且缓存有界',()=>{
 const g=scene(),layer=g.progress.mining;layer.seed=1847;const view={x:0,y:0,w:1800,h:1800},fish=mineAmbientFish(layer,view,0,1);assert.ok(fish.length>0&&fish.length<=32);for(const f of fish){const lake=mineFishLake(layer,f,1);assert.equal(f.waterId,lake.id);assert.ok(lakeFishPool(lake).includes(f.species));assert.notEqual(mineFishLake(layer,f,2).id,lake.id);}
 assert.deepEqual(mineAmbientFish(structuredClone(layer),view,0,1),fish);
 const depths=new Set();for(let depth=1;depth<=80;depth++){const lake=mineFishLake(layer,fish[0],depth);depths.add(lakeFishPool(lake).join(','));}assert.ok(depths.size>50);
});
test('鱼群实际加权、所有候选都属于本湖；浮漂点按当前鱼群锁定，失败不扣饵',()=>{
 const g=scene();let preview;
 for(const shore of fishingShores(g)){Object.assign(g.player,shore);preview=fishingPreview(g);if(preview.schools.length)break;}assert.ok(preview.schools.length);const marked=preview.odds.find(e=>preview.schools.some(f=>f.species===e.index)),unmarked=preview.odds.find(e=>!preview.schools.some(f=>f.species===e.index));assert.ok(marked&&unmarked);
 assert.ok(marked.weight>fishCatchWeight(marked.fish,'star','bait',preview.lake.water));assert.equal(unmarked.weight,fishCatchWeight(unmarked.fish,'star','bait',preview.lake.water));assert.ok(preview.odds.every(e=>lakeFishPool(preview.lake).includes(e.index)));assert.ok(Math.abs(preview.odds.reduce((s,e)=>s+e.probability,0)-1)<1e-12);
 assert.ok(beginFishing(g).ok);fishingControl(g,'press');updateOutdoors(g,.5);const f=g.fishing,expected=lakeFishingContext(g,f.shore,fishingCastPoint(g,f.shore,f.charge),f.rodId,f.baitId);g.livingPersist=()=>false;assert.equal(fishingControl(g,'release'),false);assert.equal(g.progress.outdoors.bait,150);g.livingPersist=()=>true;fishingControl(g,'press');fishingControl(g,'release');assert.deepEqual(f.odds,expected.odds);assert.ok(f.odds.some(e=>e.index===f.species));assert.equal(g.progress.outdoors.bait,149);
});
test('四种力道有不同曲线和预告，所有百鱼都能正常控线到岸，暂停不推进',()=>{
 assert.equal(new Set(FISH_SPECIES.map(fishStruggleKind)).size,4);const sprint=FISH_SPECIES.find(f=>fishStruggleKind(f)==='sprint');assert.match(fishStruggle(sprint,1.6).warning,/蓄力/);assert.ok(fishStruggle(sprint,2.5).pull>fishStruggle(sprint,.5).pull);
 const g=scene();for(const fish of FISH_SPECIES){cast(g);g.fishing.species=FISH_SPECIES.indexOf(fish);g.fishing.size=fish.minSize;land(g);fishingControl(g,'cancel');}
 cast(g);g.state='paused';const before=structuredClone(g.fishing);updateOutdoors(g,1);assert.deepEqual(g.fishing,before);
});
test('接单、真实收鱼和领奖同事务；失败、旧鱼、放流、别湖不计数且重载保持',()=>{
 const g=scene();g.progress.outdoors.fish.carp=2;g.livingPersist=()=>false;assert.equal(acceptFishingSurvey(g).ok,false);assert.equal(g.progress.outdoors.surveys.active,null);g.livingPersist=()=>true;assert.ok(acceptFishingSurvey(g).ok);const id=g.progress.outdoors.surveys.active.lakeId;assert.equal(fishingSurveyProgress(g.progress.outdoors.surveys),0);
 cast(g);land(g);g.livingPersist=()=>false;assert.equal(finishFishing(g,true).ok,false);assert.equal(fishingSurveyProgress(g.progress.outdoors.surveys),0);g.livingPersist=()=>true;assert.ok(finishFishing(g,true).ok);assert.equal(fishingSurveyProgress(g.progress.outdoors.surveys),1);assert.equal(finishFishing(g,true).ok,false);
 g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.outdoors.surveys.active.lakeId,id);assert.equal(fishingSurveyProgress(g.progress.outdoors.surveys),1);cast(g);land(g);assert.ok(finishFishing(g,false).ok);assert.equal(fishingSurveyProgress(g.progress.outdoors.surveys),1);
 const original={x:g.player.x,y:g.player.y},other=fishingShores(g).find(s=>surfaceFishLake(g.mapId,s.lake).id!==id);Object.assign(g.player,other);cast(g);land(g);finishFishing(g,true);assert.equal(fishingSurveyProgress(g.progress.outdoors.surveys),1);Object.assign(g.player,original);
 for(let i=0;i<2;i++){cast(g);land(g);assert.ok(finishFishing(g,true).ok);}const coins=g.progress.coins;g.livingPersist=()=>false;assert.equal(claimFishingSurvey(g).ok,false);assert.equal(g.progress.coins,coins);g.livingPersist=()=>true;assert.ok(claimFishingSurvey(g).ok);assert.equal(g.progress.coins,coins+180);assert.equal(g.progress.outdoors.surveys.active,null);assert.equal(claimFishingSurvey(g).ok,false);
});
test('非法调查存档清理；重复鱼不增加多样性，指定鱼委托只计目标',async()=>{
 const {creditFishingSurvey}=await import('../src/progression/fishing/fishing-surveys.js');assert.deepEqual(normalizeFishingSurveys({active:{lakeId:'<img>'}}),{completed:0,active:null});const g=scene();g.progress.outdoors.surveys.completed=1;assert.ok(acceptFishingSurvey(g).ok);const state=g.progress.outdoors.surveys,id=state.active.lakeId;creditFishingSurvey(state,id,'carp');creditFishingSurvey(state,id,'carp');assert.equal(fishingSurveyProgress(state),1);creditFishingSurvey(state,id,'perch');assert.equal(fishingSurveyProgress(state),2);assert.ok(claimFishingSurvey(g).ok);assert.ok(acceptFishingSurvey(g).ok);const focus=g.progress.outdoors.surveys;creditFishingSurvey(focus,focus.active.lakeId,'unknown');assert.equal(fishingSurveyProgress(focus),0);creditFishingSurvey(focus,focus.active.lakeId,focus.active.target);assert.equal(fishingSurveyProgress(focus),1);assert.deepEqual(normalizeFishingSurveys(focus),focus);
});
