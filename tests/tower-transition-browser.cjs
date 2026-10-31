// 隔离端口验收正式帧循环、面板暂停、自动换区和手机/桌面的昼夜同屏。
async page => {
  if (new URL(page.url()).port !== '4198') throw Error('仅允许隔离端口4198');
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.bringToFront();
  const before = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    window.__towerTest = a;
    if (g.realm?.mode !== 'tower') throw Error('请通过正式界面进入时空之塔');
    g.state = 'playing'; g.player.hp = g.maxHp();
    g.enemies = []; g.boss = null; g.realm.kills = g.realm.spec.total;
    const { updateRealm } = await import('/src/core/realm-manager.js');
    updateRealm(g, 0); a.refresh();
    return { stage: g.realm.stage, arena: g.realm.arena, coins: g.progress.coins };
  });
  await page.waitForFunction(() => document.querySelector('#quest-count').textContent.includes('秒后自动进入'));
  if (await page.locator('#realm-dialog').isVisible()) throw Error('休整不应自动弹出面板');
  await page.screenshot({ path: 'output/playwright/tower-flow/countdown.png' });
  await page.getByRole('button', { name: '时空秘境', exact: true }).click();
  const paused = await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return { state: g.state, remaining: g.realm.restRemaining };
  });
  await page.waitForTimeout(1100);
  const frozen = await page.evaluate(async () => (await import('/src/main.js')).application.game.realm.restRemaining);
  if (paused.state !== 'paused' || frozen !== paused.remaining) throw Error('查看面板没有冻结倒计时');
  await page.getByRole('button', { name: '返回战场', exact: true }).click();
  await page.waitForFunction(stage => {
    const g = window.__towerTest.game;
    return g.realm.stage === stage + 1 && g.realm.phase === 'combat';
  }, before.stage, { timeout: 20000 });
  const after = await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return { stage: g.realm.stage, arena: g.realm.arena, coins: g.progress.coins };
  });
  if (JSON.stringify(before.arena) === JSON.stringify(after.arena) || before.coins !== after.coins) throw Error('换区或奖励隔离失败：' + JSON.stringify({ before, after }));
  await page.reload();
  await page.locator('#resume').waitFor({ state: 'visible' });
  const restored = await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return { stage: g.realm.stage, arena: g.realm.arena, state: g.state };
  });
  if (JSON.stringify(restored.arena) !== JSON.stringify(after.arena) || restored.state !== 'paused') throw Error('刷新未恢复换层检查点');
  await page.getByRole('button', { name: '继续挑战', exact: true }).click();
  // 通过正式载具和怪物入口布置同屏样本，保留实时动画与完整渲染管线。
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.progress.vehicleWeapons[0] = 1; g.progress.vehicleLoadouts[0] = 0;
    g.configureVehicle(0); g.summonVehicle();
    g.player.invincible = 999; g.realm.warning = 999;
    for (const dx of [-55, 110]) {
      const enemy = g.spawnEnemy(0, 0, { x: g.player.x + dx, y: g.player.y + 110 });
      Object.assign(enemy, { hp: 100000, maxHp: 100000, realm: true, arena: g.realm.arena, speed: 0, damage: 0, flying: false });
    }
    a.refresh();
  });
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    for (const time of ['day', 'night']) {
      await page.evaluate(async time => {
        const a = (await import('/src/main.js')).application;
        const { EnvironmentTransition } = await import('/src/world/environment.js');
        const { SceneTone } = await import('/src/rendering/scene-tone.js');
        Object.assign(a.environment, { time, weather: 'sun', autoTime: false, autoWeather: false });
        a.renderer.light = new EnvironmentTransition(a.environment, 0);
        a.renderer.tone = new SceneTone(a.environment, 0);
        a.game.player.invincible = 0; a.renderer.resize(); a.renderer.draw();
      }, time);
      await page.screenshot({ path: `output/playwright/tower-flow/${width}-${time}.png` });
    }
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { passed: true, designCriterion: 'tower-floor-transition / realm-day-night', before, after, restored, errors };
}
