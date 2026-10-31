// 在隔离端口以相同手机尺寸、降速和确定性场景比较优化前后；计时只报告，不做易抖动断言。
async (page) => {
  if (!['4174', '4175'].includes(new URL(page.url()).port)) throw Error('仅允许隔离测试端口');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    await page.evaluate(async () => (await import('/src/main.js')).application.destroy());
    const results = [];
    for (let round = 0; round < 2; round++) {
      for (const config of [
        { count: 12, weapon: 0, night: false },
        { count: 48, weapon: 2, night: false },
        { count: 48, weapon: 12, night: true },
      ]) {
        results.push(await page.evaluate(async ({ config, round }) => {
          const app = (await import('/src/main.js')).application;
          const { createCrowdScene } = await import('/tests/helpers/crowd-scene.js');
          const { EnvironmentTransition } = await import('/src/world/environment.js');
          const { CombatCamera } = await import('/src/rendering/camera.js');
          Object.assign(app.game, createCrowdScene(config.count, config.weapon));
          const g = app.game, r = app.renderer;
          let effectSeed = 98765;
          // 粒子独立随机源也固定，避免特效寿命差异影响前后绘制数量。
          g.fx.random = () => ((effectSeed = (effectSeed * 16807) % 2147483647) - 1) / 2147483646;
          r.game = g; r.resize(); r.camera = new CombatCamera();
          g.setViewport(r.width, r.height);
          r.environment = { time: config.night ? 'night' : 'day', weather: config.night ? 'thunder' : 'sun' };
          r.light = new EnvironmentTransition(r.environment, performance.now());
          app.refresh();
          const parts = { river: [], rain: [] }, restores = [];
          for (const [object, key, name] of [[r.river, 'draw', 'river'], [r.rain, 'prepare', 'rain']]) {
            const original = object[key];
            // 只包裹分项入口计时，不禁用任何效果或改变模拟步长。
            object[key] = function (...args) {
              const start = performance.now(), value = original.apply(this, args);
              parts[name].push(performance.now() - start);
              return value;
            };
            restores.push(() => object[key] = original);
          }
          const update = [], draw = [], frame = [], ui = [];
          try {
            await new Promise(resolve => {
              let index = 0, previous = 0;
              // 固定走位和 60 Hz 逻辑步长，预热 30 帧后记录 90 帧。
              function tick(now) {
                if (index >= 30) frame.push(now - previous);
                previous = now;
                let start = performance.now();
                g.update(1 / 60, { x: 0.12, y: 0 });
                const u = performance.now() - start;
                start = performance.now(); r.draw();
                const d = performance.now() - start;
                if (index % 8 === 0) {
                  start = performance.now(); app.refresh();
                  if (index >= 30) ui.push(performance.now() - start);
                }
                if (index >= 30) { update.push(u); draw.push(d); }
                if (++index < 120) requestAnimationFrame(tick); else resolve();
              }
              requestAnimationFrame(tick);
            });
          } finally { restores.forEach(restore => restore()); }
          // 用均值和尾部耗时同时反映持续负担及偶发掉帧。
          function stats(values) {
            const v = values.toSorted((a, b) => a - b);
            return { mean: +(v.reduce((sum, n) => sum + n, 0) / v.length).toFixed(2),
              p95: +v[Math.floor(v.length * 0.95)].toFixed(2) };
          }
          return { round, config, trees: g.trees.length, alive: g.enemies.length,
            fx: g.fx.items.length, dpr: r.dpr, update: stats(update), draw: stats(draw),
            frame: stats(frame), ui: stats(ui), river: stats(parts.river.slice(30)),
            rain: stats(parts.rain.slice(30)),
            state: g.enemies.map(e => [e.id, e.x, e.y, e.hp, e.pushX, e.pushY]) };
        }, { config, round }));
      }
    }
    if (errors.length) throw Error(errors.join('\n'));
    return { port: new URL(page.url()).port, cpuThrottle: 4, viewport: [390, 844], results, errors };
  } finally {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await cdp.detach();
  }
}
