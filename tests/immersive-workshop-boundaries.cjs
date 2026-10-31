// 工坊边界回归：无效投放、触摸取消、资源说明、横向浏览与暂停归属。
async (page) => {
  if (new URL(page.url()).port !== '4186') throw Error('仅允许隔离端口');
  await page.reload(); await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.start(); a.workshop.open('weapons', 0);
  });
  await page.locator('#ws-kits-tab').click();
  await page.locator('[data-ws-part="2"]').dragTo(page.locator('#ws-name'));
  if (!await page.locator('#ws-confirm').isDisabled()) throw Error('无效落点产生草稿');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const b = await page.locator('[data-ws-part="2"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 30, y: b.y + 25 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + 30, y: b.y - 20 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  if (await page.locator('.ws-drag-ghost').count() || !await page.locator('#ws-confirm').isDisabled()) throw Error('取消触摸留下悬浮零件或草稿');
  await page.locator('[data-ws-mode="vehicle"]').click();await page.locator('#ws-kits-tab').click();
  const tray = await page.locator('#ws-parts').boundingBox();
  const x = tray.x + tray.width - 30, y = tray.y + 35;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 25, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (await page.locator('#ws-parts').evaluate(e => e.scrollLeft) < 80) throw Error('手机无法横向浏览炮塔');
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await cdp.detach();
  await page.locator('[data-ws-mode="weapons"]').click();await page.locator('[data-ws-upgrade="damage"]').click();await page.locator('#ws-socket').click();
  await page.locator('#ws-resources [data-resource-info]').first().click();
  if (!await page.locator('#resource-help-dialog').isVisible()) throw Error('资源来源未打开');
  await page.locator('#close-resource-help').click();
  if (await page.evaluate(async () => (await import('/src/main.js')).application.game.state) !== 'paused') throw Error('嵌套说明提前恢复战斗');
  await page.locator('[data-ws-mode="vehicle"]').click();await page.locator('#ws-close').click();
  if (await page.evaluate(async () => (await import('/src/main.js')).application.game.state) !== 'playing') throw Error('暂停归属错误');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.game.pause(); a.workshop.open('vehicle', 2);
  });
  await page.locator('#ws-close').click();
  if (await page.evaluate(async () => (await import('/src/main.js')).application.game.state) !== 'paused') throw Error('破坏手动暂停');
  // 连续开关只保留固定画布，试射关闭后不会继续调度。
  const budget = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    for (let i = 0; i < 15; i++) { a.workshop.open('vehicle', i % 4); document.getElementById('ws-close').click(); }
    return { dialogs: document.querySelectorAll('#workshop-dialog').length, ghosts: document.querySelectorAll('.ws-drag-ghost').length,
      bytes: [...document.querySelectorAll('#workshop-dialog canvas')].reduce((n, c) => n + c.width * c.height * 4, 0) };
  });
  if (budget.dialogs !== 1 || budget.ghosts !== 0 || budget.bytes > 5 * 1024 * 1024) throw Error('工坊节点或画布预算异常');
  console.log(JSON.stringify(budget));
}
