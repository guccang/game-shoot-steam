// 仅隔离端口验证综合工坊；鼠标、键盘和真实触控协议覆盖相同装配事务。
async (page) => {
  if (new URL(page.url()).port !== '4186') throw Error('仅允许工坊隔离端口 4186');
  await page.reload();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.progress.coins = a.game.progress.wood = 100000; a.game.progress.bosses = 50;
    a.game.progress.materials = { parts: 10000, crystal: 10000, core: 10000 };
    a.game.progress.weapons.fill(1); a.game.progress.mastery.fill(40);
    for (let i = 1; i < 4; i++) a.game.buyVehicle(i);
    a.game.progress.weapon = 0; a.game.progress.mods.fill(0);
    a.game.progress.vehicleWeapons.fill(0); a.game.progress.vehicleLoadouts.fill(null);
    a.environment.autoTime = false; a.environment.autoWeather = false; a.environment.time = 'day';
    a.environment.weather = 'clear'; a.environment.forestSeason = 'green';
    a.save(); a.refresh();
  });
  await page.locator('#weapons-button').click();
  if (!await page.locator('#workshop-dialog').isVisible()) throw Error('旧武器入口未转入工坊');
  const initial = await page.evaluate(async () => JSON.stringify((await import('/src/main.js')).application.game.progress));
  await page.locator('#ws-kits-tab').click();
  await page.locator('[data-ws-part="2"]').dragTo(page.locator('#ws-socket'));
  if (!await page.locator('#ws-confirm').isEnabled()) throw Error('鼠标拖拽未产生有效草稿');
  if (await page.evaluate(async () => JSON.stringify((await import('/src/main.js')).application.game.progress)) !== initial) throw Error('试装污染正式进度');
  await page.screenshot({ path: 'output/playwright/immersive-workshop/desktop-weapon-draft.png' });
  await page.locator('#ws-confirm').click();
  const committed = await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return { coins: g.progress.coins, mods: g.progress.mods[0], ammo: g.magazines[0].ammo };
  });
  if (committed.mods !== 2 || committed.coins !== JSON.parse(initial).coins - 180) throw Error('确认装配扣费错误');
  // 真实存储失败必须保留可重试草稿和正式配置。
  await page.locator('[data-ws-part="1"]').click(); await page.locator('#ws-socket').press('Enter');
  await page.evaluate(() => { window.workshopOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw Error('模拟配额不足'); }; });
  await page.locator('#ws-confirm').click();
  if (!(await page.locator('#ws-feedback').innerText()).includes('保存失败')) throw Error('未报告保存失败');
  if (await page.evaluate(async () => (await import('/src/main.js')).application.game.progress.mods[0]) !== 2) throw Error('保存失败污染正式改装');
  await page.evaluate(() => { Storage.prototype.setItem = window.workshopOriginalSetItem; delete window.workshopOriginalSetItem; });
  await page.locator('#ws-close').click();
  if (await page.locator('#workshop-dialog').isVisible()) throw Error('退出未直接关闭');
  await page.evaluate(async () => (await import('/src/main.js')).application.workshop.open('weapons',0));
  await page.locator('#ws-function-modify').click();
  await page.locator('[data-ws-part="1"]').click(); await page.locator('#ws-socket').press('Enter');
  await page.locator('#ws-confirm').click();
  // 从工坊启动正式战斗逻辑的隔离会话，试射十秒不消耗正式弹药。
  const ammo = await page.evaluate(async () => JSON.stringify((await import('/src/main.js')).application.game.magazines));
  await page.locator('#ws-test').click();
  await page.waitForFunction(() => document.querySelector('#ws-trial-time').textContent.startsWith('1.'));
  await page.screenshot({ path: 'output/playwright/immersive-workshop/desktop-trial.png' });
  await page.locator('#ws-trial-stop').click();
  if (await page.evaluate(async () => JSON.stringify((await import('/src/main.js')).application.game.magazines)) !== ammo) throw Error('试射消耗正式弹药');
  // 未选用载具挂载，不能借浏览改变正在驾驶的车体。
  await page.locator('[data-ws-mode="vehicle"]').click();
  await page.locator('[data-ws-item="1"]').click();await page.locator('#ws-kits-tab').click();
  await page.locator('[data-ws-part="1"]').dragTo(page.locator('#ws-socket'));
  if ((await page.locator('#ws-confirm').innerText()) !== '购买并安装') throw Error('未购炮塔费用未合并');
  await page.screenshot({ path: 'output/playwright/immersive-workshop/desktop-vehicle-draft.png' });
  await page.locator('#ws-confirm').click();
  if (!await page.evaluate(async () => {
    const g = (await import('/src/main.js')).application.game;
    return g.progress.vehicleIndex === 0 && g.progress.vehicleLoadouts[1] === 1 && g.vehicles[1].weaponIndex === 1;
  })) throw Error('挂载目标或出战车体错误');
  // 320 和 390 下起点与终点同时可见，托盘滚动不撑宽弹窗。
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('[data-ws-mode="weapons"]').click();
    await page.locator('[data-ws-item="0"]').click();await page.locator('#ws-kits-tab').click();
    const geometry = await page.evaluate(() => {
      const dialog = document.querySelector('#workshop-dialog'), part = document.querySelector('[data-ws-part="2"]').getBoundingClientRect(), socket = document.querySelector('#ws-socket').getBoundingClientRect();
      return { overflow: dialog.scrollWidth > dialog.clientWidth, part, socket };
    });
    if (geometry.overflow || geometry.part.bottom > 844 || geometry.socket.top < 0) throw Error('手机装配不可同屏操作 ' + width);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const from = await page.locator('[data-ws-part="2"]').boundingBox(), to = await page.locator('#ws-socket').boundingBox();
    const x = from.x + from.width / 2, y = from.y + from.height / 2, tx = to.x + to.width / 2, ty = to.y + to.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 12; step++) await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: x + (tx - x) * step / 12, y: y + (ty - y) * step / 12 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await cdp.detach();
    if (!await page.locator('#ws-confirm').isEnabled()) throw Error('真实触控拖拽失败 ' + width);
    await page.screenshot({ path: 'output/playwright/immersive-workshop/mobile-' + width + '-drag.png' });
    await page.locator('#ws-close').click();
    await page.evaluate(async () => (await import('/src/main.js')).application.workshop.open());
  }
  // 追踪目标跳转直接选择对应车体或炮塔。
  await page.locator('#ws-close').click();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.progress.equipmentGoal = { kind: 'turret', index: 8 }; a.refresh();
    document.querySelector('#equipment-goal').click();
  });
  await page.locator('#goal-workshop').click();
  if (!await page.locator('[data-ws-part="8"][aria-pressed="true"]').count()) throw Error('追踪未定位炮塔');
  await page.locator('#ws-close').click();
  // 刷新后旧编号和新装配仍然有效。
  await page.reload();
  if (!await page.evaluate(async () => {
    const p = (await import('/src/main.js')).application.game.progress;
    return p.mods[0] === 1 && p.vehicleLoadouts[1] === 1;
  })) throw Error('刷新丢失装配');
  if (errors.length) throw Error(errors.join('\n'));
  console.log('工坊浏览器验收通过：入口、鼠标、键盘、触控、保存失败、试射、追踪与存档');
}
