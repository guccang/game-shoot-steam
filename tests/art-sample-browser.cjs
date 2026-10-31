// 固定镜头、时间与实体的美术前后对比；只在隔离端口读取场景，不碰正式存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const tag = new URL(page.url()).searchParams.get('art') || 'before', results = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.clear();
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => { (await import('/src/main.js')).application.destroy(); });
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    for (const scene of ['camp', 'bridge', 'night']) {
      const metrics = await page.evaluate(async ({ scene }) => {
        const a = (await import('/src/main.js')).application, g = a.game, r = a.renderer;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        g.reset(); g.start(); g.enemies = []; g.boss = null; g.player.angle = -0.25;
        g.player.x = scene === 'camp' ? 900 : 1190;
        g.player.y = scene === 'camp' ? 700 : 825;
        g.time = g.previewTime = 12;
        const env = { time: scene === 'night' ? 'night' : 'day', weather: scene === 'night' ? 'rain' : 'sun',
          autoTime: false, autoWeather: false };
        Object.assign(a.environment, env);
        r.light = new EnvironmentTransition(env, performance.now());
        r.tone = new SceneTone(env, performance.now());
        r.resize(); g.setViewport(r.width, r.height); a.refresh();
        // 预热后只计已缓存绘制，单独返回缓存生成量和字节数。
        for (let i = 0; i < 10; i++) r.draw();
        const times = [];
        for (let i = 0; i < 90; i++) {
          g.time = g.previewTime = 12 + i / 60;
          const start = performance.now(); r.draw(); times.push(performance.now() - start);
        }
        g.time = g.previewTime = 12; r.draw();
        times.sort((x, y) => x - y);
        return { mean: times.reduce((x, y) => x + y) / times.length,
          p95: times[Math.floor(times.length * 0.95)], rendering: r.diagnosticInfo() };
      }, { scene });
      await page.screenshot({ path: `output/playwright/art-sample/${tag}-${scene}-${width}.png` });
      results.push({ width, scene, ...metrics });
    }
  }
  // 检查新增水色没有破坏桥面遮罩、动态更新和减少动态模式。
  const waterChecks = await page.evaluate(async () => {
    const { RiverRenderer } = await import('/src/rendering/river.js');
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 1000;
    const c = canvas.getContext('2d', { willReadFrequently: true }); c.translate(-1050, -300);
    const river = new RiverRenderer(), view = { x: 1050, y: 300, w: 400, h: 1000 };
    river.draw(c, 1, 0, 0, false, view);
    const updates = river.stats().updates, first = c.getImageData(0, 0, 400, 1000).data;
    river.draw(c, 1, 0, 0, false, view);
    if (river.stats().updates !== updates) throw Error('同帧重复更新水纹');
    c.clearRect(1050, 300, 400, 1000); river.draw(c, 2, 0, 0, false, view);
    const second = c.getImageData(0, 0, 400, 1000).data;
    if (first.every((v, i) => v === second[i])) throw Error('水流停止运动');
    if (c.getImageData(200, 410, 1, 1).data[3]) throw Error('水纹覆盖桥面');
    if (c.getImageData(206, 170, 1, 1).data[3]) throw Error('水纹覆盖瀑布岩壁');
    const frozen = river.stats().updates; river.draw(c, 5, 1, 1, true, view);
    if (river.stats().updates !== frozen) throw Error('减少动态仍更新水纹');
    return { bridge: true, rocks: true, animated: true, reducedMotion: true };
  });
  // 手机高清屏按实际设备像素比验证画布和 UI，结束后恢复测试浏览器。
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const highDpi = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.renderer.resize(); a.renderer.draw();
    return { width: innerWidth, dpr: devicePixelRatio };
  });
  if (highDpi.width !== 390 || highDpi.dpr !== 2) throw Error('高清屏仿真尺寸不正确');
  await page.screenshot({ path: `output/playwright/art-sample/${tag}-night-dpr2.png` });
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  if (errors.length) throw Error(errors.join(';'));
  return { tag, results, waterChecks, highDpi, errors };
}
