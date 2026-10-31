// 隔离端口检查手机援兵预警、实际外围出生、两种重击画面与减少动态模式。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy(); localStorage.clear();
  });
  await page.reload(); await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.update = () => {}; g.kills = 12; g.wave = 8; g.summonBoss();
    Object.assign(g.boss, { x: g.player.x + 40, y: g.player.y - 125,
      hp: 5000, maxHp: 5000, speed: 0, attack: 999 });
    g.boss.support.timer = 0;
    const { updateBossSupport } = await import('/src/core/boss-reinforcements.js');
    updateBossSupport(g, 0.01); a.refresh();
  });
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(async () => {
      const a = (await import('/src/main.js')).application;
      a.renderer.resize(); a.game.setViewport(a.renderer.width, a.renderer.height);
      a.renderer.draw(); a.refresh();
    });
    if (!(await page.locator('#boss-name').innerText()).includes('援兵 2秒')) throw Error('缺少援兵倒计时');
    if (await page.locator('#boss-name').evaluate(el => el.scrollWidth > el.clientWidth))
      throw Error('手机Boss名称和援兵预警被截断');
    await page.screenshot({ path: `output/playwright/boss-pressure/warning-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const adds = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    a.renderer.resize(); g.setViewport(a.renderer.width, a.renderer.height); a.renderer.draw();
    const { updateBossSupport } = await import('/src/core/boss-reinforcements.js');
    const before = [g.wave, g.waveKills, g.waveSpawned];
    updateBossSupport(g, 2); updateBossSupport(g, 0.01); updateBossSupport(g, 0.8);
    const reinforcements = g.enemies.filter(e => e.bossOwner);
    if (reinforcements.length !== 2) throw Error('没有逐只加入两只援兵');
    const v = g.arrivalView;
    for (const e of reinforcements) {
      const x = e.x - g.player.x, y = e.y - g.player.y;
      if (!(x <= v.left - 80 || x >= v.right + 80 || y <= v.top - 80 || y >= v.bottom + 80))
        throw Error('援兵刷进画面');
    }
    if (JSON.stringify(before) !== JSON.stringify([g.wave, g.waveKills, g.waveSpawned]))
      throw Error('援兵影响主线进度');
    a.refresh(); return reinforcements.length;
  });
  for (const kind of ['sniper', 'pulse']) {
    await page.evaluate(async kind => {
      const a = (await import('/src/main.js')).application, g = a.game, b = g.boss;
      Object.assign(b, { x: g.player.x + 40, y: g.player.y - 125, heavyFxCooldown: 0,
        bossPushBoost: 0, pushX: 0, pushY: 0 });
      g.fx.items = []; g.numbers = [];
      g.hit(b, 100, false, { kind, direction: { x: 0.3, y: -0.954 },
        impulse: kind === 'pulse' ? 165 : 110, power: kind === 'pulse' ? 3 : 1.8 });
      const { stepBodies } = await import('/src/physics/motion.js');
      const { WORLD } = await import('/src/world/coordinates.js');
      stepBodies([b], 0.08, WORLD); g.fx.update(0.08);
      a.renderer.draw(); a.refresh();
      if (!(b.heavyHit > 0)) throw Error('缺少重击姿态');
    }, kind);
    await page.screenshot({ path: `output/playwright/boss-pressure/${kind}.png` });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.screenshot({ path: 'output/playwright/boss-pressure/reduced.png' });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.hit(g.boss, 1e9); a.refresh();
    if (g.enemies.some(e => e.bossOwner)) throw Error('胜利后援兵未撤离');
  });
  if (errors.length) throw Error(errors.join(';'));
  return { widths: [320, 390, 580], adds, heavyFeedback: ['sniper', 'pulse'],
    reducedMotion: true, cleanup: true, errors };
}
