// 隔离端口检查山湖昼夜、实体遮挡、跨地块连续性、地图预览和手机画幅。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  await page.reload();
  const errors = [], shots = [];
  page.on('pageerror', error => errors.push(error.message));
  const positions = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy(); a.game.start(); a.game.enemies = []; a.game.boss = null;
    const { NATURAL_TERRAIN: t } = await import('/src/world/natural-terrain.js');
    const mountain = t.mountains[0], lake = t.lakes[0], lake2 = t.lakes[1];
    return [['mountain', mountain.x - 95, mountain.y + 70], ['mountain-back', mountain.x, mountain.y - 75],
      ['lake', lake.x - 40, lake.y + lake.ry + 65], ['lake-south', lake2.x - 60, lake2.y + lake2.ry + 65],
      ['shore', 1150, 1010], ['night', mountain.x - 95, mountain.y + 70], ['lake-night', lake.x - 40, lake.y + lake.ry + 65]];
  });
  for (const width of [390, 320, 580]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [name, x, y] of width === 390 ? positions : positions.filter(p => ['mountain', 'lake'].includes(p[0]))) {
      await page.evaluate(async ({ name, x, y }) => {
        const a = (await import('/src/main.js')).application, r = a.renderer, g = a.game;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        const night = name.includes('night');
        const env = { time: night ? 'night' : 'day', weather: night ? 'rain' : 'sun', autoTime: false, autoWeather: false };
        Object.assign(a.environment, env); r.light = new EnvironmentTransition(env); r.tone = new SceneTone(env);
        g.player.x = x; g.player.y = y; g.time = g.previewTime = 12;
        r.resize(); g.setViewport(r.width, r.height); a.refresh(); r.draw();
        if (document.documentElement.scrollWidth > innerWidth) throw Error('手机横向溢出');
        const info = r.diagnosticInfo();
        if (info.groundCache.count > info.groundCache.limit || info.naturalTerrain.count > 3) throw Error('地貌缓存超限');
      }, { name, x, y });
      const path = `output/playwright/natural-terrain/${name}-${width}.png`;
      await page.screenshot({ path }); shots.push(path);
    }
  }
  const checks = await page.evaluate(async () => {
    const { NATURAL_TERRAIN: t } = await import('/src/world/natural-terrain.js');
    const { paintGround } = await import('/src/rendering/ground-art.js');
    const { GroundCache } = await import('/src/rendering/ground-cache.js');
    const { drawMountain, naturalAtlasStats } = await import('/src/rendering/natural-terrain.js');
    const errors = [];
    for (const item of t.obstacles) {
      const view = { x: Math.floor(item.x - 350), y: Math.floor(item.y - 260), w: 700, h: 520 };
      const direct = document.createElement('canvas'), tiled = document.createElement('canvas');
      direct.width = tiled.width = view.w; direct.height = tiled.height = view.h;
      const a = direct.getContext('2d'), b = tiled.getContext('2d');
      a.translate(-view.x, -view.y); b.translate(-view.x, -view.y);
      paintGround(a); new GroundCache().draw(b, view, 0);
      const p = a.getImageData(0, 0, view.w, view.h).data, q = b.getImageData(0, 0, view.w, view.h).data;
      let error = 0; for (let i = 0; i < p.length; i++) error += Math.abs(p[i] - q[i]);
      error /= p.length; errors.push({ id: item.id, error });
      if (error > 0.8) throw Error(`湖岸或山脚地块不连续：${item.id} ${error}`);
    }
    // 孤立画布上的山体确有像素，屋后透显在日夜混合时不会叠加变深。
    const c = document.createElement('canvas'); c.width = 400; c.height = 400;
    const ctx = c.getContext('2d'), mountain = { ...t.mountains[0], x: 200, y: 320 };
    drawMountain(ctx, mountain); const full = ctx.getImageData(0, 0, 400, 400).data;
    const sample = full.findIndex((v, i) => i % 4 === 3 && v === 255);
    if (sample < 0) throw Error('山体图集缺失');
    for (const night of [0, 0.5, 1]) {
      ctx.clearRect(0, 0, 400, 400); drawMountain(ctx, mountain, night, { x: 200, y: 250 });
      const alpha = ctx.getImageData(0, 0, 400, 400).data[sample];
      if (alpha < 145 || alpha > 151) throw Error('山后透显异常');
    }
    const count = naturalAtlasStats().count;
    drawMountain(ctx, { ...mountain, x: mountain.x + 3600 });
    if (naturalAtlasStats().count !== count) throw Error('周期镜像重复生成山体图集');
    const map = document.createElement('canvas'); map.id = 'terrain-review-map'; map.width = 900; map.height = 700;
    map.style.cssText = 'position:fixed;inset:0;z-index:99999;width:900px;height:700px';
    new GroundCache().drawMap(map.getContext('2d'), 900, 700); document.body.append(map);
    return { ground: errors, atlas: naturalAtlasStats(), mountainOcclusion: true };
  });
  await page.setViewportSize({ width: 900, height: 700 });
  await page.locator('#terrain-review-map').screenshot({ path: 'output/playwright/natural-terrain/map.png' });
  await page.locator('#terrain-review-map').evaluate(element => element.remove());
  if (errors.length) throw Error(errors.join('; '));
  return { shots, checks, errors };
}
