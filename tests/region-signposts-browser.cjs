// 隔离浏览器验收四区域站牌、窄屏、夜雨与循环地图镜像，不修改正式存档。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy(); a.game.progress.weapon = 0; a.game.reset(); a.game.start();
  });
  const scenes = [
    ['meadow',390,'day',0], ['pine',390,'day',0], ['amber',390,'day',0], ['deep',390,'day',0],
    ['pine',320,'night',0], ['deep',580,'night',0], ['pine',390,'day',1],
  ];
  const results = [];
  for (const [id,width,time,loop] of scenes) {
    await page.setViewportSize({width,height:width===320?568:844});
    const state = await page.evaluate(async ({id,time,loop}) => {
      const a = (await import('/src/main.js')).application;
      const {REGION_SIGNPOSTS} = await import('/src/world/signposts.js');
      const {WORLD} = await import('/src/world/coordinates.js');
      const {biomeAt,pathDistance} = await import('/src/world/biomes.js');
      const {isWaterScenery} = await import('/src/world/river-geometry.js');
      const {EnvironmentTransition} = await import('/src/world/environment.js');
      const sign = REGION_SIGNPOSTS.find(s=>s.zone.id===id);
      if (biomeAt(sign.x,sign.y).id!==id || isWaterScenery(sign.x,sign.y) || pathDistance(sign.x,sign.y)<42) throw Error('站牌位置不正确');
      a.game.player.x=sign.x+105+loop*WORLD.width; a.game.player.y=sign.y-30;
      a.game.enemies=[]; a.game.aimLock=null;
      Object.assign(a.environment,{time,weather:time==='night'?'rain':'sun',autoTime:false,autoWeather:false});
      a.renderer.light=new EnvironmentTransition(a.environment,performance.now());
      a.renderer.resize(); a.game.setViewport(a.renderer.width,a.renderer.height);
      const ctx=a.renderer.c, text=[], original=ctx.fillText;
      // 记录实际绘制文字，确认不是只增加了未被场景调用的独立图元。
      ctx.fillText=function(value,...args){text.push(value);return original.call(this,value,...args);};
      try {a.renderer.draw();} finally {ctx.fillText=original;}
      a.refresh();
      if (!text.includes(sign.zone.name)||!text.includes(`Lv.${sign.zone.range}`)) throw Error('站牌未显示名称或等级');
      if (text.some(t=>t.includes(' · Lv.'))) throw Error('仍然绘制地面区域文字');
      return {id,time,loop,name:sign.zone.name,range:sign.zone.range};
    },{id,time,loop});
    results.push(state);
    await page.screenshot({path:`output/playwright/region-signposts/${id}-${width}-${time}-${loop}.png`});
  }
  if(errors.length) throw Error(errors.join('\n'));
  return {results,errors};
}
