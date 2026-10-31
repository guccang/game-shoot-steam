// 守护升级面板、独立挂载、车辆迁移与混合怪潮使用正式事务验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {validateRealms} from '../src/progression/realm-progress.js';
import {updateRealm} from '../src/core/realm-manager.js';
import {updateGuardianDefenses} from '../src/core/guardian-defense.js';
import {guardianPads} from '../src/config/guardian.js';
import {guardianWeaponStats} from '../src/config/guardian-equipment.js';
import {vehicleDamage} from '../src/config/vehicles.js';
import {guardianMarkup,guardianEquipment,guardianStatusMarkup} from '../src/ui/panels/guardian.js';

// 测试场解锁全部枪械，不改写正式新手配置。
function setup() {
  const g=new Game(undefined,()=>.45);g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);
  g.enterRealm('guardian');g.realm.realmCoins=5000;return g;
}

test('格位目录与事务都只接受枪械，详情只有一个关闭入口并列出真实能力',()=>{
  const g=setup();assert.ok(guardianEquipment(g.progress).every(o=>o.kind==='weapon'));
  for(const index of [0,1,2,3])assert.equal(g.guardianDefense('deploy',0,'vehicle',index,0),false);
  assert.equal(g.realm.realmCoins,5000);assert.ok(g.guardianDefense('deploy',0,'weapon',4));
  const html=guardianMarkup(g,{slot:0,selection:null,message:''});
  assert.equal((html.match(/data-guardian-close/g)||[]).length,1);assert.ok(!html.includes('data-guardian-back'));
  for(const label of ['攻击 / 单发','攻速','弹夹','换弹时间','射程','每发弹丸','升级后'])assert.ok(html.includes(label));
  const status=guardianStatusMarkup(g);assert.match(status,/秘境币/);assert.match(status,/女神 HP/);assert.match(status,/4940/);
});

test('能力预览匹配升级后的真实火力，含改装、祝福与浮游炮每槽挂载',()=>{
  const g=setup();g.progress.mastery.fill(50);g.progress.mods.fill(1);g.realm.buffs={power:2,haste:1,reach:1};
  for(const [slot,index] of [[0,0],[1,3],[2,9],[3,12],[4,13]]){
    g.guardianDefense('deploy',slot,'weapon',index);
    const tower=g.realm.defenses.find(t=>t.slot===slot);
    if(index===12)assert.ok(g.guardianDefense('mount',slot,'weapon',0,6));
    const preview=guardianWeaponStats(g.progress,tower,g.realm.buffs,2,index===12?0:null);
    assert.ok(g.guardianDefense('upgrade',slot));const local=tower.runtime;
    const weapon=index===12?local.funnel.nodes[0].weaponIndex:index;
    const damage=index>=12?local.damage(weapon):Math.round(vehicleDamage(local.progress,weapon)*1.4);
    assert.equal(preview.damage,damage);
    assert.equal(preview.reload,local.weapon(weapon).reloadTime);assert.equal(preview.rate,1/local.weapon(weapon).interval);
  }
});

test('浮游炮挂载各塔独立，切换不补弹、保留冷却，暂停与非法模块拒绝',()=>{
  const g=setup(),original=[...g.progress.funnelLoadout];
  for(const slot of [0,1])g.guardianDefense('deploy',slot,'weapon',12);
  g.continueRealm();const tower=g.realm.defenses[0],local=tower.runtime,node=local.funnel.nodes[0];
  node.magazine.ammo=2;node.cooldown=1.7;const position={x:node.x,y:node.y};
  assert.ok(g.guardianDefense('mount',0,'weapon',0,1));assert.equal(node.magazine.ammo,0);assert.ok(node.magazine.remaining>0);
  assert.deepEqual({x:node.x,y:node.y},position);assert.deepEqual(g.progress.funnelLoadout,original);
  assert.deepEqual(g.realm.defenses[1].funnelLoadout,original);
  assert.ok(g.guardianDefense('mount',0,'weapon',0,12));assert.equal(node.magazine.ammo,2);assert.equal(node.cooldown,1.7);
  for(const [slot,index] of [[-1,0],[3,0],[0,13],[0,999]])assert.equal(g.guardianDefense('mount',0,'weapon',slot,index),false);
  g.progress.weapons[6]=0;assert.equal(g.guardianDefense('mount',0,'weapon',0,6),false);
  g.pause();assert.equal(g.guardianDefense('mount',0,'weapon',0,1),false);
});

test('挂载随准备与休整检查点保存，战中刷新回到波前配置',()=>{
  const g=setup();g.guardianDefense('deploy',0,'weapon',12);g.guardianDefense('mount',0,'weapon',0,9);
  let restored=new Game(structuredClone(g.progress));assert.deepEqual(restored.realm.defenses[0].funnelLoadout,[9,12,12]);
  g.continueRealm();g.guardianDefense('mount',0,'weapon',0,6);
  restored=new Game(structuredClone(g.progress));assert.deepEqual(restored.realm.defenses[0].funnelLoadout,[9,12,12]);
  g.enemies=[];g.realm.kills=g.realm.spec.total;updateRealm(g,0);
  g.guardianDefense('mount',0,'weapon',2,14);
  restored=new Game(structuredClone(g.progress));assert.deepEqual(restored.realm.defenses[0].funnelLoadout,[6,12,14]);
  restored.continueRealm();assert.deepEqual(restored.realm.defenses[0].runtime.funnel.nodes.map(n=>n.weaponIndex),[6,12,14]);
});

test('新挂载使用真实弹药和技能造成伤害，升级不改其他塔与永久装备',()=>{
  for(const index of [6,9,14]){
    const g=setup();g.guardianDefense('deploy',0,'weapon',12);g.guardianDefense('mount',0,'weapon',0,index);g.continueRealm();
    const pad=guardianPads(g.realm.arena)[0],enemy=g.spawnEnemy(0,0,{x:pad.x+65,y:pad.y+5});
    Object.assign(enemy,{hp:100000,maxHp:100000,arena:g.realm.arena,mass:10000});
    for(let i=0;i<240;i++){updateGuardianDefenses(g,.05);g.updateProjectiles(.05);}
    assert.ok(enemy.hp<100000);assert.equal(g.realm.defenses[0].runtime.funnel.nodes[0].weaponIndex,index);
  }
});

test('旧战车保留搭载枪械与等级，返还车体差价一次；损坏挂载安全修复',()=>{
  const g=setup(),run=structuredClone(g.progress.realms.run);run.realmCoins=100;
  run.defenses=[{slot:0,kind:'vehicle',index:2,weaponIndex:0,level:3},{slot:1,kind:'weapon',index:12,weaponIndex:12,level:2,funnelLoadout:[13,999,1]}];
  const migrated=validateRealms({run}).run;
  assert.equal(migrated.realmCoins,140);assert.deepEqual(migrated.defenses[0],{slot:0,kind:'weapon',index:0,weaponIndex:0,level:3});
  assert.deepEqual(migrated.defenses[1].funnelLoadout,[12,12,1]);assert.equal(validateRealms({run:migrated}).run.realmCoins,140);
  g.progress.realms.run=run;const restored=new Game(g.progress);
  assert.equal(restored.realm.realmCoins,140);assert.ok(restored.realm.defenses.every(t=>t.kind==='weapon'));
});

test('首波即包含四族配色、地面重卫与飞行怪，普通秘境不受混编规则影响',()=>{
  const g=setup();g.continueRealm();g.realm.warning=0;
  for(let i=0;i<12;i++){g.realm.spawnTimer=0;updateRealm(g,0);}
  assert.equal(g.realm.spawned,12);assert.equal(new Set(g.enemies.map(e=>e.biome)).size,4);
  assert.equal(new Set(g.enemies.map(e=>e.color)).size,4);assert.ok(g.enemies.some(e=>e.flying&&e.species==='leaf-bat'));
  assert.ok(g.enemies.some(e=>e.rank===1&&e.tough&&!e.flying));assert.ok(g.enemies.some(e=>!e.flying&&!e.tough));
  assert.ok(g.enemies.every(e=>e.goddessTarget&&e.hp>0&&e.hp<30));
  g.leaveRealm();g.enterRealm('tower');g.realm.warning=0;updateRealm(g,0);assert.equal(g.enemies[0].name,'裂隙入侵者');
});
