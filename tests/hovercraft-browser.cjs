// 隔离端口验收气垫船的购买、装配、水陆画面、手机布局与持久化。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  // 手机侧边入口默认折叠，按实际操作展开菜单再进入收藏。
  async function openVehicles() {
    if (!await page.locator('#vehicles-button').isVisible()) await page.getByRole('button', { name: '展开功能菜单' }).click();
    await page.locator('#vehicles-button').click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.destroy();
    const { freshProgress } = await import('/src/game.js');
    localStorage.setItem('forest-patrol-v1', JSON.stringify(freshProgress()));
  });
  await page.reload();
  await openVehicles();
  await page.locator('[data-vehicle-preview="3"]').click();
  if (!await page.locator('#vehicle-board').isDisabled()) throw Error('未满足购买条件');
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    Object.assign(a.game.progress, { coins: 20000, wood: 10000, bosses: 30, materials: { parts: 1000, crystal: 1000, core: 100 } }); a.save();
  });
  await page.locator('#start').click();
  await page.evaluate(async () => { const g = (await import('/src/main.js')).application.game; g.enemies = []; g.spawnTimer = 999; });
  await openVehicles();
  await page.locator('[data-vehicle-preview="3"]').click();
  await page.locator('#vehicle-board').click();
  if (await page.locator('#vehicle-collection-count').textContent() !== '已收集 2 辆') throw Error('未入库');
  await page.locator('#vehicle-board').click();
  await page.locator('#vehicle-upgrade').click();
  await page.locator('#vehicle-tab-turrets').click();
  await page.locator('[data-turret-card="0"] [data-turret-action="buy"]').click();
  await page.locator('[data-turret-card="0"] [data-turret-action="equip"]').click();
  await page.locator('#vehicle-tab-hull').click();
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('#vehicle-collection-dialog').evaluate(n => n.scrollTop = 0);
    const ok = await page.locator('#vehicle-collection-dialog').evaluate(n => n.scrollWidth <= n.clientWidth && document.documentElement.scrollWidth <= innerWidth);
    if (!ok) throw Error('收藏页面溢出');
    await page.screenshot({ path: `output/playwright/hovercraft/collection-${width}.png` });
  }
  if (await page.locator('#vehicle-board').textContent() !== '登船 · 水陆航行') throw Error('登船按钮错误');
  await page.locator('#vehicle-board').click();
  await page.waitForFunction(() => document.querySelector('#player-name').textContent === '气垫船');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.destroy();
    a.game.enemies = []; a.game.boss = null;
  });
  for (const name of ['lake', 'river', 'land', 'night', 'reduced']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: name === 'reduced' ? 'reduce' : 'no-preference' });
    await page.evaluate(async name => {
      const a = (await import('/src/main.js')).application, g = a.game, r = a.renderer;
      const { NATURAL_TERRAIN: t } = await import('/src/world/natural-terrain.js');
      const { riverXAt } = await import('/src/world/river-geometry.js');
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      const env = { time: name === 'night' ? 'night' : 'day', weather: name === 'night' ? 'rain' : 'sun', autoTime: false, autoWeather: false };
      Object.assign(a.environment, env); r.light = new EnvironmentTransition(env); r.tone = new SceneTone(env);
      const point = name === 'river' ? { x: riverXAt(900), y: 900 } : name === 'land' ? { x: 900, y: 700 } : t.lakes[0];
      Object.assign(g.player, { x: point.x, y: point.y, vx: 110, vy: 30, invincible: 0 });
      g.time = g.previewTime = 12; r.resize(); g.setViewport(r.width, r.height); a.refresh(); r.draw();
      if (!g.player.amphibious || g.player.flying || g.vehicle.index !== 3) throw Error('载具能力错误');
    }, name);
    await page.screenshot({ path: `output/playwright/hovercraft/${name}.png` });
  }
  // 真正点击快捷下船按钮，检查水中驾驶员能安全回岸。
  await page.reload();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return g.progress.vehicleIndex === 3 && g.progress.vehicleHulls[3] === 2 && g.vehicle.weaponIndex === 0 && !g.vehicle.active && !g.player.amphibious;
  })) throw Error('刷新恢复失败');
  if (await page.locator('#start').isVisible()) await page.locator('#start').click();
  if (await page.locator('#resume').isVisible()) await page.locator('#resume').click();
  await page.locator('#vehicle-button').click();
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    const { NATURAL_TERRAIN: t } = await import('/src/world/natural-terrain.js');
    Object.assign(g.player, { x: t.lakes[0].x, y: t.lakes[0].y }); g.enemies = []; g.spawnTimer = 999;
  });
  await page.locator('#vehicle-button').click();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game, { blocked } = await import('/src/physics/motion.js');
    return !g.vehicle.active && !g.player.amphibious && !blocked(g.player.x, g.player.y, 12, g.trees);
  })) throw Error('水中下船未安全回岸');
  if (errors.length) throw Error(errors.join('; '));
  return { purchase: true, turret: true, upgrade: true, persistence: true, safeLanding: true, layouts: [320, 390, 580], errors };
}
