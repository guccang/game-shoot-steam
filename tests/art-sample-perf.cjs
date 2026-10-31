// 同页交替绘制基线和样板，减少不同运行时刻的系统负载噪声；仅测 Canvas 提交耗时。
// 先将修改前 HEAD 的 src 用 git archive 解压到 output/playwright/art-sample/baseline。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  return await page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    const { Renderer: Before } = await import('/output/playwright/art-sample/baseline/src/rendering/renderer.js');
    const { Renderer: After } = await import('/src/rendering/renderer.js');
    const { Game } = await import('/src/core/game.js');
    const { freshProgress } = await import('/src/progression/progress.js');
    const results = [];
    for (const scene of ['camp', 'bridge', 'night']) {
      const g = new Game(freshProgress(), () => 0.42);
      g.start(); g.enemies = []; g.boss = null;
      g.player.x = scene === 'camp' ? 900 : 1190; g.player.y = scene === 'camp' ? 700 : 825;
      g.time = g.previewTime = 12;
      const env = { time: scene === 'night' ? 'night' : 'day', weather: scene === 'night' ? 'rain' : 'sun', autoTime: false, autoWeather: false };
      const pair = [Before, After].map(Type => {
        const canvas = document.createElement('canvas'); canvas.width = 390; canvas.height = 844;
        const r = new Type(canvas, g, env); r.width = 390; r.height = 844; r.dpr = 1;
        return r;
      });
      for (let n = 0; n < 30; n++) for (const r of pair) r.draw();
      const timings = [[], []], builds = pair.map(r => r.ground.stats().builds);
      for (let n = 0; n < 360; n++) {
        g.time = g.previewTime = 12 + n / 60;
        for (const i of n % 2 ? [1, 0] : [0, 1]) {
          const start = performance.now(); pair[i].draw(); timings[i].push(performance.now() - start);
        }
      }
      const stats = pair.map((r, i) => {
        if (r.ground.stats().builds !== builds[i]) throw Error('固定视角重复构建背景');
        const t = timings[i].sort((a, b) => a - b);
        return { mean: t.reduce((a, b) => a + b) / t.length, p95: t[Math.floor(t.length * 0.95)], diagnostics: r.diagnosticInfo() };
      });
      results.push({ scene, before: stats[0], after: stats[1] });
    }
    return { width: 390, height: 844, dpr: 1, framesPerScene: 360, results };
  });
}
