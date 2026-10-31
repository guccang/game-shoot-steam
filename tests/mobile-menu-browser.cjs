// 隔离端口验收默认收起、四个真实面板、焦点归还、手机旋转与桌面布局。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [], layouts = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    // 仅重置隔离测试端口，保证重复验收不会继承上一轮的自动继续状态。
    (await import('/src/main.js')).application.destroy();
    localStorage.clear();
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    g.player.invincible = 999;
    g.attackTimer = 999;
  });
  for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 580, height: 928 }, { width: 580, height: 360 }]) {
    await page.setViewportSize(size);
    if (await page.locator('#map-button').isVisible()) throw Error('手机默认未收起');
    const closed = await page.locator('.field-menu').boundingBox();
    if (closed.width !== 44 || closed.height !== 44) throw Error('收起菜单占用过大');
    if (!(await page.locator('.player-hud').isVisible())) throw Error('收起菜单隐藏了血条');
    await page.screenshot({ path: `output/playwright/mobile-menu/closed-${size.width}-${size.height}.png` });
    await page.getByRole('button', { name: '展开功能菜单', exact: true }).click();
    const opened = await page.locator('#field-menu-items').boundingBox();
    if (opened.x < 0 || opened.y < 0 || opened.x + opened.width > size.width || opened.y + opened.height > size.height)
      throw Error('展开菜单超出视口');
    for (const id of ['map-button', 'heroes-button', 'weapons-button', 'vehicles-button'])
      if (!(await page.locator('#' + id).isVisible())) throw Error('展开缺少入口');
    await page.screenshot({ path: `output/playwright/mobile-menu/open-${size.width}-${size.height}.png` });
    await page.getByRole('button', { name: '收起功能菜单', exact: true }).click();
    layouts.push({ ...size, closed, opened });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, dialog, close] of [
    ['map-button', 'map-dialog', 'map-done'],
    ['heroes-button', 'camp-dialog', 'camp-done'],
    ['weapons-button', 'camp-dialog', 'camp-done'],
    ['vehicles-button', 'vehicle-collection-dialog', 'vehicle-collection-done'],
  ]) {
    await page.locator('#field-menu-toggle').click();
    await page.locator('#' + id).click();
    if (!(await page.locator('#' + dialog).isVisible())) throw Error('面板未打开');
    if (await page.locator('#field-menu-items').isVisible()) throw Error('选中功能未自动收起');
    await page.waitForFunction(async () => (await import('/src/main.js')).application.game.state === 'paused');
    await page.locator('#' + close).click();
    await page.waitForFunction(async () => (await import('/src/main.js')).application.game.state === 'playing');
    await page.waitForFunction(() => document.activeElement.id === 'field-menu-toggle');
  }
  await page.locator('#field-menu-toggle').click();
  await page.keyboard.press('Escape');
  if (await page.locator('#map-button').isVisible()) throw Error('Escape 未收起');
  await page.locator('#field-menu-toggle').click();
  await page.locator('#game').click({ position: { x: 100, y: 300 } });
  if (await page.locator('#map-button').isVisible()) throw Error('外部点击未收起');
  await page.setViewportSize({ width: 900, height: 900 });
  await page.waitForFunction(() => !document.getElementById('field-menu-items').hidden);
  if (await page.locator('#field-menu-toggle').isVisible()) throw Error('桌面显示了折叠按钮');
  if (!(await page.locator('#vehicles-button').isVisible())) throw Error('桌面入口丢失');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.getElementById('field-menu-items').hidden);
  await page.locator('#field-menu-toggle').click();
  await page.reload();
  if (await page.locator('#map-button').isVisible()) throw Error('刷新未默认收起');
  if (errors.length) throw Error(errors.join(';'));
  return { layouts, panels: 4, reload: true, focus: true, errors };
}
