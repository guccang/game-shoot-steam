// 清缴成长校准：读取正式装备属性，使用真实射击、装填和主炮测量固定站位输出。
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty} from '../src/config/waves.js';
import {weaponGrowth,heroGrowth} from '../src/config/economy.js';
import {vehicleDamage} from '../src/config/vehicles.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {clearingDifficulty} from '../src/config/clearing-difficulty.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// 固定升级样本是校准条件，不代表每位玩家在对应轮数必然拥有这些装备。
export const CLEARING_AUDIT_BUILDS=[
 {round:1,level:1,weapon:0},{round:2,level:3,weapon:0},{round:3,level:5,weapon:3},
 {round:5,level:7,weapon:2},{round:8,level:10,weapon:8},{round:13,level:15,weapon:9},
 {round:21,level:20,weapon:9},{round:31,level:20,weapon:9},
];

// 排除走位和援兵转火，只测有效命中条件下的击杀时间；角色生命与装甲另用真实属性报告承伤次数。
export function sampleClearingGrowth({round,level,weapon},mounted=false){
 const p=freshProgress();p.bosses=round-1;p.weapon=weapon;p.weapons[weapon]=level;p.heroes[0]=level;
 p.vehicleIndex=0;p.vehicleHulls[0]=level;grantVehicleArmament(p,0);p.vehicleWeapons[17]=level;
 const g=new Game(p,()=>.5);g.start();g.progress.living.patrolActive=true;
 Object.assign(g.player,{x:1600,y:400});g.wave=round*5;g.bossWave=g.wave;
 g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.bossReady=true;
 if(!g.summonBoss())throw Error('校准领主生成失败');
 const b=g.boss,initial=b.maxHp,skill=b.blastDamage,scale=clearingDifficulty(round-1);
 const stats={round,level,weapon:g.weapon().name,mounted,damage:g.damage(),turretDamage:vehicleDamage(p,17),
  growth:+(weaponGrowth(level,p)*heroGrowth(level,p)).toFixed(3),heroHp:g.maxHp(),armor:g.vehicle.maxHp,
  bossHp:initial,bossSkill:skill,heroSkillHits:Math.ceil(g.maxHp()/skill),armorSkillHits:Math.ceil(g.vehicle.maxHp/skill),
  enemyHealthScale:scale.health,enemyDamageScale:scale.damage};
 g.trees=[];g.enemies=[];g.workshopTrial=true;g.vehicle.active=mounted;b.support.timer=999;
 // 纯输出测量不让受击与刷怪干扰；技能时钟仍由正式运行时推进。
 g.hurt=()=>{};g.updateWaves=()=>{};
 let seconds=0,casts=0,last='chase';
 while(g.boss&&seconds<180){
  Object.assign(g.player,{x:1600,y:400,pushX:0,pushY:0});Object.assign(b,{x:1720,y:400,pushX:0,pushY:0});
  g.update(1/60);seconds+=1/60;
  if(b.ai.phase==='cast'&&last!=='cast')casts++;last=b.ai.phase;
 }
 return {...stats,seconds:+seconds.toFixed(2),casts,defeated:!g.boss};
}

// 命令行导出完整样本，失败样本明确保留，不过滤后假报平均耗时。
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const rows=CLEARING_AUDIT_BUILDS.flatMap(build=>[sampleClearingGrowth(build),sampleClearingGrowth(build,true)]);
 const path=process.argv[2]||'output/clearing-growth/audit.json';mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,JSON.stringify({assumption:'固定站位、无部件加成、无暴击、排除受伤与转火；不是完整清缴耗时或通关率。',rows},null,2));
 console.log(JSON.stringify(rows));
}
