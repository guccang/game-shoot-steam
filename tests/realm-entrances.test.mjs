// 世界入口的通行留白、周期命中与地标保护，独立于浏览器点击验收。
import test from 'node:test';
import assert from 'node:assert/strict';
import { REALM_ENTRANCES, realmEntranceAt, coversRealmEntrance } from '../src/world/realm-entrances.js';
import { REALMS } from '../src/config/realms.js';
import { WORLD } from '../src/world/coordinates.js';
import { pathDistance } from '../src/world/paths.js';
import { terrainBlocked } from '../src/physics/terrain-navigation.js';
import { forestLayout } from '../src/world/biomes.js';

test('三种现有玩法各有唯一入口，门前与脚底位于可通行地面并避让主路', () => {
  // 新增运动小游戏使用秘境卡片，三种探索建筑共用更新后的位置与通路。
  assert.deepEqual(REALM_ENTRANCES.map(e=>e.mode).sort(),Object.keys(REALMS).filter(mode=>!['football','race'].includes(mode)).sort());
  for(const entry of REALM_ENTRANCES) {
    assert.ok(pathDistance(entry.x,entry.y)>entry.width/2+35,entry.mode);
    for(const y of [0,30,60,85]) assert.equal(terrainBlocked(entry.x,entry.y+y,20),false,entry.mode);
    assert.ok(Math.hypot(entry.x-900,entry.y-780)>220,'中央草场保持开放');
  }
});

test('实际森林不会用树冠挡住入口和门前引路石', () => {
  for(const tree of forestLayout()) assert.equal(coversRealmEntrance(tree.x,tree.y),false);
});

test('建筑本体与世界周期镜像可点击，空地及屋顶外部不可点击', () => {
  for(const entry of REALM_ENTRANCES) {
    for(const [dx,dy] of [[0,0],[WORLD.width,-WORLD.height],[-WORLD.width,WORLD.height]])
      assert.equal(realmEntranceAt({x:entry.x+dx,y:entry.y-50+dy})?.mode,entry.mode);
    assert.equal(realmEntranceAt({x:entry.x,y:entry.y-entry.height-2}),null);
    assert.equal(realmEntranceAt({x:entry.x,y:entry.y+80}),null);
  }
  assert.equal(realmEntranceAt({x:900,y:780}),null);
});
