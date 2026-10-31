// 同一设备尺寸、种子与真实 RAF 时钟对比渲染管线；只操作隔离端口。
async (page) => {
  if (!['4174', '4175'].includes(new URL(page.url()).port)) throw Error('仅允许隔离端口');
  const tag = new URL(page.url()).port === '4175' ? 'before' : 'after';
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 388, height: 748 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 388, height: 748, deviceScaleFactor: 3.125, mobile: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.removeItem('forest-patrol-v1');
    localStorage.setItem('forest-patrol-environment-v1', JSON.stringify({
      time: 'day', weather: 'sun', autoTime: false, autoWeather: false,
    }));
  });
  await page.reload();
  const initialization = await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const report = (await import('/src/main.js')).application.diagnostics.report();
    return { stages: report.milestones.filter(e => e.type === 'timing'),
      firstFrame: report.milestones.find(e => e.type === 'first-enemy')?.frame.total };
  });
  const results = [];
  try {
    for (const config of [
      { name: 'camp-day', x: 900, y: 700, count: 12, time: 'day', weather: 'sun' },
      { name: 'river-day', x: 1200, y: 1000, count: 12, time: 'day', weather: 'sun' },
      { name: 'river-night-rain', x: 1200, y: 1000, count: 48, time: 'night', weather: 'thunder' },
    ]) {
      results.push(await page.evaluate(async config => {
        const app = (await import('/src/main.js')).application;
        app.destroy();
        const { createCrowdScene } = await import('/tests/helpers/crowd-scene.js');
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { CombatCamera } = await import('/src/rendering/camera.js');
        const { PerformanceMonitor } = await import('/src/platform/performance-monitor.js');
        const g = createCrowdScene(config.count, 0), r = app.renderer, p = new PerformanceMonitor();
        let seed = 98765;
        g.fx.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        const dx = config.x - g.player.x, dy = config.y - g.player.y;
        g.player.x += dx; g.player.y += dy; g.player.hp = 1e9;
        g.enemies.forEach(e => { e.x += dx; e.y += dy; e.hp = e.maxHp = 1e9; });
        g.profiler = r.profiler = p; r.game = g; r.camera = new CombatCamera();
        if (r.ground) {
          const { GroundCache } = await import('/src/rendering/ground-cache.js');
          r.ground = new GroundCache();
        }
        const { RiverRenderer } = await import('/src/rendering/river.js');
        const { RainRenderer } = await import('/src/rendering/rain.js');
        r.river = new RiverRenderer(); r.rain = new RainRenderer();
        r.environment = { time: config.time, weather: config.weather };
        r.light = new EnvironmentTransition(r.environment, performance.now());
        if (r.tone) {
          const { SceneTone } = await import('/src/rendering/scene-tone.js');
          r.tone = new SceneTone(r.environment, performance.now());
        }
        document.getElementById('game-frame').dataset.time = config.time;
        document.getElementById('game-frame').dataset.weather = config.weather;
        document.getElementById('game-frame').dataset.state = 'playing';
        document.getElementById('intro').hidden = true;
        document.getElementById('overlay').hidden = true;
        document.getElementById('game').style.transition = 'none';
        document.querySelector('.environment-tint').style.transition = 'none';
        r.resize(); g.setViewport(r.width, r.height);
        let previous = performance.now(), start = previous;
        await new Promise(resolve => {
          // 使用真实帧间隔，保留水流按实际时钟更新的频率；末尾 120 战斗帧参与统计。
          function frame(now) {
            p.beginFrame(now, 'playing');
            const dt = Math.min(0.05, (now - previous) / 1000); previous = now;
            p.start('logic'); g.update(dt, { x: 0, y: 0 }); p.end('logic');
            p.start('render'); r.draw(); p.end('render');
            p.finishFrame({ enemies: g.enemies.length, visible: r.visibleStats });
            if (now - start < 9000) requestAnimationFrame(frame); else resolve();
          }
          requestAnimationFrame(frame);
        });
        return { config, report: p.summary(), cache: r.diagnosticInfo() };
      }, config));
    }
    if (errors.length) throw Error(errors.join('\n'));
    return { tag, initialization, viewport: [388, 748], deviceDpr: 3.125, canvasDpr: 2, cpu: 4, results, errors };
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
}
