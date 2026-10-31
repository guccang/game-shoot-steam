// 隔离端口验收前期购买、工坊画像、近身伐木反馈、电量环与存档恢复。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [], results = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.clear();
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.progress.coins = 120; a.game.progress.wood = 40;
    a.game.player.invincible = 999; a.game.enemies = [];
    a.game.spawnTimer = 999; a.refresh();
  });
  await page.locator('#field-menu-toggle').click();
  await page.locator('#weapons-button').click();
  await page.locator('[data-action="buy"][data-index="14"]').click();
  if (!(await page.locator('.item-card').first().innerText()).includes('松齿电锯')) throw Error('电锯未装备置顶');
  const card = await page.locator('.item-card').first().innerText();
  if (!card.includes('电量') || card.includes('共享能源')) throw Error('电量标签不正确');
  await page.screenshot({ path: 'output/playwright/chainsaw/workshop.png' });
  await page.locator('#camp-done').click();
  await page.reload();
  const saved = await page.evaluate(async () => {
    const p = (await import('/src/main.js')).application.game.progress;
    return p.weapon === 14 && p.weapons[14] === 1 && p.bosses === 0;
  });
  if (!saved) throw Error('购买或刷新恢复失败');
  for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 580, height: 928 }]) {
    await page.setViewportSize(size);
    for (const stage of ['cut', 'break', 'charge']) {
      const result = await page.evaluate(async ({ size, stage }) => {
        const a = (await import('/src/main.js')).application;
        a.destroy();
        const g = a.game, r = a.renderer;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        if (stage === 'cut') {
          g.reset(); g.start(); g.progress.weapon = 14; g.progress.weapons[14] = 1;
          g.player.x = 1600; g.player.y = 700; g.random = () => .5;
          g.enemies = []; g.trees = []; g.boss = null; g.spawnTimer = 999;
          g.addTree(1660, 700);
          g.attack();
        } else if (stage === 'break') {
          g.attack();
          if (g.chopped !== 1) throw Error('两次切割未砍倒普通树');
        } else {
          g.addTree(1660, 700, { hp: 1e6, maxHp: 1e6 });
          g.magazines[14].ammo = 1; g.attack(); g.attackTimer = 999;
          for (let i = 0; i < 20; i++) g.update(.05);
          if (g.magazines[14].remaining < .9 || g.magazines[14].remaining > 1.1) throw Error('充能时钟错误');
        }
        Object.assign(a.environment, { time: 'day', weather: 'sun', autoTime: false, autoWeather: false });
        r.light = new EnvironmentTransition(a.environment, performance.now());
        r.resize(); g.setViewport(size.width, size.height); r.draw(); a.refresh();
        if (document.documentElement.scrollWidth > innerWidth) throw Error('手机横向溢出');
        if (g.projectiles.length) throw Error('电锯发射了子弹');
        return { ...size, stage, chopped: g.chopped, ammo: g.magazines[14].ammo };
      }, { size, stage });
      results.push(result);
      await page.screenshot({ path: `output/playwright/chainsaw/${size.width}-${stage}.png` });
    }
  }
  if (errors.length) throw Error(errors.join(';'));
  return { purchase: true, persisted: true, results, errors };
}
