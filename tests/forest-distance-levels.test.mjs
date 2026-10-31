// 森林距离等级覆盖所有方向与循环边界，脚本固定等级和其他地图保持独立。
import test from 'node:test';
import assert from 'node:assert/strict';
import {forestThreatAt,FOREST_LEVEL_ORIGIN as camp} from '../src/world/forest-levels.js';
import {enemyIdentity,BIOMES} from '../src/world/biomes.js';
import {WORLD} from '../src/world/coordinates.js';
import {TOWN_LAYOUT} from '../src/config/town-layout.js';
import {REGION_SIGNPOSTS} from '../src/world/signposts.js';
import {Game,freshProgress} from '../src/game.js';
import {monsterCampTerritoryAt} from '../src/config/monster-camps.js';

test('城镇周边保持1–3级，怪物营地区域跟随营地等级，西门不跳到10级',()=>{
 for(let angle=0;angle<Math.PI*2;angle+=Math.PI/16)for(const radius of [600,900,1499]){const x=camp.x+Math.cos(angle)*radius,y=camp.y+Math.sin(angle)*radius,level=enemyIdentity(x,y,.5).level,territory=monsterCampTerritoryAt(x,y);
  // 野外营地周边是明确的局部等级区域；其余城镇近郊继续受原1–3级带约束。
  if(territory)assert.equal(level,forestThreatAt((territory.levelOrigin||territory).x,(territory.levelOrigin||territory).y).level);else assert.ok(level>=1&&level<=3);
 }
 // 扩建后的西门可能接近固定营地，维持其原等级，周期镜像不能额外跳级。
 for(const x of [-400,-100,TOWN_LAYOUT.bounds.left-60]){const t=monsterCampTerritoryAt(x,camp.y),origin=t?.levelOrigin||t;assert.equal(enemyIdentity(x,camp.y).level,forestThreatAt(origin?.x??x,origin?.y??camp.y).level);assert.equal(enemyIdentity(x+WORLD.width,camp.y).level,enemyIdentity(x,camp.y).level);}
});

test('向远处移动等级单调增加，整个循环地图覆盖1到20级',()=>{
 const levels=new Set();for(let x=0;x<WORLD.width;x+=200)for(let y=0;y<WORLD.height;y+=200){const n=enemyIdentity(x,y).level;assert.ok(n>=1&&n<=20);levels.add(n);}
 assert.deepEqual([...levels].sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i+1));
 for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.25]){let before=0;for(let radius=0;radius<4100;radius+=50){const level=forestThreatAt(camp.x+Math.cos(angle)*radius,camp.y+Math.sin(angle)*radius).level;assert.ok(level>=before);before=level;}}
});

test('同一地点的世界镜像、HUD等级带及路牌共享规则，固定关卡等级不受影响',()=>{
 for(const [x,y]of [[-200,700],[3000,5000],[6000,4900]])for(const [dx,dy]of [[0,0],[WORLD.width,WORLD.height],[-WORLD.width,-WORLD.height]])assert.equal(enemyIdentity(x+dx,y+dy).level,enemyIdentity(x,y).level);
 for(const sign of REGION_SIGNPOSTS)assert.equal(sign.zone.range,forestThreatAt(sign.x,sign.y).range);
 for(const zone of BIOMES)assert.equal(zone.level,forestThreatAt(zone.x,zone.y).level);
 assert.equal(enemyIdentity(6000,5000,.5,'forest',1).level,1);
 const g=new Game(freshProgress(),()=>.5);g.start();Object.assign(g.player,{x:-100,y:700});const e=g.spawnEnemy(0,0,{x:-200,y:700},{ambient:true});assert.ok(e.level<=3);
});
