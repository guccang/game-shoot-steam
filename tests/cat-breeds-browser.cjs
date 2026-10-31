// 六品种的正式主体、真实招募切换、手机布局与昼夜同屏验收；仅使用隔离端口。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    const { freshProgress } = await import('/src/progression/progress.js');
    const p = freshProgress(); p.coins = p.wood = 10000;
    localStorage.setItem('forest-patrol-v1', JSON.stringify(p));
  });
  await page.reload(); await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#start').click();
  await page.evaluate(async () => (await import('/src/main.js')).application.game.pause());
  if (!await page.locator('#heroes-button').isVisible()) await page.getByRole('button', { name: '展开功能菜单', exact: true }).click();
  await page.locator('#heroes-button').click();
  if (await page.locator('#inventory .item-card').count() !== 6) throw Error('营地不是六只猫');
  if (await page.locator('#tab-heroes span').innerText() !== '06') throw Error('数量未更新');
  for (let hero = 1; hero < 6; hero++) {
    await page.locator(`[data-action="buy"][data-index="${hero}"]`).click();
    const selected = await page.evaluate(async () => (await import('/src/main.js')).application.game.progress.hero);
    if (selected !== hero) throw Error('招募未出战');
  }
  for (const width of [320, 390, 580]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('#camp-dialog').evaluate(el => { el.scrollTop = 0; });
    if (!await page.locator('#camp-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1)) throw Error('角色卡片横向溢出');
    await page.screenshot({ path: `output/playwright/cat-breeds/camp-${width}.png` });
  }
  await page.locator('#close-camp').click();
  const frames = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application; a.destroy();
    const { catSprites } = await import('/src/rendering/cat-animation.js');
    const { HEROES } = await import('/src/config/heroes.js');
    if (!await catSprites.load()) throw Error('原版连续帧素材加载失败');
    const { drawCat } = await import('/src/rendering/characters.js');
    const preview = document.createElement('canvas'); preview.id = 'breed-review'; preview.width = 900; preview.height = 520;
    preview.style.cssText = 'position:fixed;inset:0;z-index:99999;width:900px;height:520px'; document.body.append(preview);
    const c = preview.getContext('2d'); c.fillStyle = '#f7f4df'; c.fillRect(0, 0, 900, 520);
    const signatures = [], uniqueBreeds = [];
    for (let hero = 0; hero < 6; hero++) {
      const tile = document.createElement('canvas'); tile.width = tile.height = 180; const ctx = tile.getContext('2d'), hashes = [];
      for (const moving of [0, 1]) for (const time of [0, 0.25, 0.5]) {
        ctx.clearRect(0, 0, 180, 180);
        catSprites.draw(ctx, hero, { idleTime: time, moveTime: time, moveWeight: moving }, { bodyX: 95, bodyY: 145 });
        hashes.push(tile.toDataURL());
      }
      if (new Set(hashes).size < 5) throw Error('品种动作缺少真实连续帧：' + hero);
      uniqueBreeds.push(hashes[0]); signatures.push(new Set(hashes).size);
      const x = hero % 3 * 300 + 150, y = Math.floor(hero / 3) * 260 + 170;
      drawCat(c, x, y, hero, -0.25, 2.5, 0, 0, null, 1, null, 0, false, false, { idleTime: .3, moveTime: .5, moveWeight: 1 });
      c.fillStyle = '#365748'; c.textAlign = 'center'; c.font = 'bold 20px sans-serif'; c.fillText(HEROES[hero].name, x, y + 42);
      c.font = '14px sans-serif'; c.fillText(HEROES[hero].breed, x, y + 66);
    }
    if (new Set(uniqueBreeds).size !== 6) throw Error('品种外观重复');
    if (catSprites.stats().bytes > 20 * 1024 * 1024) throw Error('品种缓存超出手机预算');
    return { signatures, stats: catSprites.stats(), designCriterion: '六品种轮廓动作连续、花色可辨、原枪械小手保持独立' };
  });
  await page.setViewportSize({ width: 900, height: 520 });
  await page.screenshot({ path: 'output/playwright/cat-breeds/six-cats.png' });
  await page.evaluate(() => document.getElementById('breed-review').remove());
  await page.setViewportSize({ width: 390, height: 844 });
  for (const time of ['day', 'night']) for (let hero = 0; hero < 6; hero++) {
    await page.evaluate(async ({ hero, time }) => {
      const a = (await import('/src/main.js')).application, g = a.game;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      Object.assign(a.environment, { time, weather: 'sun', autoTime: false, autoWeather: false });
      a.renderer.light = new EnvironmentTransition(a.environment); a.renderer.tone = new SceneTone(a.environment);
      g.progress.hero = hero; g.reset(); g.state = 'playing'; g.summonVehicle();
      g.spawnEnemy(0, 0, { x: 1030, y: 800 }); g.spawnEnemy(0, 0, { x: 800, y: 780 });
      Object.assign(g.player, { x: 900, y: 830, angle: -.25 });
      Object.assign(g.player.bodyAnimation, { idleTime: .3, moveTime: .5, moveWeight: 0 });
      a.renderer.resize(); a.refresh(); a.renderer.draw();
    }, { hero, time });
    await page.screenshot({ path: `output/playwright/cat-breeds/field-${hero}-${time}.png` });
  }
  if (errors.length) throw Error(errors.join('\n'));
  return { ...frames, recruited: 6, widths: [320, 390, 580], errors };
}
