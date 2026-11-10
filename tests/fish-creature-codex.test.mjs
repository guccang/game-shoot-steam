// 生物图鉴回归：水内自然游鱼、成功入护记录、迁移与目录完整性。
import {FISH_SPECIES} from '../src/config/outdoors.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceAmbientFish,mineAmbientFish,AMBIENT_FISH_LIMIT} from '../src/world/ambient-fish.js';
import {NATURAL_TERRAIN,touchesLandform} from '../src/world/natural-terrain.js';
import {JIUZHAIGOU_LAKES} from '../src/world/jiuzhaigou.js';
import {mineSurfaceAt} from '../src/world/mine-surface.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {normalizeOutdoors} from '../src/progression/activities/outdoors.js';
import {CREATURE_ENTRIES,CREATURE_FISH,CREATURE_MONSTERS} from '../src/config/creature-codex.js';
import {Game} from '../src/core/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {finishFishing,sellOutdoorFish} from '../src/core/activities/outdoors.js';
// 使用真正自由巡林场景与原子保存，只准备上岸待结算鱼以隔离新增记录事务。
function caughtScene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';const g=new Game(p,()=>.4);g.state='playing';g.mainlineSpeech=null;g.cottage=null;g.vehicle.active=false;g.livingPersist=()=>true;g.fishing={phase:'landed',species:0,size:31.5};return g;}
// 鱼体取多个边缘点，验证持续游动而非出现一次，并避免游上岸。
test('两张地表地图未钓鱼也有游鱼，连续路径和鱼身保持水内',()=>{
 for(const [mapId,lakes] of [['forest',NATURAL_TERRAIN.lakes],['jiuzhaigou',JIUZHAIGOU_LAKES.filter(l=>l.kind==='lake')]]){let total=0;for(const lake of lakes){const view={x:lake.x-350,y:lake.y-350,w:700,h:700},first=surfaceAmbientFish(mapId,view,0);assert.ok(first.some(f=>f.lakeId===lake.id),lake.id+" 没有游鱼");total+=first.length;assert.ok(first.length<=AMBIENT_FISH_LIMIT);for(let time=0;time<=30;time+=3){const fish=surfaceAmbientFish(mapId,view,time);for(const f of fish){const home=lakes.find(l=>l.id===f.lakeId);for(let j=0;j<8;j++)assert.ok(touchesLandform(home,f.x+Math.cos(j*Math.PI/4)*(f.small?14:18),f.y+Math.sin(j*Math.PI/4)*(f.small?14:18)),mapId+' 鱼体离开水域');}if(first.length&&time===3)assert.notDeepEqual(fish,first);}}assert.ok(total>0,mapId+' 没有常态鱼');}
});
test('地下鱼来自真实开放水面，固定时钟可重复且数量有界',()=>{const layer=freshProgress().mining;layer.seed=1847;const view={x:0,y:0,w:1800,h:1800},a=mineAmbientFish(layer,view,0);assert.ok(a.length>0);assert.ok(a.length<=AMBIENT_FISH_LIMIT);assert.deepEqual(mineAmbientFish(layer,view,0),a);assert.notDeepEqual(mineAmbientFish(layer,view,5),a);for(let t=0;t<=30;t+=3)for(const f of mineAmbientFish(layer,view,t))for(let j=0;j<8;j++){const s=mineSurfaceAt(layer,f.x+Math.cos(j*Math.PI/4)*18,f.y+Math.sin(j*Math.PI/4)*18);assert.ok(s.open&&s.water);}});
test('成功收鱼才登记并返回弹窗信息，失败放流和重复提交不发记录',()=>{const g=caughtScene(),before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(finishFishing(g,true).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;const r=finishFishing(g,true);assert.deepEqual(r.catch,{id:'crucian',size:31.5,first:true});assert.equal(g.progress.outdoors.collection.crucian.count,1);assert.equal(g.progress.outdoors.collection.crucian.best,31.5);assert.equal(finishFishing(g,true).ok,false);g.fishing={phase:'landed',species:0,size:22};assert.equal(finishFishing(g,true).catch.first,false);assert.equal(g.progress.outdoors.collection.crucian.count,2);assert.equal(g.progress.outdoors.collection.crucian.best,31.5);g.fishing={phase:'landed',species:1,size:42};assert.ok(finishFishing(g,false).ok);assert.equal(g.progress.outdoors.collection.perch.count,0);});
test('出售和重载保留鱼种历史，旧档只迁移已知种类并清理非法值',()=>{const g=caughtScene();finishFishing(g,true);g.cottage={kind:'outdoor'};const wallet=g.progress.coins;assert.ok(sellOutdoorFish(g).ok);assert.equal(g.progress.coins-wallet,FISH_SPECIES.find(f=>f.id==='crucian').coins);assert.equal(g.progress.outdoors.fish.crucian,0);assert.equal(validateProgress(g.progress).outdoors.collection.crucian.count,1);const old=normalizeOutdoors({fish:{carp:2},collection:{perch:{count:-8,best:Infinity},unknown:{count:9}}});assert.equal(old.collection.carp.count,2);assert.equal(old.collection.carp.best,0);assert.equal(old.collection.perch.count,0);assert.equal(old.collection.perch.best,0);assert.equal(old.collection.unknown,undefined);});
test('图鉴包含全部鱼种与三类怪物，稳定键唯一且介绍齐全',()=>{assert.equal(CREATURE_FISH.length,100);assert.equal(CREATURE_MONSTERS.length,21);assert.equal(new Set(CREATURE_ENTRIES.map(e=>e.key)).size,CREATURE_ENTRIES.length);for(const e of CREATURE_ENTRIES)assert.ok(e.name&&e.description&&e.habitat&&e.tip&&e.portrait);for(const group of ['地表怪物','地下怪物','领主'])assert.ok(CREATURE_MONSTERS.some(e=>e.group===group));});
