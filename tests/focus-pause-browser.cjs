// 隔离浏览器验证自动暂停开关、失焦事件链、秘境倒计时与偏好持久化。
async page => {
  if (new URL(page.url()).port !== '4199') throw Error('仅允许隔离端口4199');
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  const toggle = page.getByRole('checkbox', { name: '失去焦点时自动暂停' });
  if (!await toggle.isChecked()) throw Error('默认未开启失焦暂停');
  await page.getByRole('button', { name: '回到游戏', exact: true }).click();
  // 在正式应用事件链中读取状态，不另造简化的暂停规则。
  async function state() {
    return page.evaluate(async () => (await import('/src/main.js')).application.game.state);
  }
  // 自动化宿主不保证操作系统焦点，显式派发失焦事件并检查正式监听链。
  async function switchAway() {
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(150);
  }
  await switchAway();
  if (await state() !== 'paused') throw Error('默认失焦没有暂停');
  await page.locator('#resume').click();
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  await toggle.uncheck();
  // 关闭开关后，设置面板失焦不应撤销关闭面板时的正常恢复资格。
  await switchAway();
  await page.getByRole('button', { name: '回到游戏', exact: true }).click();
  if (await state() !== 'playing') throw Error('关闭设置后未恢复战斗');
  await switchAway();
  if (await state() !== 'playing') throw Error('关闭开关后失焦仍暂停');
  // 显式覆盖可见性事件，确保浏览器没有触发 blur 时也遵守相同开关。
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  if (await state() !== 'playing') throw Error('关闭开关后隐藏页面仍暂停');
  await page.reload();
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  if (await toggle.isChecked()) throw Error('刷新丢失关闭偏好');
  await page.getByRole('button', { name: '回到游戏', exact: true }).click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.state = 'playing'; g.enterRealm('tower');
    g.enemies = []; g.boss = null; g.realm.kills = g.realm.spec.total;
    const { updateRealm } = await import('/src/core/realm-manager.js');
    updateRealm(g, 0); a.refresh();
  });
  await switchAway();
  if (await state() !== 'realm') throw Error('关闭开关后爬塔休整仍暂停');
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  await toggle.check();
  await page.getByRole('button', { name: '回到游戏', exact: true }).click();
  await switchAway();
  if (await state() !== 'paused') throw Error('重新开启后爬塔休整未暂停');
  // 手机与桌面检查设置行排版，昼夜均通过正式场景绘制器显示背景。
  for (const [width, height, time] of [[390, 844, 'day'], [1280, 900, 'night']]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async time => {
      const a = (await import('/src/main.js')).application;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      Object.assign(a.environment, { time, weather: 'sun', autoTime: false, autoWeather: false });
      a.renderer.light = new EnvironmentTransition(a.environment, 0);
      a.renderer.tone = new SceneTone(a.environment, 0);
    }, time);
    await page.getByRole('button', { name: '游戏设置', exact: true }).click();
    await toggle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/focus-setting/${width}-${time}.png` });
    await page.getByRole('button', { name: '回到游戏', exact: true }).click();
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { passed: true, defaultPause: true, disabledContinues: true, reloadPersists: true, towerRestCovered: true, errors };
}
