// 浏览器生命周期回归：销毁清理监听、帧循环与弹窗，原地重建仍能正常操作。
async (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const { application } = await import('/src/main.js');
    const { createApplication } = await import('/src/app/create-app.js');
    window.moduleTest = { old: application, createApplication };
    let guarded = false;
    try {
      createApplication();
    } catch (error) {
      guarded = error.message.includes('destroy');
    }
    if (!guarded) throw Error('同一画布没有阻止重复挂载');
    application.game.player.invincible = 999;
  });
  await page.locator('#heroes-button').click();
  await page.evaluate(() => {
    moduleTest.old.destroy();
    moduleTest.old.destroy();
    moduleTest.old.game.start();
    moduleTest.frozen = moduleTest.old.game.time;
    if (document.querySelector('dialog[open]')) throw Error('销毁后仍有弹窗');
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    if (moduleTest.old.game.time !== moduleTest.frozen) throw Error('销毁后仍有动画更新');
    document.getElementById('pause').click();
    if (moduleTest.old.game.state !== 'playing') throw Error('销毁后仍有旧监听器');
    moduleTest.app = moduleTest.createApplication();
  });
  await page.locator('#start').click();
  await page.locator('#pause').click();
  if ((await page.evaluate(() => moduleTest.app.game.state)) !== 'paused')
    throw Error('重新挂载后暂停重复触发');
  await page.locator('#resume').click();
  const before = await page.evaluate(() => moduleTest.app.game.player.x);
  await page.keyboard.down('d');
  await page.waitForTimeout(220);
  await page.keyboard.up('d');
  if ((await page.evaluate(() => moduleTest.app.game.player.x)) <= before)
    throw Error('重新挂载后输入失效');
  await page.locator('#settings-button').click();
  await page.locator('#help').click();
  await page.locator('#help-ok').click();
  if ((await page.evaluate(() => moduleTest.app.game.state)) !== 'paused')
    throw Error('嵌套弹窗提前恢复战斗');
  await page.locator('#settings-done').click();
  await page.waitForFunction(() => moduleTest.app.game.state === 'playing');
  await page.evaluate(() => {
    moduleTest.app.destroy();
    delete window.moduleTest;
  });
  await page.reload();
  if (errors.length) throw Error(errors.join('; '));
  return {
    duplicateMountGuard: true,
    destroyStopsLoopAndListeners: true,
    remountInput: true,
    nestedPause: true,
    errors,
  };
};
