// 隔离端口验收三车型购买、装备、飞行降落、存档和手机画面，不访问正式存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.destroy();
    const { freshProgress } = await import('/src/game.js');
    localStorage.setItem('forest-patrol-v1', JSON.stringify(freshProgress()));
  });
  await page.reload();
  await page.locator('#environment-button').click();
  await page.locator('button[data-time="day"]').click();
  await page.locator('button[data-weather="sun"]').click();
  await page.locator('#auto-time').uncheck(); await page.locator('#auto-weather').uncheck();
  await page.locator('#environment-ok').click();
  await page.locator('#vehicles-button').click();
  if (await page.locator('[data-vehicle-preview]').count() !== 4) throw Error('车型目录错误');
  await page.locator('[data-vehicle-preview="1"]').click();
  if (!await page.locator('#vehicle-board').isDisabled()) throw Error('不足资源可买重坦');
  if (await page.locator('#vehicle-upgrade').isVisible()) throw Error('未购买出现升级');
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    Object.assign(a.game.progress, { coins: 20000, wood: 10000, bosses: 30 }); a.save();
  });
  await page.locator('#start').click();
  await page.evaluate(async () => { const g = (await import('/src/main.js')).application.game; g.enemies = []; g.spawnTimer = 999; });
  await page.locator('#vehicles-button').click();
  await page.locator('[data-vehicle-preview="1"]').click(); await page.locator('#vehicle-board').click();
  if (await page.locator('#vehicle-collection-count').textContent() !== '已收集 2 辆') throw Error('购买未入库');
  await page.locator('#vehicle-board').click();
  await page.locator('#vehicle-upgrade').click();
  if (await page.locator('#vehicle-collection-health').textContent() !== '560 / 560') throw Error('重坦升级失败');
  await page.locator('#vehicle-tab-turrets').click();
  if (!await page.locator('#vehicle-turret-owner').textContent().then(s => s.includes('重型主战坦克'))) throw Error('安装目标错误');
  await page.locator('[data-turret-card="0"] [data-turret-action="buy"]').click();
  await page.locator('[data-turret-card="0"] [data-turret-action="equip"]').click();
  await page.locator('#vehicle-tab-hull').click(); await page.locator('#vehicle-board').click();
  await page.waitForFunction(() => document.querySelector('#player-name').textContent === '重型坦克');
  await page.screenshot({ path: 'output/playwright/tank-helicopter/heavy-combat.png' });
  await page.locator('#vehicles-button').click(); await page.locator('[data-vehicle-preview="2"]').click();
  if (!await page.evaluate(async () => (await import('/src/main.js')).application.game.vehicle.active)) throw Error('预览导致下车');
  await page.locator('#vehicle-board').click(); await page.locator('#vehicle-board').click();
  if (!await page.evaluate(async () => { const g = (await import('/src/main.js')).application.game; return g.vehicle.index === 2 && !g.vehicle.active && g.vehicle.module === null; })) throw Error('选择直升机没有保留空炮塔');
  await page.locator('#vehicle-tab-turrets').click();
  await page.locator('[data-turret-card="1"] [data-turret-action="buy"]').click();
  await page.locator('[data-turret-card="1"] [data-turret-action="equip"]').click();
  await page.locator('#vehicle-tab-hull').click(); await page.locator('#vehicle-board').click();
  await page.waitForFunction(() => document.querySelector('#player-name').textContent === '直升机');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const { riverXAt } = await import('/src/world/river-geometry.js');
    Object.assign(a.game.player, { x: riverXAt(900), y: 900 });
    a.game.enemies = []; a.game.spawnTimer = 999;
  });
  const layouts = [];
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 580 ? 928 : 844 });
    await page.screenshot({ path: `output/playwright/tank-helicopter/helicopter-${width}.png` });
    await page.locator('#vehicles-button').click();
    for (const index of [1,2]) {
      await page.locator(`[data-vehicle-preview="${index}"]`).click();
      await page.locator('#vehicle-collection-dialog').evaluate(n => n.scrollTop = 0);
      const ok = await page.locator('#vehicle-collection-dialog').evaluate(n => { const r = n.getBoundingClientRect(); return n.scrollWidth <= n.clientWidth && r.x >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.top >= 0; });
      if (!ok) throw Error('载具面板溢出');
      await page.screenshot({ path: `output/playwright/tank-helicopter/collection-${index}-${width}.png` });
    }
    layouts.push(width); await page.keyboard.press('Escape');
  }
  await page.locator('#vehicle-button').click();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game, { blocked } = await import('/src/physics/motion.js');
    return !g.player.flying && !g.vehicle.active && !blocked(g.player.x,g.player.y,12,g.trees);
  })) throw Error('水上安全下机失败');
  await page.locator('#vehicle-button').click();
  await page.locator('#environment-button').click();
  await page.locator('button[data-time="night"]').click();
  await page.locator('button[data-weather="rain"]').click();
  await page.locator('#environment-ok').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const { EnvironmentTransition } = await import('/src/world/environment.js'); a.renderer.light = new EnvironmentTransition(a.environment,performance.now());
  });
  await page.screenshot({ path: 'output/playwright/tank-helicopter/helicopter-night-rain.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.screenshot({ path: 'output/playwright/tank-helicopter/helicopter-reduced-motion.png' });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    const { riverXAt } = await import('/src/world/river-geometry.js');
    Object.assign(a.game.player,{x:riverXAt(900),y:900,invincible:0});a.game.hurt(9999); a.refresh();
  });
  if (!await page.evaluate(async () => {
    const g=(await import('/src/main.js')).application.game, {blocked}=await import('/src/physics/motion.js');
    return !g.player.flying && !g.vehicle.active && g.vehicle.cooldown>28 && !blocked(g.player.x,g.player.y,12,g.trees);
  })) throw Error('击毁落地失败');
  await page.reload();
  if (!await page.evaluate(async () => {
    const g=(await import('/src/main.js')).application.game;
    return g.progress.vehicleIndex===2 && g.progress.vehicleHulls.join(',')==='1,2,1,0' && g.progress.vehicleLoadouts.join(',')===',0,1,' && !g.vehicle.active;
  })) throw Error('多载具存档恢复失败');
  if(errors.length) throw Error(errors.join('\n'));
  return { purchases:true, loadouts:true, upgrades:true, flightLanding:true, destruction:true, persistence:true, layouts, errors };
}
