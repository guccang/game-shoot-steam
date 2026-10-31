// 隔离端口复核每块地名牌的正式绘制，并在真实 HUD 下检查林坡、角色、怪物和载具昼夜同屏。
async (page) => {
  if (new URL(page.url()).port !== '4207') throw Error('仅允许隔离端口 4207');
  const errors = [], shots = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const { catSprites } = await import('/src/rendering/cat-animation.js');
    if (!await catSprites.load()) throw Error('角色资源缺失');
    a.game.state = 'playing'; a.game.boss = null; a.game.switchMap('jiuzhaigou');
    a.game.update = dt => { a.game.previewTime += dt; }; a.game.state = 'playing';
  });
  // 逐站记录真正提交给 Canvas 的文字，确认所有地名牌都接入正式场景且未被裁剪掉。
  const signs = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const { JIUZHAIGOU_SIGNPOSTS } = await import('/src/world/jiuzhaigou.js');
    const results = [], ctx = a.renderer.c, original = ctx.fillText;
    for (const sign of JIUZHAIGOU_SIGNPOSTS) {
      const labels = [];
      ctx.fillText = function (label, ...args) { labels.push(label); return original.call(this, label, ...args); };
      try {
        a.game.player.x = sign.x + 110; a.game.player.y = sign.y + 60;
        a.renderer.camera.setZoomStep(2); a.renderer.draw();
        if (!labels.includes(sign.zone.name) || !labels.includes(sign.subtitle)) throw Error(`未绘制 ${sign.zone.name}`);
        results.push(sign.zone.name);
      } finally { ctx.fillText = original; }
    }
    return results;
  });
  for (const [site, x, y] of [['five-flower', 710, 780], ['nuorilang', 1510, 1640], ['rize-slope', 850, 1680]]) {
    for (const night of [false, true]) {
      await page.setViewportSize({ width: 580, height: 900 });
      await page.evaluate(async ({ x, y, night }) => {
        const a = (await import('/src/main.js')).application, g = a.game, r = a.renderer;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        const { spawnEnemy } = await import('/src/core/enemy-manager.js');
        Object.assign(a.environment, { time: night ? 'night' : 'day', weather: 'sun', autoTime: false, autoWeather: false });
        r.light = new EnvironmentTransition(a.environment); r.tone = new SceneTone(a.environment);
        Object.assign(g.player, { x, y }); g.enemies = []; spawnEnemy(g, 2.4, 150); spawnEnemy(g, 3.5, 180);
        if (!g.vehicle.active) g.summonVehicle();
        g.state = 'playing'; r.camera.setZoomStep(2); r.resize(); a.refresh(); r.draw();
      }, { x, y, night });
      await page.waitForTimeout(2800);
      const path = `output/playwright/landmarks-${site}-${night ? 'night' : 'day'}.png`;
      await page.locator('#game-frame').screenshot({ path }); shots.push(path);
    }
  }
  // 新增林坡案例连续取样正式绘制器；静态路牌不要求运动，树冠风动仍由原时钟驱动。
  const frames = await page.evaluate(async () => {
    const { renderVisualCase } = await import('/src/rendering/visual-review.js');
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 320;
    const ctx = canvas.getContext('2d'), results = [];
    for (const id of ['jiuzhaigou-landmarks-day', 'jiuzhaigou-landmarks-night']) {
      const hashes = [];
      for (const phase of [0, .125, .25, .375]) {
        ctx.clearRect(0, 0, 480, 320); await renderVisualCase(ctx, id, phase);
        hashes.push(ctx.getImageData(0, 0, 480, 320).data.reduce((h, v) => (h * 31 + v) >>> 0, 0));
      }
      if (new Set(hashes).size < 2) throw Error(`林坡连续帧未改变 ${id}`);
      results.push({ id, hashes });
    }
    return results;
  });
  if (errors.length) throw Error(errors.join('\n'));
  return { signs, frames, shots, errors };
}
