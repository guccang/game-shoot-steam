// 桌面键盘与手机触摸实际驱动正式循环，昼夜检查角色、蜘蛛、敌人、载具和界面。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const results = [];
  for (const width of [1280, 390, 320]) for (const time of ['day', 'night']) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await page.bringToFront();
    const start = await page.evaluate(async time => {
      const a = (await import('/src/main.js')).application;
      const { createCrowdScene } = await import('/tests/helpers/crowd-scene.js');
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SeasonTransition } = await import('/src/world/season-transition.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      const { catSprites } = await import('/src/rendering/cat-animation.js');
      if (!await catSprites.load()) throw Error('角色图集缺失');
      const events = a.game.onEvent;
      Object.assign(a.game, createCrowdScene(8, 16)); a.game.onEvent = events;
      const g = a.game;
      g.progress.vehicleHulls[0] = 1; g.progress.vehicle = 0;
      g.summonVehicle();
      Object.assign(a.environment, { time: time === 'night' ? 'dusk' : 'night', forestSeason: 'autumn', weather: 'sun', autoTime: false, autoWeather: false, autoSeason: false });
      a.renderer.light = new EnvironmentTransition(a.environment, performance.now());
      a.renderer.tone = new SceneTone(a.environment, performance.now());
      a.renderer.seasons = new SeasonTransition('autumn', performance.now());
      // 先出舱一只小蛛，实际移动仍完全由后续键盘或触摸输入驱动。
      for (let n = 0; n < 260; n++) g.update(1 / 60, { x: 0, y: 0 });
      a.refresh();
      return { x: g.player.x, y: g.player.y };
    }, time);
    // 通过正式按钮同步环境标签与保存回调，避免夹具只改场景而留下旧 UI。
    await page.locator('#time-picture').click();
    await page.evaluate(async () => {
      const a = (await import('/src/main.js')).application;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      a.renderer.light = new EnvironmentTransition(a.environment, performance.now());
      a.renderer.tone = new SceneTone(a.environment, performance.now());
    });
    if (await page.locator('#time-picture-label').textContent() !== (time === 'night' ? '夜晚' : '白昼')) throw Error('时段标签未同步');
    if (width === 1280) {
      await page.keyboard.down('KeyS'); await page.waitForTimeout(1100); await page.keyboard.up('KeyS');
    } else {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: 420 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2, y: 480 }] });
      await page.waitForTimeout(1100);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await cdp.detach();
    }
    const end = await page.evaluate(async () => {
      const a = (await import('/src/main.js')).application, g = a.game;
      return { x: g.player.x, y: g.player.y, mother: g.spider.mother.ready,
        minions: g.spider.nodes.filter(n => n.spawned).length, state: g.state,
        overflow: document.documentElement.scrollWidth > innerWidth,
        cache: a.renderer.ground.stats(), errors: a.renderer.profiler.events.filter(e => e.type === 'frame-error') };
    });
    if (Math.hypot(end.x - start.x, end.y - start.y) < 30 || !end.mother || end.minions < 1 || end.state !== 'playing' || end.overflow || end.errors.length)
      throw Error(`实际移动或同屏状态异常：${width}/${time} ${JSON.stringify({ start, end })}`);
    await page.screenshot({ path: `output/playwright/movement-stutter/scene-${width}-${time}.png` });
    results.push({ width, time, distance: Math.hypot(end.x - start.x, end.y - start.y), ...end });
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { results, errors };
}
