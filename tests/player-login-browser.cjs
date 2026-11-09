// 在独立浏览器上下文运行真实登录、返回首页与换人，避免改动已有玩家存档。
async (page) => {
  const context = await page.context().browser().newContext({
    viewport: {width: 320, height: 568}, isMobile: true, hasTouch: true,
  });
  try {
    const gamePage = await context.newPage();
    await gamePage.goto('http://localhost:4175');
    const field = gamePage.getByLabel('用户名', {exact: true});
    // 等待正式应用接管后检查输入校验。
    await gamePage.evaluate(async () => { await import('/src/main.js'); });
    await field.fill('   ');
    if (!await gamePage.locator('#start').isDisabled()) throw Error('空白用户名可以进入');

    // 通过正式按钮入场，从当页模块读取换人后重新装配的应用。
    async function enter(name) {
      await field.fill(name);
      await gamePage.locator('#start').click();
      await gamePage.waitForSelector('#game-frame[data-page="game"]', {timeout: 90000});
      return gamePage.evaluate(async () => (await import('/src/main.js')).application.game.progress.coins);
    }
    // 返回首页通过正式保存流程落盘。
    async function saveAndLeave(coins) {
      await gamePage.evaluate(async amount => {
        const {application} = await import('/src/main.js');
        application.game.progress.coins = amount;
        if (!application.menu.home()) throw Error('返回首页时保存失败');
      }, coins);
    }
    await enter('巡游测试甲');
    await saveAndLeave(7432);
    await gamePage.getByRole('button', {name: '随机取名'}).click();
    const other = await field.inputValue();
    if (!other || other === '巡游测试甲' || await enter(other) === 7432) throw Error('随机用户串档');
    await saveAndLeave(8291);
    if (await enter('巡游测试甲') !== 7432) throw Error('原用户进度没有恢复');
  } finally {
    await context.close();
  }
}
