// 主场景秘境回归：随机选区、三倍面积、冻结森林、可达布防与统一物理边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress as freshBaseProgress } from '../src/progression/progress.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import { REALM_ARENA, REALM_RADIUS } from '../src/config/realms.js';
import { realmSites, validRealmArena, chooseRealmArena } from '../src/core/realms/realm-region.js';
import { SETTLEMENTS } from '../src/config/settlements.js';
import { settlementAt } from '../src/world/settlements.js';
import { WORLD, ORIGINAL_WORLD } from '../src/world/coordinates.js';
import { guardianPads } from '../src/config/guardian.js';
import { terrainBlocked } from '../src/physics/terrain-navigation.js';
import { blocked, moveBody } from '../src/physics/motion.js';
import { landingPoint } from '../src/combat/vehicle-landing.js';
import { updateRealm } from '../src/core/realms/realm-manager.js';

// 选区测试使用已修复秘境的存档，避免被新手设施权限提前拦截。
function freshProgress(){const p=freshBaseProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';return p;}

// 对照原始逐点判定，确保格点复用不改变候选顺序、存档落点或随机选择概率。
test('复用重叠采样后候选点与逐圈地形检查完全一致',()=>{
  const expected=[],radius=REALM_RADIUS;
  for(let y=radius+24;y<ORIGINAL_WORLD.height-radius-24;y+=24)
    for(let x=radius+24;x<ORIGINAL_WORLD.width-radius-24;x+=24){
      if(settlementAt({x,y},radius+24))continue;
      let dry=true;
      for(let dy=-radius;dy<=radius&&dry;dy+=24)
        for(let dx=-radius;dx<=radius;dx+=24)
          if(dx*dx+dy*dy<=radius*radius&&terrainBlocked(x+dx,y+dy,24)){dry=false;break;}
      if(dry)expected.push({x,y,radius,terrain:'forest'});
    }
  assert.deepEqual(realmSites(),expected);
  assert.equal(realmSites(),realmSites());
});

test('随机选区来自原世界干地，面积恰为旧秘境三倍且存档不能篡改半径', () => {
  assert.ok(Math.abs(REALM_RADIUS ** 2 / REALM_ARENA.radius ** 2 - 3) < 1e-10);
  const sites = realmSites(); assert.ok(sites.length >= 2);
  for (const a of sites) {
    assert.equal(terrainBlocked(a.x, a.y, 24), false);
    for (const p of guardianPads(a)) {
      assert.equal(terrainBlocked(p.x, p.y, 42), false);
      assert.ok(Math.hypot(p.x - a.x, p.y - a.y) < a.radius - 42);
    }
    assert.deepEqual(validRealmArena(a), a);
    assert.equal(validRealmArena({...a,radius:9999}), null);
  }
  const starts = [0,.5,.99].map(random => {
    const g = new Game(freshProgress(), () => random);g.enterRealm('tower');return g.realm.arena;
  });
  assert.equal(new Set(starts.map(a=>`${a.x}:${a.y}`)).size,Math.min(3,sites.length));
});

test('三种秘境刷新保留选区，退出恢复森林树木与原位置', () => {
  for (const mode of ['tower','rogue','guardian']) {
    const g = new Game(freshProgress(), () => .45), forest = g.trees, player = g.player;
    const snapshot = JSON.stringify(forest);g.enterRealm(mode);
    const a = {...g.realm.arena};assert.ok(g.trees.length > 0);assert.notEqual(g.trees,forest);
    assert.deepEqual(g.player.arena,a);
    const restored = new Game(JSON.parse(JSON.stringify(g.progress)), () => .99);
    assert.deepEqual(restored.realm.arena,a);
    g.leaveRealm();assert.equal(g.trees,forest);assert.equal(g.player,player);
    assert.equal(JSON.stringify(forest),snapshot);
  }
});

test('砍树不推进关卡或增加秘境币，原森林树木不受局内伤害影响', () => {
  const g = new Game(freshProgress());const before=JSON.stringify(g.progress);g.enterRealm('guardian');g.continueRealm();
  const tree=g.trees.find(t=>t.hp>0), forestTree=g.forestState.trees.find(t=>t.id===tree.id);
  const hp=forestTree.hp,coins=g.realm.realmCoins;g.hit(tree,9999);
  assert.equal(g.realm.kills,0);assert.equal(g.realm.realmCoins,coins);
  assert.equal(forestTree.hp,hp);assert.ok(g.stumps.length>0);
  g.leaveRealm();assert.equal(JSON.stringify(g.progress.weapons),JSON.stringify(JSON.parse(before).weapons));
});

test('守护准备可走动布防但不刷怪、不消耗弹药或推进修复，暂停仍冻结移动', () => {
  const g=new Game(freshProgress());g.enterRealm('guardian');const x=g.player.x,time=g.time,ammo=g.magazines[0].ammo;
  g.vehicle.cooldown=20;
  for(let i=0;i<10;i++)g.update(.05,{x:1,y:0});
  assert.ok(g.player.x>x+10);assert.equal(g.time,time);assert.equal(g.enemies.length,0);
  assert.equal(g.magazines[0].ammo,ammo);assert.equal(g.vehicle.cooldown,20);
  assert.ok(g.guardianDefense('deploy',0,'weapon',0));
  const pad=guardianPads(g.realm.arena)[0];assert.equal(g.realm.defenses[0].runtime.player.x,pad.x);
  g.state='paused';const stop=g.player.x;g.update(.05,{x:1,y:0});assert.equal(g.player.x,stop);
});

test('树干碰撞、飞行边界和安全降落共用主场景规则，出生点不陷入树木', () => {
  const g=new Game(freshProgress(),()=>.45);g.enterRealm('tower');const a=g.realm.arena;
  const tree={x:a.x+30,y:a.y,radius:22,hp:55};
  const body={x:a.x,y:a.y,arena:a};moveBody(body,60,0,null,12,[tree]);assert.ok(body.x<tree.x);
  body.flying=true;moveBody(body,3000,3000,null,12,[tree]);
  assert.ok(Math.hypot(body.x-a.x,body.y-a.y)<a.radius-12+1e-6);
  const landing=landingPoint({...body,x:tree.x,y:tree.y},[tree]);
  assert.ok(landing);assert.equal(blocked(landing.x,landing.y,12,[tree],{arena:a}),false);
  g.realm.warning=0;updateRealm(g,.05);const enemy=g.enemies[0];
  assert.equal(blocked(enemy.x,enemy.y,25,g.trees,enemy),false);
});

// 不只检查中心点：圈边、聚落角点和循环镜像也必须保持完整分离。
test('所有秘境候选战斗圈及护栏余量都在两处生活聚落之外',()=>{
  for(const arena of realmSites())for(const settlement of SETTLEMENTS)
    for(const ox of [-WORLD.width,0,WORLD.width])for(const oy of [-WORLD.height,0,WORLD.height]){
      const x=Math.max(settlement.left+ox,Math.min(settlement.right+ox,arena.x));
      const y=Math.max(settlement.top+oy,Math.min(settlement.bottom+oy,arena.y));
      assert.ok(Math.hypot(arena.x-x,arena.y-y)>arena.radius+24,settlement.id);
    }
});

test('营地中的旧选区不再有效，三种秘境恢复时重新选择营地外落点',()=>{
  const unsafe={x:REALM_RADIUS+24,y:REALM_RADIUS+24,radius:REALM_RADIUS,terrain:'forest'};
  assert.ok(settlementAt(unsafe,unsafe.radius));assert.equal(validRealmArena(unsafe),null);
  for(const mode of ['tower','guardian','rogue']){
    const game=new Game(freshProgress(),()=>0);game.enterRealm(mode);
    const progress=structuredClone(game.progress);progress.realms.run.arena=unsafe;
    const restored=new Game(progress,()=>.99);
    assert.equal(settlementAt(restored.realm.arena,REALM_RADIUS+24),null);
    assert.deepEqual(restored.player.arena,restored.realm.arena);
    assert.equal(restored.realm.mode,mode);assert.equal(restored.realm.stage,game.realm.stage);
  }
});

test('固定随机数连续换层仍能轮换合法落点，不退回营地',()=>{
  for(const random of [0,.5,.999999,1]){
    let previous=null;
    for(let i=0;i<8;i++){
      const arena=chooseRealmArena(()=>random,null,previous);
      assert.equal(settlementAt(arena,arena.radius+24),null);
      if(previous)assert.notDeepEqual(arena,previous);
      previous=arena;
    }
  }
});
