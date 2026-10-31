// 清缴领主耐久实测：正式出生、射击、弹道与装填，固定站位以比较生命预算。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty} from '../src/config/waves.js';
import {clearingDifficulty} from '../src/config/clearing-difficulty.js';
import {clearingBossHealth} from '../src/config/clearing-boss.js';

// 测量持续有效射击的最快击败时间；排除躲避、地形及援兵转火，保留领主技能运行。
function fight({level=15,index=9,hull=null,health=null,round=7}={}){
 const p=freshProgress();p.bosses=round;p.weapon=index;p.weapons[index]=level;p.heroes[0]=level;
 if(hull!==null){p.vehicleHulls[hull]=level;p.vehicleIndex=hull;p.vehicleWeapons[17+hull]=level;p.vehicleLoadouts[hull]=17+hull;}
 const g=new Game(p,()=>.5);g.start();g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});
 g.wave=round*5+5;g.bossWave=g.wave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.bossReady=true;
 assert.ok(g.summonBoss());const b=g.boss;
 if(health!==null)b.hp=b.maxHp=health;
 const initial=b.maxHp;
 g.trees=[];g.enemies=[];g.workshopTrial=true;g.updateWaves=()=>{};g.hurt=()=>{};b.support.timer=999;
 if(hull!==null)g.vehicle.active=true;
 let seconds=0,casts=0,lastPhase='chase';
 while(g.boss&&seconds<90){
  Object.assign(g.player,{x:1600,y:400,pushX:0,pushY:0});
  Object.assign(b,{x:1720,y:400,pushX:0,pushY:0});
  g.update(1/60);seconds+=1/60;
  if(b.ai.phase==='cast'&&lastPhase!=='cast')casts++;lastPhase=b.ai.phase;
 }
 return {seconds,casts,initial,defeated:!g.boss};
}


// 步行对照版本9，战车对照版本10；只替换生命，攻击、弹道、装填与技能走正式实现。
for(const sample of [
 {name:'第六轮5级散弹枪',round:5,level:5,index:3,min:20,max:45},
 {name:'第八轮15级脉冲炮',round:7,level:15,index:9,min:18,max:40},
 {name:'第五轮5级散弹枪与战车集火',round:4,level:5,index:3,hull:0,min:8,max:22},
 {name:'第六轮5级散弹枪与战车集火',round:5,level:5,index:3,hull:0,min:10,max:35},
 {name:'第八轮15级加特林与战车集火',round:7,level:15,index:2,hull:0,min:12,max:30},
 {name:'第十轮15级加特林与战车集火',round:9,level:15,index:2,hull:0,min:20,max:45},
 {name:'第十三轮20级脉冲炮',round:12,level:20,index:9,min:30,max:65},
])test(sample.name+'能够经历领主技能且正常击败',t=>{
 const oldHp=sample.hull!==undefined?clearingBossHealth(sample.round):Math.round(Math.round(clearingDifficulty(sample.round).bossHealth*115/100)*1.5);
 const before=fight({...sample,health:oldHp}),after=fight(sample);
 assert.ok(before.defeated&&after.defeated);
 assert.ok(after.seconds>before.seconds*1.4&&after.seconds>=sample.min&&after.seconds<=sample.max,JSON.stringify(after));
 assert.ok(after.casts>=1,'应经历至少一次技能释放');
 t.diagnostic(JSON.stringify({round:sample.round+1,before,after}));
});

test('首轮仍为1122生命，升级装备继续缩短战斗',t=>{
 const base=fight({level:1,index:0,round:0}),upgraded=fight({level:5,index:0,round:0});
 assert.equal(base.initial,1122);assert.ok(base.defeated&&base.casts>=1);assert.ok(upgraded.defeated&&upgraded.seconds<base.seconds);
 t.diagnostic(JSON.stringify({base,upgraded}));
});
