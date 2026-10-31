// 手机诊断面板适配、普通 HTTP 复制回退与清日志保留游戏存档验证。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await page.reload();
  const results = [];
  await page.getByRole('button', { name: '游戏设置', exact: true }).click();
  await page.locator('#debug-toggle').click();
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: '生成当前报告' }).click();
    await page.getByRole('button', { name: '下载报告', exact: true }).scrollIntoViewIfNeeded();
    const layout = await page.evaluate(() => {
      const area = document.querySelector('.performance-section').getBoundingClientRect();
      const dialog = document.querySelector('dialog[open]');
      return { viewport: innerWidth, left: area.left, right: area.right,
        overflow: dialog.scrollWidth > dialog.clientWidth + 1 };
    });
    if (layout.left < 0 || layout.right > width || layout.overflow) throw Error('诊断区横向溢出');
    await page.screenshot({ path: `output/playwright/mobile-frame-diagnostics/settings-${width}.png` });
    results.push(layout);
  }
  // 模拟局域网 HTTP 没有 Clipboard API，报告仍可选中并手动复制。
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await page.getByRole('button', { name: '复制报告', exact: true }).click();
  const fallback = await page.evaluate(() => {
    const input = document.getElementById('performance-report-text');
    return { selected: input.selectionEnd - input.selectionStart,
      feedback: document.getElementById('performance-feedback').textContent };
  });
  if (!fallback.selected || !fallback.feedback.includes('长按')) throw Error('HTTP 复制回退失效');
  const before = await page.evaluate(() => localStorage.getItem('forest-patrol-v1'));
  await page.getByRole('button', { name: '清除诊断日志' }).click();
  const after = await page.evaluate(() => localStorage.getItem('forest-patrol-v1'));
  if (!before || before !== after) throw Error('清日志影响游戏进度');
  return { results, fallback, progressUnchanged: true };
}
