// 独立端口检查灯具昼夜表现、火焰动态、循环镜像与手机构图，避免改动正式进度。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅使用隔离端口 4174');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const scene of [
    { name: 'camp-night', x: 660, y: 820, time: 'night', weather: 'sun' },
    { name: 'road-night', x: 900, y: 700, time: 'night', weather: 'sun' },
    { name: 'bridge-night', x: 1285, y: 740, time: 'night', weather: 'sun' },
    { name: 'road-day', x: 900, y: 700, time: 'day', weather: 'sun' },
    { name: 'camp-rain', x: 660, y: 820, time: 'night', weather: 'rain' },
  ]) {
    await page.reload();
    await page.locator('#environment-button').click();
    await page.locator('#auto-time').uncheck();
    await page.locator('#auto-weather').uncheck();
    await page.locator(`button[data-time="${scene.time}"]`).click();
    await page.locator(`button[data-weather="${scene.weather}"]`).click();
    await page.locator('#environment-ok').click();
    await page.evaluate(async (scene) => {
      const a = (await import('/src/main.js')).application;
      a.destroy();
      window.lightingTest = a;
      a.game.start();
      a.game.enemies = [];
      a.game.spawnTimer = a.game.attackTimer = 999;
      a.game.previewTime = 4;
      Object.assign(a.environment, {
        time: scene.time,
        weather: scene.weather,
        autoTime: false,
        autoWeather: false,
      });
      Object.assign(a.game.player, { x: scene.x, y: scene.y });
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      a.renderer.light = new EnvironmentTransition(a.environment, performance.now());
      a.renderer.resize();
      a.renderer.draw();
      a.refresh();
      document.getElementById('toast').hidden = true;
    }, scene);
    await page.screenshot({ path: `output/playwright/lighting-${scene.name}.png` });
  }
  const checks = await page.evaluate(async () => {
    const { drawLightFixture, drawLampGround } = await import('/src/rendering/lighting.js');
    const { LIGHT_FIXTURES, fixturePower } = await import('/src/world/lighting.js');
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const c = canvas.getContext('2d');
    // 像素签名只读取隔离图层，验证动画与减少动态，不受天气或战斗干扰。
    const render = (kind, time, reduced, night, ground = false) => {
      c.clearRect(0, 0, 400, 400);
      const environment = { night, dusk: 0, rain: 0 };
      const light = { ...LIGHT_FIXTURES.find((l) => l.kind === kind), x: 200, y: 240 };
      light.power = fixturePower(light, time, environment, reduced);
      if (ground) drawLampGround(c, [light], []);
      else drawLightFixture(c, light, time, environment, reduced);
      return canvas.toDataURL();
    };
    if (render('torch', 1, false, 1) === render('torch', 2, false, 1)) throw Error('火焰没有动态');
    if (render('torch', 1, true, 1) !== render('torch', 2, true, 1))
      throw Error('减少动态仍在闪动');
    if (render('lamp', 1, false, 0) === render('lamp', 1, false, 1))
      throw Error('路灯昼夜没有变化');
    render('lamp', 1, false, 0, true);
    if (c.getImageData(0, 0, 400, 400).data.some((v) => v !== 0)) throw Error('白天仍有地面光池');
    render('lamp', 1, false, 1, true);
    if (!c.getImageData(0, 0, 400, 400).data.some((v) => v !== 0)) throw Error('夜晚缺少地面光池');
    const a = lightingTest,
      times = [];
    for (let i = 0; i < 120; i++) {
      a.game.previewTime += 1 / 60;
      const start = performance.now();
      a.renderer.draw();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return { flame: true, reduced: true, dayNight: true, p95: times[114] };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    const a = lightingTest;
    a.game.player.x += 1800;
    a.renderer.resize();
    a.renderer.draw();
    a.refresh();
    if (document.documentElement.scrollWidth > innerWidth) throw Error('窄屏溢出');
  });
  await page.screenshot({ path: 'output/playwright/lighting-loop-reduced-320.png' });
  if (errors.length) throw Error(errors.join(';'));
  return { checks, errors };
}
