// 隔离端口验收波次栏领主头像、挑战流程、窄屏布局及后续采集收益。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy();
    const { freshProgress } = await import('/src/game.js');
    const p = freshProgress();
    p.coins = 465; p.wood = 13819;
    localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
  });
  await page.reload();
  await page.locator('#start').click();
  const resources = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.enemies = []; g.trees = []; g.spawnTimer = g.attackTimer = 9999;
    if (g.progress.coins !== 465 || g.progress.wood !== 13819) throw Error('旧库存被修改');
    g.addTree(g.player.x + 100, g.player.y);
    g.hit(g.trees[0], 99999);
    if (g.progress.coins !== 469 || g.progress.wood !== 13823) throw Error('采集收益错误');
    g.trees = []; a.save(); a.refresh();
    const saved = JSON.parse(localStorage.getItem('forest-patrol-v1'));
    if (saved.coins !== 469 || saved.wood !== 13823) throw Error('收益保存错误');
    return { coins: saved.coins, wood: saved.wood };
  });
  const portraits = [];
  for (const [index, kind] of ['boar', 'mushroom', 'owl', 'turtle', 'moss'].entries()) {
    await page.evaluate(async (index) => {
      const a = (await import('/src/main.js')).application;
      a.game.progress.bosses = index; a.refresh();
    }, index);
    if (await page.locator('#boss-button').getAttribute('data-kind') !== kind) throw Error('领主头像轮换错误');
    portraits.push(await page.locator('#boss-button-icon').evaluate(c => c.toDataURL()));
    await page.locator('#quest').screenshot({path: `output/playwright/boss-wave-resources/portrait-${kind}.png`});
  }
  if (new Set(portraits).size !== 5) throw Error('领主头像重复');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.progress.bosses = 0; a.game.kills = 5; a.refresh();
  });
  if (!await page.locator('#boss-button').isDisabled()) throw Error('挑战提前解锁');
  if (await page.locator('#boss-button-badge').textContent() !== '7') throw Error('倒计数错误');
  const layouts = [];
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({width, height: width === 320 ? 568 : width === 580 ? 928 : 844});
    for (const ready of [false, true]) {
      await page.evaluate(async (ready) => {
        const a = (await import('/src/main.js')).application;
        a.game.kills = ready ? 12 : 5; a.refresh();
      }, ready);
      const bounds = await page.locator('#quest').evaluate(n => {
        const r = n.getBoundingClientRect(), b = n.querySelector('button').getBoundingClientRect();
        return { left: r.left, right: r.right, width: b.width, height: b.height,
          inside: b.left >= r.left && b.right <= r.right, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      if (!bounds.inside || bounds.left < 0 || bounds.right > width || bounds.width < 44 || bounds.height < 44 || bounds.overflow) throw Error(`布局越界 ${width}`);
      if (await page.locator('.bottom-info #boss-button').count()) throw Error('底部仍有领主按钮');
      if (await page.locator('#boss-button').isDisabled() === ready) throw Error('按钮可用状态错误');
      layouts.push({width, ready, ...bounds});
      await page.screenshot({path: `output/playwright/boss-wave-resources/${width}-${ready ? 'ready' : 'locked'}.png`});
    }
  }
  await page.locator('#pause').click();
  if (!await page.locator('#boss-button').isDisabled()) throw Error('暂停时仍能挑战');
  await page.locator('#resume').click();
  await page.locator('#boss-button').click();
  if (await page.locator('#quest').isVisible() || !await page.locator('#boss-hud').isVisible()) throw Error('挑战后 HUD 未切换');
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    if (g.boss.kind !== 'boar') throw Error('挑战领主与头像不一致');
    g.hit(g.boss, 1e9); a.refresh();
  });
  if (await page.locator('#boss-button').getAttribute('data-kind') !== 'mushroom') throw Error('胜利后没有切换下一位');
  if (await page.locator('#boss-button-badge').textContent() !== '12') throw Error('胜利后未重置挑战门槛');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify({resources, portraits: portraits.length, layouts, errors}));
}
