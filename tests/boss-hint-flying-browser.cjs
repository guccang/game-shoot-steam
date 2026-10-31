// 隔离浏览器验证猫爪非强制引导、真实炮塔交易、飞行怪画面和减少动态模式。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [], layouts = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.clear();
  });
  await page.reload(); await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.enemies = []; g.updateWaves = () => {}; g.attackTimer = 999;
    g.kills = 12; a.refresh();
  });
  if (!(await page.locator('#boss-button').getAttribute('class') || '').includes('show-paw'))
    throw Error('领主就绪没有猫爪');
  const initial = await page.evaluate(async () => (await import('/src/main.js')).application.game.time);
  await page.screenshot({ path: 'output/playwright/bat-paw/boss-paw.png' });
  await page.waitForFunction(() => !document.getElementById('boss-button').classList.contains('show-paw'), { timeout: 4000 });
  const continued = await page.evaluate(async initial => {
    const g = (await import('/src/main.js')).application.game;
    return g.state === 'playing' && g.time > initial + 1 && !g.boss;
  }, initial);
  if (!continued) throw Error('猫爪提示阻断或自动启动战斗');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.kills = 24; a.game.bossKillsAt = 12; a.refresh();
  });
  // 直接点击头像中心，猫爪覆盖部分不会抢走点击事件。
  await page.locator('#boss-button').click({ position: { x: 30, y: 30 } });
  if (!await page.evaluate(async () => !!(await import('/src/main.js')).application.game.boss))
    throw Error('猫爪阻碍挑战按钮');
  if ((await page.locator('#boss-button').getAttribute('class') || '').includes('show-paw'))
    throw Error('挑战后猫爪未收起');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.boss = null; a.game.hazards = [];
    a.game.progress.coins = 120; a.game.progress.wood = 40; a.refresh();
  });
  await page.locator('#field-menu-toggle').click();
  await page.locator('#vehicles-button').click();
  await page.locator('#vehicle-tab-turrets').click();
  const buy = page.locator('[data-turret-card="14"] [data-turret-action="buy"]');
  if (!await buy.isDisabled()) throw Error('仍能用旧价购买载具电锯');
  if (!(await buy.innerText()).includes('1800') || !(await buy.innerText()).includes('600'))
    throw Error('炮塔价格展示错误');
  await page.locator('#vehicle-collection-done').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.progress.coins = 1800; a.game.progress.wood = 600; a.refresh();
  });
  await page.locator('#field-menu-toggle').click();
  await page.locator('#vehicles-button').click();
  await page.locator('#vehicle-tab-turrets').click();
  await buy.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/bat-paw/turret-price.png' });
  await buy.click();
  await page.locator('[data-turret-card="14"] [data-turret-action="equip"]').click();
  if (!await page.evaluate(async () => {
    const p = (await import('/src/main.js')).application.game.progress;
    return p.coins === 0 && p.wood === 0 && p.vehicleWeapons[14] === 1 && p.vehicleWeapon === 14 && p.weapons[14] === 0;
  })) throw Error('炮塔扣费、安装或手持隔离错误');
  await page.locator('#vehicle-collection-done').click();
  await page.reload();
  if (!await page.evaluate(async () => (await import('/src/main.js')).application.game.progress.vehicleWeapons[14] === 1))
    throw Error('炮塔购买未保存');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy();
    const g = a.game, { riverXAt } = await import('/src/world/river-geometry.js');
    g.progress.vehicleHulls[2] = 1; g.progress.vehicleIndex = 2;
    g.reset(); g.start(); g.player.x = riverXAt(1100); g.player.y = 1100;
    g.enemies = []; g.updateWaves = () => {}; g.attackTimer = 999;
    g.summonVehicle();
    for (const angle of [-2.4, -0.6, 1.6]) {
      g.waveSpawned = 3;
      const e = g.spawnEnemy(angle, 110);
      e.x = g.player.x + Math.cos(angle) * 110;
      e.y = g.player.y + Math.sin(angle) * 110;
    }
    for (let i = 0; i < 20; i++) g.update(0.01);
    if (!g.enemies.every(e => e.flying && e.assault.phase === 'windup')) throw Error('飞行前摇未触发');
  });
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.evaluate(async () => {
      const a = (await import('/src/main.js')).application;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      Object.assign(a.environment, { time: 'day', weather: 'sun', autoTime: false, autoWeather: false });
      a.renderer.light = new EnvironmentTransition(a.environment, performance.now());
      a.renderer.resize(); a.game.setViewport(innerWidth, innerHeight);
      a.renderer.draw(); a.refresh();
      if (document.documentElement.scrollWidth > innerWidth) throw Error('横向溢出');
    });
    await page.screenshot({ path: `output/playwright/bat-paw/flying-${width}.png` });
    layouts.push(width);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.kills = 24; a.game.bossKillsAt = 12; a.renderer.draw(); a.refresh();
  });
  if (await page.locator('.boss-paw').evaluate(n => getComputedStyle(n).animationName) !== 'none')
    throw Error('减少动态模式未关闭猫爪动画');
  await page.screenshot({ path: 'output/playwright/bat-paw/reduced-motion.png' });
  if (errors.length) throw Error(errors.join(';'));
  return { hintSeconds: 2.4, nonBlocking: continued, turretPrice: [1800, 600], persisted: true, layouts, errors };
}
