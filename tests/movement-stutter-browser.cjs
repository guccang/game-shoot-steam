// 在隔离服务测量正式地块生成及伙伴绕行，返回同场景前后对照所需数据。
async (page) => {
  if (!['4174', '4175'].includes(new URL(page.url()).port)) throw Error('仅允许隔离对照端口');
  const client = await page.context().newCDPSession(page);
  await client.send('Profiler.enable');
  await client.send('Profiler.start');
  const result = await page.evaluate(async () => {
    const app = (await import('/src/main.js')).application;
    app.destroy();
    const { GroundCache, groundTiles } = await import('/src/rendering/ground-cache.js');
    const { naturalWaypoint } = await import('/src/physics/terrain-navigation.js');
    const { NATURAL_TERRAIN } = await import('/src/world/natural-terrain.js');
    const ground = [];
    for (const night of [0, 1]) {
      const cache = new GroundCache(); cache.setSeason('autumn');
      for (const spec of groundTiles({ x: 600, y: 2400, w: 1100, h: 390 })) {
        const start = performance.now(); cache.get(spec, night);
        ground.push({ key: spec.key, night, ms: performance.now() - start });
      }
    }
    const navigation = [];
    for (const lake of NATURAL_TERRAIN.lakes) {
      for (let n = 0; n < 8; n++) {
        const body = { x: lake.x - lake.rx - 70, y: lake.y + n, mapId: 'forest' };
        const target = { x: lake.x + lake.rx + 70, y: lake.y + n };
        const start = performance.now(); const point = naturalWaypoint(body, target);
        navigation.push({ ms: performance.now() - start, point });
      }
    }
    return { ground, navigation };
  });
  const { profile } = await client.send('Profiler.stop');
  await client.detach();
  result.hotspots = profile.nodes.filter(n => n.hitCount).sort((a, b) => b.hitCount - a.hitCount).slice(0, 12)
    .map(n => ({ name: n.callFrame.functionName, file: n.callFrame.url.split('/').slice(-2).join('/'), hits: n.hitCount }));
  return result;
}
