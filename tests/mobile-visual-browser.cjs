// 隔离浏览器对比旧版河流像素及雨场数据；旧模块从修改前提交导出到忽略的 output 目录。
async (page) => {
  if (!['4174', '4175'].includes(new URL(page.url()).port)) throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(async () => (await import('/src/main.js')).application.destroy());
  const comparison = await page.evaluate(async () => {
    const { RiverRenderer } = await import('/src/rendering/river.js');
    const { RiverRenderer: LegacyRiver } = await import('/output/playwright/mobile-performance/legacy-river.js');
    const { RainRenderer } = await import('/src/rendering/rain.js');
    const { RainRenderer: LegacyRain } = await import('/output/playwright/mobile-performance/legacy-rain.js');
    const { visibleBodies } = await import('/src/world/coordinates.js');
    const app = (await import('/src/main.js')).application;
    const river = new RiverRenderer(), legacy = new LegacyRiver();
    const rain = new RainRenderer(), oldRain = new LegacyRain(), cases = [];
    const canvases = [document.createElement('canvas'), document.createElement('canvas')];
    const counters = { strips: 0, full: 0 };
    for (const [renderer, key] of [[river, 'strips'], [legacy, 'full']]) {
      // 新版按需水块不再暴露整河图层，直接读取诊断累计值。
      if (renderer.stats) continue;
      for (const region of renderer.layers) for (const layer of region.layers) {
        const draw = layer.ctx.drawImage.bind(layer.ctx);
        layer.ctx.drawImage = (...args) => { if (args.length === 9 && args[4] === 2) counters[key]++; draw(...args); };
      }
    }
    // 覆盖瀑布、木桥、下游、同帧滚动与昼夜切换；世界接缝由同一河道局部坐标绘制。
    for (const [width, y, time, night] of [
      [320, 330, 2, 0], [390, 540, 2, 0], [580, 600, 2, 1],
      [390, 1400, 2.5, 0.5], [320, 2300, 3, 1], [390, 0, 3, 1],
      [580, 700, 3, 0], [320, 2100, 3, 1],
    ]) {
      const view = { x: 1060, y, w: width / 0.85, h: 844 / 0.85, zoom: 0.85 };
      const before = { ...counters };
      for (let i = 0; i < 2; i++) {
        const canvas = canvases[i]; canvas.width = width * 2; canvas.height = 844 * 2;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        c.setTransform(1.7, 0, 0, 1.7, -view.x * 1.7, -view.y * 1.7);
        [river, legacy][i].draw(c, time, night, 1, false, view);
      }
      const images = canvases.map(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
      let sum = 0, changed = 0;
      for (let i = 0; i < images[0].length; i++) {
        const difference = Math.abs(images[0][i] - images[1][i]);
        sum += difference; if (difference > 3) changed++;
      }
      const mean = sum / images[0].length, fraction = changed / images[0].length;
      // 八像素水纹采样允许轻微位移差异；桥面遮挡与动画另由 render-pipeline-visual 验证。
      if (mean > 0.6 || fraction > 0.02) throw Error(`河流像素差异过大：${width}/${y} mean=${mean} changed=${fraction}`);
      const trees = visibleBodies(app.game.trees, view);
      for (const weather of [[0.6, 0], [1, 1]]) {
        rain.prepare(time, view, trees, ...weather, false);
        oldRain.prepare(time, view, trees, ...weather, false);
        if (JSON.stringify(rain.drops) !== JSON.stringify(oldRain.drops)) throw Error('雨滴或树冠落点变化');
      }
      if (river.stats) counters.strips = river.stats().strips;
      cases.push({ width, y, night, mean, changedFraction: fraction,
        strips: counters.strips - before.strips, legacyStrips: counters.full - before.full });
    }
    return { cases, counters, terrainCache: rain.surfaces.terrain.size };
  });
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(async width => {
      const app = (await import('/src/main.js')).application;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { CombatCamera } = await import('/src/rendering/camera.js');
      const r = app.renderer, g = app.game;
      g.player.x = width === 580 ? 3595 : 1080;
      g.player.y = width === 580 ? 2790 : 650;
      g.progress.weapon = 0; g.state = 'playing'; g.enemies = [];
      r.environment = { time: width === 390 ? 'night' : 'day', weather: 'thunder' };
      r.light = new EnvironmentTransition(r.environment, performance.now());
      r.camera = new CombatCamera(); r.resize(); g.setViewport(width, 844);
      g.previewTime = 8; app.refresh(); r.draw();
      if (document.documentElement.scrollWidth > innerWidth) throw Error('手机页面横向溢出');
    }, width);
    await page.screenshot({ path: `output/playwright/mobile-performance/scene-${width}.png` });
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { comparison, screenshots: [320, 390, 580], errors };
}
