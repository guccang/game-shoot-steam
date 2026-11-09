// 新手清缴回归：位置不再叠加强度，历史任务续档及独立玩法保持隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {BIOMES,enemyIdentity} from '../src/world/biomes.js';
import {waveDifficulty} from '../src/config/waves.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {clearingEnemyHealth,clearingEnemyDamage} from '../src/config/clearing-damage.js';
import {clearingEnemyLevel} from '../src/config/clearing-difficulty.js';

// 使用固定抽签和正式工厂，在各区域逐个名额比较相同兵种。
function scene(rounds=0){
 const progress=freshProgress();progress.bosses=rounds;
 const game=new Game(progress,()=>.99);game.start();return game;
}
// 隔离上一只怪物，避免同屏特殊兵种上限改变本次比较。
function spawn(game,point,wave,ordinal,context=null){
 Object.assign(game.player,{x:point.x,y:point.y});game.wave=wave;game.waveSpawned=ordinal-1;game.nextId=1;game.enemies=[];
 return game.spawnEnemy(0,0,{x:point.x,y:point.y},context);
}
// 只取玩法属性，允许当地团子继续沿用区域配色。
function stats(enemy){return {level:enemy.level,hp:enemy.hp,damage:enemy.damage,speed:enemy.speed,reward:enemy.reward,species:enemy.species,rank:enemy.rank};}

test('首轮至后期五波所有兵种跨区域强度一致，初始手枪面对一级基础怪',()=>{
 const game=scene();
 for(const rounds of [0,1,7,30]){
  game.progress.bosses=rounds;
  for(let step=1;step<=5;step++){
   const wave=rounds*5+step;
   for(let ordinal=1;ordinal<=waveDifficulty(wave).total;ordinal++){
    const expected=stats(spawn(game,BIOMES[0],wave,ordinal));assert.equal(expected.level,rounds+1);
    for(const point of BIOMES.slice(1))assert.deepEqual(stats(spawn(game,point,wave,ordinal)),expected);
   }
  }
 }
 game.progress.bosses=0;
 const first=spawn(game,BIOMES[2],1,1);assert.equal(first.rank,0);assert.ok(first.hp<=enemyIdentity(BIOMES[0].x,BIOMES[0].y,0,'forest',1).hp);
});

test('领主援军不叠加区域难度，野外遭遇与剧情秘境仍保留原等级',()=>{
 const game=scene(7);
 const support=stats(spawn(game,BIOMES[0],5,1,{bossOwner:7}));
 assert.equal(support.level,8);
 for(const point of BIOMES.slice(1))assert.deepEqual(stats(spawn(game,point,5,1,{bossOwner:7})),support);
 const point=BIOMES[3],expected=enemyIdentity(point.x,point.y,.99).level;assert.ok(expected>=7);
 assert.equal(spawn(game,point,1,1,{ambient:true}).level,expected);
 for(const mode of ['story','realm','campDefense','workshopTrial']){
  game[mode]={};assert.equal(spawn(game,point,1,1).level,expected,mode);game[mode]=null;
 }
});

test('清缴等级只随胜场递增，五批共享等级且不再叠加基础等级属性或奖励',()=>{
 const g=scene(),point=BIOMES[0];
 for(const round of [0,1,4,19,30])for(let batch=1;batch<=5;batch++){
  g.progress.bosses=round;const wave=round*5+batch,e=spawn(g,point,wave,1);
  assert.equal(e.level,round+1);
  // 第一个出生名额固定为普通团子，阶级沿用工厂选择以核对原预算。
  const ranked=enemyIdentity(point.x,point.y,e.rank===2?1:e.rank===1?.8:0,'forest',1);
  assert.equal(e.hp,Math.round(ranked.hp*clearingEnemyHealth(round,wave)));
  assert.equal(e.damage,clearingEnemyDamage(ranked.damage,round,wave));
  assert.equal(e.speed,ranked.speed);assert.equal(e.reward,ranked.reward);
 }
 for(const invalid of [-1,NaN,Infinity])assert.equal(clearingEnemyLevel(invalid),1);
 assert.equal(clearingEnemyLevel(2.9),3);
});

test('旧档高等级清缴地点保持进度，继续生成怪物时使用修复后的基础强度',()=>{
 const game=scene(),point=BIOMES[2];
 game.progress.living.patrolActive=true;
 game.progress.living.clearingSite={id:'patrol-clearing',mapId:'forest',name:'本次清缴地点',x:point.x,y:point.y,radius:300,origin:{x:810,y:965}};
 Object.assign(game.player,{x:point.x,y:point.y});game.wave=4;game.waveGroupStart=1;game.bossWave=5;game.waveKills=2;game.waveSpawned=2;
 const progress=validateProgress({...game.progress,patrol:capturePatrol(game)});
 const loaded=new Game(progress,()=>.99);loaded.start();
 assert.equal(loaded.wave,4);assert.equal(loaded.waveKills,2);assert.deepEqual(loaded.progress.living.clearingSite,game.progress.living.clearingSite);
 assert.equal(loaded.progress.bosses,0);assert.equal(spawn(loaded,point,4,3).level,1);
});
