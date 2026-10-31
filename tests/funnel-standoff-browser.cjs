// 隔离浏览器复现近树混装与目标逼近，保留真实炮体渲染和手机视口。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口 4174');
  const errors = [], results = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 580, height: 928 }]) {
    await page.setViewportSize(size);
    for (const phase of ['near-tree', 'retreat', 'supply']) {
      const result = await page.evaluate(async ({ size, phase }) => {
        const a = (await import('/src/main.js')).application;
        a.destroy();
        const g = a.game, r = a.renderer;
        const { updateFunnel } = await import('/src/combat/funnel.js');
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { funnelFlightBounds } = await import('/src/combat/funnel-movement.js');
        if (phase === 'near-tree') {
          g.progress.weapons.fill(1); g.progress.weapon = 12;
          g.progress.funnelLoadout = [0, 8, 9];
          g.reset(); g.start(); g.setViewport(size.width, size.height);
          g.random = () => .5; g.spawnTimer = 999; g.reducedMotion = false;
          g.enemies = []; g.boss = null;
          const tree = g.trees[0];
          Object.assign(tree, { x: g.player.x, y: g.player.y - 90, hp: 1e8, maxHp: 1e8 });
          g.trees = [tree];
          for (let k = 0; k < 360; k++) g.update(1 / 120);
        } else if (phase === 'retreat') {
          // 靶子沿原炮位逼近，用正式飞控响应，不在测试中直接设置炮体位置。
          g.trees[0].y += 55;
          for (let k = 0; k < 240; k++) updateFunnel(g, 1 / 120);
        } else {
          g.funnel.nodes.forEach(n => Object.assign(n.magazine, { ammo: 0, remaining: n.weapon.reloadTime }));
          for (let k = 0; k < 240; k++) updateFunnel(g, 1 / 120);
        }
        g.projectiles = [];
        const night = phase === 'supply';
        Object.assign(a.environment, { time: night ? 'night' : 'day', weather: night ? 'rain' : 'sun', autoTime: false, autoWeather: false });
        r.light = new EnvironmentTransition(a.environment, performance.now());
        r.resize(); r.draw(); a.refresh();
        const bounds = funnelFlightBounds(g.viewport, 25);
        const tree = g.trees[0];
        const distances = g.funnel.nodes.map(n => Math.hypot(g.player.x + n.x - tree.x, g.player.y + n.y - tree.y + 8));
        if (phase === 'near-tree' && (distances[0] < 110 || distances[1] < 230 || distances[2] < 230))
          throw Error(`混装炮体仍然贴树：${distances}`);
        for (const n of g.funnel.nodes)
          if (n.x < bounds.minX || n.x > bounds.maxX || n.y < bounds.minY || n.y > bounds.maxY)
            throw Error('炮体越界');
        if (document.documentElement.scrollWidth > innerWidth) throw Error('页面横向溢出');
        return { width: size.width, phase, distances: distances.map(Math.round), modes: g.funnel.nodes.map(n => n.flight.mode) };
      }, { size, phase });
      results.push(result);
      await page.screenshot({ path: `output/playwright/funnel-standoff-${size.width}-${phase}.png` });
    }
  }
  if (errors.length) throw Error(errors.join(';'));
  return { results, errors };
}
