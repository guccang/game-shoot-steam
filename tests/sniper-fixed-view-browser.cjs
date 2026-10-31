// 实际画布验证狙击广角、目标切换和空场固定构图，并对照脉冲原有镜头。
async (page) => {
  const errors = [], results = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  for (const width of [320, 580]) {
    await page.setViewportSize({ width, height: 928 });
    results.push(await page.evaluate(async () => {
      const { application: a } = await import('/src/main.js');
      const { updateAimLock } = await import('/src/combat/targeting.js');
      const { CombatCamera } = await import('/src/rendering/camera.js');
      a.destroy(); const g = a.game, r = a.renderer;
      g.state = 'playing'; g.boss = null; g.aimLock = null;
      g.progress.weapon = 9; g.progress.weapons[9] = 1;
      // 使用合法静止目标，保留真实树木、瞄准解算、角色绘制和换弹标记。
      const enemy = (id, x, y) => ({ id, type: 'enemy', x, y, hp: 2000, maxHp: 2000, radius: 17, mass: 1, speed: 0, phase: 0, rank: 0, biome: 'pine' });
      g.enemies = [enemy(9001, g.player.x + 150, g.player.y)];
      updateAimLock(g); r.resize(); r.camera = new CombatCamera(); r.draw();
      const pulse = { ...r.view };
      if (pulse.x + pulse.w / 2 <= g.player.x || pulse.zoom !== (r.width < 500 ? .85 : 1.05) / 1.2) throw Error('脉冲广角或中点跟随发生回归');
      g.progress.weapon = 8; g.progress.weapons[8] = 1;
      g.magazines[8].ammo = 0; g.magazines[8].remaining = 1.2;
      let drift = 0;
      for (let i = 0; i < 180; i++) {
        g.enemies = i % 3 ? [enemy(9100 + i, g.player.x + Math.cos(i) * 500, g.player.y + Math.sin(i) * 500)] : [];
        g.player.x += .5; g.time += 1 / 60;
        updateAimLock(g); r.draw();
        const v = r.view;
        drift = Math.max(drift, Math.abs(v.x + v.w / 2 - g.player.x), Math.abs(v.y + v.h / 2 - g.player.y - 30));
        if (v.zoom !== (r.width < 500 ? .6 : .75)) throw Error('狙击倍率不固定');
      }
      if (drift > 1e-7) throw Error('狙击镜头随目标偏移');
      a.refresh();
      return { width: r.width, frames: 180, drift, sniperZoom: r.view.zoom, pulseZoom: pulse.zoom, viewGain: r.view.w / pulse.w };
    }));
    await page.screenshot({ path: `output/playwright/sniper-fixed-${width}.png` });
  }
  if (errors.length) throw Error(errors.join(';'));
  return { results, errors };
}
