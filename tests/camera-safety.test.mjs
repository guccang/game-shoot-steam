// 验证竖屏中点镜头的完整可见范围，覆盖长距离、反冲、窗口变化和树木采集。
import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatCamera } from '../src/rendering/camera.js';
import { Game, freshProgress, WEAPONS } from '../src/game.js';
import { sniperGuide } from '../src/combat/aim.js';
import { updateAimLock } from '../src/combat/targeting.js';

test('采集锁定与预览不输出镜头注视点，怪物死亡的同帧也不会借用旧锁定', () => {
  for (const weapon of [8, 9]) {
    const g = new Game(freshProgress(), () => 0.5);
    g.progress.weapon = weapon;
    g.trees = [];
    g.enemies = [{ id: 9000, type: 'enemy', x: 1100, y: 700, hp: 100, radius: 17 }];
    g.addTree(1550, 700);
    updateAimLock(g);
    assert.ok(sniperGuide(g).focus, '怪物仍支持中点镜头');
    g.enemies[0].hp = 0;
    const guide = sniperGuide(g);
    assert.equal(guide.target, null);
    assert.equal(guide.focus, null, '旧战斗锁定尚未更新时，树木也不能输出焦点');
    assert.equal(guide.hits.length,0);
    updateAimLock(g);
    assert.equal(g.aimLock,null);
    g.trees[0].hp = 0;
    assert.equal(sniperGuide(g).focus, null);
  }
});

test('镜头拒绝树木、空目标和死亡目标携带的历史注视点', () => {
  const p = { x: 900, y: 700 },
    camera = new CombatCamera();
  const baseline = camera.update(p, 390, 844);
  for (let i = 1; i <= 120; i++) {
    const target = [null, { type: 'tree', hp: 55 }, { type: 'enemy', hp: 0 }][i % 3];
    const focus = { x: p.x + Math.cos(i) * 650, y: p.y + Math.sin(i) * 650 };
    assert.deepEqual(camera.update(p, 390, 844, { target, focus }, i / 60), baseline);
  }
  const boss = { type: 'boss', hp: 1000 };
  const combat = camera.update(p, 390, 844, { target: boss, focus: { x: 1000, y: 700 } }, 3);
  assert.ok(combat.x > baseline.x, '存活领主仍可驱动战斗镜头');
});

test('连续经过不同方向树木期间，狙击与脉冲只跟随玩家真实位移', () => {
  for (const weapon of [8, 9]) {
    const g = new Game(freshProgress(), () => 0.5);
    g.progress.weapon = weapon;
    g.progress.weapons[weapon] = 1;
    g.trees = [];
    g.enemies = [];
    g.aimLock = null;
    g.start();
    g.spawnTimer = 999;
    g.magazines[weapon].ammo = 1;
    const camera = new CombatCamera();
    let shots = 0,
      reload = false;
    const targets = new Set();
    g.onEvent = (type) => {
      if (type === 'shot') shots++;
    };
    for (let i = 0; i < 1200; i++) {
      // 逐批更换不同方向的树，并留出空目标帧，覆盖选树、击杀、走位和反冲。
      if (i % 120 === 0) {
        g.trees = [];
        const direction = ((Math.floor(i / 120) % 4) * Math.PI) / 2;
        g.addTree(g.player.x + Math.cos(direction) * 200, g.player.y + Math.sin(direction) * 200);
      }
      g.update(1 / 60, { x: 0, y: i % 240 < 120 ? 0.15 : -0.15 });
      const guide = sniperGuide(g);
      if (guide.target) targets.add(guide.target.id);
      reload ||= g.magazines[weapon].remaining > 0;
      assert.equal(guide.focus, null);
      const view = camera.update(g.player, 390, 844, guide, g.time);
      assert.ok(Math.abs(view.x + view.w / 2 - g.player.x) < 1e-7);
      assert.ok(Math.abs(view.y + view.h / 2 - g.player.y - 30) < 1e-7);
      assertVisible(g.player, view);
    }
    assert.equal(shots,0);assert.equal(targets.size,0);assert.equal(reload,false);
    assert.equal(g.stumps.length,0);
  }
});

// 按可视实体尺寸独立检查脚底、枪械和带阴影的头顶换弹环，保留至少12像素留白。
function assertVisible(player, view) {
  const x = (player.x - view.x) * view.zoom,
    y = (player.y - view.y) * view.zoom,
    body = 110 * view.zoom;
  assert.ok(x - body >= 12 - 1e-7 && x + body <= view.width - 12 + 1e-7, `横向越界 ${x}`);
  assert.ok(y - body >= 12 - 1e-7 && y + body <= view.height - 12 + 1e-7, `纵向越界 ${y}`);
  assert.ok(y - 80 - 23 - 8 >= 12 - 1e-7, `换弹环越界 ${y}`);
}

test('320至580宽竖屏，任意远距方向与缓动切线都不会使角色及换弹环出屏', () => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [580, 928],
  ])
    for (const reduced of [false, true]) {
      const camera = new CombatCamera(),
        player = { x: 900, y: 700 };
      let time = 0;
      for (let direction = 0; direction < 16; direction++)
        for (let frame = 0; frame < 60; frame++) {
          const angle = (direction * Math.PI) / 8;
          player.x += 1.3;
          player.y -= 0.7;
          time += 1 / 60;
          const view = camera.update(
            player,
            width,
            height,
            {
              kind: 'pulse',
              target: { type: 'enemy', hp: 100 },
              focus: { x: player.x + Math.cos(angle) * 820, y: player.y + Math.sin(angle) * 820 },
            },
            time,
            reduced,
          );
          assert.equal(view.zoom, (width < 500 ? 0.85 : 1.05) / 1.2);
          assertVisible(player, view);
        }
    }
});

test('反向切线、目标消失、暂停和缩窄窗口的第一帧均受可见范围约束', () => {
  const c = new CombatCamera(),
    p = { x: 900, y: 700 };
  for (const [width, height, time, focus] of [
    [580, 928, 0, { x: 1720, y: 700 }],
    [320, 568, 0.1, { x: 80, y: 700 }],
    [390, 844, 0.2, { x: 900, y: 1520 }],
    [320, 568, 0, null],
  ]) {
    const guide = { focus, target: focus ? { type: 'enemy', hp: 100 } : null };
    const v = c.update(p, width, height, guide, time);
    assertVisible(p, v);
    assert.deepEqual(c.update(p, width, height, guide, time), v, '暂停不推进镜头');
  }
});

test('狙击和脉冲真实攻击、走位、反冲与装填全程保持可见', () => {
  for (const weapon of [8, 9])
    for (const width of [320, 580]) {
      const g = new Game(freshProgress(), () => 0.5);
      g.progress.weapon = weapon;
      g.progress.weapons[weapon] = 1;
      g.trees = [];
      g.enemies = [];
      g.aimLock = null;
      g.spawnTimer = 999;
      g.start();
      g.attackTimer = 0;
      g.enemies = [
        {
          id: 800,
          type: 'enemy',
          x: g.player.x+400,
          y: g.player.y,
          hp: 100000,
          maxHp: 100000,
          radius: 17,
          mass: 1,
          speed: 0,
        },
      ];
      Object.assign(g.magazines[weapon],{ammo:1,remaining:0});
      const camera = new CombatCamera();
      let shots = 0,
        reloading = false;
      g.onEvent = (e) => {
        if (e === 'shot') shots++;
      };
      for (let i = 0; i < 720; i++) {
        g.update(1 / 120, { x: 0, y: i < 360 ? 1 : -1 });
        reloading ||= g.magazines[weapon].remaining > 0;
        assertVisible(g.player, camera.update(g.player, width, 928, sniperGuide(g), g.time));
      }
      assert.ok(shots >= 1);
      assert.ok(reloading, '测试必须经过真实换弹');
    }
});

test('树木保持角色跟随，不缩短远程弹道；怪物仍使用安全范围内的中点', () => {
  for (const weapon of [8, 9]) {
    const g = new Game(freshProgress(), () => 0.5);
    g.progress.weapon = weapon;
    g.progress.weapons[weapon] = 1;
    g.trees = [];
    g.enemies = [];
    g.aimLock = null;
    g.addTree(1550, 700);
    updateAimLock(g);
    const guide = sniperGuide(g);
    assert.equal(guide.target, null);
    assert.equal(guide.hits.length,0);
    assert.equal(guide.range, WEAPONS[weapon].range);
    const camera = new CombatCamera(),
      baseline = new CombatCamera().update(g.player, 390, 844, { kind: WEAPONS[weapon].id });
    assert.deepEqual(camera.update(g.player, 390, 844, guide, 0), baseline);
    g.enemies = [{ id: 900, type: 'enemy', x: 1000, y: 700, hp: 2000, radius: 17 }];
    updateAimLock(g);
    const combat = new CombatCamera().update(g.player, 390, 844, sniperGuide(g), 0);
    const center=combat.x+combat.w/2;
    if(weapon===8)assert.equal(center,g.player.x);
    else assert.ok(center>g.player.x&&center<=(g.player.x+g.enemies[0].x)/2,'脉冲镜头向目标移动并保留安全边距');
    const returning = new CombatCamera();
    returning.update(g.player, 390, 844, sniperGuide(g), 0);
    for (let i = 1; i <= 360; i++) returning.update(g.player, 390, 844, guide, i / 60);
    const end = returning.update(g.player, 390, 844, guide, 6);
    assert.ok(
      Math.abs(end.x - baseline.x) < 0.01 && Math.abs(end.y - baseline.y) < 0.01,
      '打树平滑回到角色视角',
    );
  }
});
