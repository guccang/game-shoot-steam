// 验证季节混合像素、取消构建释放画布，以及销毁期间不遗留入场动画回调。
async (page) => {
  await page.bringToFront(); await page.reload();
  const lifecycle = await page.evaluate(async () => {
    const app = (await import('/src/main.js')).application;
    app.destroy(); const ready = await app.ready;
    const time = app.game.time;
    await new Promise(resolve => setTimeout(resolve, 80));
    if (ready || app.game.time !== time || app.renderer.ground.stats().pending) throw Error('销毁后仍在准备或推进战斗');
    return { readyAfterDestroy: ready, clockUnchanged: app.game.time === time };
  });
  const cache = await page.evaluate(async () => {
    const { GroundCache: Before } = await import('/output/playwright/incremental-warmup/baseline/src/rendering/ground-cache.js');
    const { GroundCache: After, groundTiles } = await import('/src/rendering/ground-cache.js');
    const view = { x: 670, y: 280, w: 120, h: 140 }, results = [];
    for (const from of [{ summer: 1 }, { summer: .4, autumn: .6 }]) {
      const caches = [new Before(), new After()], state = { active: true, revision: 1, from, progress: .37 };
      for (const c of caches) c.setSeason('winter', state);
      caches[1].prepare(view);
      for (let i = 0; !caches[1].ready(view) && i < 3000; i++) caches[1].advance(2);
      for (const night of [0, .5, 1]) {
        const pixels = caches.map(cache => {
          const canvas = document.createElement('canvas'); canvas.width=120; canvas.height=140;
          const c=canvas.getContext('2d',{willReadFrequently:true}); c.translate(-view.x,-view.y); cache.draw(c,view,night);
          return c.getImageData(0,0,120,140).data;
        });
        let different=0;
        for(let i=0;i<pixels[0].length;i++) if(pixels[0][i]!==pixels[1][i])different++;
        if(different)throw Error('季节来源混合像素发生变化');
        results.push({from,night,different});
      }
      caches[1].setSeason('winter', {...state,active:false});
      if([...caches[1].tiles.values()].some(tile=>tile.fromDay||tile.fromNight))throw Error('过渡结束仍保留来源画布');
      for(const c of caches)c.setMap('release');
    }
    const c=new After(),spec=groundTiles(view)[0],day=c.get(spec,0).day;
    c.startWork(spec,1); c.work.steps.next(); const owned=[...c.work.surfaces];
    c.cancelWarmup();
    if(day.width!==spec.w+4||owned.some(canvas=>canvas.width!==1))throw Error('取消夜色任务破坏已发布白天层或泄漏工作画布');
    c.prepare(view); c.advance(1); const pending=[...(c.work?.surfaces||[])]; c.setMap('jiuzhaigou');
    if(pending.some(canvas=>canvas.width!==1)||c.stats().pendingBytes||c.tiles.size)throw Error('换图未清空旧缓存');
    c.dispose();
    return {transitions:results,cancelReleased:owned.length,oldDayPreserved:true,mapCancelled:true};
  });
  return {lifecycle,cache};
}
