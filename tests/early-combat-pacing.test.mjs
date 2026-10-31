// 新手战斗节奏：用正式出生、射击和装填验证耗时，并守住玩法隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty} from '../src/config/waves.js';

// 固定抽签与测试位置；数值仍由正式怪物工厂生成。
function target(round=0,step=4,ordinal=4,context=null,mode=null){
 const p=freshProgress();p.bosses=round;const g=new Game(p,()=>.5);g.start();
 Object.assign(g.player,{x:1600,y:400});g.wave=round*5+step;g.waveSpawned=ordinal-1;g.enemies=[];
 if(mode)g[mode]=true;
 const enemy=g.spawnEnemy(0,0,{x:1720,y:400},context);return {g,enemy};
}
// 固定相同射程排除追敌耗时，保留真实伤害、弹丸、后坐和换弹。
function firingTime(oldHealth=null){
 const {g,enemy}=target();if(oldHealth!==null)enemy.hp=enemy.maxHp=oldHealth;
 g.workshopTrial=true;g.updateWaves=()=>{};g.hurt=()=>{};g.trees=[];let time=0;
 while(enemy.hp>0&&time<20){Object.assign(g.player,{x:1600,y:400,pushX:0,pushY:0});Object.assign(enemy,{x:1720,y:400,pushX:0,pushY:0});g.update(1/60);time+=1/60;}
 assert.ok(enemy.hp<=0);return time;
}
test('首轮重装持续射击耗时明显缩短，仍比普通怪耐打',t=>{
 const before=firingTime(220),after=firingTime();assert.ok(after<before*.65);assert.ok(after>1.5&&after<4);
 assert.equal(target().enemy.hp,100);assert.equal(target(0,4,1).enemy.hp,34);
 t.diagnostic(JSON.stringify({before,after}));
});
test('前两轮减免，第三轮和后期恢复原强度；伤害、移速和编成不变',()=>{
 const first=target().enemy,second=target(1).enemy,third=target(2).enemy;
 assert.equal(second.hp,229);assert.equal(third.hp,415);assert.equal(target(7).enemy.hp,2002);
 assert.equal(first.damage,third.damage);assert.equal(first.speed,third.speed);assert.equal(first.species,third.species);
 assert.deepEqual([1,2,3,4,5].map(w=>waveDifficulty(w).total),[2,4,6,8,10]);
 const {g}=target();g.progress.weapons[0]=10;g.progress.heroes[0]=10;g.waveSpawned=3;g.enemies=[];g.recoveryRun=true;
 assert.equal(g.spawnEnemy(0,0,{x:1720,y:400}).hp,100);
});
test('野外遭遇和独立玩法不套用清缴减免',()=>{
 const ambient=target(0,4,1,{ambient:true}).enemy;assert.equal(ambient.hp,target(7,4,1,{ambient:true}).enemy.hp);
 for(const mode of ['workshopTrial','story','realm','campDefense']){
  const {g,enemy}=target(0,4,4,null,mode);g.progress.bosses=7;g.waveSpawned=3;g.enemies=[];
  assert.equal(g.spawnEnemy(0,0,{x:1720,y:400}).hp,enemy.hp,mode);
 }
});
