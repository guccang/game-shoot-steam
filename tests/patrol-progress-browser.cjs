// 真实刷新验收：离页保存、Boss 血量与轮次、清档失败保护和旧档兼容。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    const { freshProgress } = await import('/src/game.js');
    const p = freshProgress();
    p.bosses = 2;
    p.coins = 465;
    p.wood = 13819;
    delete p.patrol;
    localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
    localStorage.setItem(
      'forest-patrol-environment-v1',
      JSON.stringify({ time: 'night', weather: 'rain', autoTime: false, autoWeather: false }),
    );
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application,
      g = a.game;
    Object.assign(g, {
      wave: 8,
      waveKills: 19,
      kills: 90,
      bossKillsAt: 77,
      roundBosses: 2,
      spawnTimer: 1.8,
      attackTimer: 999,
      state: 'paused',
    });
    g.enemies = [];
    g.trees = [];
    g.player.hp = 83;
    g.addTree(g.player.x + 100, g.player.y);
    g.hit(g.trees[0], 1000);
    if (g.progress.coins !== 469 || g.progress.wood !== 13823)
      throw Error('伐木未保持 4 金币、4 木材');
    // 奖励保存后再改变波次，下一次刷新必须由离页保存捕获最新值。
    g.wave = 9;
    a.refresh();
  });
  await page.reload();
  const wave = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application,
      g = a.game;
    if (
      g.state !== 'paused' ||
      g.wave !== 9 ||
      g.waveKills !== 19 ||
      g.kills !== 90 ||
      g.bossKillsAt !== 77 ||
      g.roundBosses !== 2
    )
      throw Error('刷新丢失波次');
    if (g.player.hp !== 83 || g.progress.coins !== 469 || g.progress.wood !== 13823)
      throw Error('刷新数据不一致');
    g.enemies = [];
    g.attackTimer = g.spawnTimer = 999;
    a.refresh();
    return { wave: g.wave, kills: g.waveKills, bossWins: g.roundBosses };
  });
  await page.locator('#resume').click();
  if (await page.locator('#boss-button').isDisabled()) throw Error('挑战资格丢失');
  await page.locator('#boss-button').click();
  const boss = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application,
      g = a.game;
    g.boss.hp -= 123;
    g.boss.attack = 999;
    g.boss.speed = 0;
    g.state = 'paused';
    a.refresh();
    return { hp: g.boss.hp, maxHp: g.boss.maxHp, kind: g.boss.kind, bosses: g.progress.bosses };
  });
  await page.reload();
  await page.evaluate(async (boss) => {
    const a = (await import('/src/main.js')).application,
      g = a.game;
    if (
      g.boss.hp !== boss.hp ||
      g.boss.maxHp !== boss.maxHp ||
      g.boss.kind !== boss.kind ||
      g.progress.bosses !== boss.bosses
    )
      throw Error('Boss 刷新不一致');
    if (g.wave !== 9 || g.waveKills !== 19 || g.state !== 'paused') throw Error('Boss 战波次丢失');
    g.attackTimer = g.spawnTimer = 999;
    g.boss.attack = 999;
    g.boss.speed = 0;
    g.enemies = [];
    a.refresh();
  }, boss);
  await page.locator('#resume').click();
  await page.screenshot({ path: 'output/playwright/patrol-progress/boss-restored.png' });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application,
      g = a.game;
    g.state = 'paused';
    g.hit(g.boss, 1e9);
    a.refresh();
  });
  await page.reload();
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    if (g.boss || g.progress.bosses !== 3 || g.roundBosses !== 3 || g.bossKillsAt !== 90)
      throw Error('领主胜利未保存');
  });
  await page.locator('#settings-button').click();
  await page.locator('#reset-progress').click();
  await page.locator('#cancel-reset').click();
  await page.locator('#reset-progress').click();
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'forest-patrol-v1') throw Error('模拟写入失败');
      return window.originalSetItem.call(this, key, value);
    };
  });
  await page.locator('#confirm-reset').click();
  if (!(await page.locator('#reset-error').isVisible())) throw Error('写入失败没有提示');
  await page.evaluate(async () => {
    if ((await import('/src/main.js')).application.game.wave !== 9) throw Error('失败仍清空');
    Storage.prototype.setItem = window.originalSetItem;
    delete window.originalSetItem;
  });
  await page.screenshot({ path: 'output/playwright/patrol-progress/reset-confirmation.png' });
  await page.locator('#confirm-reset').click();
  await page.reload();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application,
      g = a.game;
    const { freshProgress } = await import('/src/game.js');
    if (
      JSON.stringify(g.progress) !== JSON.stringify(freshProgress()) ||
      g.state !== 'ready' ||
      g.wave !== 1 ||
      g.kills !== 0 ||
      g.boss
    )
      throw Error('刷新复活旧进度');
    if (a.environment.time !== 'night' || a.environment.weather !== 'rain')
      throw Error('清档改变环境偏好');
  });
  if (errors.length) throw Error(errors.join('\n'));
  return {
    wave,
    boss,
    pagehideSaved: true,
    resetSafe: true,
    coinsPerTree: 4,
    woodPerTree: 4,
    errors,
  };
};
