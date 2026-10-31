// 使用 playwright-cli run-code --filename 执行，真实验证环境设置、合成与触屏布局。
async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.getByRole('button', { name: '环境设置', exact: true }).click();
  await page.locator('#auto-time').uncheck(); await page.locator('#auto-weather').uncheck();
  await page.locator('button[data-time="day"]').click(); await page.locator('button[data-weather="sun"]').click();
  await page.getByRole('button', { name: '回到森林', exact: true }).click();
  await page.waitForTimeout(20200); await page.screenshot({ path: 'output/playwright/environment-day.png' });
  // 模块级像素检查使用同一绘制实现，不暴露生产环境调试接口。
  const water = await page.evaluate(async () => {
    const { RiverRenderer, WATERFALL, BRIDGE } = await import('/src/rendering/river.js');
    const renderer = new RiverRenderer(), canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1400;
    const ctx = canvas.getContext('2d'), viewport = { x: 0, y: 0, w: 1800, h: 1400 };
    // 指定区域像素校验和用于证明纹理持续运动。
    const sample = (x, y, w, h) => {
      const pixels = ctx.getImageData(x, y, w, h).data;
      return pixels.reduce((sum, value) => sum + value, 0);
    };
    renderer.draw(ctx, 1, 0, 0, false, viewport);
    const first = sample(WATERFALL.x - 25, WATERFALL.y + 10, 50, 110);
    const riverFirst = sample(1200, 900, 160, 180);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderer.draw(ctx, 2, 0, 0, false, viewport);
    const second = sample(WATERFALL.x - 25, WATERFALL.y + 10, 50, 110);
    const riverSecond = sample(1200, 900, 160, 180);
    const bridge = ctx.getImageData(BRIDGE.x + 65, BRIDGE.y + 20, 1, 1).data[3];
    const rock = ctx.getImageData(WATERFALL.x + 36, WATERFALL.y + 50, 1, 1).data[3];
    const before = renderer.frames; renderer.draw(ctx, 3, 1, 1, true, viewport);
    if (first === second || riverFirst === riverSecond || bridge || rock || renderer.frames !== before) throw Error('水流、岩壁、桥面遮罩或减少动态异常');
    return { waterfallAnimated: first !== second, riverAnimated: riverFirst !== riverSecond, bridgeProtected: bridge === 0, rockProtected: rock === 0, reducedMotion: renderer.frames === before };
  });
  await page.getByRole('button', { name: '环境设置', exact: true }).click();
  await page.locator('button[data-time="dusk"]').click(); await page.getByRole('button', { name: '回到森林', exact: true }).click();
  await page.waitForTimeout(20200); await page.screenshot({ path: 'output/playwright/environment-dusk.png' });
  await page.getByRole('button', { name: '环境设置', exact: true }).click();
  await page.locator('button[data-time="night"]').click(); await page.locator('button[data-weather="rain"]').click();
  await page.getByRole('button', { name: '回到森林', exact: true }).click();
  await page.waitForTimeout(20200); await page.screenshot({ path: 'output/playwright/environment-night-rain.png' });
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('forest-patrol-environment-v1')));
  await page.reload();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('forest-patrol-environment-v1')));
  if (JSON.stringify(original) !== JSON.stringify(restored)) throw Error('环境刷新后未保留设置或时间锚点');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '开始巡游 ↗' }).click();
  await page.getByRole('button', { name: '环境设置', exact: true }).click();
  if (await page.locator('#auto-label').innerText() !== '巡游已暂停') throw Error('环境面板没有暂停战斗');
  await page.screenshot({ path: 'output/playwright/environment-mobile-panel.png' });
  await page.getByRole('button', { name: '回到森林', exact: true }).click();
  // dialog 的 close 事件异步派发，等待实际恢复状态再断言。
  await page.waitForFunction(() => document.getElementById('auto-label').textContent === '自动攻击中', null, { timeout: 2000 });
  const rect = await page.getByRole('group', { name: '左手移动摇杆' }).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + 50, y: rect.y + 50 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x + 75, y: rect.y + 40 }] });
  const dragged = await page.locator('#stick').getAttribute('style');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (!dragged?.includes('translate') || await page.locator('#stick').getAttribute('style') !== '') throw Error('天气图层阻挡触摸摇杆');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole('button', { name: '环境设置', exact: true }).click();
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('手机面板横向溢出');
  await page.getByRole('button', { name: '回到森林', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/environment-mobile-night.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(200);
  const reducedTransition = await page.locator('#game').evaluate(element => getComputedStyle(element).transitionDuration);
  if (reducedTransition !== '0s') throw Error('减少动态未关闭色彩过渡');
  // 虚拟浏览器时钟验证自动逻辑已接入主循环，不需要真实等待九十秒。
  await page.clock.install({ time: new Date('2026-10-19T00:00:00Z') });
  await page.evaluate(async () => {
    const { normalizeEnvironment } = await import('/src/world/environment.js');
    localStorage.setItem('forest-patrol-environment-v1', JSON.stringify(normalizeEnvironment({})));
  });
  await page.reload(); await page.clock.runFor(100);
  await page.clock.fastForward(120000); await page.clock.runFor(100);
  if (await page.locator('#game-frame').getAttribute('data-time') !== 'dusk') throw Error('自动黄昏未生效');
  await page.clock.fastForward(60000); await page.clock.runFor(100);
  if (await page.locator('#game-frame').getAttribute('data-time') !== 'night') throw Error('自动夜晚未生效');
  await page.clock.fastForward(120000); await page.clock.runFor(100);
  if (await page.locator('#game-frame').getAttribute('data-time') !== 'day') throw Error('自动日出未生效');
  const priorWeather=await page.locator('#game-frame').getAttribute('data-weather');
  await page.clock.fastForward(120000); await page.clock.runFor(100);
  if (await page.locator('#game-frame').getAttribute('data-weather') === priorWeather) throw Error('自动天气未生效');
  if (errors.length) throw Error(errors.join('; '));
  return { ...water, storageRestored: true, touchJoystick: true, mobileOverflow: false, automaticCycle: true, automaticWeather: true, reducedTransition, errors };
}
