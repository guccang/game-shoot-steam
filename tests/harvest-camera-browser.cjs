// 使用实际渲染器重放无怪伐木、击碎、换弹与移动，检查镜头不会追逐采集目标。
async (page) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  const results = [];
  for (const width of [320, 580]) {
    await page.setViewportSize({ width, height: 844 });
    results.push(await page.evaluate(async () => {
      const { application: a } = await import('/src/main.js');
      const { CombatCamera } = await import('/src/rendering/camera.js');
      const { sniperGuide } = await import('/src/combat/aim.js');
      a.destroy();
      const g = a.game, r = a.renderer, weapons = [];
      r.resize();
      for (const weapon of [8, 9]) {
        g.progress.weapon = weapon; g.progress.weapons[weapon] = 1;
        g.reset(); g.start(); g.trees = []; g.enemies = []; g.aimLock = null;
        g.spawnTimer = 999; g.magazines[weapon].ammo = 1;
        r.camera = new CombatCamera();
        r.draw();
        // 全景按屏幕留白取景，采集过程中保持首次投影的跟随偏移。
        const offset = { x: r.view.x + r.view.w / 2 - g.player.x, y: r.view.y + r.view.h / 2 - g.player.y };
        let drift = 0, shots = 0, reload = false, empty = false;
        const targets = new Set();
        g.onEvent = type => { if (type === 'shot') shots++; };
        for (let i = 0; i < 1200; i++) {
          // 每两秒替换为另一个方向的树，使用真实攻击和碰撞产生死亡及空目标帧。
          if (i % 120 === 0) {
            g.trees = [];
            const angle = Math.floor(i / 120) % 4 * Math.PI / 2;
            g.addTree(g.player.x + Math.cos(angle) * 200, g.player.y + Math.sin(angle) * 200);
          }
          g.update(1 / 60, { x: 0, y: i % 240 < 120 ? .15 : -.15 });
          r.draw();
          const guide = sniperGuide(g), v = r.view;
          if (guide.focus !== null) throw Error('采集射线泄漏镜头注视点');
          if (guide.target) targets.add(guide.target.id); else empty = true;
          reload ||= g.magazines[weapon].remaining > 0;
          drift = Math.max(drift, Math.abs(v.x + v.w / 2 - g.player.x - offset.x), Math.abs(v.y + v.h / 2 - g.player.y - offset.y));
        }
        if (drift > 1e-7 || shots < 3 || !reload || !empty || targets.size < 3 || !g.chopped) throw Error(JSON.stringify({ drift, shots, reload, empty, targets: targets.size, chopped: g.chopped }));
        weapons.push({ weapon, frames: 1200, drift, shots, reload, empty, targets: targets.size, chopped: g.chopped });
      }
      a.refresh();
      return { width: r.width, weapons };
    }));
    await page.screenshot({ path: `output/playwright/harvest-camera-${width}.png` });
  }
  if (errors.length) throw Error(errors.join(';'));
  return { results, errors };
}
