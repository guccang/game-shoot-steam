// 对照冷地块、分帧预热、跨块移动及原导航结果，数据来自正式浏览器绘制器。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  await page.bringToFront(); await page.reload();
  return page.evaluate(async () => {
    const app = (await import('/src/main.js')).application;
    const bootStart = performance.now(), bootReady = await app.ready;
    const boot = { ready: bootReady, remainingMs: performance.now() - bootStart,
      ground: app.renderer.ground.stats(), navigation: app.navigationWarmup.stats() };
    app.destroy();
    const { GroundCache: Before, groundTiles } = await import('/output/playwright/incremental-warmup/baseline/src/rendering/ground-cache.js');
    const { GroundCache: After } = await import('/src/rendering/ground-cache.js');
    const oldNav = await import('/output/playwright/incremental-warmup/baseline/src/physics/terrain-navigation.js');
    const newNav = await import('/src/physics/terrain-navigation.js?measurement');
    const { NATURAL_TERRAIN } = await import('/src/world/natural-terrain.js');
    const { JIUZHAIGOU_TERRAIN } = await import('/src/world/jiuzhaigou.js');
    // 汇总实际时间分布；不把总构建时间误报为单帧时间。
    const summary = list => ({ count: list.length, mean: list.reduce((a,b) => a+b,0)/list.length,
      max: Math.max(...list), p95: [...list].sort((a,b)=>a-b)[Math.floor(list.length*.95)] });
    const ground = [];
    for (const mapId of ['forest', 'jiuzhaigou']) {
      const view = { x: 600, y: 2400, w: 1100, h: 700 }, before = new Before(mapId), after = new After(mapId);
      before.setSeason('autumn'); after.setSeason('autumn');
      const synchronous = [], slices = [];
      for (const spec of groundTiles(view)) {
        const t = performance.now(); before.get(spec, 1); synchronous.push(performance.now() - t);
      }
      before.setMap('release'); after.prepare(view);
      for (let frame = 0; !after.ready(view) && frame < 3000; frame++) {
        const t = performance.now(); after.advance(2); slices.push(performance.now() - t);
      }
      if (!after.ready(view) || after.stats().syncMisses) throw Error('冷地块未能分帧完成');
      const initial = after.stats(), canvas = document.createElement('canvas'); canvas.width = 1100; canvas.height = 700;
      const c = canvas.getContext('2d'), renders = [];
      // 模拟每秒 300 世界像素、60 帧的连续运动；使用正式地块选择和正式同步兜底。
      for (let frame = 0; frame < 600; frame++) {
        const moving = { ...view, x: view.x + frame * 5 };
        c.setTransform(1,0,0,1,-moving.x,-moving.y);
        const t = performance.now(); after.draw(c, moving, 1); renders.push(performance.now()-t);
        after.advance(2);
      }
      ground.push({ mapId, synchronous: summary(synchronous), slices: summary(slices), initial,
        movingDraw: summary(renders), final: after.stats() }); after.dispose();
    }
    const navigation = [], mismatches = [];
    for (const [mapId, terrain] of [['forest', NATURAL_TERRAIN], ['jiuzhaigou', JIUZHAIGOU_TERRAIN]]) {
      const warmup = new newNav.NavigationWarmup(), slices = [], cold = [], hot = [];
      warmup.prepare({ x: 900, y: 700, mapId });
      while (warmup.steps) { const t = performance.now(); warmup.advance(1); slices.push(performance.now()-t); }
      let count = 0;
      for (const obstacle of terrain.obstacles) for (let n = 0; n < 5; n++) {
        const b = obstacle.bounds, body = { x: obstacle.x + b.x - 70 + n*.1234567,
          y: obstacle.y + n*.2345678, mapId }, goal = { x: obstacle.x+b.x+b.w+70, y: body.y+20 };
        let t = performance.now(); const old = oldNav.naturalWaypoint({ ...body }, goal); cold.push(performance.now()-t);
        t = performance.now(); const fresh = newNav.naturalWaypoint({ ...body }, goal); hot.push(performance.now()-t);
        if (Math.hypot(old.x-fresh.x,old.y-fresh.y)>1e-8) mismatches.push({ mapId, body, goal, old, fresh });
        count++;
      }
      navigation.push({ mapId, count, before: summary(cold), after: summary(hot), slices: summary(slices), stats: warmup.stats() });
    }
    if (mismatches.length) throw Error(`导航结果改变：${JSON.stringify(mismatches.slice(0,3))}`);
    return { boot, ground, navigation, mismatches };
  });
}
