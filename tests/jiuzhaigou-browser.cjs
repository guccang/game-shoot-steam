// 在隔离端口实际点击地图入口，检查手机布局、连续水流、昼夜同屏与刷新恢复。
async (page) => {
  if (new URL(page.url()).port !== '4207') throw Error('仅允许隔离端口 4207');
  const errors = [], shots = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(async () => { (await import('/src/main.js')).application.destroy(); localStorage.clear(); });
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '开始巡游 ↗' }).click();
  await page.getByRole('button', { name: '展开功能菜单', exact: true }).click();
  await page.getByRole('button', { name: '区域地图', exact: true }).click();
  await page.getByRole('button', { name: '九寨沟 四川 · 翠湖叠瀑 前往 →' }).click();
  await page.getByRole('heading', { name: '九寨沟', exact: true }).waitFor();
  await page.screenshot({ path: 'output/playwright/jiuzhaigou-panel-390.png' });
  shots.push('jiuzhaigou-panel-390.png');
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.querySelector('#map-dialog').scrollWidth > document.querySelector('#map-dialog').clientWidth + 2);
    if (overflow) throw Error(`地图面板横向溢出 ${width}`);
  }
  await page.getByRole('button', { name: '继续探索', exact: true }).click();
  const before = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    Object.assign(a.environment, { time: 'day', weather: 'sun', autoTime: false, autoWeather: false });
    return a.game.player.x;
  });
  await page.keyboard.down('a');
  await page.waitForTimeout(450);
  await page.keyboard.up('a');
  const moved = await page.evaluate(async () => (await import('/src/main.js')).application.game.player.x);
  if (!(moved < before - 10)) throw Error('键盘移动未生效');
  await page.getByRole('button', { name: '区域地图', exact: true }).click();
  await page.getByRole('button', { name: '四境森林 林间营地 · 河流沙湾 前往 →' }).click();
  await page.getByRole('heading', { name: '四境森林', exact: true }).waitFor();
  await page.getByRole('button', { name: '九寨沟 四川 · 翠湖叠瀑 前往 →' }).click();
  await page.getByRole('button', { name: '继续探索', exact: true }).click();
  await page.reload();
  const restored = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    return { id: a.game.mapId, state: a.game.state, mapId: a.game.player.mapId };
  });
  if (restored.id !== 'jiuzhaigou' || restored.mapId !== 'jiuzhaigou' || restored.state !== 'paused') throw Error('地图刷新恢复失败');
  checks.push('地图卡片实际往返、键盘移动、刷新恢复、320/390/1280 无横向溢出');

  // 确认正式角色资源解码完成，再用正式实体做同屏审美复核，不能以缺失资源通过。
  await page.evaluate(async () => {
    const { catSprites } = await import('/src/rendering/cat-animation.js');
    if (!await catSprites.load()) throw Error('角色动作资源未就绪');
    const a = (await import('/src/main.js')).application;
    // 固定战斗现场供审美复核，仍保留独立景观动作时钟。
    a.game.update = dt => { a.game.previewTime += dt; }; a.game.state = 'playing';
  });
  for (const width of [390, 1280]) for (const night of [false, true]) {
    await page.setViewportSize({ width, height: 844 });
    const result = await page.evaluate(async ({ night }) => {
      const a = (await import('/src/main.js')).application, g = a.game, r = a.renderer;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      const { spawnEnemy } = await import('/src/core/battle/enemy-manager.js');
      Object.assign(a.environment, { time: night ? 'night' : 'day', weather: 'sun', autoTime: false, autoWeather: false });
      r.light = new EnvironmentTransition(a.environment); r.tone = new SceneTone(a.environment);
      g.state = 'playing'; g.player.x = 1485; g.player.y = 1625; g.enemies = []; g.boss = null;
      spawnEnemy(g, 2.4, 150); spawnEnemy(g, 3.5, 180);
      g.state = 'playing'; if (!g.vehicle.active) g.summonVehicle(); g.state = 'playing';
      g.time = g.previewTime = 12; r.resize(); g.setViewport(r.width, r.height); a.refresh(); r.draw();
      return { map: g.mapId, enemies: g.enemies.length, vehicle: g.vehicle.active, trees: r.visibleStats.trees, cache: r.ground.stats() };
    }, { night });
    if (!result.vehicle || result.enemies !== 2 || result.trees < 1 || result.cache.count > result.cache.limit) throw Error('同屏实体或缓存异常');
    const path = `output/playwright/jiuzhaigou-${night ? 'night' : 'day'}-${width}.png`;
    await page.screenshot({ path }); shots.push(path);
  }
  // 两处核心湖瀑的日间近景，实际地面与植被共用游戏绘制器。
  for (const [name, x, y] of [['five-flower', 710, 760], ['pearl', 1110, 1210]]) {
    await page.setViewportSize({ width: 580, height: 844 });
    await page.evaluate(async ({ x, y }) => {
      const a = (await import('/src/main.js')).application;
      const { EnvironmentTransition } = await import('/src/world/environment.js');
      const { SceneTone } = await import('/src/rendering/scene-tone.js');
      Object.assign(a.environment, { time: 'day', weather: 'sun', autoTime: false, autoWeather: false });
      a.renderer.light = new EnvironmentTransition(a.environment); a.renderer.tone = new SceneTone(a.environment);
      a.game.player.x = x; a.game.player.y = y; a.renderer.resize(); a.renderer.draw(); a.refresh();
    }, { x, y });
    const path = `output/playwright/jiuzhaigou-${name}.png`; await page.screenshot({ path }); shots.push(path);
  }
  const animation = await page.evaluate(async () => {
    const { renderVisualCase } = await import('/src/rendering/visual-review.js');
    const { drawJiuzhaigouWater } = await import('/src/rendering/jiuzhaigou.js');
    const c = document.createElement('canvas'); c.width = 480; c.height = 320; const ctx = c.getContext('2d');
    const hashes = [];
    for (const id of ['jiuzhaigou-lake-day','jiuzhaigou-lake-night','jiuzhaigou-falls-day','jiuzhaigou-falls-night']) {
      const frames = [];
      for (const phase of [0, .125, .25, .375]) {
        ctx.clearRect(0,0,480,320); await renderVisualCase(ctx,id,phase);
        let hash = 0; const pixels = ctx.getImageData(0,0,480,320).data;
        for(let i=0;i<pixels.length;i++) hash = (hash * 31 + pixels[i]) >>> 0;
        frames.push(hash);
      }
      if (new Set(frames).size < 3) throw Error(`连续帧没有水流变化 ${id}`);
      hashes.push({id,frames});
    }
    const still=[];
    for(const t of [0,2]) {
      ctx.clearRect(0,0,480,320); ctx.save();ctx.translate(-1560,-1410);
      drawJiuzhaigouWater(ctx,{x:1560,y:1410,w:480,h:320},t,0,true);ctx.restore();
      still.push(Array.from(ctx.getImageData(0,0,480,320).data).reduce((h,v)=>(h*31+v)>>>0,0));
    }
    if(still[0]!==still[1])throw Error('减少动态仍推进水流');
    return hashes;
  });
  checks.push('正式工作台四组昼夜案例各采样 4 帧，减少动态冻结水流');
  // 回到原地图核对既有湖山和建筑仍由原绘制器呈现。
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.game.vehicle.active = false; a.game.switchMap('forest'); a.game.player.x = 900; a.game.player.y = 700;
    a.renderer.draw(); a.refresh();
  });
  await page.screenshot({ path: 'output/playwright/jiuzhaigou-return-forest.png' });
  if (errors.length) throw Error(errors.join('\n'));
  return { checks, shots, animation, errors };
}
