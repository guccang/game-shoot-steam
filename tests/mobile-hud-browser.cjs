// 在隔离端口验证手机顶部、设置控制、嵌套暂停归属与 Boss 挑战，不操作正式存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [], layouts = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    // 此端口仅供验收，清理隔离存储保证重复运行不继承上一轮 Boss 挑战。
    localStorage.clear();
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const app = (await import('/src/main.js')).application;
    app.game.player.invincible = 999;
    app.game.attackTimer = 999;
  });
  // 检查真实应用状态，等待原生 dialog 的异步 close 事件完成。
  async function state(expected) {
    await page.waitForFunction(async expected =>
      (await import('/src/main.js')).application.game.state === expected, expected);
  }
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForFunction(() =>
      document.getElementById('location-info').parentElement.id === 'settings-patrol');
    for (const id of ['location-info', 'environment-button', 'pause', 'sound', 'fullscreen'])
      if (await page.locator('#' + id).isVisible()) throw Error(`手机战场仍显示 ${id}`);
    const info = await page.evaluate(() => {
      const wallet = document.querySelector('.hud-resources').getBoundingClientRect();
      const quest = document.getElementById('quest').getBoundingClientRect();
      return { width: innerWidth, top: wallet.top, bottom: wallet.bottom,
        questTop: quest.top, questBottom: quest.bottom, questLeft: quest.left, walletLeft: wallet.left,
        overflow: document.documentElement.scrollWidth > innerWidth,
        resources: document.querySelectorAll('.hud-resources .resource-pill').length };
    });
    if (info.top > 15 || info.bottom > 60 || info.overflow || info.resources !== 2) throw Error(JSON.stringify(info));
    if (!(await page.locator('#quest').isVisible()) || info.questTop < info.bottom ||
        info.questTop - info.bottom > 12 || info.questBottom > 130 || info.questLeft !== info.walletLeft)
      throw Error('波次卡未紧贴资源下方：' + JSON.stringify(info));
    layouts.push(info);
    await page.screenshot({ path: `output/playwright/compact-hud/battle-${width}.png` });
    await page.locator('#settings-button').click();
    await state('paused');
    if (await page.locator('#settings-patrol #quest').count()) throw Error('波次仍留在设置内');
    for (const id of ['environment-button', 'pause', 'sound'])
      if (!(await page.locator(`#settings-dialog #${id}`).isVisible())) throw Error(`设置内缺少 ${id}`);
    if (width === 390) await page.screenshot({ path: 'output/playwright/compact-hud/settings-390.png' });
    await page.locator('#close-settings').click();
    await state('playing');
  }
  await page.locator('#settings-button').click();
  await page.getByRole('button', { name: '保持暂停并返回战场', exact: true }).click();
  await state('paused');
  await page.waitForFunction(() => !document.getElementById('overlay').hidden);
  await page.locator('#settings-button').click();
  await page.getByRole('button', { name: '继续游戏', exact: true }).click();
  await state('playing');
  await page.locator('#settings-button').click();
  await page.locator('#environment-button').click();
  await page.locator('button[data-time="night"]').click();
  await page.locator('button[data-weather="thunder"]').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('environment-dialog').open);
  if (!(await page.locator('#settings-dialog').isVisible())) throw Error('嵌套设置意外关闭');
  await state('paused');
  await page.locator('#sound').click();
  await page.waitForFunction(() => document.getElementById('sound').getAttribute('aria-label') === '关闭声音');
  if (await page.locator('#sound-caption').textContent() !== '关闭声音') throw Error('声音说明未同步');
  await page.locator('#reset-progress').click();
  if (!(await page.locator('#reset-confirmation').isVisible())) throw Error('缺少清空确认');
  await page.locator('#cancel-reset').click();
  await page.locator('#close-settings').click();
  await state('playing');
  // 挑战入口恢复在主界面，暂停不可挑战，继续后点击头像召唤。
  await page.evaluate(async () => {
    const app = (await import('/src/main.js')).application;
    app.game.kills = app.game.bossKillsAt + 12;
    app.game.onEvent('boss-ready');
    app.refresh();
  });
  if (!(await page.locator('#toast').textContent()).includes('左上波次栏')) throw Error('挑战提示仍指向旧入口');
  await page.locator('#settings-button').click();
  if (!(await page.locator('#boss-button').isDisabled())) throw Error('暂停仍可挑战');
  await page.locator('#close-settings').click();
  await state('playing');
  if (await page.locator('#boss-button').isDisabled()) throw Error('继续后挑战仍被禁用');
  await page.locator('#boss-button').click();
  await state('playing');
  await page.waitForFunction(() => !document.getElementById('boss-hud').hidden);
  if (await page.locator('#settings-dialog').isVisible()) throw Error('挑战后未回战场');
  await page.screenshot({ path: 'output/playwright/compact-hud/boss-580.png' });
  // 桌面和手机反复切换仍只保留一套节点、监听与头像。
  await page.evaluate(async () => {
    const app = (await import('/src/main.js')).application;
    app.game.boss = null; app.game.hazards = []; app.refresh();
  });
  for (const width of [900, 390, 900, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForFunction(mobile =>
      (document.getElementById('location-info').parentElement.id === 'settings-patrol') === mobile, width <= 600);
    if (!(await page.locator('#game-frame > #quest').isVisible())) throw Error('缩放后波次卡丢失');
    if (await page.locator('#boss-button').count() !== 1) throw Error('重复挑战按钮');
    if (width > 600 && !(await page.locator('.game-top #location-info').isVisible())) throw Error('桌面区域丢失');
  }
  await page.locator('#settings-button').click();
  let fullscreen = 'unsupported';
  if (await page.locator('#fullscreen').isVisible()) {
    await page.locator('#fullscreen').click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    await page.locator('#fullscreen').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    fullscreen = 'entered-and-exited';
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { layouts, pauseResume: true, environment: true, audio: true, bossChallenge: true, fullscreen, errors };
}
