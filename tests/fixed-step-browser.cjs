// 使用正式应用和绘制器采样中间帧；独立浏览器存档，不更改用户游戏数据。
async page => {
  if (new URL(page.url()).port !== '4175') throw Error('仅允许本地4175端口');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const version = await page.evaluate(async () => (await import('/src/platform/performance-monitor.js')).DIAGNOSTICS_VERSION);
  if (version !== '2026-10-27-fixed-logic-25-v2') throw Error('服务不是本次分帧版本：' + version);
  const cdp = await page.context().newCDPSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy(); window.a?.destroy(); localStorage.clear();
    const { STORAGE_KEYS, WORLD_SAVE_REVISION } = await import('/src/platform/storage.js');
    const { freshProgress } = await import('/src/progression/progress.js');
    const { MAINLINE_IDS } = await import('/src/config/mainline.js');
    const p = freshProgress(); p.arrival = { version: 2, phase: 'complete', keys: true };
    p.mainline.completed = [...MAINLINE_IDS]; p.mainline.phase = 'complete'; p.living.position = { x: 1600, y: 400 };
    p.vehicleHulls.fill(1); p.weapons.fill(1); p.weapon = 2;
    localStorage.setItem(STORAGE_KEYS.worldRevision, WORLD_SAVE_REVISION);
    localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
    localStorage.setItem('forest-patrol-audio-v1', JSON.stringify({ enabled: false }));
    localStorage.setItem('forest-patrol-gameplay-v1', JSON.stringify({ pauseOnBlur: false }));
    window.a = (await import('/src/app/create-app.js')).createApplication({ random: () => .5 });
    window.samples = [];
    const draw = a.renderer.draw.bind(a.renderer);
    // 记录真正送入Canvas绘制器的值，同时检查绘制没有改写逻辑玩家位置。
    a.renderer.draw = function (view) {
      const g = a.game, before = [g.player.x, g.player.y, g.time, g.player.hp, g.magazines[2].ammo];
      draw(view);
      const after = [g.player.x, g.player.y, g.time, g.player.hp, g.magazines[2].ammo];
      if (before.some((v, i) => v !== after[i])) throw Error('绘制修改了权威战斗状态');
      samples.push({ at: performance.now(), t: g.time, x: g.player.x, y: g.player.y,
        renderX: view.player.x, renderY: view.player.y, animation: view.player.bodyAnimation.moveTime,
        steps: this.frameTiming.steps, alpha: this.frameTiming.alpha });
      if (samples.length > 1200) samples.shift();
    };
  });
  await page.locator('#start').click(); await page.waitForFunction(() => a.menu.page === 'game');
  await page.evaluate(() => { a.game.player.invincible = 1e6; a.game.encounterTimer = 999; a.game.mainlineTalkDelay = 999; });
  await page.waitForTimeout(1500);
  const results = [];
  for (const night of [false, true]) {
    await page.evaluate(async night => {
      const env = a.environment;
      Object.assign(env, { time: night ? 'night' : 'day', weather: 'sun', forestSeason: 'spring', livingPreview: true, autoTime: false, autoWeather: false });
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      a.renderer.light = new EnvironmentTransition(env, performance.now());
      const { SceneTone } = await import('/src/rendering/scene-tone.js'); a.renderer.tone = new SceneTone(env, performance.now());
      a.game.player.x = 1600; a.game.player.y = 400; a.refresh(); samples.length = 0; a.renderer.profiler.clear();
    }, night);
    const clockStart = await page.evaluate(() => ({ wall: performance.now(), game: a.game.time }));
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(10000);
    const clockEnd = await page.evaluate(() => ({ wall: performance.now(), game: a.game.time }));
    const wallSeconds = (clockEnd.wall - clockStart.wall) / 1000, gameSeconds = clockEnd.game - clockStart.game;
    if (gameSeconds > wallSeconds + .08 || gameSeconds < wallSeconds - .5)
      throw Error('现实与模拟时钟不同步：' + JSON.stringify({ wallSeconds, gameSeconds }));
    // 连续截图用于核对真实身体帧、独立枪和脚底，不用静帧模拟运动。
    for (let i = 0; i < 3; i++) {
      await page.screenshot({ path: `output/playwright/fixed-step/${night ? 'night' : 'day'}-motion-${i}.png` });
      await page.waitForTimeout(100);
    }
    await page.keyboard.up('ArrowRight'); await page.waitForTimeout(300);
    const result = await page.evaluate(night => {
      const changed = samples.filter((s, i) => i && s.t === samples[i - 1].t &&
        Math.hypot(s.renderX - samples[i - 1].renderX, s.renderY - samples[i - 1].renderY) > .01);
      const result = { night, samples: samples.length, interpolatedOnlyFrames: changed.length,
        example: changed.slice(0, 8), summary: a.renderer.profiler.summary(), assets: a.renderer.diagnosticInfo().catAnimation };
      if (changed.length < 10) throw Error('逻辑未变时缺少真实中间运动帧：' + JSON.stringify(result));
      if (result.summary.logicFps < 23 || result.summary.logicFps > 27) throw Error('实际逻辑频率偏离25Hz：' + JSON.stringify(result.summary));
      return result;
    }, night);
    results.push({ ...result, wallSeconds, gameSeconds });
    await page.evaluate(() => {
      const g = a.game; g.progress.vehicleIndex = 2; if (!g.vehicle.active) g.summonVehicle();
      for(let i=0;i<4;i++)g.spawnEnemy(i*Math.PI/2,120);
      for(const e of g.enemies){e.hp=e.maxHp=1e6;e.damage=0;}
    });
    for (const width of [320, 390, 1200]) {
      await page.setViewportSize({ width, height: 844 });
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: width > 400 ? 1 : 2, mobile: width < 400 });
      await page.waitForTimeout(350);
      const layout = await page.evaluate(() => ({ width: innerWidth, canvas: a.renderer.width }));
      if (layout.width !== width) throw Error('测试视口宽度不匹配：' + JSON.stringify(layout));
      await page.screenshot({ path: `output/playwright/fixed-step/${night ? 'night' : 'day'}-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await page.evaluate(() => { if(a.game.vehicle.active)a.game.summonVehicle(); a.game.enemies=[]; });
  }
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  const paused = await page.evaluate(() => ({ state: a.game.state, time: a.game.time, x: a.game.player.x }));
  await page.waitForTimeout(500);
  const afterPause = await page.evaluate(() => ({ state: a.game.state, time: a.game.time, x: a.game.player.x }));
  if (JSON.stringify(paused) !== JSON.stringify(afterPause)) throw Error('设置暂停时仍推进了战斗');
  if (errors.length) throw Error(errors.join('\n'));
  await cdp.detach();
  return { version, results, paused, afterPause, errors };
}
