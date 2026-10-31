// 原版模块来自修改前 git archive；像素对照与水域保护只在隔离端口运行。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  await page.reload();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.setViewportSize({ width: 850, height: 900 });
  const result = await page.evaluate(async () => {
    const app = (await import('/src/main.js')).application; app.destroy();
    const { Renderer: Before } = await import('/output/playwright/render-pipeline/baseline/src/rendering/renderer.js');
    const { Renderer: After } = await import('/src/rendering/renderer.js');
    const { GroundCache } = await import('/src/rendering/ground-cache.js');
    const { RiverRenderer } = await import('/src/rendering/river.js');
    const { freshProgress } = await import('/src/progression/progress.js');
    const { Game } = await import('/src/core/game.js');
    const { CombatCamera } = await import('/src/rendering/camera.js');
    const { EnvironmentTransition } = await import('/src/world/environment.js');
    const { SceneTone } = await import('/src/rendering/scene-tone.js');
    const g = new Game(freshProgress(), () => 0.42);
    g.state = 'playing'; g.player.x = 1120; g.player.y = 670;
    g.time = g.previewTime = 4;
    const host = document.createElement('div');
    host.id = 'visual-comparison'; host.style.cssText = 'position:absolute;inset:0;z-index:100;background:#eee;width:820px';
    document.body.append(host);
    const ca = document.createElement('canvas'), cb = document.createElement('canvas');
    for (const c of [ca, cb]) { c.style.width = '390px'; c.style.height = '844px'; host.append(c); }
    const old = new Before(ca, g), next = new After(cb, g);
    old.resize(); next.resize();
    const cache = new GroundCache(), pixels = [];
    // 在整数坐标直接对照原版地形，涵盖内部接缝、尾块、负坐标和地图角落。
    for (const [x, y, night] of [[670, 280, 0], [1140, 600, 1], [2100, 1200, 0.5], [3500, 2700, 1], [-100, -100, 0]]) {
      const canvases = [document.createElement('canvas'), document.createElement('canvas')];
      for (const c of canvases) { c.width = 420; c.height = 450; }
      const contexts = canvases.map(c => c.getContext('2d', { willReadFrequently: true }));
      for (const c of contexts) c.translate(-x, -y);
      const a = contexts[0];
      a.fillStyle = a.createPattern(old.background, 'repeat'); a.fillRect(x, y, 420, 450);
      a.globalAlpha = night;
      a.fillStyle = a.createPattern(old.nightBackground, 'repeat'); a.fillRect(x, y, 420, 450);
      cache.draw(contexts[1], { x, y, w: 420, h: 450 }, night);
      const images = contexts.map(c => c.getImageData(0, 0, 420, 450).data);
      let sum = 0, large = 0;
      for (let i = 0; i < images[0].length; i++) {
        const d = Math.abs(images[0][i] - images[1][i]); sum += d; if (d > 10) large++;
      }
      const mean = sum / images[0].length;
      if (mean > 0.6) throw Error(`地面分块像素不一致 ${x}/${y}：${mean}`);
      pixels.push({ x, y, night, mean, largeFraction: large / images[0].length });
    }
    const river = new RiverRenderer(), waterCanvas = document.createElement('canvas');
    waterCanvas.width = 400; waterCanvas.height = 800;
    const water = waterCanvas.getContext('2d', { willReadFrequently: true });
    water.translate(-1050, -300);
    river.draw(water, 1, 0, 0, false, { x: 670, y: 290, w: 457, h: 880 });
    if (river.stats().updates !== 0) throw Error('出生点仍更新透明水域');
    const view = { x: 1050, y: 300, w: 400, h: 800 };
    river.draw(water, 1, 0, 0, false, view);
    const first = water.getImageData(0, 0, 400, 800).data;
    const updates = river.stats().updates;
    river.draw(water, 1, 0, 0, false, view);
    if (river.stats().updates !== updates) throw Error('同帧重复更新');
    water.clearRect(1050, 300, 400, 800);
    river.draw(water, 2, 0, 0, false, view);
    const second = water.getImageData(0, 0, 400, 800).data;
    if (first.every((v, i) => v === second[i])) throw Error('水流不再运动');
    if (water.getImageData(1250 - 1050, 710 - 300, 1, 1).data[3]) throw Error('水纹覆盖桥面');
    if (water.getImageData(1256 - 1050, 470 - 300, 1, 1).data[3]) throw Error('水纹覆盖瀑布岩壁');
    const reference = document.createElement('canvas'); reference.width = 400; reference.height = 800;
    const referenceContext = reference.getContext('2d', { willReadFrequently: true });
    referenceContext.translate(-1050, -300);
    old.river.draw(referenceContext, 2, 0, 0, false, view);
    const referencePixels = referenceContext.getImageData(0, 0, 400, 800).data;
    let waterDifference = 0;
    for (let i = 0; i < second.length; i++) waterDifference += Math.abs(second[i] - referencePixels[i]);
    waterDifference /= second.length;
    if (waterDifference > 1.5) throw Error(`河流表现差异过大：${waterDifference}`);
    const frozen = river.stats().updates;
    river.draw(water, 5, 1, 1, true, view);
    if (river.stats().updates !== frozen) throw Error('减少动态仍更新水纹');
    // 暴露只存在于测试页面的对照绘制入口，正式模块没有全局调试状态。
    window.paintComparison = async (time, weather) => {
      const env = { time, weather };
      for (const r of [old, next]) {
        r.environment = env; r.light = new EnvironmentTransition(env, performance.now());
        r.camera = new CombatCamera();
        if (r.tone) r.tone = new SceneTone(env, performance.now());
        r.draw();
      }
      const light = time === 'night' ? 'brightness(0.76) contrast(1.04) saturate(0.94) sepia(0)' :
        time === 'dusk' ? 'brightness(1.02) contrast(1.09) saturate(1.2) sepia(0.12)' : '';
      const weatherFilter = weather === 'thunder' ? 'brightness(0.88) saturate(0.82)' : '';
      ca.style.filter = `${light} ${weatherFilter}`.trim() || 'none';
      let tint = document.getElementById('legacy-tint');
      if (!tint) { tint = document.createElement('div'); tint.id = 'legacy-tint'; host.append(tint); }
      tint.style.cssText = `position:absolute;left:0;top:0;width:390px;height:844px;mix-blend-mode:multiply;pointer-events:none;background:${time === 'night' ? '#a6c5ef38' : time === 'dusk' ? '#ffd19366' : 'transparent'}`;
    };
    return { pixels, waterDifference, river: river.stats(), cache: cache.stats(),
      protectedBridge: true, protectedRock: true, animated: true };
  });
  for (const [time, weather] of [['day', 'sun'], ['dusk', 'sun'], ['night', 'thunder']]) {
    await page.evaluate(([time, weather]) => window.paintComparison(time, weather), [time, weather]);
    await page.locator('#visual-comparison').screenshot({ path: `output/playwright/render-pipeline/compare-${time}.png` });
  }
  return result;
}
