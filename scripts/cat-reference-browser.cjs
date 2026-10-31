// 从现有角色主体生成无枪械的正面蓝幕首帧，供视频流程复现。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  await page.setViewportSize({ width: 768, height: 768 });
  for (const hero of [0, 1]) {
    await page.evaluate(async hero => {
      const { drawCat } = await import('/src/rendering/characters.js');
      document.querySelector('#cat-reference')?.remove();
      const canvas = document.createElement('canvas'); canvas.id = 'cat-reference';
      canvas.width = canvas.height = 768; canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;width:768px;height:768px';
      document.body.append(canvas);
      const c = canvas.getContext('2d'); c.fillStyle = '#0000ff'; c.fillRect(0, 0, 768, 768);
      drawCat(c, 400, 570, hero, Math.PI / 2, 7, 0, 0, null, 1, null, 0, false, true);
    }, hero);
    await page.locator('#cat-reference').screenshot({ path: `assets/cat-front/source/cat-${hero}-reference.png` });
  }
  await page.locator('#cat-reference').evaluate(n => n.remove());
  return { count: 2, size: 768 };
}
