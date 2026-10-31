// 隔离端口验证真实直升机形态、两岸追兵和落地恢复，并保存手机尺寸画面。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [], layouts = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.clear();
  });
  await page.reload();
  await page.locator('#start').click();
  const result = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const { riverXAt, isWaterBlocked } = await import('/src/world/river-geometry.js');
    const { worldDistance } = await import('/src/world/coordinates.js');
    a.destroy();
    const g = a.game;
    g.progress.vehicleHulls[2] = 1; g.progress.vehicleIndex = 2;
    g.reset(); g.start();
    g.player.x = riverXAt(1100); g.player.y = 1100;
    g.enemies = []; g.spawnTimer = g.attackTimer = 999;
    g.updateWaves = () => {};
    if (!g.summonVehicle() || !g.player.flying) throw Error('直升机未起飞');
    const hp = g.vehicle.hp;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const e = g.spawnEnemy(0, 200);
        Object.assign(e, { x: g.player.x + side * 220, y: 1100 + (i - 2.5) * 60,
          speed: 80, testSide: side, flying: false, species: 'slime' });
      }
    }
    for (let i = 0; i < 600; i++) g.update(1 / 60);
    if (g.vehicle.hp !== hp) throw Error('河面悬停受到地面扑击伤害');
    for (const e of g.enemies) {
      if (isWaterBlocked(e.x, e.y, 12)) throw Error('追兵进入河道');
      if (e.groundPursuit?.side !== e.testSide) throw Error('追兵意外更换岸侧');
      if (Math.abs(e.y - 1100) > 260) throw Error('追兵仍在追桥头');
      if (worldDistance(e, g.player) < 310) throw Error('追兵没有退出手枪射程');
    }
    return { enemies: g.enemies.length, hp, finalHp: g.vehicle.hp };
  });
  for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 580, height: 928 }]) {
    await page.setViewportSize(size);
    const view = await page.evaluate(async size => {
      const a = (await import('/src/main.js')).application;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      Object.assign(a.environment, { time: 'day', weather: 'sun', autoTime: false, autoWeather: false });
      a.renderer.light = new EnvironmentTransition(a.environment, performance.now());
      a.renderer.resize(); a.game.setViewport(size.width, size.height);
      a.renderer.draw(); a.refresh();
      if (document.documentElement.scrollWidth > innerWidth) throw Error('手机横向溢出');
      return a.renderer.view;
    }, size);
    layouts.push({ ...size, view });
    await page.screenshot({ path: `output/playwright/shore-ai/hover-${size.width}.png` });
  }
  const movement = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    const { riverXAt, isWaterBlocked } = await import('/src/world/river-geometry.js');
    const { worldDistance } = await import('/src/world/coordinates.js');
    for (let i = 0; i < 600; i++) {
      g.player.y += 0.5; g.player.x = riverXAt(g.player.y);
      g.update(1 / 60);
    }
    if (g.enemies.some(e => isWaterBlocked(e.x, e.y, 12))) throw Error('沿岸追踪进入水域');
    const guarding = g.enemies.filter(e => worldDistance(e, g.player) >= 310).length;
    if (guarding !== 12) throw Error('追兵没有保持安全距离');
    g.player.x = riverXAt(g.player.y) + 190;
    for (let i = 0; i < 40; i++) g.update(1 / 60);
    if (g.enemies.some(e => e.groundPursuit)) throw Error('上岸后未恢复普通追击');
    a.renderer.draw(); a.refresh();
    return { guarding, resumed: true };
  });
  await page.screenshot({ path: 'output/playwright/shore-ai/return-to-land.png' });
  if (errors.length) throw Error(errors.join(';'));
  return { result, movement, layouts, errors };
}
