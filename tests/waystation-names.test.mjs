// 地标站名沿用真实目录和环面几何，重复名称以独立编号区分。
import test from 'node:test';
import assert from 'node:assert/strict';
import {waystationLandmarkName} from '../src/world/waystation-landmarks.js';
import {SETTLEMENTS} from '../src/config/settlements.js';
import {REGIONAL_CAMPS} from '../src/config/regional-camps.js';
import {MONSTER_CAMPS} from '../src/config/monster-camps.js';
import {WAYSTATION_NAMING} from '../src/config/waystations.js';
import {NATURAL_TERRAIN} from '../src/world/natural-terrain.js';
import {LAKE_VARIANTS} from '../src/world/landscape-variants.js';
import {WORLD} from '../src/world/coordinates.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {normalizeWaystations,randomWaystationName} from '../src/progression/navigation/waystations.js';
import {buildWaystation,waystationBuildReason} from '../src/core/navigation/waystations.js';

// 简单游戏夹具仍保留正式建筑、河水与农田的建站校验，不人为放开通行。
function scene(){return {progress:freshProgress(),player:{x:0,y:0,hp:120},mapId:'forest',state:'playing',trees:[],vehicle:{active:false}};}
// 在指定营地的真实范围内选择可建空地，允许第二站自动避开第一站间距。
function campSite(game,camp){for(let y=camp.y-300;y<=camp.y+300;y+=90)for(let x=camp.x-300;x<=camp.x+300;x+=90){Object.assign(game.player,{x,y});if(waystationLandmarkName(game.player)===camp.name&&!waystationBuildReason(game))return;}throw Error('营地建站空地缺失');}

test('主营地、五方营地和野外营地使用各自正式名称',()=>{
 const home=SETTLEMENTS[0];assert.equal(waystationLandmarkName({x:home.left+40,y:729}),home.name);
 assert.equal(waystationLandmarkName({x:home.left-WAYSTATION_NAMING.nearby+1,y:729}),home.name);
 for(const camp of REGIONAL_CAMPS)assert.equal(waystationLandmarkName(camp),camp.name);
 for(const id of ['snore-pine','berry-rumor','north-sapling']){const camp=MONSTER_CAMPS.find(c=>c.id===id);assert.equal(waystationLandmarkName(camp),camp.name);}
});

test('雪山和其他景观沿用名称，湖泊沿用正式形态名称',()=>{
 for(const feature of NATURAL_TERRAIN.earth){assert.equal(waystationLandmarkName(feature),feature.name);if(feature.kind==='snowpeak')assert.equal(waystationLandmarkName({x:feature.x,y:feature.y+feature.ry+100}),feature.name);}
 const lake=NATURAL_TERRAIN.lakes[0];assert.equal(waystationLandmarkName(lake),LAKE_VARIANTS.find(v=>v.id===lake.variant).name);
});

test('边缘营地与负坐标、周期镜像一致，邻里小院不会被远一点的主营地覆盖',()=>{
 const camp=SETTLEMENTS[0],point={x:camp.left+50,y:729},name=waystationLandmarkName(point);
 for(const shift of [-1,1])assert.equal(waystationLandmarkName({x:point.x+shift*WORLD.width,y:point.y-shift*WORLD.height}),name);
 const neighbors=SETTLEMENTS.find(c=>c.id==='neighbors');assert.equal(waystationLandmarkName({x:300,y:(neighbors.top+neighbors.bottom)/2}),neighbors.name);
 for(const point of [null,{x:NaN,y:0},{x:0,y:Infinity},{x:camp.left,y:729,mapId:'jiuzhaigou'}])assert.equal(waystationLandmarkName(point),'');
});

test('同营地的站点允许同名，编号、用途和读档不变且不消耗随机数',()=>{
 const game=scene(),camp=REGIONAL_CAMPS.find(c=>c.id==='snowcedar');game.random=()=>{throw Error('地标命名不应抽取随机数');};
 campSite(game,camp);const a=buildWaystation(game,{purpose:'camp'});assert.equal(a.ok,true);campSite(game,camp);const b=buildWaystation(game,{purpose:'fishing'});assert.equal(b.ok,true);
 assert.equal(a.site.name,camp.name);assert.equal(b.site.name,camp.name);assert.deepEqual([a.site.id,b.site.id],[1,2]);assert.deepEqual([a.site.purpose,b.site.purpose],['camp','fishing']);assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(game.progress))).waystations,game.progress.waystations);
});

test('旧随机站名迁为附近地标，历史自定义名称保留且不修改原始存档对象',()=>{
 const snow=NATURAL_TERRAIN.earth.find(s=>s.kind==='snowpeak'),random=randomWaystationName([],()=>0),raw={nextId:30,sites:[{id:7,name:random,purpose:'scenery',x:snow.x,y:snow.y+snow.ry+80},{id:8,name:'猫猫的看雪台',purpose:'fishing',x:snow.x+100,y:snow.y+snow.ry+80}]},before=structuredClone(raw),p=normalizeWaystations(raw);
 assert.equal(p.sites[0].name,'雪山');assert.equal(p.sites[1].name,'猫猫的看雪台');assert.equal(p.nextId,30);assert.deepEqual(p.sites.map(s=>s.id),[7,8]);assert.deepEqual(p.sites.map(s=>s.purpose),['scenery','fishing']);assert.deepEqual(raw,before);assert.deepEqual(normalizeWaystations(p),p);
});

test('无附近地标继续随机命名，读档不会重抽名称',()=>{
 const game=scene();let point=null;for(let y=9000;y<15000&&!point;y+=300)for(let x=15000;x<22000;x+=300){Object.assign(game.player,{x,y});if(!waystationLandmarkName(game.player)&&!waystationBuildReason(game)){point={x,y};break;}}
 assert.ok(point);let draws=0;game.random=()=>{draws++;return .25;};const result=buildWaystation(game);assert.equal(result.ok,true);assert.equal(draws,1);assert.equal(result.site.name,randomWaystationName([],()=>.25));assert.equal(normalizeWaystations(game.progress.waystations).sites[0].name,result.site.name);
});
