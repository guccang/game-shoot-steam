// 独立端口验证夜晚随机散点、昼夜可见性与循环镜头，保存手机画面。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅使用隔离测试端口 4174');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('#environment-button').click();
  await page.locator('#auto-time').uncheck();
  await page.locator('#auto-weather').uncheck();
  await page.locator('button[data-time="night"]').click();
  await page.locator('button[data-weather="sun"]').click();
  await page.locator('#environment-ok').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy();
    window.fireflyTest = a;
    a.game.start();
    a.game.enemies = [];
    a.game.attackTimer = a.game.spawnTimer = 999;
    a.game.player.x = 900;
    a.game.player.y = 700;
    Object.assign(a.environment, {
      time: 'night',
      weather: 'sun',
      autoTime: false,
      autoWeather: false,
    });
    const { EnvironmentTransition } = await import('/src/world/environment.js');
    a.renderer.light = new EnvironmentTransition(a.environment, performance.now());
    a.game.previewTime = 0;
    a.renderer.draw();
    a.refresh();
    document.getElementById('toast').hidden = true;
  });
  const frames = [];
  for (const seconds of [4, 8, 12]) {
    frames.push(
      await page.evaluate(async (seconds) => {
        const a = fireflyTest,
          g = a.game,
          field = a.renderer.fireflies.field;
        const times = [];
        for (let t = g.previewTime + 1 / 60; t <= seconds + 1e-8; t += 1 / 60) {
          g.previewTime = t;
          const start = performance.now();
          a.renderer.draw();
          times.push(performance.now() - start);
        }
        const { visibleBodies } = await import('/src/world/coordinates.js');
        const view = a.renderer.view,
          visible = visibleBodies(field.points, { x: view.x, y: view.y, w: view.w, h: view.h }, 0);
        const solitary = visible.length;
        if (!solitary || field.points.length !== 72) throw Error('独立散点数量不正确');
        times.sort((a, b) => a - b);
        return { seconds, solitary, p95: times[Math.floor(times.length * 0.95)] };
      }, seconds),
    );
    await page.screenshot({ path: `output/playwright/fireflies-night-${seconds}.png` });
  }
  const checks = await page.evaluate(async () => {
    const a = fireflyTest,
      g = a.game,
      field = a.renderer.fireflies.field;
    const before = JSON.stringify(field.points);
    g.player.x += 1800;
    a.renderer.draw();
    if (JSON.stringify(field.points) !== before) throw Error('镜头循环导致萤火虫重新随机');
    const { FireflyRenderer } = await import('/src/rendering/fireflies.js');
    const layer = new FireflyRenderer(),
      canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const c = canvas.getContext('2d'),
      view = { x: 650, y: 450, w: 500, h: 500 };
    // 统计独立萤火虫图层的透明度，验证天气与时段，不受地形颜色干扰。
    const coverage = (light) => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 500, 500);
      c.translate(-650, -450);
      layer.draw(c, 0, light, view);
      return c
        .getImageData(0, 0, 500, 500)
        .data.reduce((sum, v, i) => sum + (i % 4 === 3 ? v : 0), 0);
    };
    const night = coverage({ night: 1, dusk: 0, rain: 0 }),
      day = coverage({ night: 0, dusk: 0, rain: 0 }),
      rain = coverage({ night: 1, dusk: 0, rain: 1 });
    if (day !== 0 || night <= rain || rain <= 0) throw Error('昼夜或雨天亮度不正确');
    return { cameraStable: true, night, day, rain };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    const a = fireflyTest,
      field = a.renderer.fireflies.field,
      before = JSON.stringify(field.points);
    a.game.previewTime += 10;
    a.renderer.resize();
    a.renderer.draw();
    a.refresh();
    if (JSON.stringify(field.points) !== before) throw Error('减少动态时仍游动');
    if (document.documentElement.scrollWidth > innerWidth) throw Error('窄屏横向溢出');
  });
  await page.screenshot({ path: 'output/playwright/fireflies-reduced-320.png' });
  if (errors.length) throw Error(errors.join(';'));
  return { frames, checks, errors };
}
