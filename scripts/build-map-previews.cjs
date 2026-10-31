// 用 playwright-cli run-code 在本地4175页面执行；仅离线导出正式总览图元，不运行游戏模拟。
async page => {
  // 默认4175；并行任务占用时可使用空闲本地端口。
  if (!['localhost', '127.0.0.1'].includes(new URL(page.url()).hostname)) throw Error('仅允许本地测试服务');
  return await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy(); window.a?.destroy();
    await document.fonts.ready;
    const { WORLD, ORIGINAL_WORLD } = await import('/src/world/coordinates.js');
    const { paintGround } = await import('/src/rendering/ground-art.js');
    const { drawSceneryMap } = await import('/src/rendering/scenery.js');
    const { drawNaturalMap } = await import('/src/rendering/natural-terrain.js');
    const { paintJiuzhaigou, drawJiuzhaigouWater } = await import('/src/rendering/jiuzhaigou.js');
    const results = [];
    for (const name of ['forest-spring', 'forest-summer', 'forest-autumn', 'forest-winter', 'jiuzhaigou-summer']) {
      const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 560;
      const c = canvas.getContext('2d'), [mapId, season] = name.split('-'), winter = season === 'winter';
      const extent = mapId === 'jiuzhaigou' ? ORIGINAL_WORLD : WORLD;
      c.save(); c.scale(720 / extent.width, 560 / extent.height);
      if (mapId === 'jiuzhaigou') {
        paintJiuzhaigou(c); drawJiuzhaigouWater(c, { x: 0, y: 0, w: WORLD.width, h: WORLD.height }, 0, 0, true);
      } else { paintGround(c, null, winter, season); drawSceneryMap(c, winter); drawNaturalMap(c, winter); }
      c.restore(); results.push({ name, png: canvas.toDataURL('image/png').split(',')[1] });
      canvas.width = canvas.height = 1;
    }
    return results;
  });
}
