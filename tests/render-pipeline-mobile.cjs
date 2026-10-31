// 真实应用的移动、地图预览、日志导出和缓存上限检查，禁止接触正式存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await page.setViewportSize({ width: 388, height: 748 });
  await page.reload();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('button', { name: /开始巡游|继续巡游/ }).first().click();
  const start = await page.evaluate(async () => {
    const app = (await import('/src/main.js')).application;
    return { x: app.game.player.x, y: app.game.player.y };
  });
  const rect = await page.getByRole('group', { name: '左手移动摇杆' }).boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart',
    touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove',
    touchPoints: [{ x: rect.x + rect.width / 2 + 34, y: rect.y + rect.height / 2 }] });
  await page.waitForTimeout(400);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const moved = await page.evaluate(async start => {
    const app = (await import('/src/main.js')).application;
    return Math.hypot(app.game.player.x - start.x, app.game.player.y - start.y);
  }, start);
  if (moved < 2) throw Error('触屏移动失效');
  // 小地图不再依赖整张背景位图；通过正式 UI 验证可打开。
  await page.locator('#map-button').click();
  if (!(await page.locator('#map-dialog').isVisible())) throw Error('区域地图未打开');
  await page.locator('#close-map').click();
  const shots = [];
  for (const width of [320, 388, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(async width => {
      const app = (await import('/src/main.js')).application;
      app.game.player.x = width === 580 ? 3595 : 1120;
      app.game.player.y = width === 580 ? 2790 : 670;
      const env = { time: width === 388 ? 'night' : 'day',
        weather: width === 388 ? 'thunder' : 'sun', autoTime: false, autoWeather: false };
      Object.assign(app.environment, env);
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      app.renderer.light = new EnvironmentTransition(env, performance.now());
      app.renderer.tone = new SceneTone(env, performance.now());
      app.game.player.invincible = 1e6;
      app.refresh();
    }, width);
    await page.waitForTimeout(120);
    const filters = await page.evaluate(() => ({
      game: getComputedStyle(document.getElementById('game')).filter,
      backdrop: getComputedStyle(document.getElementById('settings-dialog'), '::backdrop').backdropFilter,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    if (filters.game !== 'none' || filters.backdrop !== 'none' || filters.overflow)
      throw Error('滤镜未移除或布局溢出');
    await page.screenshot({ path: `output/playwright/render-pipeline/mobile-${width}.png` });
    shots.push({ width, filters });
  }
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  await page.getByRole('button', { name: '生成当前报告' }).click();
  const report = JSON.parse(await page.getByRole('textbox', { name: '性能诊断报告' }).inputValue());
  if (report.version !== '2026-10-20-render-pipeline-2' || !report.rendering.groundCache ||
      !report.summary.sections['render.tone']) throw Error('新日志字段缺失');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载报告', exact: true }).click();
  await (await download).saveAs('output/playwright/render-pipeline/optimized-report.json');
  const cache = await page.evaluate(async () => {
    const { GroundCache, GROUND_CACHE_LIMIT } = await import('/src/rendering/ground-cache.js');
    const c = document.createElement('canvas'); c.width = c.height = 388;
    const ctx = c.getContext('2d'), cache = new GroundCache();
    // 探索整个地图后缓存仍有界，淘汰再返回不会漏图。
    for (let y = 0; y < 2800; y += 384)
      for (let x = 0; x < 3600; x += 384) {
        ctx.setTransform(1, 0, 0, 1, -x, -y);
        cache.draw(ctx, { x, y, w: 100, h: 100 }, 1);
      }
    if (cache.stats().count > GROUND_CACHE_LIMIT) throw Error('地面缓存无上限');
    const before = cache.stats().builds;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    cache.draw(ctx, { x: 0, y: 0, w: 100, h: 100 }, 0);
    if (cache.stats().builds <= before) throw Error('淘汰块返回后未重建');
    return cache.stats();
  });
  if (errors.length) throw Error(errors.join('\n'));
  return { moved, shots, cache, reportVersion: report.version, errors };
}
