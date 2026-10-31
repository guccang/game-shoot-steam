// 验证无锁定预览不擅自移动镜头，保留狙击瞄准标记和移动端布局。
async (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  const result = await page.evaluate(async () => {
    const { application: a } = await import('/src/main.js');
    a.destroy();
    const g = a.game,
      r = a.renderer;
    const { sniperGuide } = await import('/src/combat/aim.js');
    Object.assign(g.player, { x: 500, y: 700 });
    g.aimLock = null;
    g.boss = null;
    g.trees = [];
    g.enemies = [
      { id: 9901, type: 'enemy', x: 1150, y: 700, hp: 1000, maxHp: 1000, radius: 17, phase: 0 },
    ];
    g.addTree(800, 700);
    g.progress.weapon = 0;
    r.draw();
    const before = { ...r.view };
    g.progress.weapon = 8;
    r.draw();
    const guide = sniperGuide(g);
    if (JSON.stringify(r.view) !== JSON.stringify(before))
      throw Error('无锁定的只读预览改变了镜头');
    if (guide.hits.length !== 2 || guide.distance !== 650) throw Error('远距瞄准或贯穿标记缺失');
    return { zoom: r.view.zoom, markers: guide.hits.length, distance: guide.distance };
  });
  await page.reload();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('#weapons-button').click();
  if (
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    )
  )
    throw Error('窄屏溢出');
  if (errors.length) throw Error(errors.join(';'));
  return { ...result, readOnlyPreview: true, mobileOverflow: false, errors };
}
