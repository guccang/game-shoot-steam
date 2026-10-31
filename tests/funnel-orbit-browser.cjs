// 隔离浏览器验收：先装备浮游炮并点击开始巡游，再检查真实输入、连续编队与昼夜同屏。
async page => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.progress.weapon = 12; g.progress.weapons[12] = 1;
    g.reset(); g.start(); g.enemies = []; g.trees = []; g.boss = null;
    g.spawnTimer = 999; g.reducedMotion = false;
    document.activeElement?.blur(); a.refresh();
  });
  const before = await page.evaluate(async () => ({ ...(await import('/src/main.js')).application.game.player }));
  await page.keyboard.down('d');
  await page.waitForTimeout(900);
  await page.keyboard.up('d');
  const movement = await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return { x: g.player.x, y: g.player.y, nodes: g.funnel.nodes.map(n => ({ x: n.x, y: n.y })) };
  });
  if (Math.hypot(movement.x - before.x, movement.y - before.y) < 20) throw Error('键盘移动未生效');
  if (movement.nodes.some(n => Math.hypot(n.x, n.y) > 150)) throw Error('移动时编队掉队');
  await page.keyboard.press('Space');
  const paused = await page.evaluate(async () => JSON.stringify((await import('/src/main.js')).application.game.funnel));
  await page.waitForTimeout(250);
  if (paused !== await page.evaluate(async () => JSON.stringify((await import('/src/main.js')).application.game.funnel))) throw Error('暂停未冻结编队');
  await page.keyboard.press('Space');
  // 结束自动循环后使用同一正式游戏与绘制器逐帧采样，保证昼夜对比相位可重复。
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.destroy();
    const g = a.game; g.reset(); g.start(); g.enemies = []; g.spawnTimer = 999;
    g.trees = g.trees.filter(t => Math.hypot(t.x - g.player.x, t.y - g.player.y) > 470);
    g.progress.vehicleHulls.fill(1);
    const enemy = g.spawnEnemy(0, 0, { x: g.player.x + 110, y: g.player.y + 480 });
    Object.assign(enemy, { speed: 0, hp: 100000, maxHp: 100000 });
  });
  const checks = [];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const time of ['day', 'night']) {
      for (const mounted of [false, true]) {
        await page.evaluate(async ({ time, mounted, width }) => {
          const a = (await import('/src/main.js')).application, g = a.game, r = a.renderer;
          const { EnvironmentTransition } = await import('/src/world/environment.js');
          const { SceneTone } = await import('/src/rendering/scene-tone.js');
          const { catSprites } = await import('/src/rendering/cat-animation.js');
          if (!await catSprites.load()) throw Error('角色图集缺失');
          Object.assign(a.environment, { time, weather: 'sun', autoTime: false, autoWeather: false });
          r.light = new EnvironmentTransition(a.environment, 0); r.tone = new SceneTone(a.environment, 0);
          if (mounted) g.summonVehicle(); else if (g.vehicle.active) g.dismountVehicle();
          g.setViewport(width, 844); r.camera.setZoomStep(4); r.resize();
          for (let i = 0; i < 360; i++) g.update(1 / 120);
          a.refresh(); r.draw();
        }, { time, mounted, width });
        for (let frame = 0; frame < 3; frame++) {
          const nodes = await page.evaluate(async () => {
            const a = (await import('/src/main.js')).application;
            for (let i = 0; i < 60; i++) a.game.update(1 / 120);
            a.renderer.draw(); a.refresh();
            return a.game.funnel.nodes.map(n => ({ x: n.x, y: n.y, mode: n.flight.mode, targetId: n.targetId }));
          });
          if (nodes.some(n => n.targetId !== null)) throw Error('待机采样误入攻击');
          checks.push({ width, time, mounted, frame, nodes });
          await page.screenshot({ path: `output/playwright/orbit-${width}-${time}-${mounted ? 'vehicle' : 'foot'}-${frame}.png` });
        }
      }
    }
  }
  const samples = await page.evaluate(async () => {
    const { renderVisualCase } = await import('/src/rendering/visual-review.js');
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 420;
    const c = canvas.getContext('2d'), frames = [];
    for (let i = 0; i < 8; i++) {
      c.clearRect(0, 0, 480, 420); await renderVisualCase(c, 'funnel-orbit', i / 12);
      frames.push(canvas.toDataURL());
    }
    return new Set(frames).size;
  });
  if (samples !== 8) throw Error('工作台连续帧重复');
  if (errors.length) throw Error(errors.join(';'));
  return { designCriterion: ['funnel-orbit', 'funnel-orbit-transition', 'funnel-orbit-day-night'], movement, samples, checks, errors };
}
