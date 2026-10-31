// 独立浏览器中验证新枪养成、实战充能、火流以及雷阵雨保存和窄屏适配。
async (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => sessionStorage.setItem('new-weapons-fixture', '1'));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('new-weapons-fixture')) return;
    sessionStorage.removeItem('new-weapons-fixture');
    localStorage.setItem(
      'forest-patrol-v1',
      JSON.stringify({
        version: 1,
        coins: 20000,
        wood: 8000,
        hero: 0,
        weapon: 0,
        heroes: [1, 0],
        weapons: [1, 0, 0, 0, 0, 0],
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
  const weaponCount = await page.evaluate(async () => (await import('/src/config/weapons.js')).WEAPONS.length);
  if ((await page.locator('.item-card').count()) !== weaponCount) throw Error('武器目录不完整');
  await page.locator('[data-action="buy"][data-index="6"]').click();
  await page.locator('[data-action="upgrade"][data-index="6"]').click();
  await page.locator('[data-action="buy"][data-index="7"]').click();
  await page.locator('[data-action="upgrade"][data-index="7"]').click();
  await page.locator('[data-action="equip"][data-index="6"]').click();
  await page.locator('#close-camp').click();
  await page.evaluate(async () => {
    const { application: app } = await import('/src/main.js');
    window.heavyTest = { app, events: [] };
    const oldEvent = app.game.onEvent;
    app.game.onEvent = (type, data) => {
      heavyTest.events.push(type);
      oldEvent(type, data);
    };
    const g = app.game;
    g.trees = [];
    g.enemies = [];
    g.spawnTimer = 999;
    g.addTree(1060, 700);
    g.trees[0].hp = g.trees[0].maxHp = 99999;
    g.player.invincible = 999;
    g.attackTimer = 0;
  });
  await page.waitForFunction(() => heavyTest.events.includes('grenade-launch'), null, {
    timeout: 6000,
  });
  await page.locator('#pause').click();
  if (!(await page.locator('#magazine-hud').getAttribute('aria-label')).includes('榴弹'))
    throw Error('榴弹仪表未显示');
  await page.screenshot({ path: 'output/playwright/grenade-mobile.png' });
  await page.locator('#resume').click();
  await page.waitForFunction(() => heavyTest.events.includes('explosion'));
  await page.locator('#weapons-button').click();
  await page.locator('[data-action="equip"][data-index="7"]').click();
  await page.locator('#close-camp').click();
  await page.evaluate(() => {
    const g = heavyTest.app.game;
    g.trees = [];
    g.enemies = [];
    for (let i = 0; i < 3; i++) {
      const e = g.spawnEnemy(0, 130);
      e.x = 1010 + i * 20;
      e.y = 680 + i * 20;
      e.hp = e.maxHp = 99999;
      e.speed = 0;
    }
    g.attackTimer = 0;
  });
  await page.waitForFunction(() => heavyTest.app.game.projectiles.some((b) => b.kind === 'flame'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'output/playwright/flame-mobile.png' });
  const health = await page.evaluate(() => heavyTest.app.game.enemies.map((e) => e.hp));
  if (!health.some((hp) => hp < 99999)) throw Error('火流未造成真实伤害');
  await page.locator('#environment-button').click();
  await page.locator('[data-weather="thunder"]').click();
  await page.screenshot({ path: 'output/playwright/thunder-settings.png' });
  await page.locator('#environment-ok').click();
  // 打开声音后实际触发雷声与喷火音效，捕捉 WebAudio 路径中的运行错误。
  await page.locator('#sound').click();
  await page.waitForFunction(() => heavyTest.app.renderer.storm?.flash > 0.5, null, {
    timeout: 5000,
  });
  await page.screenshot({ path: 'output/playwright/thunder-flash.png' });
  await page.waitForTimeout(1200);
  await page.locator('#sound').click();
  await page.reload();
  if (!(await page.locator('#environment-button').innerText()).includes('雷阵雨'))
    throw Error('雷雨存档未恢复');
  await page.locator('#weapons-button').click();
  if (!(await page.locator('.item-card.equipped h3').innerText()).includes('火焰'))
    throw Error('新枪装备未保存');
  if (!(await page.locator('.item-card.equipped .level').innerText()).includes('2'))
    throw Error('新枪升级未保存');
  await page.locator('#close-camp').click();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('#environment-button').click();
  if (
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.getElementById('environment-dialog').scrollWidth >
          document.getElementById('environment-dialog').clientWidth,
    )
  )
    throw Error('窄屏天气按钮溢出');
  await page.locator('#environment-ok').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => {
    window.reducedApp = (await import('/src/main.js')).application;
  });
  await page.waitForTimeout(3200);
  if ((await page.evaluate(() => reducedApp.renderer.storm.flash)) !== 0)
    throw Error('减少动态仍有闪光');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (errors.length) throw Error(errors.join('; '));
  return {
    purchaseAndUpgrade: true,
    grenadeChargeAndExplosion: true,
    flameDamage: true,
    thunderPersisted: true,
    soundPaths: true,
    mobileOverflow: false,
    reducedMotion: true,
    errors,
  };
};
