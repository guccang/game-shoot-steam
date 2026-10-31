// 隔离浏览器验证资源图标、触摸说明、嵌套暂停恢复、手机布局与实际掉落渲染。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.destroy();
    const { freshProgress } = await import('/src/game.js'), p = freshProgress();
    p.coins = 9855; p.wood = 3456; p.bosses = 18;
    p.materials = { parts: 123, crystal: 46, core: 8 };
    localStorage.clear(); localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
  });
  await page.reload(); await page.locator('#start').click();
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    g.attackTimer = g.spawnTimer = 999; g.player.invincible = 999;
  });
  await page.locator('.hud-resources [data-resource-info="coins"]').click();
  if (await page.locator('#resource-help-title').innerText() !== '金币') throw Error('金币说明错误');
  await page.locator('#close-resource-help').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.game.state === 'playing');
  await page.locator('#field-menu-toggle').click(); await page.locator('#weapons-button').click();
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('#camp-dialog').evaluate(n => n.scrollTop = 0);
    for (const key of ['coins', 'wood', 'parts', 'crystal', 'core']) {
      if (!await page.locator(`#camp-dialog [data-resource-info="${key}"] svg path`).count())
        throw Error(`${key} 未显示矢量图标`);
    }
    if (await page.locator('#camp-dialog').evaluate(n => n.scrollWidth > n.clientWidth + 1))
      throw Error(`${width} 钱包横向溢出`);
    await page.screenshot({ path: `output/playwright/resource-icons/wallet-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#camp-dialog [data-material-wallet] [data-resource-info="crystal"]').click();
  if (await page.locator('#resource-help-title').innerText() !== '能源晶体' ||
      !await page.locator('#resource-help-source').innerText().then(s => s.includes('雾松密林')))
    throw Error('晶体来源说明缺失');
  await page.screenshot({ path: 'output/playwright/resource-icons/crystal-help.png' });
  await page.locator('#close-resource-help').click();
  if (!await page.locator('#camp-dialog').isVisible() || !await page.evaluate(async () =>
    (await import('/src/main.js')).application.game.state === 'paused')) throw Error('关闭嵌套说明提前恢复战斗');
  const card = page.locator('#inventory article').filter({ has: page.locator('[data-track-index="12"]') });
  await card.locator('[data-track-kind]').click();
  await card.locator('.equipment-requirements').scrollIntoViewIfNeeded();
  if ((await card.locator('.requirement-grid').innerText()).includes('能源晶体'))
    throw Error('需求行仍使用资源文字标签');
  await page.screenshot({ path: 'output/playwright/resource-icons/requirements.png' });
  await card.locator('[data-resource-info="core"]').click();
  if (await page.locator('#resource-help-title').innerText() !== '首领核心') throw Error('核心说明错误');
  await page.locator('#close-resource-help').click();
  await page.locator('#camp-done').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.game.state === 'playing');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    const e = g.spawnEnemy(0, 55); e.rank = 2; e.biome = 'pine';
    g.hit(e, 1e9); a.refresh();
    if (!g.numbers.some(n => n.resources?.parts === 3)) throw Error('掉落仍使用字符飘字');
  });
  await page.screenshot({ path: 'output/playwright/resource-icons/field.png' });
  await page.locator('#equipment-goal').click();
  if (!await page.locator('#goal-details [data-resource-art]').count()) throw Error('追踪详情无图标');
  await page.locator('#close-goal').click();
  if (errors.length) throw Error(errors.join('; '));
  return { icons: ['coins', 'wood', 'parts', 'crystal', 'core'], touchHelp: true,
    nestedPause: true, canvasLoot: true, widths: [320, 390, 580], errors };
}
