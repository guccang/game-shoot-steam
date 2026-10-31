// 隔离端口验证地形分块、昼夜图集和真实实体排序，并保存手机场景对照图。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [], shots = [], metrics = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy(); a.game.start(); a.game.enemies = []; a.game.boss = null;
  });
  for (const width of [390, 320, 580]) {
    await page.setViewportSize({ width, height: 844 });
    const scenes = width === 390
      ? [['camp', 900, 700], ['wheat', 865, 650], ['house-back', 1000, 556],
        ['house-front', 1000, 606], ['shore', 1160, 950], ['night', 1010, 640],
        ['pine', 650, 2100], ['amber', 2410, 1240], ['seam', -20, -20]]
      : [['camp', 900, 700], ['shore', 1160, 950], ['night', 1010, 640]];
    for (const [name, x, y] of scenes) {
      const stats = await page.evaluate(async ({ name, x, y }) => {
        const a = (await import('/src/main.js')).application, r = a.renderer, g = a.game;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        const env = { time: name === 'night' ? 'night' : 'day',
          weather: name === 'night' ? 'rain' : 'sun', autoTime: false, autoWeather: false };
        Object.assign(a.environment, env);
        r.light = new EnvironmentTransition(env, performance.now());
        r.tone = new SceneTone(env, performance.now());
        g.player.x = x; g.player.y = y; g.player.angle = 0;
        g.time = g.previewTime = 12;
        r.resize(); g.setViewport(r.width, r.height); a.refresh();
        r.draw();
        const times = [];
        for (let i = 0; i < 30; i++) {
          g.previewTime = 12 + i / 60;
          const start = performance.now(); r.draw(); times.push(performance.now() - start);
        }
        if (document.documentElement.scrollWidth > innerWidth) throw Error('出现横向溢出');
        const info = r.diagnosticInfo();
        if (info.groundCache.count > info.groundCache.limit) throw Error('地面缓存超限');
        return { mean: times.reduce((a, b) => a + b) / times.length,
          groundBytes: info.groundCache.bytes, scenery: info.scenery };
      }, { name, x, y });
      const path = `output/playwright/scene-depth/${name}-${width}.png`;
      await page.screenshot({ path }); shots.push(path); metrics.push({ name, width, ...stats });
    }
  }
  const checks = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, r = a.renderer, g = a.game;
    const { EnvironmentTransition } = await import('/src/world/environment.js');
    const { SceneTone } = await import('/src/rendering/scene-tone.js');
    const { paintGround } = await import('/src/rendering/ground-art.js');
    const { GroundCache } = await import('/src/rendering/ground-cache.js');
    const { drawScenery } = await import('/src/rendering/scenery.js');
    const { SCENERY } = await import('/src/world/scenery.js');
    const { WORLD } = await import('/src/world/coordinates.js');
    const day = { time: 'day', weather: 'sun', autoTime: false, autoWeather: false };
    Object.assign(a.environment, day);
    r.light = new EnvironmentTransition(day, performance.now()); r.tone = new SceneTone(day);

    // 比较真实分块与直接地表绘制，覆盖沙岸跨块、路径以及麦田底座。
    const view = { x: 700, y: 450, w: 900, h: 750 };
    const direct = document.createElement('canvas'), tiled = document.createElement('canvas');
    direct.width = tiled.width = view.w; direct.height = tiled.height = view.h;
    const dc = direct.getContext('2d'), tc = tiled.getContext('2d');
    dc.translate(-view.x, -view.y); tc.translate(-view.x, -view.y);
    paintGround(dc); new GroundCache().draw(tc, view, 0);
    const p = dc.getImageData(0, 0, view.w, view.h).data;
    const q = tc.getImageData(0, 0, view.w, view.h).data;
    let error = 0;
    for (let i = 0; i < p.length; i++) error += Math.abs(p[i] - q[i]);
    const groundError = error / p.length;
    if (groundError > 0.8) throw Error(`地表分块不连续：${groundError}`);

    // 图集在孤立透明画布上确认为实体像素，屋后透显同时保留形状和夜间颜色。
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 200;
    const c = canvas.getContext('2d'), house = { kind: 'cottage', x: 100, y: 160, size: 1 };
    drawScenery(c, house, 0);
    const opaque = c.getImageData(0, 0, 240, 200).data;
    c.clearRect(0, 0, 240, 200);
    drawScenery(c, house, 0, { x: 100, y: 145 });
    const behind = c.getImageData(0, 0, 240, 200).data;
    let solid = 0;
    for (let i = 3; i < opaque.length; i += 4) {
      if (opaque[i] !== 255) continue;
      solid++;
      if (behind[i] < 135 || behind[i] > 145) throw Error('屋后角色透显不正确');
    }
    if (solid < 3000) throw Error('建筑图集缺失');
    for (const night of [0.5, 1]) {
      c.clearRect(0, 0, 240, 200);
      drawScenery(c, house, night, { x: 100, y: 145 });
      const tinted = c.getImageData(0, 0, 240, 200).data;
      for (let i = 3; i < opaque.length; i += 4)
        if (opaque[i] === 255 && (tinted[i] < 135 || tinted[i] > 145))
          throw Error('昼夜混合使建筑遮挡加深');
    }

    // 从屋后走到屋前时遮挡平滑恢复，屋侧与飞行角色不误触发整屋透显。
    for (const night of [0, 0.5, 1]) {
      const opacities = [];
      for (const dy of [-15, -9, -6, -3, 0, 5]) {
        c.clearRect(0, 0, 240, 200);
        drawScenery(c, house, night, { x: 100, y: 160 + dy });
        const pixels = c.getImageData(0, 0, 240, 200).data;
        const index = opaque.findIndex((value, i) => i % 4 === 3 && value === 255);
        opacities.push(pixels[index]);
      }
      if (opacities[0] > 145 || opacities[5] !== 255 ||
          opacities.some((alpha, i) => i > 0 && alpha < opacities[i - 1]) ||
          new Set(opacities).size < 5) throw Error('建筑前后遮挡没有连续恢复');
      for (const player of [{ x: 195, y: 145 }, { x: 100, y: 145, flying: true }]) {
        c.clearRect(0, 0, 240, 200); drawScenery(c, house, night, player);
        const pixels = c.getImageData(0, 0, 240, 200).data;
        for (let i = 3; i < opaque.length; i += 4)
          if (opaque[i] === 255 && pixels[i] !== 255) throw Error('屋侧或空中角色导致误透显');
      }
    }

    // 记录正式渲染器实际绘制麦田的顺序，前后行之间必须插入角色实体的绘制。
    // 在 Canvas 方法上临时加只读记录，所有绘制仍调用原实现，结束后恢复。
    const wheatCalls = [], fillCalls = [], context = r.c;
    const originalImage = context.drawImage, originalFill = context.fill;
    context.drawImage = function (image, ...args) {
      if (image.width >= 300 && image.width <= 480 && image.height === 96) {
        wheatCalls.push({ index: fillCalls.length, transformY: this.getTransform().f, alpha: this.globalAlpha });
      }
      return originalImage.call(this, image, ...args);
    };
    context.fill = function (...args) {
      fillCalls.push({ color: this.fillStyle, y: this.getTransform().f });
      return originalFill.apply(this, args);
    };
    try {
      g.player.x = 865; g.player.y = 650;
      r.draw();
    } finally {
      context.drawImage = originalImage; context.fill = originalFill;
    }
    const playerScreenY = (g.player.y - r.view.y) * r.view.zoom * r.dpr;
    const front = wheatCalls.filter(call => call.transformY > playerScreenY + 1);
    const back = wheatCalls.filter(call => call.transformY < playerScreenY - 1);
    if (!front.length || !back.length) throw Error('麦田没有在角色前后分别绘制');
    if (Math.max(...back.map(call => call.index)) >= Math.min(...front.map(call => call.index)))
      throw Error('角色未绘制在前后两排麦田之间');

    // 穿越环形地图后绘制相同麦田，图集数量保持不变且仍有前后行。
    const beforeCount = r.diagnosticInfo().scenery.count;
    g.player.x += WORLD.width; g.player.y += WORLD.height; r.draw();
    if (r.diagnosticInfo().scenery.count !== beforeCount) throw Error('地图镜像重复创建装饰图集');
    const rows = SCENERY.filter(item => item.kind === 'wheat');
    return { groundError, solidHousePixels: solid, wheatRows: rows.length,
      depth: { back: back.length, front: front.length }, periodicAtlas: true };
  });
  if (errors.length) throw Error(errors.join('; '));
  return { shots, metrics, checks, errors };
}
