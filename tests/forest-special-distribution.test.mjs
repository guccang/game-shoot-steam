// 地面混编与全图任务：真实出生、拒马伤害、等级带与持久化。
import test from 'node:test';import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {mixedDumpling,SPECIAL_DUMPLING_QUOTAS} from '../src/config/special-dumpling-spawns.js';
import {dumplingHabitatAt} from '../src/world/dumpling-habitats.js';
import {chooseClearingSite} from '../src/core/story/clearing-site.js';
import {normalizeClearingSite} from '../src/progression/story/clearing-site.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {FOREST_LEVEL_ORIGIN,FOREST_LEVEL_BANDS,forestThreatAt} from '../src/world/forest-levels.js';
import {worldDistance} from '../src/world/coordinates.js';
import {CAMP_GATES,campDefenseWave} from '../src/config/camp-defense.js';
import {startCampDefense,updateCampDefense} from '../src/core/camp/camp-defense.js';
import {updateEnemyBolts} from '../src/combat/ranged-enemies.js';
// 保留真实地图和随机序列，只略过剧情准备状态。
function scene(level=1,seed=9){const p=freshProgress();p.bosses=level-1;const g=new Game(p,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));g.start();g.mainlineSpeech=null;g.vehicle.active=false;Object.assign(g.player,CLEARING_APPROACH);return g;}
const plain={x:1500,y:1500};
test('普通森林低频陆生混编，各类可选齐且各模式同屏上限生效',()=>{assert.equal(dumplingHabitatAt(plain),null);for(const [mode,q] of Object.entries(SPECIAL_DUMPLING_QUOTAS)){const chosen=[];for(let i=1;i<=120;i++){const p=mixedDumpling(plain,i,mode);if(p)chosen.push(p);}assert.equal(chosen.length,120/q.every);assert.ok(chosen.every(p=>p.habitat!=='lake'));const active=Array.from({length:q.alive},()=>({hp:1,dumplingVariant:'fern'}));assert.equal(mixedDumpling(plain,q.every+q.offset,mode,active),null);}const ids=new Set();for(let i=0;i<12;i++)ids.add(mixedDumpling(plain,12,'field',[],()=>i/12).id);assert.equal(ids.size,12);});
test('正式森林遭遇与清缴工厂穿插特殊团子，数量和原阵容保留',()=>{const g=scene();g.random=()=>.99;g.enemies=[];let field=0;for(let i=0;i<24;i++){g.encounterSpawned=i;const e=g.spawnEnemy(0,0,plain,{ambient:true,rangedEncounter:true});if(e.dumplingVariant)field++;g.enemies=[];}assert.equal(field,2);g.wave=1;g.waveSpawned=0;for(let i=0;i<24;i++)g.spawnEnemy(0,0,plain);assert.equal(g.enemies.length,24);assert.equal(g.enemies.filter(e=>e.dumplingVariant).length,3);for(const context of [{ambient:true},{ambient:true,escortWave:1,escortOrdinal:3},{bossOwner:1},{ordinaryDumpling:true}]){g.enemies=[];g.waveSpawned=2;g.encounterSpawned=11;assert.equal(g.spawnEnemy(0,0,plain,context).dumplingVariant,undefined);}});
test('兽潮使用正式出生和数值，特殊怪不增加波次数量，直射与落砸可伤拒马',()=>{const g=scene();g.progress.restoration.repaired.push('defense');Object.assign(g.player,CAMP_GATES[0]);assert.ok(startCampDefense(g,CAMP_GATES[0].id));const r=g.campDefense;r.timer=0;for(let i=0;i<15;i++){r.spawnTimer=0;updateCampDefense(g,.01);}assert.equal(r.spawned,15);assert.equal(g.enemies.length,15);assert.equal(g.enemies.filter(e=>e.dumplingVariant).length,3);for(const e of g.enemies)assert.equal(e.hp,campDefenseWave(1).hp);const owner=g.enemies.find(e=>e.dumplingVariant);g.trees=[];const p={...r.barrier};Object.assign(g.player,{x:p.x+500,y:p.y+500});const hp=r.gateHp;
for(const splash of [0,40]){g.enemyBolts=[{owner:owner.id,campBarrier:true,x:p.x-20,y:p.y,dx:1,dy:0,speed:100,radius:4,remaining:20,damage:10,age:0,splash,endX:p.x,endY:p.y}];updateEnemyBolts(g,.2,g.player,[]);}assert.equal(r.gateHp,hp-20);});
for(const level of [4,9,15,20,30])test(`清缴${level}级落在对应全图等级带，存档不丢远点`,()=>{const g=scene(level),band=FOREST_LEVEL_BANDS.find(b=>b.max>=level)||FOREST_LEVEL_BANDS.at(-1);let route;const site=chooseClearingSite(g,r=>route=r);assert.ok(site);assert.ok(route.reachable);assert.ok(worldDistance(site,FOREST_LEVEL_ORIGIN)>=band.from+300);assert.ok(forestThreatAt(site.x,site.y).level<=level);assert.deepEqual(normalizeClearingSite(site),site);g.progress.living.clearingSite=site;g.progress.living.patrolActive=true;assert.deepEqual(validateProgress(g.progress).living.clearingSite,site);});
