// 角色天赋验证正式报价属性与战斗入口，覆盖隔离、等级封顶、换人和耐久同步。
import test from 'node:test';
import assert from 'node:assert/strict';
import {HEROES} from '../src/config/heroes.js';
import {heroTalent,heroTalentMultiplier} from '../src/config/hero-talents.js';
import {weaponGrowth,heroGrowth} from '../src/config/economy.js';
import {effectiveWeapon,weaponDamage} from '../src/config/weapon-mods.js';
import {vehicleWeapon,vehicleDamage,vehicleMaxHp,vehicleSpeed} from '../src/config/vehicles.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {expeditionEquipment} from '../src/config/expedition.js';
import {Game} from '../src/core/game.js';
import {heroGrowthMarkup} from '../src/ui/hero-growth.js';
// 统一真实等级与初始部件，只改被比较的角色。
function progress(hero=0,level=10){const p=freshProgress();p.hero=hero;p.heroes.fill(level);p.weapons[2]=20;p.weapon=2;p.vehicleHulls[2]=20;p.vehicleIndex=2;p.vehicleWeapons[19]=20;p.vehicleLoadouts[2]=19;return validateProgress(p);}

test('角色天赋仅出战时生效，装甲养护固定，其余天赋随1/10/20级增强',()=>{
 const keys=new Set();for(let hero=0;hero<HEROES.length;hero++){
  const p=progress(hero),a=heroTalent(p,hero,1),b=heroTalent(p),c=heroTalent(p,hero,20);keys.add(b.stat);
  if(b.stat==='hullHealth'){assert.equal(a.bonus,.15);assert.equal(b.bonus,a.bonus);assert.equal(c.bonus,a.bonus);}
  else assert.ok(a.bonus>0&&b.bonus>a.bonus&&c.bonus>b.bonus);
  assert.equal(heroTalent(p,hero,100).bonus,c.bonus);
  const other=heroTalentMultiplier(p,'unrelated');assert.equal(other,1);
  assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(p))),p);
 }
 assert.equal(keys.size,6);assert.equal(heroTalentMultiplier({hero:2,heroes:[]},'hullHealth'),1);
});

test('手持伤害和车炮伤害只各算一次，普通炮塔不会继承手持射速或装填天赋',()=>{
 for(let hero=0;hero<HEROES.length;hero++){
  const p=progress(hero),w=effectiveWeapon(p,2),v=vehicleWeapon(p,19);p.vehicleWeapons[2]=20;const legacy=vehicleWeapon(p,2);
  const factor=HEROES[hero].bonus*weaponGrowth(20,p)*heroGrowth(10,p);
  assert.equal(weaponDamage(p),Math.round(7*factor*(hero===0?1.1:1)));
  assert.equal(vehicleDamage(p,19),Math.round(12*factor*(hero===5?1.1:1)));
  assert.equal(w.interval,.075/(hero===1?1.1:1));assert.equal(w.reloadTime,3/(hero===3?1.15:hero===6?1.12:1));assert.equal(w.magazineSize,80);
  assert.equal(v.interval,.065);assert.equal(v.reloadTime,3.1);assert.equal(legacy.interval,.075);assert.equal(legacy.reloadTime,3);
 }
});

test('车体天赋只改耐久或速度，远征百级装备不把角色天赋变成百级',()=>{
 const p=progress(2),plain=progress(0);assert.equal(vehicleMaxHp(p,500),Math.round(vehicleMaxHp(plain,500)*1.15));
 assert.equal(vehicleSpeed(p),vehicleSpeed(plain));p.hero=4;assert.equal(vehicleSpeed(p),vehicleSpeed(plain)*1.1);
 assert.equal(vehicleMaxHp(p,500),vehicleMaxHp(plain,500));
 const local=expeditionEquipment(p,{weapon:2,vehicle:2,turret:2,modules:[0,0,0]},100);assert.equal(heroTalent(local).level,10);
});

test('角色切换和升级即时作用，车体保持受损比例，损毁冷却和弹药不被刷新',async()=>{
 const p=progress();p.coins=p.wood=100000;const g=new Game(p,()=>.5);g.start();const hull=g.vehicle;
 g.livingPersist=()=>true;g.cottage={kind:'cottage',floor:3,residentTalk:2,outside:{x:g.player.x,y:g.player.y}};
 Object.assign(g.player,(await import('../src/config/cottage-residents.js')).RESIDENT_VISITOR);
 hull.hp=hull.maxHp*.4;hull.module.magazine.ammo=7;hull.module.magazine.remaining=1.2;
 assert.ok(g.transact('heroes',2,'equip'));assert.equal(hull.maxHp,vehicleMaxHp(g.progress,g.maxHp()));assert.ok(Math.abs(hull.hp/hull.maxHp-.4)<1e-9);
 assert.equal(g.transact('heroes',2,'upgrade'),false);assert.equal(hull.maxHp,vehicleMaxHp(g.progress,g.maxHp()));assert.ok(Math.abs(hull.hp/hull.maxHp-.4)<1e-9);
 g.cottage.floor=1;g.cottage.residentTalk=0;hull.hp=0;hull.cooldown=21;assert.ok(g.transact('heroes',0,'equip'));assert.equal(hull.hp,0);assert.equal(hull.cooldown,21);assert.equal(hull.module.magazine.ammo,7);assert.equal(hull.module.magazine.remaining,1.2);
});

test('卡片仅按武器与载具列最终加成，伤害天赋合并，未购买展示一级预览',()=>{
 const p=progress();const text=heroGrowthMarkup(p,0);
 assert.match(text,/武器加成<\/b>：伤害 \+109.8%/);assert.match(text,/载具加成<\/b>：机炮伤害 \+90.8%/);
 assert.doesNotMatch(text,/基础攻击|等级成长|下一级|每级|共通/);
 assert.match(heroGrowthMarkup(p,1),/射速 \+10%/);
 assert.match(heroGrowthMarkup(p,2),/最大耐久 \+15%/);
 assert.match(heroGrowthMarkup(p,3),/装填速度 \+15%/);
 assert.match(heroGrowthMarkup(p,4),/移动速度 \+10%/);
 assert.match(heroGrowthMarkup(p,5),/机炮伤害 \+193.8%/);
 p.heroes[2]=20;assert.match(heroGrowthMarkup(p,2),/最大耐久 \+15%（固定）/);
 p.heroes[1]=0;assert.match(heroGrowthMarkup(p,1),/1级预览/);
});

// 守护塔防通过局内快照部署，不能将角色手持天赋误加给所有支架。
test('守护局内部署不继承手持或载具专属天赋',()=>{
 for(const hero of [0,1,3,5]){const p=progress(hero);p.guardianUpgrades={rate:1,magazine:1,reload:1};
  assert.equal(heroTalentMultiplier(p,heroTalent(p).stat),1);
  const w=effectiveWeapon(p,2);assert.equal(w.interval,.075);assert.equal(w.reloadTime,3);
 }
});
