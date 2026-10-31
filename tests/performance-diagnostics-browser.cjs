// 实际应用冷启动、首次刷怪、HTTP 报告导出及故障注入；仅在隔离端口操作测试存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.removeItem('forest-patrol-v1');
    localStorage.setItem('forest-patrol-environment-v1', JSON.stringify({
      time: 'day', weather: 'sun', autoTime: false, autoWeather: false,
    }));
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.reload();
  await page.getByRole('button', { name: '开始巡游 ↗' }).click();
  // 真实帧时钟与正常刷怪持续运行，不预热、不替换正式 onFrame。
  await page.waitForTimeout(20000);
  const live = await page.evaluate(async () => {
    const report = (await import('/src/main.js')).application.diagnostics.report();
    if (!report.milestones.some(e => e.type === 'first-enemy')) throw Error('未记录首次刷怪');
    if (!report.milestones.some(e => e.type === 'combat-start' && e.frame.state === 'playing'))
      throw Error('未区分预览怪物与战斗开始');
    if (!report.milestones.some(e => e.type === 'monster-atlas-build')) throw Error('未记录首次图集生成');
    if (!report.summary.sections['logic.enemyPhysics'] || !report.summary.sections['render.monsters'])
      throw Error('缺少细分耗时');
    return report;
  });
  await page.screenshot({ path: 'output/playwright/mobile-frame-diagnostics/live-390.png' });
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  await page.getByRole('button', { name: '生成当前报告' }).click();
  const text = await page.getByRole('textbox', { name: '性能诊断报告' }).inputValue();
  if (!JSON.parse(text).summary.frames) throw Error('报告文本为空');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载报告', exact: true }).click();
  await (await downloading).saveAs('output/playwright/mobile-frame-diagnostics/phone-report.json');
  await page.screenshot({ path: 'output/playwright/mobile-frame-diagnostics/settings-390.png' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.reload();
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  if (!(await page.getByRole('button', { name: '查看上次留档' }).isEnabled())) throw Error('刷新后留档丢失');
  await page.getByRole('button', { name: '查看上次留档' }).click();
  const previous = JSON.parse(await page.getByRole('textbox', { name: '性能诊断报告' }).inputValue());
  if (!previous.milestones.some(e => e.type === 'first-enemy')) throw Error('首次刷怪留档丢失');
  await page.getByRole('button', { name: '关闭游戏设置' }).click();
  const overhead = await page.evaluate(async () => {
    const { PerformanceMonitor } = await import('/src/platform/performance-monitor.js');
    const monitor = new PerformanceMonitor();
    const start = performance.now();
    for (let i = 0; i < 3000; i++) {
      monitor.beginFrame(performance.now(), 'playing');
      for (let part = 0; part < 20; part++) { monitor.start('test' + part); monitor.end('test' + part); }
      monitor.finishFrame({ enemies: 12 });
    }
    return { msPerFrame: (performance.now() - start) / 3000, retained: monitor.frames.length };
  });
  await page.evaluate(async () => {
    const app = (await import('/src/main.js')).application;
    document.getElementById('hero-button-icon').dispatchEvent(new Event('contextlost'));
    // 注入已知错误验证停滞检测；不吞异常、不偷偷改变游戏的循环行为。
    app.renderer.draw = () => { throw Error('diagnostic-test-render-failure'); };
  });
  await page.waitForTimeout(3200);
  const failed = await page.evaluate(async () => {
    const report = (await import('/src/main.js')).application.diagnostics.report();
    if (!report.events.some(e => e.type === 'frame-error' && e.phase.includes('render')))
      throw Error('未捕捉绘制失败阶段');
    if (!report.events.some(e => e.type === 'contextlost')) throw Error('未记录画布丢失事件');
    if (!document.getElementById('performance-hud').textContent.includes('停滞'))
      throw Error('动画停止后诊断面板未继续刷新');
    return { events: report.events.filter(e => ['frame-error', 'contextlost'].includes(e.type)) };
  });
  if (errors.some(message => !message.includes('diagnostic-test-render-failure')))
    throw Error(errors.join('\n'));
  return { live: { summary: live.summary, milestones: live.milestones, counters: live.counters,
    device: live.device, rendering: live.rendering }, previousCaptured: true, overhead, failed, errors };
}
