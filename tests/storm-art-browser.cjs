// 实际 Canvas 验证图集取帧、雨场表面、光影、移动端输入与帧耗时，保存视觉回归截图。
async (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await page.locator('#environment-button').click();
  await page.locator('#auto-time').uncheck();
  await page.locator('#auto-weather').uncheck();
  await page.locator('button[data-time="day"]').click();
  await page.locator('button[data-weather="thunder"]').click();
  await page.locator('#environment-ok').click();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    window.stormTest = (await import('/src/main.js')).application;
    stormTest.game.player.invincible = 0;
    stormTest.game.spawnTimer = 999;
    stormTest.game.enemies = [];
    stormTest.game.attackTimer = 999;
  });
  await page.waitForFunction(() => stormTest.renderer.storm.flash > 0.85, null, { timeout: 13000 });
  await page.screenshot({ path: 'output/playwright/storm-lightning-mobile.png' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'output/playwright/storm-rain-mobile.png' });
  // 雷雨画层不会吞掉真实鼠标摇杆输入，弹窗关闭仍恢复战斗。
  const pad = await page.locator('#joystick').boundingBox();
  await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2);
  await page.mouse.down();
  await page.mouse.move(pad.x + pad.width * 0.75, pad.y + pad.height / 2);
  await page.waitForTimeout(100);
  if (!(await page.locator('#stick').getAttribute('style')).includes('translate'))
    throw Error('雨层阻挡摇杆');
  await page.mouse.up();
  await page.locator('#environment-button').click();
  await page.locator('#environment-ok').click();
  await page.waitForFunction(() => stormTest.game.state === 'playing');
  const result = await page.evaluate(async () => {
    const { getLightningAtlas, LIGHTNING_ATLAS, getRainAtlas } =
      await import('/src/rendering/weather-atlas.js');
    const { RainRenderer } = await import('/src/rendering/rain.js');
    const { StormCycle } = await import('/src/world/storm.js');
    const { EnvironmentTransition } = await import('/src/world/environment.js');
    const { BRIDGE } = await import('/src/world/river-geometry.js');
    const { rainSample } = await import('/src/world/precipitation.js');
    const spec = LIGHTNING_ATLAS,
      atlas = getLightningAtlas(0);
    if (getLightningAtlas(3) !== atlas || getRainAtlas() !== getRainAtlas())
      throw Error('天气图集重复分配');
    const ctx = atlas.getContext('2d');
    const energy = [0, 4, 7, 12, 17].map((frame) => {
      const pixels = ctx.getImageData(
        (frame % spec.columns) * spec.width,
        Math.floor(frame / spec.columns) * spec.height,
        spec.width,
        spec.height,
      ).data;
      let sum = 0;
      for (let i = 3; i < pixels.length; i += 4) sum += pixels[i];
      return sum;
    });
    if (energy[0] >= energy[2] || energy[3] >= energy[2] || energy[4] !== 0)
      throw Error('序列帧生长或消退错误');
    const rain = new RainRenderer();
    const view = { x: 800, y: 500, w: 650, h: 700, zoom: 1 };
    rain.prepare(3, view, [], 1, 1, false);
    const heavyCount = rain.drops.length;
    if (
      !rain.drops.some((d) => d.surface === 'water') ||
      !rain.drops.some((d) => d.surface === 'path')
    )
      throw Error('缺少水面或道路受雨表面');
    if (
      rain.drops.some(
        (d) =>
          d.surface === 'water' &&
          d.x > BRIDGE.x + 15 &&
          d.x < BRIDGE.x + BRIDGE.width - 15 &&
          d.y > BRIDGE.y + 15 &&
          d.y < BRIDGE.y + BRIDGE.height - 15,
      )
    )
      throw Error('桥上出现水面圆波');
    const location = rainSample(15, 9, 3, 1);
    rain.prepare(3, view, [{ x: location.x, y: location.y, size: 1, hp: 55 }], 1, 1, false);
    if (!rain.drops.some((d) => d.surface === 'canopy')) throw Error('树冠缺少雨滴撞击');
    rain.prepare(3, view, [], 1, 0, false);
    const lightCount = rain.drops.length;
    if (heavyCount <= lightCount) throw Error('雷雨与小雨密度相同');
    rain.prepare(100000, view, [], 1, 1, false);
    if (rain.drops.length !== heavyCount) throw Error('雨滴缓存随时间增长');
    rain.prepare(3, view, [], 1, 1, true);
    if (rain.drops.length) throw Error('低动态仍创建雨滴');
    // 停止应用循环但保留生产绘制器，按真实帧序列生成比较图。
    stormTest.destroy();
    stormTest.game.state = 'playing';
    stormTest.refresh();
    const r = stormTest.renderer,
      g = stormTest.game;
    r.environment.weather = 'thunder';
    r.environment.time = 'day';
    r.light = new EnvironmentTransition(r.environment, performance.now());
    const sheet = document.createElement('canvas');
    sheet.width = 1170;
    sheet.height = 900;
    const s = sheet.getContext('2d');
    s.fillStyle = '#263e46';
    s.fillRect(0, 0, 1170, 900);
    const cycle = new StormCycle();
    cycle.sample(0, true);
    for (let i = 0; i < 3; i++) {
      r.storm = cycle.sample([2085, 2290, 2580][i], true);
      g.previewTime = 3;
      r.draw();
      s.drawImage(r.canvas, 0, 0, r.canvas.width, r.canvas.height, i * 390, 44, 390, 844);
      s.fillStyle = '#e5f0ed';
      s.font = 'bold 16px sans-serif';
      s.fillText(['引导放电', '主干与分叉亮起', '余辉消退'][i], i * 390 + 20, 28);
    }
    sheet.id = 'storm-sheet';
    sheet.style = 'position:fixed;inset:0;z-index:9999;width:1170px;height:900px';
    document.body.append(sheet);
    // 测量实际 390 像素画布的连续帧，不计一次性的图集生成开销。
    getLightningAtlas(1);
    getLightningAtlas(2);
    const timings = [];
    for (let i = 0; i < 45; i++) {
      g.previewTime = i / 60;
      r.storm = cycle.sample(2200 + i * 5, true);
      const start = performance.now();
      r.draw();
      timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    return {
      frames: 18,
      atlasCached: true,
      energy,
      heavyCount,
      lightCount,
      medianDrawMs: timings[22],
      p95DrawMs: timings[42],
      surfaces: true,
    };
  });
  await page.setViewportSize({ width: 1170, height: 900 });
  await page.screenshot({ path: 'output/playwright/storm-animation-sheet.png' });
  await page.reload();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => {
    window.stormReduced = (await import('/src/main.js')).application;
  });
  await page.waitForTimeout(3000);
  if (
    await page.evaluate(
      () =>
        stormReduced.renderer.storm.frame !== -1 || stormReduced.renderer.rain.drops.length !== 0,
    )
  )
    throw Error('减少动态未关闭闪电与降雨');
  if (
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    )
  )
    throw Error('窄屏溢出');
  await page.screenshot({ path: 'output/playwright/storm-reduced-mobile.png' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (errors.length) throw Error(errors.join(';'));
  return { ...result, joystick: true, mobileOverflow: false, reducedMotion: true, errors };
}
