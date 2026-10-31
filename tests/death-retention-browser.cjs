// 隔离端口验证死亡提示、真实保存、重新出发、统计面板与显式清档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.clear();
  });
  await page.reload(); await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    Object.assign(g, { wave: 15, waveKills: 37, kills: 115, chopped: 307, roundBosses: 3,
      bossKillsAt: 110, attackTimer: 999, enemies: [] });
    Object.assign(g.progress, { bosses: 3, coins: 12345, wood: 678 });
    g.updateWaves = () => {};
    g.player.invincible = 0; g.hurt(1e9); a.refresh();
  });
  const message = await page.locator('#overlay-text').innerText();
  if (!message.includes('回到第 12 波') || !message.includes('伐木 307'))
    throw Error('死亡提示未说明真实回退和保留统计');
  await page.screenshot({ path: 'output/playwright/death-retention/dead.png' });
  await page.reload();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return g.state === 'dead' && g.wave === 15 && g.kills === 115 && g.chopped === 307;
  })) throw Error('死亡刷新丢失统计或提前重复扣波次');
  await page.locator('#resume').click();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    g.player.invincible = 999; g.attackTimer = 999; g.spawnTimer = 999;
    return g.wave === 12 && g.waveKills === 0 && g.kills === 115 && g.chopped === 307 &&
      g.roundBosses === 3 && g.bossKillsAt === 110 &&
      g.progress.coins === 12345 && g.progress.wood === 678 && g.enemies.every(e => e.wave === 12);
  })) throw Error('重新出发未保留统计或生成了错误波次怪物');
  await page.reload(); await page.reload();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return g.state === 'paused' && g.wave === 12 && g.chopped === 307 && g.roundBosses === 3;
  })) throw Error('续游存档刷新后再次回退');
  await page.locator('#field-menu-toggle').click();
  await page.locator('#heroes-button').click();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.journal').scrollIntoViewIfNeeded();
    if (await page.locator('#kills').innerText() !== '115' ||
        await page.locator('#trees').innerText() !== '307' ||
        await page.locator('#bosses').innerText() !== '3') throw Error('巡游手记被清空');
    await page.screenshot({ path: `output/playwright/death-retention/journal-${width}.png` });
  }
  await page.locator('#camp-done').click();
  await page.locator('#resume').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.player.invincible = 0; a.game.hurt(1e9); a.refresh();
  });
  await page.locator('#resume').click();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    g.player.invincible = 999;
    return g.wave === 9 && g.kills === 115 && g.chopped === 307 && g.roundBosses === 3;
  })) throw Error('第二次死亡未恰好回退三波');
  await page.locator('#settings-button').click();
  await page.locator('#reset-progress').click();
  await page.locator('#confirm-reset').click();
  await page.reload();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return g.state === 'ready' && g.wave === 1 && g.kills === 0 && g.chopped === 0 &&
      g.roundBosses === 0 && g.progress.coins === 60 && g.progress.wood === 30;
  })) throw Error('显式清档未完整重置');
  if (errors.length) throw Error(errors.join(';'));
  return { waves: [15, 12, 9], stats: [115, 307, 3], reloadSafe: true, resetSafe: true, errors };
}
