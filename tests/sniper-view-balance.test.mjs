// 验证远距构图、预览与真实弹道一致、循环镜像及开局手枪的实际击杀成本。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { waveDifficulty } from '../src/config/waves.js';
import { sniperGuide } from '../src/combat/aim.js';
import { CombatCamera } from '../src/rendering/camera.js';
import { visibleBodies, WORLD } from '../src/world/coordinates.js';
import {FOREST_LEVEL_ORIGIN, FOREST_LEVEL_BANDS} from '../src/world/forest-levels.js';
import { biomeAt, enemyIdentity } from '../src/world/biomes.js';
import { updateAimLock } from '../src/combat/targeting.js';

test('狙击固定广角不追随目标，切换自脉冲也不残留镜头缓动', () => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [580, 1000],
  ]) {
    const g = arena(),
      camera = new CombatCamera();
    g.progress.weapon = 9;
    g.enemies = [{ id: 1, type: 'enemy', x: 1050, y: 700, hp: 100, radius: 17 }];
    updateAimLock(g);
    const pulse = camera.update(g.player, width, height, sniperGuide(g), 0);
    const ordinary = new CombatCamera().update(g.player, width, height);
    assert.ok(
      Math.abs(pulse.w / ordinary.w - 1.2) < 1e-9 && Math.abs(pulse.h / ordinary.h - 1.2) < 1e-9,
      '脉冲视野宽高扩大两成',
    );
    assert.ok(pulse.x + pulse.w / 2 > g.player.x, '脉冲继续偏向怪物中点');
    g.progress.weapon = 8;
    for (let frame = 1; frame <= 180; frame++) {
      // 切敌、清空、移动和暂停都使用真实预览，狙击倍率不依赖是否选中目标。
      g.enemies =
        frame % 3
          ? [
              {
                id: frame,
                type: 'enemy',
                x: g.player.x + Math.cos(frame) * 500,
                y: g.player.y + Math.sin(frame) * 500,
                hp: 100,
                radius: 17,
              },
            ]
          : [];
      g.player.x += 2;
      g.player.y -= 1;
      updateAimLock(g);
      const guide = sniperGuide(g),
        view = camera.update(g.player, width, height, guide, frame / 60);
      assert.equal(view.zoom, width < 500 ? 0.6 : 0.75);
      assert.ok(view.w / ordinary.w >= 1.4 && view.h / ordinary.h >= 1.4, '狙击仍扩大约四成');
      assert.ok(Math.abs(view.x + view.w / 2 - g.player.x) < 1e-7);
      assert.ok(Math.abs(view.y + view.h / 2 - g.player.y - 30) < 1e-7);
      assert.deepEqual(camera.update(g.player, width, height, guide, frame / 60), view);
    }
  }
});

// 创建没有刷怪和树木干扰的静态射击场，不替换生产攻击逻辑。
function arena() {
  const g = new Game(freshProgress(), () => 0.5);
  g.trees = [];
  g.enemies = [];
  g.start();
  g.attackTimer = g.spawnTimer = 999;
  return g;
}

test('无锁定注视点时，镜头保持各武器的固定构图', () => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [580, 1000],
  ]) {
    const camera = new CombatCamera(),
      player = { x: 900, y: 700 };
    const baseline = camera.update(player, width, height, null, 0);
    for (let i = 0; i < 180; i++) {
      const guide =
        i % 3
          ? {
              point: { x: 900 + Math.cos(i) * 800, y: 700 + Math.sin(i) * 650 },
              kind: i % 2 ? 'sniper' : 'pulse',
            }
          : null;
      const view = camera.update(player, width, height, guide, i / 60, i % 2 === 0);
      assert.equal(view.x + view.w / 2, player.x);
      assert.equal(view.y + view.h / 2, player.y + 30);
      assert.equal(
        view.zoom,
        guide?.kind === 'sniper'
          ? width < 500
            ? 0.6
            : 0.75
          : guide?.kind === 'pulse'
            ? baseline.zoom / 1.2
            : baseline.zoom,
      );
    }
  }
});

test('固定视野只跟随玩家真实移动，调整窗口尺寸仍保持统一缩放', () => {
  const c = new CombatCamera(),
    p = { x: 900, y: 700 };
  const first = c.update(p, 390, 844);
  const moved = c.update({ x: 960, y: 670 }, 390, 844);
  assert.equal(moved.zoom, first.zoom);
  assert.equal(moved.x - first.x, 60);
  assert.equal(moved.y - first.y, -30);
  assert.equal(c.update(p, 320, 568).zoom, 0.85);
  assert.equal(c.update(p, 580, 1000).zoom, 1.05);
});
test('瞄准预览与实际枪口及穿透顺序相同，预览不会改变战场或发放资源', () => {
  const g = arena();
  g.progress.weapon = 8;
  g.progress.weapons[8] = 1;
  g.player.x = 200;
  g.player.y = 600;
  const targets = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    type: i % 2 ? 'enemy' : 'tree',
    x: 300 + i * 65,
    y: 600,
    radius: 17,
    hp: 1000,
    maxHp: 1000,
  }));
  g.trees = targets.filter((t) => t.type === 'tree');
  g.enemies = targets.filter((t) => t.type === 'enemy');
  const before = JSON.stringify({ progress: g.progress, targets });
  const guide = sniperGuide(g);
  assert.equal(JSON.stringify({ progress: g.progress, targets }), before);
  assert.equal(guide.target.id, 2);
  assert.deepEqual(
    guide.hits.map((h) => h.target.id),
    [2, 4, 6],
  );
  Object.assign(g.magazines[8],{ammo:1,remaining:0});
  g.attack();
  const b = g.projectiles[0];
  assert.equal(b.originX, guide.muzzle.x);
  assert.equal(b.originY, guide.muzzle.y);
  assert.ok(Math.abs(b.dx - guide.direction.x) < 1e-12);
  assert.ok(Math.abs(b.dy - guide.direction.y) < 1e-12);
  g.updateProjectiles(0.5);
  assert.deepEqual(
    targets.filter((t) => t.hp < 1000).map((t) => t.id),
    guide.hits.map((h) => h.target.id),
  );
});

test('跨边界瞄准选择近方向，放大视野补齐同一地形实体的镜像且不修改原对象', () => {
  const g = arena();
  g.progress.weapon = 8;
  g.player.x = WORLD.width - 20;
  g.player.y = 700;
  g.enemies = [{ id: 1, type: 'enemy', x: 30, y: 700, hp: 100, radius: 17 }];
  const guide = sniperGuide(g);
  assert.equal(guide.point.x, WORLD.width + 30);
  assert.equal(guide.distance, 50);
  const original = { id: 3, x: 100, y: 100, hp: 20, trail: [{ x: 90, y: 100 }] };
  const copies = visibleBodies([original], { x: 0, y: 0, w: WORLD.width, h: WORLD.height * 2 + 100 }, 0);
  assert.equal(copies.length, 3);
  assert.deepEqual(
    copies.map((c) => c.y),
    [100, WORLD.height + 100, WORLD.height * 2 + 100],
  );
  assert.ok(copies.every((c) => c.id === 3 && c.trail[0].y === c.y));
  assert.equal(original.y, 100);
  const shifted = visibleBodies([original], { x: WORLD.width, y: 0, w: WORLD.width, h: WORLD.height * 2 + 100 }, 0);
  assert.deepEqual(
    shifted.map((c) => c.x),
    copies.map((c) => c.x + WORLD.width),
  );
});

test('营地第一波全为本区基础怪，初始手枪至多两次非暴击即可击败', () => {
  for (const roll of [0.01, 0.5, 0.999]) {
    const g = new Game(freshProgress(), () => roll);
    assert.ok(
      g.enemies.every((e) => e.biome === 'meadow' && e.rank === 0 && e.level <= 3 && e.maxHp <= 28),
    );
    g.trees = [];
    g.start();
    g.enemies = [];
    for (let i = 0; i < 24; i++) {
      const e = g.spawnEnemy((i * Math.PI) / 12, 320 + (i % 3) * 50);
      assert.equal(e.biome, 'meadow');
      assert.equal(biomeAt(e.x, e.y).id, 'meadow');
      assert.equal(e.rank, 0);
      assert.ok(e.level<=3 && e.maxHp>0 && e.maxHp<=28);
    }
    const e = g.enemies[0];
    e.x = g.player.x + 160;
    e.y = g.player.y;
    g.enemies = [e];
    g.random = () => 0.5;
    Object.assign(g.magazines[0],{ammo:2,remaining:0});
    for(let shot=0;shot<2&&e.hp>0;shot++){
      const hp=e.hp;
      assert.ok(g.attack());
      g.updateProjectiles(.3);
      assert.ok(e.hp<hp);
    }
    assert.ok(e.hp <= 0);
    assert.equal(g.kills, 1);
  }
});

test('前三波减免逐步退出，第四波使用线性血量；高等级区域仍保留等级差异', () => {
  for (let wave = 1; wave <= 12; wave++) {
    const n = wave - 1,
      d = waveDifficulty(wave),
      base = 1 + 0.12 * n;
    if (wave <= 3) assert.ok(d.health < base);
    else assert.equal(d.health, base);
    if (wave > 1) assert.ok(d.health > waveDifficulty(wave - 1).health);
  }
  const g = arena();
  g.random = () => 0.999;
  g.enemies = [];
  g.wave = 2;
  assert.equal(g.spawnEnemy(0, 100).rank, 1);
  g.wave = 3;
  assert.equal(g.spawnEnemy(0, 100).rank, 2);
  // 清缴固定轮次等级，野外遭遇按出生点距营地的距离生成。
  const band=FOREST_LEVEL_BANDS.find(b=>b.min===10);
  g.player.x=FOREST_LEVEL_ORIGIN.x+band.from;
  g.player.y=FOREST_LEVEL_ORIGIN.y;
  g.wave=1;
  const e=g.spawnEnemy(0,100,null,{ambient:true,ordinaryDumpling:true});
  const expected=enemyIdentity(e.x,e.y,0);
  assert.ok(e.level>=band.min && e.hp>28);
  assert.equal(e.level,expected.level);
  assert.equal(e.maxHp,expected.hp);
});
