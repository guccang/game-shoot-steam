// 新武器、河道通行与轻量物理回归，检查可玩行为而非只验证配置值。
import {equipmentRecipe} from '../src/progression/workshop/equipment-goals.js';
import {equipmentQuest} from '../src/progression/workshop/equipment-quests.js';
import {upgradeCost} from '../src/progression/progress.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS, WORLD } from '../src/game.js';
import { BRIDGE, riverXAt, riverHalfWidth, isWaterBlocked } from '../src/world/river-geometry.js';
import { moveBody, applyImpulse, stepImpulse, stepFragment, treeSway } from '../src/physics/motion.js';
import { createEnemyAttack, updateEnemyAttack } from '../src/combat/enemy-attack.js';
import { fireBallistics } from '../src/combat/ballistics.js';
import { RECOIL_PROFILES } from '../src/combat/recoil.js';
import { CombatFX } from '../src/combat/effects.js';

// 隔离自动生成内容，使每个测试仅包含所需交互。
function arena(weapon = 0) {
  const progress = freshProgress();
  progress.weapon = weapon;
  progress.weapons[weapon] = 1;
  progress.supplies.handMags[weapon] = {ammo:WEAPONS[weapon].magazineSize, remaining:0, weapon};
  const g = new Game(progress, () => .5);
  g.trees = []; g.enemies = [];
  Object.assign(g.player,{x:900,y:700});
  g.start();
  g.attackTimer = g.spawnTimer = 999;
  return g;
}
// 构建高生命测试怪，避免死亡干扰弹道和受击状态的检查。
function mob(id, x, y) { return { id, type: 'enemy', x, y, radius: 17, hp: 1000, maxHp: 1000, speed: 48, assault: createEnemyAttack(), flash: 0 }; }

test('旧存档补齐新增锁定武器，所有新枪都能购买装备升级并保存', () => {
  const old = validateProgress({ version: 1, coins: 234, wood: 56, heroes: [3, 2], hero: 1, weapons: [4, 5], weapon: 1, bosses: 2 });
  assert.deepEqual(old.weapons, [4,5,...Array(WEAPONS.length-2).fill(0)]); assert.equal(old.coins,234); assert.equal(old.hero,1);
  // 每把武器单独购物，避免前一把武器的重量改变下一把的交付位置。
  for (let i=2; i<WEAPONS.length; i++) {
    const g=arena(), p=g.progress;
    const price=equipmentRecipe('weapons',i,p), upgrade=upgradeCost(1,p,'weapons',i);
    const quest=equipmentQuest('weapons',i);
    p.coins=price.coins+upgrade.coins;
    p.wood=price.wood+upgrade.wood;
    Object.assign(p.materials,{parts:price.parts,crystal:price.crystal,core:price.core});
    if(quest){
      assert.equal(g.transact('weapons',i,'buy'),false,quest.title);
      p.story.chapters[quest.chapter]={completed:true};
    }
    assert.ok(g.transact('weapons',i,'buy'),WEAPONS[i].id);
    assert.equal(p.weapon,i);
    assert.equal(g.transact('weapons',i,'upgrade'),false);
    g.cottage={kind:'weapons'};
    assert.ok(g.transact('weapons',i,'upgrade'),WEAPONS[i].id);
    const restored=validateProgress(JSON.parse(JSON.stringify(p)));
    assert.equal(restored.weapons[i],2);
    assert.equal(restored.weapon,i);
    assert.ok(RECOIL_PROFILES[i]);
  }
  const g=arena();
  assert.equal(g.transact('weapons',WEAPONS.length,'buy'),false); assert.equal(g.transact('weapons',-1,'buy'),false);
});
test('河岸双向阻挡且高速运动不穿河，桥面双向可通行', () => {
  for (const y of [50,320,470,570,900,1200]) for (const sign of [-1,1]) {
    const x = riverXAt(y), b = { x: x + sign * 150, y };
    moveBody(b,-sign*300,0,WORLD); assert.ok(sign*(b.x-x)>40); assert.equal(isWaterBlocked(b.x,b.y),false);
  }
  for (const sign of [-1,1]) { const y=BRIDGE.y+BRIDGE.height/2, x=riverXAt(y), b={x:x+sign*170,y}; moveBody(b,-sign*340,0,WORLD); assert.ok(sign*(b.x-x)<-150); }
  for(const sign of [-1,1]){
    const y=BRIDGE.y+BRIDGE.height/2,b={x:riverXAt(y),y};
    moveBody(b,0,sign*150,WORLD);
    const edge=sign<0?BRIDGE.y:BRIDGE.y+BRIDGE.height;
    assert.ok(sign*(b.y-y)>0 && sign*(edge-b.y)>=4);
    assert.equal(isWaterBlocked(b.x,b.y),false);
    assert.equal(isWaterBlocked(b.x,edge+sign,12),true);
  }
});
test('怪物从两岸绕桥追击，不能隔河扑击或造成伤害', () => {
  for (const sign of [-1,1]) {
    const enemy=mob(1,riverXAt(850)+sign*100,850), player={x:riverXAt(850)-sign*110,y:850};
    let crossed=false;
    for(let i=0;i<1800;i++) { const damage=updateEnemyAttack(enemy,player,player,1/30,WORLD); assert.equal(isWaterBlocked(enemy.x,enemy.y),false); if(sign*(enemy.x-riverXAt(enemy.y))<0)crossed=true; if(Math.hypot(enemy.x-player.x,enemy.y-player.y)>130)assert.equal(damage,0); }
    assert.ok(crossed,`未成功绕桥 ${sign}`); assert.ok(Math.hypot(enemy.x-player.x,enemy.y-player.y)<=117);
  }
});
test('弹道散射六颗，弹射最多三次且不重复伤害，水弹施加减速推力', () => {
  const g=arena(3);g.enemies=[mob(1,1050,700)];g.attack();assert.equal(g.projectiles.length,6);assert.equal(new Set(g.projectiles.map(b=>b.dx+','+b.dy)).size,6);
  const bounce=arena(4);bounce.enemies=[mob(1,1000,700),mob(2,1080,700),mob(3,1080,800),mob(4,990,820)];
  fireBallistics(bounce,WEAPONS[4],{x:950,y:692},{x:1,y:0},19,false);
  for(let i=0;i<80;i++)bounce.updateProjectiles(1/60);
  assert.equal(bounce.enemies.filter(e=>e.hp===981).length,3);assert.equal(bounce.enemies.filter(e=>e.hp===1000).length,1);assert.equal(bounce.projectiles.length,0);
  const water=arena(5);water.enemies=[mob(1,1020,700)];water.attack();for(let i=0;i<30;i++)water.updateProjectiles(1/60);
  assert.ok(water.enemies[0].wet>0);assert.ok(water.enemies[0].pushX>0);
});
test('隔河距离虽近，领主仍会主动绕向木桥，出生点不落水', () => {
  const g=arena(), x=riverXAt(1000);g.player.x=x-53;g.player.y=1000;
  g.boss={id:1,type:'boss',x:x+53,y:1000,hp:850,maxHp:850,radius:48,attack:999,flash:0};
  for(let i=0;i<120;i++){g.update(1/60);assert.equal(isWaterBlocked(g.boss.x,g.boss.y),false);}
  assert.ok(g.boss.y<970);
  for(let i=0;i<20;i++)g.spawnEnemy(i/20*Math.PI*2,150);
  assert.ok(g.enemies.every(e=>!isWaterBlocked(e.x,e.y)));
});
test('加特林持续射击更快，换枪不改变在途弹丸，所有弹体最终回收', () => {
  const counts=[];
  for(const index of [0,2]) {const g=arena(index);g.enemies=[mob(1,1090,700)];g.enemies[0].speed=0;g.attackTimer=0;let shots=0;g.onEvent=t=>{if(t==='shot')shots++;};for(let i=0;i<60;i++)g.update(1/60);counts.push(shots);}
  assert.ok(counts[1]>counts[0]*3);
  const g=arena(5);g.enemies=[mob(1,1080,700)];g.attack();const bullet=g.projectiles[0];g.progress.weapon=3;assert.equal(bullet.kind,'water');g.enemies=[];for(let i=0;i<120;i++)g.updateProjectiles(1/60);assert.equal(g.projectiles.length,0);
});
test('手持枪械优先瞄准怪物，开启木材后能自动打树，关闭后停止伐木', () => {
  const g=arena();Object.assign(g.player,{x:900,y:700});Object.assign(g.magazines[0],{ammo:1,remaining:0});g.addTree(920,790);g.enemies=[mob(1,1090,700)];g.attack();assert.equal(g.player.angle,0);
  for(let i=0;i<30;i++)g.updateProjectiles(1/60);assert.ok(g.enemies[0].hp<1000);assert.equal(g.trees[0].hp,55);
  g.enemies=[];const tree=g.trees[0];assert.equal(g.findAttackTarget(),tree);
  g.gameplayPreferences={targetWood:false};Object.assign(g.magazines[0],{ammo:3,remaining:0});
  assert.equal(g.findAttackTarget(),null);assert.equal(g.attack(),false);assert.equal(g.magazines[0].ammo,3);
  g.gameplayPreferences.targetWood=true;g.attackTimer=0;
  for(let i=0;i<90&&tree.hp===55;i++)g.update(1/60);
  assert.ok(tree.hp<55);assert.ok(g.magazines[0].ammo<3);
});
test('推力不能把怪物推进河中；碎片重力独立于水平弹道并在地面收敛', () => {
  // 起点位于新河湾的干岸外侧，验证冲量从合法陆地不能穿入水中。
  const b=mob(1,riverXAt(1000)-riverHalfWidth(1000,-1)-24,1000);applyImpulse(b,{x:1,y:0},170);for(let i=0;i<100;i++)stepImpulse(b,1/60,WORLD);assert.equal(isWaterBlocked(b.x,b.y),false);
  const p={x:0,y:0,z:10,vx:100,vy:0,vz:120,angle:0,spin:4};let bounced=false,prev=120;
  for(let i=0;i<300;i++){stepFragment(p,1/60);if(prev<0&&p.vz>0)bounced=true;prev=p.vz;assert.equal(p.y,0);assert.ok(p.z>=0);}
  assert.ok(bounced);assert.ok(Math.abs(p.vx)<1);assert.equal(p.z,0);
  const fx=new CombatFX(()=>.5);fx.impact({target:{type:'tree',x:0,y:0},x:0,y:0},{x:0,y:1},false,false,true);
  assert.ok(fx.items.filter(p=>p.kind==='chip').every(p=>p.vy>0&&p.vz>0));
});
test('受击树木摆动一次后恢复风摆，暂停不会推进受击动画', () => {
  const g=arena();g.addTree(1040,700);const t=g.trees[0];g.hit(t,1,false,{direction:{x:1,y:0}});assert.equal(t.sway,.7);g.pause();g.update(.05);assert.equal(t.sway,.7);g.pause();
  for(let i=0;i<16;i++)g.update(.05);assert.equal(t.sway,0);assert.ok(Math.abs(treeSway(t,3))<=.025);
});
