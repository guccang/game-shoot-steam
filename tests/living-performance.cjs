// 正式绘制器性能采样；在相同1280×900视口、晴天和位置比较主分支与生活圈。
// 基线为排除旧版强制怪潮而冻结刷怪；不用于战斗强度或实体手机帧率结论。
async page=>{
  await page.bringToFront();await page.setViewportSize({width:1280,height:900});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.state='playing';Object.assign(g.player,{x:650,y:1790});g.progress.fireDispatch.next=600;g.progress.fireDispatch.run=null;a.environment.weather='sun';a.environment.autoWeather=false;a.environment.time='day';a.environment.forestSeason='spring';if(g.progress.living)g.progress.living.calendar={day:1,elapsed:500000};a.refresh();});
  await page.waitForTimeout(23000);
  await page.evaluate(async()=>{(await import('/src/main.js')).application.game.profiler.frames=[];});
  await page.waitForTimeout(5000);
  return await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,frames=a.game.profiler.frames.filter(f=>f.state==='playing');
    // 记录实际主线程工作耗时与回调间隔，不能把模拟dt冒充真实性能。
    function stats(values){const sorted=values.sort((a,b)=>a-b);return {mean:values.reduce((s,n)=>s+n,0)/values.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};}
    return {url:location.href,viewport:[innerWidth,innerHeight],frames:frames.length,frameWorkMs:stats(frames.map(f=>f.total)),intervalMs:stats(frames.map(f=>f.interval||0)),logicMs:stats(frames.map(f=>f.sections.logic||0)),renderMs:stats(frames.map(f=>f.sections.render||0)),residents:a.game.livingActors?.size||0,heap:performance.memory?.usedJSHeapSize||null};
  });
}
