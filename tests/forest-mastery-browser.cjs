// 独立端口验证真实工坊交互、存档恢复、元素枪与精细场景，避免覆盖正式进度。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('请使用隔离测试端口 4174');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.setItem(
      'forest-patrol-v1',
      JSON.stringify({
        version: 1,
        coins: 20000,
        wood: 10000,
        hero: 0,
        weapon: 0,
        heroes: [1, 0],
        weapons: [1],
        bosses: 5,
      }),
    );
    localStorage.setItem(
      'forest-patrol-environment-v1',
      JSON.stringify({ time: 'day', weather: 'sun', autoTime: false, autoWeather: false }),
    );
  });
  await page.reload();
  await page.locator('#start').click();
  await page.locator('#weapons-button').click();
  if ((await page.locator('.item-card').count()) !== 13) throw Error('枪械目录不完整');
  if (!(await page.locator('[data-mod="1"][data-index="0"]').isDisabled()))
    throw Error('未达到熟练度即可改装');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    window.artTest = a;
    for (let i = 0; i < 10; i++)
      a.game.hit(
        { id: 8000 + i, type: 'enemy', x: 1000, y: 700, hp: 1, maxHp: 1, radius: 17 },
        1,
        false,
        { weaponIndex: 0, impulse: 0 },
      );
    a.refresh();
  });
  await page.locator('[data-mod="1"][data-index="0"]').click();
  if (
    (await page.locator('[data-mod="1"][data-index="0"]').getAttribute('aria-pressed')) !== 'true'
  )
    throw Error('改装未选中');
  await page
    .locator('.item-card')
    .first()
    .screenshot({ path: 'output/playwright/mastery-branch-card.png' });
  await page.locator('[data-mod="2"][data-index="0"]').click();
  if (
    (await page.locator('[data-mod="1"][data-index="0"]').getAttribute('aria-pressed')) !== 'false'
  )
    throw Error('分支叠加');
  await page.locator('[data-action="buy"][data-index="10"]').click();
  await page.locator('[data-action="buy"][data-index="11"]').click();
  await page.locator('#close-camp').click();
  await page.reload();
  const restored = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    window.artTest = a;
    const p = a.game.progress;
    if (
      p.mods[0] !== 2 ||
      p.mastery[0] !== 40 ||
      p.weapons[10] !== 1 ||
      p.weapons[11] !== 1 ||
      p.weapon !== 11
    )
      throw Error('熟练度、改装或购买未保存');
    return { mastery: p.mastery[0], mod: p.mods[0], guns: p.weapons.length };
  });
  await page.locator('#start').click();
  await page.locator('#weapons-button').click();
  await page.locator('.item-card').filter({ has: page.locator('[data-portrait="11"]') }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/frost-workshop-mobile.png' });
  await page.locator('#close-camp').click();
  // 停止自动循环后手动绘制，截图中的弹道不会因截图等待而消失。
  await page.evaluate(() => {
    const a = artTest,
      g = a.game;
    a.destroy();
    g.state = 'playing';
    g.enemies = [];
    g.boss = null;
    g.projectiles = [];
    g.shots = [];
    g.fx.items = [];
    g.numbers = [];
    g.remnants = [];
    g.drops = [];
    g.spawnTimer = g.attackTimer = 999;
    g.player.x = 1120;
    g.player.y = 640;
    g.player.invincible = 0;
    document.getElementById('toast').hidden = true;
    g.progress.weapon = 0;
    a.renderer.camera.reset?.();
    a.renderer.resize();
    a.refresh();
    for (let i = 0; i < 120; i++) a.renderer.draw();
  });
  await page.screenshot({ path: 'output/playwright/refined-forest-river-day.png' });
  await page.evaluate(async () => {
    const a = artTest;
    a.environment.time = 'night';
    a.renderer.light = new (await import('/src/world/environment.js')).EnvironmentTransition(
      a.environment,
      performance.now(),
    );
    a.renderer.draw();
    a.refresh();
  });
  await page.screenshot({ path: 'output/playwright/refined-forest-river-night.png' });
  await page.evaluate(async () => {
    const a = artTest,
      g = a.game;
    a.environment.time = 'day';
    a.renderer.light = new (await import('/src/world/environment.js')).EnvironmentTransition(
      a.environment,
      performance.now(),
    );
    g.trees = [];
    g.player.x = 900;
    g.player.y = 700;
    g.progress.weapon = 10;
    g.player.angle = 0;
    g.enemies = [
      { id: 901, type: 'enemy', x: 1000, y: 700, hp: 1000, maxHp: 1000, radius: 17, size: 1 },
      { id: 902, type: 'enemy', x: 1070, y: 640, hp: 1000, maxHp: 1000, radius: 17, size: 1 },
      { id: 903, type: 'enemy', x: 980, y: 570, hp: 1000, maxHp: 1000, radius: 17, size: 1 },
    ];
    for (let i = 0; i < 120; i++) a.renderer.draw();
    g.attackTimer = 0;
    g.attack();
    a.refresh();
    a.renderer.draw();
    if (g.shots.filter((s) => s.kind === 'arc-link').length !== 3)
      throw Error('电弧未生成三段实战链路');
  });
  await page.screenshot({ path: 'output/playwright/arc-combat-mobile.png' });
  await page.evaluate(async () => {
    const a = artTest,
      g = a.game;
    g.progress.weapon = 11;
    g.shots = [];
    g.fx.items = [];
    g.progress.mastery[11] = 40;
    g.progress.mods[11] = 2;
    const { fireBallistics } = await import('/src/combat/ballistics.js');
    fireBallistics(g, g.weapon(), { x: 930, y: 692 }, { x: 1, y: 0 }, g.damage(), false);
    g.updateProjectiles(0.09);
    a.refresh();
    a.renderer.draw();
  });
  await page.screenshot({ path: 'output/playwright/frost-combat-mobile.png' });
  const artChecks = await page.evaluate(async () => {
    const { drawTreeSprite } = await import('/src/rendering/tree-art.js');
    const { RiverRenderer, BRIDGE } = await import('/src/rendering/river.js');
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1400;
    const c = canvas.getContext('2d'),
      river = new RiverRenderer(),
      viewport = { x: 0, y: 0, w: 1800, h: 1400 };
    // 波纹随时钟变化，桥面始终留空；关闭动画不提交动态水层。
    river.draw(c, 1, 0, 0, false, viewport);
    const first = canvas.toDataURL();
    c.clearRect(0, 0, 1800, 1400);
    river.draw(c, 2, 0, 0, false, viewport);
    if (canvas.toDataURL() === first) throw Error('河水未流动');
    if (c.getImageData(BRIDGE.x + 100, BRIDGE.y + 30, 1, 1).data[3] !== 0)
      throw Error('动态水覆盖桥面');
    c.clearRect(0, 0, 1800, 1400);
    river.draw(c, 3, 0, 0, true, viewport);
    if (c.getImageData(1220, 450, 1, 1).data[3] !== 0) throw Error('低动态模式仍绘制水流');
    // 四区、两种树形、三种变体预热后，再次绘制不创建新图集。
    const trees = [];
    for (let palette = 0; palette < 4; palette++)
      for (const variant of ['pine', 'round'])
        for (let id = 0; id < 3; id++) trees.push({ palette, variant, id });
    for (const t of trees) drawTreeSprite(c, t, 1);
    const original = document.createElement;
    let allocations = 0;
    document.createElement = function (...args) {
      if (args[0] === 'canvas') allocations++;
      return original.apply(this, args);
    };
    try {
      for (let frame = 0; frame < 20; frame++) for (const t of trees) drawTreeSprite(c, t, 0.5);
    } finally {
      document.createElement = original;
    }
    if (allocations) throw Error('树木细节每帧重复烘焙');
    const a = artTest;
    a.game.reset();
    a.game.state = 'playing';
    a.game.progress.weapon = 0;
    a.game.player.x = 1120;
    a.game.player.y = 640;
    const times = [];
    for (let i = 0; i < 60; i++) {
      a.game.previewTime = i / 60;
      const start = performance.now();
      a.renderer.draw();
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return {
      treeCacheReused: true,
      waterAnimated: true,
      bridgeClear: true,
      normalMedian: times[30],
      normalP95: times[57],
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  const performanceResult = await page.evaluate(async () => {
    const a = artTest;
    a.game.reset();
    a.game.state = 'playing';
    a.game.enemies = [];
    a.game.progress.weapon = 0;
    a.game.player.x = 1120;
    a.game.player.y = 640;
    a.renderer.resize();
    a.refresh();
    // 先预热昼夜图集，再统计常态绘制；不将首次烘焙计入每帧开销。
    for (let i = 0; i < 20; i++) a.renderer.draw();
    const times = [];
    for (let i = 0; i < 60; i++) {
      const start = performance.now();
      a.renderer.draw();
      times.push(performance.now() - start);
    }
    if (document.documentElement.scrollWidth > innerWidth) throw Error('窄屏横向溢出');
    times.sort((a, b) => a - b);
    return { median: times[30], p95: times[57] };
  });
  await page.screenshot({ path: 'output/playwright/refined-forest-320.png' });
  if (errors.length) throw Error(errors.join(';'));
  return { restored, artChecks, performanceResult, errors };
}
