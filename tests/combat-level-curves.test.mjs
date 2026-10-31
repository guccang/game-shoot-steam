// 通过正式属性工厂和实战更新验证越级、同级及载具等级隔离，不只检查公式自洽。
import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyLevelHealth} from '../src/config/combat-levels.js';
import {combatLevelTable,equipmentLevelTable,levelLoadout,measureLevelFight} from '../src/balance/combat-levels.js';
import {enemyIdentity} from '../src/world/biomes.js';
import {vehicleDamage,vehicleMaxHp} from '../src/config/vehicles.js';
import {weaponDamage} from '../src/config/weapon-mods.js';
import {Game} from '../src/core/game.js';
import {forestThreatAt} from '../src/world/forest-levels.js';
import {clearingDifficulty} from '../src/config/clearing-difficulty.js';

test('1至20级普通怪HP连续增长，同级手枪2至6发，加特林6至15颗',()=>{
 const rows=combatLevelTable();assert.deepEqual(rows.filter(r=>[1,5,10,15,20].includes(r.level)).map(r=>r.hp),[36,161,504,1447,3947]);
 for(const [i,r] of rows.entries()){
  assert.ok(r.pistolHits>=2&&r.pistolHits<=6);assert.ok(r.gatlingHits>=6&&r.gatlingHits<=15);
  if(i){assert.ok(r.hp>rows[i-1].hp);assert.ok(r.pistol>rows[i-1].pistol);assert.ok(r.gatling>=rows[i-1].gatling);}
  assert.equal(enemyIdentity(0,0,0,'forest',r.level).hp,r.hp);
 }
});

test('所有枪械、载具主炮、猫的成长单调且有限；无炮载具没有虚构火力',()=>{
 const table=equipmentLevelTable();
 for(const row of [...table.weapons,...table.vehicles,...table.heroes]){
  const values=row.damage||row.pistol;
  if(values[0]===null){assert.ok(values.every(v=>v===null));continue;}
  assert.ok(values.every((n,i)=>Number.isSafeInteger(n)&&n>0&&(!i||n>=values[i-1])));
 }
});

test('车体只加耐久，主炮只读取自己的等级，手持升级不免费升级车炮',()=>{
 const p=levelLoadout({heroLevel:5,turretLevel:3}),damage=vehicleDamage(p,17),hp=vehicleMaxHp(p,230);
 p.vehicleHulls[0]=20;assert.equal(vehicleDamage(p,17),damage);assert.ok(vehicleMaxHp(p,230)>hp);
 p.weapons[0]=20;assert.equal(vehicleDamage(p,17),damage);
 p.vehicleWeapons[17]=10;assert.ok(vehicleDamage(p,17)>damage);
 const hand=weaponDamage(p,0);p.vehicleHulls[0]=1;assert.equal(weaponDamage(p,0),hand);
});

test('真实野外20级怪使用新HP；换枪与刷新存档不自动抬高怪物等级属性',()=>{
 let point;for(let x=0;x<16000&&!point;x+=400)for(let y=0;y<12000;y+=400)if(forestThreatAt(x,y).level===20){point={x,y};break;}
 assert.ok(point,'必须采到地图真实20级带');
 const g=new Game(levelLoadout(),()=>.5);g.state='playing';const a=g.spawnEnemy(0,0,point,{ambient:true});
 assert.equal(a.level,20);assert.equal(a.maxHp,3947);
 g.progress.weapons[2]=20;g.progress.weapon=2;g.progress.heroes[0]=20;
 const b=g.spawnEnemy(0,0,point,{ambient:true});assert.equal(b.maxHp,a.maxHp);
 const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);assert.equal(restored.spawnEnemy(0,0,point,{ambient:true}).maxHp,a.maxHp);
});

test('复现案例：3级手枪/5级猫不能四发杀20级怪，15级加特林也不能秒杀',()=>{
 const pistol=measureLevelFight({weapon:0,weaponLevel:3,heroLevel:5}),gatling=measureLevelFight({weapon:2,weaponLevel:15,heroLevel:5});
 assert.equal(pistol.damage,40);assert.equal(pistol.hits,99);assert.ok(pistol.seconds>=45&&pistol.seconds<65);
 assert.equal(gatling.damage,64);assert.equal(gatling.hits,62);assert.ok(gatling.seconds>=4&&gatling.seconds<6);
 // 固定种子开启正常暴击后仍不能回到几发秒杀。
 const crit=measureLevelFight({weapon:2,weaponLevel:15,heroLevel:5,critical:true});assert.ok(crit.seconds>=3&&crit.seconds<7);
});

test('同级满级装备有清晰收益；高等级打低等级保留碾压',()=>{
 const pistol=measureLevelFight({weapon:0,weaponLevel:20,heroLevel:20}),gatling=measureLevelFight({weapon:2,weaponLevel:20,heroLevel:20});
 assert.equal(pistol.hits,6);assert.ok(pistol.seconds>2&&pistol.seconds<4);
 assert.equal(gatling.hits,15);assert.ok(gatling.seconds>1&&gatling.seconds<2);
 const lower=measureLevelFight({weapon:0,weaponLevel:20,heroLevel:20,enemyLevel:5});assert.equal(lower.hits,1);
});

test('主炮真实开火保持机枪、重炮和火神差异，猫与主炮同级可有效对抗20级怪',()=>{
 const machine=measureLevelFight({kind:'vehicle',vehicle:0,turretLevel:20,heroLevel:20});
 const heavy=measureLevelFight({kind:'vehicle',vehicle:1,turretLevel:20,heroLevel:20});
 const vulcan=measureLevelFight({kind:'vehicle',vehicle:2,turretLevel:20,heroLevel:20});
 assert.equal(machine.hits,7);assert.ok(machine.seconds>.8&&machine.seconds<1.5);
 assert.equal(heavy.hits,1);assert.equal(vulcan.hits,10);assert.ok(vulcan.seconds>.5&&vulcan.seconds<1);
});

test('清缴后期生命跟上显示等级，开局预算和30轮封顶仍然有效',()=>{
 assert.equal(clearingDifficulty(0).health,1);assert.equal(clearingDifficulty(4).health,4.8);
 assert.ok(36*clearingDifficulty(19).health>=enemyLevelHealth(20)-.5);
 assert.deepEqual(clearingDifficulty(30),clearingDifficulty(300));
});
