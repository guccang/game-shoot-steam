// 正式手机循环的昼夜持续负载采样；在独立浏览器会话运行，不读取用户存档。
async page => {
  if (new URL(page.url()).port !== '4175') throw Error('仅允许本地测试端口4175');
  const version = await page.evaluate(async () => (await import('/src/platform/performance-monitor.js')).DIAGNOSTICS_VERSION);
  if (version !== '2026-10-27-fixed-logic-25-v2') throw Error('测试服务未提供本次优化版本：' + version);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await page.evaluate(async () => {
    window.a?.destroy(); (await import('/src/main.js')).application.destroy(); localStorage.clear();
    const { STORAGE_KEYS, WORLD_SAVE_REVISION } = await import('/src/platform/storage.js');
    localStorage.setItem(STORAGE_KEYS.worldRevision, WORLD_SAVE_REVISION);
    const { freshProgress } = await import('/src/progression/progress.js');
    const { MAINLINE_IDS } = await import('/src/config/mainline.js');
    const p = freshProgress(); p.arrival = { version: 2, phase: 'complete', keys: true };
    p.mainline.completed = [...MAINLINE_IDS]; p.mainline.phase = 'complete'; p.living.position = { x: 1600, y: 400 };
    localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
    localStorage.setItem('forest-patrol-audio-v1', JSON.stringify({ enabled: false }));
    localStorage.setItem('forest-patrol-gameplay-v1', JSON.stringify({ pauseOnBlur: false }));
    window.a = (await import('/src/app/create-app.js')).createApplication({ random: () => .5 });
  });
  await page.locator('#start').click(); await page.waitForFunction(() => a.menu.page === 'game');
  await page.evaluate(() => { a.game.player.invincible = 1e6; a.game.encounterTimer = 999; a.game.mainlineTalkDelay = 999; });
  const results = [];
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    for (const night of [false, true]) {
      await page.evaluate(async night => {
        const env = a.environment;
        Object.assign(env, { time: night ? 'night' : 'day', weather: night ? 'thunder' : 'sun',
          forestSeason: 'spring', livingPreview: true, autoTime: false, autoWeather: false });
        a.game.player.x = 1600; a.game.player.y = 400;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        a.renderer.light = new EnvironmentTransition(env, performance.now());
        a.renderer.tone = new SceneTone(env, performance.now());
        a.refresh();
      }, night);
      await page.waitForTimeout(3500);
      await page.evaluate(() => a.renderer.profiler.clear());
      await page.keyboard.down('ArrowRight'); await page.waitForTimeout(4000); await page.keyboard.up('ArrowRight');
      results.push(await page.evaluate(night => {
        const frames = a.renderer.profiler.frames.filter(f => f.state === 'playing');
        // 固定窗口中的均值与尾部耗时用于同机前后对照，不当作真机温度数据。
        const stats = values => { const v = values.toSorted((a, b) => a - b); return {
          mean: v.reduce((s, n) => s + n, 0) / v.length, p95: v[Math.floor(v.length * .95)] }; };
        const sections = {};
        for (const name of ['logic', 'logic.targeting', 'logic.enemyPhysics', 'render', 'ui'])
          sections[name] = stats(frames.map(f => f.sections[name] || 0));
        return { night, count: frames.length, total: stats(frames.map(f => f.total)),
          interval: stats(frames.map(f => f.interval || 0)), sections, x: a.game.player.x,
          trees: a.game.trees.length, cache: a.renderer.ground.stats(),
          frameErrors: a.renderer.profiler.events.filter(e => e.type === 'frame-error') };
      }, night));
      await page.screenshot({ path: `output/playwright/thermal/${night ? 'night' : 'day'}.png` });
    }
    if (errors.length || results.some(r => r.frameErrors.length || !r.count || r.x <= 1602))
      throw Error(JSON.stringify({ errors, results }));
    return { version, cpuThrottle: 4, viewport: [390, 844], dpr: 2, results, errors };
  } finally { await page.keyboard.up('ArrowRight'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.detach(); }
}
