// 手机浏览器验收：真实入口、祝福、失败结算、刷新恢复及三种无尽模式跨越旧终点。
async (page) => {
  if (new URL(page.url()).port !== '4186') throw Error('仅允许隔离测试端口');
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    const { freshProgress } = await import('/src/progression/progress.js');
    localStorage.setItem('forest-patrol-v1', JSON.stringify(freshProgress()));
    localStorage.setItem('forest-patrol-environment-v1', JSON.stringify({time:'day',weather:'sun',autoTime:false,autoWeather:false}));
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.wave = 7; a.game.kills = 42; a.game.player.hp = 83; a.game.pause(); a.save();
    a.game.progress.equipmentGoal = {kind:'weapons',index:1}; a.save(); a.refresh();
  });
  // 移动菜单折叠时先展开，真实点击入口验证事件与暂停归属。
  async function openMenu() {
    if (!await page.locator('#realm-button').isVisible())
      await page.getByRole('button', {name:'展开功能菜单', exact:true}).click();
    await page.locator('#realm-button').click();
  }
  // 使用实际敌人和正式击杀入口驱动关卡结束，不直接改写通关阶段。
  async function clearStage() {
    await page.evaluate(async () => {
      const a = (await import('/src/main.js')).application, g = a.game;
      for (let i = 0; i < 3000 && g.realm.phase === 'combat'; i++) {
        g.updateWaves(.05);
        for (const enemy of g.enemies) if (enemy.hp > 0) g.hit(enemy, 100000);
        if(g.boss)g.hit(g.boss,1000000);
      }
      if (g.realm.phase === 'combat') throw Error('关卡未结束');
      a.refresh(); a.renderer.draw();
    });
  }
  // 当前模式逐关通过，祝福和爬塔按钮仍由真实点击驱动。
  async function complete() {
    for (let i = 0; i < 16; i++) {
      const phase = await page.evaluate(async () => (await import('/src/main.js')).application.game.realm.phase);
      if (await page.evaluate(async () => (await import('/src/main.js')).application.game.realm.cleared>=12)) {
        if(!await page.locator('#realm-dialog').isVisible())await openMenu();
        return;
      }
      if (phase === 'choice') {
        if(await page.locator('[data-guardian-wave]').isVisible())await page.locator('[data-guardian-wave]').click();
        await page.locator('[data-realm-blessing]').first().click();
      }
      else if (phase === 'rest') await page.locator('[data-realm-next]').click();
      await clearStage();
    }
    throw Error('未能完成整局');
  }
  await openMenu();
  await page.locator('.realm-art img').first().evaluate(img => img.decode());
  await page.screenshot({path:'output/playwright/endless-realms/catalog-390.png'});
  await page.locator('[data-enter-realm="rogue"]').click();
  await page.locator('[data-realm-roll="weapon"]').click();
  await page.locator('[data-realm-roll="vehicle"]').click();
  await page.locator('[data-realm-roll="turret"]').click();
  await page.locator('[data-realm-ready]').click();
  if (await page.locator('#equipment-goal').isVisible()) throw Error('秘境不应显示森林工坊目标');
  if (await page.locator('[data-realm-blessing]').count() !== 3) throw Error('祝福必须三选一');
  await page.locator('#realm-help').click();
  if (!await page.locator('#realm-help-dialog').isVisible()) throw Error('问号没有打开说明');
  await page.keyboard.press('Escape');
  if (await page.locator('#realm-help-dialog').isVisible()) throw Error('Esc 没有关闭说明');
  if (await page.evaluate(async () => (await import('/src/main.js')).application.game.realm.phase) !== 'choice') throw Error('说明跳过了祝福选择');
  await page.keyboard.press('Escape');
  if (!await page.locator('#realm-dialog').isVisible()) throw Error('Esc 不应跳过必选祝福');
  await page.screenshot({path:'output/playwright/endless-realms/blessings-390.png'});
  await page.locator('[data-realm-blessing]').first().click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    for (let i = 0; i < 95; i++) a.game.update(.05, {x:0,y:0});
    a.refresh(); a.renderer.draw();
  });
  await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('d');
  await page.screenshot({path:'output/playwright/endless-realms/rogue-390.png'});
  await complete();
  const reward = await page.evaluate(async () => (await import('/src/main.js')).application.game.progress.coins);
  await page.screenshot({path:'output/playwright/endless-realms/victory-390.png'});
  await page.reload();
  const restored = await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return { phase:g.realm.phase, coins:g.progress.coins };
  });
  if (restored.phase !== 'choice' || restored.coins !== reward) throw Error('结算刷新重复发奖');
  await page.locator('[data-realm-exit]').click();
  if (!await page.locator('#equipment-goal').isVisible()) throw Error('返回森林后追踪目标没有恢复');
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    if(g.wave !== 7 || g.kills !== 42 || g.player.hp !== 83) throw Error('森林进度被秘境覆盖');
  });
  await page.locator('#resume').click();
  await openMenu(); await page.locator('[data-enter-realm="guardian"]').click();
  await page.locator('[data-realm-next]').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    for(let i=0;i<180;i++) g.update(.05,{x:0,y:0});
    a.refresh(); a.renderer.draw();
  });
  await page.screenshot({path:'output/playwright/endless-realms/guardian-390.png'});
  await clearStage();
  await page.locator('[data-guardian-wave]').click();
  await page.locator('[data-realm-blessing="mend"]').click();
  await page.reload();
  await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    if(g.realm.stage !== 2 || g.state !== 'paused') throw Error('刷新未恢复守护第二波暂停状态');
  });
  await page.locator('#resume').click(); await complete();
  await page.locator('[data-realm-exit]').click();
  await page.locator('#resume').click();
  await openMenu(); await page.locator('[data-enter-realm="tower"]').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.hurt(100000); a.refresh();
  });
  if (!await page.getByRole('heading', {name:'本次挑战结束'}).isVisible()) throw Error('失败未展示结算');
  await page.locator('[data-realm-exit]').click();
  await page.locator('#resume').click();
  await openMenu(); await page.locator('[data-enter-realm="tower"]').click();
  await complete();
  await page.locator('[data-realm-exit]').click();
  await page.locator('#resume').click();
  for (const width of [320,390,580]) {
    await page.setViewportSize({width,height:844});
    await openMenu();
    for (const img of await page.locator('.realm-art img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(img => img.decode());
      if (!await img.evaluate(img => img.naturalWidth === 768 && img.naturalHeight === 512)) throw Error('玩法插画未正确加载');
    }
    if (await page.locator('#realm-dialog .eyebrow, #realm-dialog .realm-lead, .realm-rules').count()) throw Error('入口仍有冗余说明');
    await page.locator('#realm-dialog').evaluate(el => {el.scrollTop = 0;});
    await page.locator('#realm-help').click();
    if (!(await page.locator('#realm-help-content').innerText()).includes('刷新从未完成关卡起点恢复')) throw Error('说明缺失存档规则');
    if ((await page.locator('#realm-help-content').innerText()).includes('undefined')) throw Error('说明存在缺失字段');
    const helpFits = await page.locator('#realm-help-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().width <= innerWidth);
    if (!helpFits) throw Error('玩法说明横向溢出：' + width);
    await page.screenshot({path:`output/playwright/endless-realms/help-${width}.png`});
    await page.locator('#realm-help-done').click();
    if (!await page.locator('#realm-dialog').isVisible()) throw Error('关闭说明丢失入口');
    if (await page.evaluate(async () => (await import('/src/main.js')).application.game.state) !== 'paused') throw Error('关闭说明提前恢复战斗');
    const words = await page.locator('.realm-card').evaluateAll(cards => cards.map(card => card.innerText.length));
    if (words.some(count => count > 85)) throw Error('入口卡片仍有过多文字');
    await page.locator('#realm-dialog').evaluate(el => {el.scrollTop = 0;});
    const fit = await page.locator('#realm-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().width <= innerWidth);
    if (!fit) throw Error('秘境入口横向溢出：' + width);
    await page.screenshot({path:`output/playwright/endless-realms/catalog-${width}.png`});
    await page.locator('#close-realm').click();
  }
  const records = await page.evaluate(async () => (await import('/src/main.js')).application.game.progress.realms.records);
  if(Object.values(records).some(r=>r.best!==12||r.bosses!==2)) throw Error('无尽纪录错误：'+JSON.stringify(records));
  if(errors.length) throw Error(errors.join('\n'));
  return {records,errors,widths:[320,390,580],passed:true};
}
