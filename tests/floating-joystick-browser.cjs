// 隔离端口通过浏览器触摸协议验收移动、双指点击、取消与响应式布局。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [], layouts = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.clear();
  });
  await page.reload();
  await page.locator('#start').click();
  await page.evaluate(async () => {
    const game = (await import('/src/main.js')).application.game;
    const update = game.update.bind(game);
    // 记录进入真实游戏循环的输入，避免地形阻挡影响摇杆断言。
    game.update = (dt, vector) => { window.joystickVector = vector; update(dt, vector); };
    game.player.invincible = 9999;
  });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  // 真实触摸序列会触发浏览器默认动作和指针捕获，不直接伪造 DOM 事件。
  async function touch(type, points) {
    await session.send('Input.dispatchTouchEvent', {
      type, touchPoints: points.map(p => ({ ...p, radiusX: 4, radiusY: 4, force: 1 })),
    });
  }
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(100);
    if (await page.locator('#joystick').isVisible()) throw Error('空闲摇杆未隐藏');
    const frame = await page.locator('#game-frame').boundingBox();
    for (const fraction of [0.22, 0.78]) {
      const x = Math.round(frame.x + frame.width * fraction), y = 390;
      await touch('touchStart', [{ id: 1, x, y }]);
      const box = await page.locator('#joystick').boundingBox();
      if (!box || Math.abs(box.x + box.width / 2 - x) > 1 || Math.abs(box.y + box.height / 2 - y) > 1)
        throw Error('触点与摇杆中心不一致');
      await page.waitForFunction(() => window.joystickVector?.x === 0 && window.joystickVector?.y === 0);
      await touch('touchMove', [{ id: 1, x: x + 36, y: y - 20 }]);
      await page.waitForFunction(() => window.joystickVector?.x > 0.8 && window.joystickVector?.y < -0.4);
      await page.screenshot({ path: `output/playwright/floating-joystick/drag-${width}-${fraction}.png` });
      // 森林不支持缩放，第二根手指抬起不能打断首指移动。
      await touch('touchStart', [{ id: 1, x: x + 36, y: y - 20 }, { id: 2, x: 40, y: 280 }]);
      await touch('touchEnd', [{ id: 1, x: x + 36, y: y - 20 }]);
      await page.waitForFunction(() => window.joystickVector?.x > 0.8 && !document.getElementById('joystick').hidden);
      await touch('touchEnd', []);
      await page.waitForFunction(() => window.joystickVector?.x === 0 && window.joystickVector?.y === 0);
      if (await page.locator('#joystick').isVisible()) throw Error('释放后摇杆未隐藏');
      layouts.push({ width, fraction, center: { x, y } });
    }
    // 右侧按钮继续使用真实触摸点击。
    const settings = await page.locator('#settings-button').boundingBox();
    const point = { id: 1, x: settings.x + settings.width / 2, y: settings.y + settings.height / 2 };
    await touch('touchStart', [point]);
    if (await page.locator('#joystick').isVisible()) throw Error('按钮触发摇杆');
    await touch('touchEnd', []);
    await page.locator('#settings-dialog').waitFor({ state: 'visible' });
    await page.locator('#close-settings').click();
    await page.waitForFunction(async () => (await import('/src/main.js')).application.game.state === 'playing');
  }
  // 取消、旋转时必须停止；持续长按也不会弹出菜单或自动漂移。
  await touch('touchStart', [{ id: 1, x: 160, y: 400 }]);
  await page.waitForTimeout(700);
  await touch('touchMove', [{ id: 1, x: 200, y: 400 }]);
  await page.waitForFunction(() => window.joystickVector?.x === 1);
  await touch('touchCancel', []);
  await page.waitForFunction(() => window.joystickVector?.x === 0);
  await touch('touchStart', [{ id: 1, x: 160, y: 400 }]);
  await touch('touchMove', [{ id: 1, x: 200, y: 400 }]);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.joystickVector?.x === 0 && document.getElementById('joystick').hidden);
  await touch('touchEnd', []);
  await page.keyboard.down('d');
  await page.waitForFunction(() => window.joystickVector?.x === 1);
  await page.keyboard.up('d');
  await page.waitForFunction(() => window.joystickVector?.x === 0);
  if (errors.length) throw Error(errors.join('; '));
  await session.detach();
  return { layouts, buttons: true, multiTouch: true, cancel: true, rotate: true, keyboard: true, errors };
}
