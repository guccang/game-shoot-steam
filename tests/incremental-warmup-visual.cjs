// 使用修改前源码副本逐像素对照缓存存储优化，画面内容、季节和周期接缝必须保持。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  return page.evaluate(async () => {
    const app = (await import('/src/main.js')).application; await app.ready; app.destroy();
    const { GroundCache: Before } = await import('/output/playwright/incremental-warmup/baseline/src/rendering/ground-cache.js');
    const { GroundCache: After } = await import('/src/rendering/ground-cache.js');
    const results = [];
    for (const [mapId, season, x, y] of [
      ['forest', 'spring', 670, 280], ['forest', 'summer', 1140, 600],
      ['forest', 'autumn', 600, 2400], ['forest', 'winter', -100, -100],
      ['jiuzhaigou', 'summer', 850, 580],
    ]) {
      const caches = [new Before(mapId), new After(mapId)];
      for (const cache of caches) cache.setSeason(season);
      const after = caches[1], view = { x, y, w: 390, h: 450 };
      after.prepare(view);
      let frames = 0;
      while (!after.ready(view) && frames++ < 2000) after.advance(1);
      if (!after.ready(view) || after.stats().syncMisses) throw Error('分帧生成失败');
      for (const night of [0, .5, 1]) {
        const pixels = caches.map(cache => {
          const canvas = document.createElement('canvas'); canvas.width = 390; canvas.height = 450;
          const c = canvas.getContext('2d', { willReadFrequently: true }); c.translate(-x, -y);
          cache.draw(c, { x, y, w: 390, h: 450 }, night);
          return c.getImageData(0, 0, 390, 450).data;
        });
        let sum = 0, large = 0;
        for (let i = 0; i < pixels[0].length; i++) {
          const diff = Math.abs(pixels[0][i] - pixels[1][i]); sum += diff; if (diff > 10) large++;
        }
        const mean = sum / pixels[0].length, largeFraction = large / pixels[0].length;
        if (mean !== 0 || largeFraction !== 0) throw Error(`缓存像素变化过大：${mapId}/${season}/${night} ${mean}/${largeFraction}`);
        results.push({ mapId, season, night, mean, largeFraction });
      }
      for (const cache of caches) cache.setMap('release');
    }
    return results;
  });
}
