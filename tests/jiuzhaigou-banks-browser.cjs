// 四处瀑布近景逐帧调用正式绘制器，另检查真实角色、怪物、载具和 HUD 的昼夜同屏。
async (page) => {
  if (new URL(page.url()).port !== '4207') throw Error('只允许隔离端口4207');
  const errors = [], frames = [], diagnostics = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  const shots = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const { catSprites } = await import('/src/rendering/cat-animation.js');
    if (!await catSprites.load()) throw Error('角色资源缺失');
    a.game.state = 'playing'; a.game.boss = null; a.game.switchMap('jiuzhaigou');
    a.game.update = dt => { a.game.previewTime += dt; }; a.game.state = 'playing'; a.refresh();
    const canvas = document.createElement('canvas'); canvas.id = 'bank-review'; canvas.width = 720; canvas.height = 480;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;width:720px;height:480px;'; document.body.append(canvas);
    return [];
  });
  await page.setViewportSize({ width: 900, height: 700 });
  for (const site of ['pearl-falls', 'nuorilang-falls', 'shuzheng-falls', 'lower-falls']) for (const light of ['day', 'night']) {
    const id = `jiuzhaigou-bank-${site}-${light}`;
    frames.push(await page.evaluate(async id => {
      const { renderVisualCase } = await import('/src/rendering/visual-review.js');
      const ctx = document.querySelector('#bank-review').getContext('2d'), hashes = [];
      for (const phase of [0, .125, .25, .375]) {
        ctx.clearRect(0, 0, 720, 480); await renderVisualCase(ctx, id, phase);
        hashes.push(ctx.getImageData(0, 0, 720, 480).data.reduce((h, v) => (h * 31 + v) >>> 0, 0));
      }
      if (new Set(hashes).size < 3) throw Error(`水流连续帧不变化 ${id}`);
      return { id, hashes };
    }, id));
    const path = `output/playwright/soft-banks/${site}-${light}.png`; await page.locator('#bank-review').screenshot({ path }); shots.push(path);
  }
  await page.evaluate(() => document.querySelector('#bank-review').remove());
  for (const width of [320, 390, 1280]) for (const light of ['day', 'night']) {
    await page.setViewportSize({ width, height: 844 });
    diagnostics.push(await page.evaluate(async light => {
      const a = (await import('/src/main.js')).application, g = a.game, r = a.renderer;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      const { spawnEnemy } = await import('/src/core/enemy-manager.js');
      Object.assign(a.environment, { time: light, weather: 'sun', autoTime: false, autoWeather: false });
      r.light = new EnvironmentTransition(a.environment); r.tone = new SceneTone(a.environment);
      g.player.x = 1485; g.player.y = 1625; g.enemies = []; spawnEnemy(g, 2.4, 150); spawnEnemy(g, 3.5, 180);
      if (!g.vehicle.active) g.summonVehicle(); g.state = 'playing'; r.camera.setZoomStep(2); r.resize(); a.refresh(); r.draw();
      return r.diagnosticInfo();
    }, light));
    await page.waitForTimeout(2700);
    const path = `output/playwright/soft-banks/scene-${width}-${light}.png`; await page.screenshot({ path }); shots.push(path);
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { frames, shots, diagnostics, errors };
}
