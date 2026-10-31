// 战斗载具获取后的清缴耐久：永久所有权、开战快照、旧档迁移与模式隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {clearingBossHealth,CLEARING_BOSS_HEALTH_VERSION} from '../src/config/clearing-boss.js';
import {capturePatrol} from '../src/core/patrol-session.js';

// 仅准备五波结束状态，领主属性和存档仍由正式入口创建。
function challenge({round=4,hull=null}={}){
 const p=freshProgress();p.bosses=round;
 if(hull!==null)p.vehicleHulls[hull]=1;
 const g=new Game(p,()=>.5);g.start();g.progress.living.patrolActive=true;
 Object.assign(g.player,{x:1600,y:400});g.wave=round*5+5;g.bossWave=g.wave;g.bossReady=true;
 assert.ok(g.summonBoss());return g;
}

test('只有永久带武器载具触发阶段增幅，电动车、借装和单独炮塔不触发',()=>{
 const base=clearingBossHealth(4),p=freshProgress();p.storyHull=360;p.storyTurretDamage=5;p.vehicleWeapons[17]=10;
 assert.equal(clearingBossHealth(4,p),base);
 for(let index=0;index<COLLECTED_VEHICLES.length;index++){
  const owned=freshProgress();owned.vehicleHulls[index]=1;
  assert.equal(clearingBossHealth(4,owned),base*(COLLECTED_VEHICLES[index].unarmed?1:3),COLLECTED_VEHICLES[index].id);
 }
});

test('前七轮获得战车后为三倍，第八轮起为1.5倍且血量持续增长',()=>{
 const p=freshProgress();p.vehicleHulls[0]=1;let previous=0;
 for(let round=0;round<=31;round++){
  const hp=clearingBossHealth(round,p);assert.equal(hp,Math.round(clearingBossHealth(round)*(round<7?3:1.5)));
  assert.ok(hp>=previous);previous=hp;
 }
 const onFoot=challenge(),vehicle=challenge({hull:0});
 assert.equal(vehicle.boss.maxHp,onFoot.boss.maxHp*3);
 for(const field of ['damage','blastDamage','speed','kind'])assert.equal(vehicle.boss[field],onFoot.boss[field]);
});

test('战车上下车、升级、刷新和死亡重试均沿用本次挑战快照',()=>{
 let g=challenge({hull:0});const max=g.boss.maxHp;g.boss.hp=max*.4;
 g.progress.vehicleHulls[0]=15;g.progress.vehicleIndex=5;g.vehicle.active=false;
 g.progress.patrol=capturePatrol(g);g=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
 assert.equal(g.boss.maxHp,max);assert.equal(g.boss.hp,max*.4);
 g.start();g.hurt(1e9);g.start();Object.assign(g.player,{x:1600,y:400});assert.ok(g.summonBoss());assert.equal(g.boss.maxHp,max);
});

test('版本10车主存档按剩余比例迁移一次，不增加伤害或重复放大奖励',()=>{
 for(const round of [4,7,9]){
  const g=challenge({round,hull:0});g.progress.patrol=capturePatrol(g);const raw=structuredClone(g.progress);
  Object.assign(raw.bossChallenge,{clearingHealthVersion:10,maxHp:clearingBossHealth(round)});raw.patrol.bossHp=raw.bossChallenge.maxHp*.4;
  const saved=validateProgress(raw);assert.equal(saved.bossChallenge.maxHp,clearingBossHealth(round,saved));
  assert.ok(Math.abs(saved.patrol.bossHp-saved.bossChallenge.maxHp*.4)<1e-8);
  assert.equal(saved.bossChallenge.clearingHealthVersion,CLEARING_BOSS_HEALTH_VERSION);
  for(const field of ['coins','wood','bosses'])assert.equal(saved[field],raw[field]);
  assert.deepEqual(validateProgress(saved),saved);
 }
});

test('开战后获得载具只影响下一次新挑战，其他地图保留原生命规则',()=>{
 let g=challenge();const before=g.boss.maxHp;g.progress.vehicleHulls[0]=1;g.progress.patrol=capturePatrol(g);
 g=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);assert.equal(g.boss.maxHp,before);
 g.hit(g.boss,1e9);g.start();g.progress.living.patrolActive=true;g.bossReady=true;assert.ok(g.summonBoss());
 assert.equal(g.boss.maxHp,clearingBossHealth(g.progress.bosses)*3);
 const raw=structuredClone(g.progress);raw.mapId='jiuzhaigou';raw.patrol=capturePatrol(g);
 raw.bossChallenge.clearingHealthVersion=10;raw.bossChallenge.maxHp=2000;raw.patrol.bossHp=800;
 const restored=validateProgress(raw);assert.equal(restored.bossChallenge.maxHp,2000);assert.equal(restored.patrol.bossHp,800);
});
