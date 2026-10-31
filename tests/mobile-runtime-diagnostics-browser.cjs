// 隔离浏览器注入已知尖峰，验证恢复后的报告、焦点事件与手机中文换行。
async page => {
  if (new URL(page.url()).port !== '4175') throw Error('仅允许本地测试端口4175');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.clearDeviceMetricsOverride'); await cdp.detach();
  await page.setViewportSize({ width: 320, height: 720 }); await page.reload();
  await page.locator('#start').click();
  await page.waitForFunction(async () => (await import('/src/main.js')).application.menu.page === 'game');
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  await page.locator('#settings-advanced > summary').click(); await page.locator('#debug-toggle').click();
  await page.evaluate(async () => {
    const { application } = await import('/src/main.js');
    application.diagnostics.monitor.spikes.push({ at: performance.now() - 4000, state: 'playing',
      total: 24, interval: 4165, outside: 4144, sections: { logic: 5, render: 19 }, unfinished: [] });
    window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus'));
  });
  await page.waitForFunction(() => document.getElementById('performance-summary').textContent.includes('近1分钟曾卡顿 4.17 秒'));
  const layouts = [];
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 720 });
    await page.locator('#performance-report').click();
    const report = JSON.parse(await page.locator('#performance-report-text').inputValue());
    if (report.version !== '2026-10-27-mobile-runtime-1' || report.summary.recentStall?.intervalMs !== 4165 ||
        typeof report.device.focused !== 'boolean' || report.events.filter(e => e.type === 'focus').length < 2)
      throw Error('报告未保留严重卡顿或焦点上下文');
    await page.locator('#performance-summary').scrollIntoViewIfNeeded();
    const layout = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]'), summary = document.getElementById('performance-summary');
      return { width: innerWidth, overflow: dialog.scrollWidth > dialog.clientWidth + 1,
        text: summary.textContent, textOverflow: summary.scrollWidth > summary.clientWidth + 1 };
    });
    if (layout.overflow || layout.textOverflow) throw Error('诊断中文横向溢出');
    await page.screenshot({ path: `output/playwright/thermal/diagnostics-${width}.png` }); layouts.push(layout);
  }
  return { injectedStall: true, layouts };
}
