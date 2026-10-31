// 隔离浏览器检查手机预警与真实镜头下的入场点，不访问正式端口存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    localStorage.clear();
  });
  await page.reload();
  await page.locator('#start').click();
  // 暂停自动时间推进，测试中显式推进生产逻辑，截图不受机器帧率影响。
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    window.arrivalOriginalUpdate = a.game.update.bind(a.game);
    a.game.update = () => {};
  });
  const results = [];
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(async () => {
      const a = (await import('/src/main.js')).application, g = a.game;
      g.state = 'playing'; g.wave = 15; g.waveKills = g.waveSpawned = 0;
      g.waveRest = 0; g.waveWarning = 3; g.waveElapsed = 0; g.spawnTimer = 0;
      g.enemies = []; g.boss = null; g.progress.weapon = 12; g.progress.weapons[12] = 1;
      g.attackTimer = 999; g.player.invincible = 999;
      a.renderer.resize(); g.setViewport(a.renderer.width, a.renderer.height);
      a.renderer.draw(); a.refresh();
    });
    if (!await page.locator('#quest').evaluate(el => el.classList.contains('incoming')))
      throw Error('预警未显示');
    if (!await page.locator('#quest-detail').isVisible()) throw Error('手机隐藏了预警内容');
    if (await page.locator('#quest-count').innerText() !== '3 秒') throw Error('预警倒计时错误');
    await page.screenshot({ path: `output/playwright/wave-arrival/warning-${width}.png` });
    results.push(await page.evaluate(async () => {
      const a = (await import('/src/main.js')).application, g = a.game;
      g.updateWaves(2.9);
      if (g.enemies.length) throw Error('预警期间提前刷怪');
      g.updateWaves(0.11);
      const spawned = [];
      const original = g.spawnEnemy;
      g.spawnEnemy = function (angle, radius, spot) {
        const v = this.arrivalView, x = spot.x - this.player.x, y = spot.y - this.player.y;
        if (!(x <= v.left - 80 || x >= v.right + 80 || y <= v.top - 80 || y >= v.bottom + 80))
          throw Error('怪物出现在画面内');
        if (Math.hypot(x, y) < 440) throw Error('怪物贴身出生');
        spawned.push(Math.hypot(x, y));
        return original.call(this, angle, radius, spot);
      };
      for (let i = 0; i < 180; i++) {
        // 玩家持续走位且跨越镜头中心；每帧只有一个新兵，画面随后更新。
        g.player.x += 1.5;
        a.renderer.draw();
        const before = g.waveSpawned;
        g.updateWaves(0.1);
        if (g.waveSpawned - before > 1) throw Error('同帧刷入多个怪物');
      }
      g.spawnEnemy = original;
      if (spawned.length < 8) throw Error('入场调度停滞');
      a.refresh();
      return { width: window.innerWidth, spawned: spawned.length,
        minimumDistance: Math.round(Math.min(...spawned)), outsideView: true };
    }));
    await page.screenshot({ path: `output/playwright/wave-arrival/arrivals-${width}.png` });
  }
  const combat = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application, g = a.game;
    g.reset(); g.state = 'playing'; g.wave = 15; g.progress.weapon = 0;
    g.attackTimer = 999; g.player.invincible = 999;
    let firstVisible = null, maximumNewPerFrame = 0;
    for (let i = 0; i < 360; i++) {
      a.renderer.draw();
      const before = g.waveSpawned;
      window.arrivalOriginalUpdate(0.05);
      maximumNewPerFrame = Math.max(maximumNewPerFrame, g.waveSpawned - before);
      const v = g.arrivalView;
      if (firstVisible === null && g.enemies.some(e =>
        e.x > g.player.x + v.left && e.x < g.player.x + v.right &&
        e.y > g.player.y + v.top && e.y < g.player.y + v.bottom))
        firstVisible = (i + 1) * 0.05;
    }
    if (firstVisible === null || firstVisible <= 3) throw Error('没有自然进入视野的过程');
    if (maximumNewPerFrame > 1) throw Error('实际战斗同帧补出整批');
    a.renderer.draw(); a.refresh();
    return { firstVisibleSeconds: firstVisible, maximumNewPerFrame, alive: g.enemies.length };
  });
  await page.screenshot({ path: 'output/playwright/wave-arrival/natural-combat.png' });
  if (errors.length) throw Error(errors.join(';'));
  return { results, combat, errors };
}
