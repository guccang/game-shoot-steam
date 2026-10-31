// 隔离浏览器检查密集怪潮、宽视野、周期接缝及夜雨绘制，真实战场保留原有怪物数量。
async (page) => {
  if (new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application;
    a.destroy();
  });
  const results = [];
  for (const [width, weapon, night] of [[320, 2, false], [390, 9, false], [580, 12, true]]) {
    await page.setViewportSize({ width, height: 844 });
    results.push(await page.evaluate(async ({width,weapon,night}) => {
      const a = (await import('/src/main.js')).application;
      const {createCrowdScene} = await import('/tests/helpers/crowd-scene.js');
      const {EnvironmentTransition} = await import('/src/world/environment.js');
      Object.assign(a.game, createCrowdScene(96, weapon));
      const g = a.game;
      a.renderer.game = g;
      a.renderer.environment = { time: night ? 'night' : 'day', weather: night ? 'thunder' : 'sun' };
      a.renderer.light = new EnvironmentTransition(a.renderer.environment, performance.now());
      g.setViewport(width,844);
      for(let i=0;i<90;i++)g.update(1/60,{x:0.2,y:0});
      a.renderer.resize();a.refresh();a.renderer.draw();
      if(g.enemies.length!==96||g.state!=='playing')throw Error('怪潮被削减或玩家异常倒下');
      if(g.enemies.some(e=>!Number.isFinite(e.x)||!Number.isFinite(e.y)))throw Error('碰撞位置异常');
      if(document.documentElement.scrollWidth>innerWidth)throw Error('窄屏横向溢出');
      return {width,weapon,night,alive:g.enemies.length,particles:g.fx.items?.length};
    }, {width,weapon,night}));
    await page.screenshot({path:`output/playwright/crowd-performance/crowd-${width}.png`});
  }
  const seam = await page.evaluate(async () => {
    const a = (await import('/src/main.js')).application,g=a.game;
    const {WORLD}=await import('/src/world/coordinates.js');
    const {CombatCamera}=await import('/src/rendering/camera.js');
    g.progress.weapon=2;g.enemies=[];g.player.x=1;g.player.y=700;
    a.renderer.environment={time:'day',weather:'sun'};
    const {EnvironmentTransition}=await import('/src/world/environment.js');
    a.renderer.light=new EnvironmentTransition(a.renderer.environment,performance.now());
    a.renderer.camera=new CombatCamera();a.renderer.draw();
    const c=a.renderer.c,w=a.renderer.canvas.width,h=a.renderer.canvas.height;
    const first=c.getImageData(0,0,w,h).data.slice();
    g.player.x+=WORLD.width;g.player.y-=WORLD.height;
    a.renderer.camera=new CombatCamera();a.renderer.draw();
    const second=c.getImageData(0,0,w,h).data;
    let difference=0;for(let i=0;i<first.length;i++)difference+=Math.abs(first[i]-second[i]);
    if(difference/first.length>1)throw Error('循环地图绘制不一致');
    return {meanPixelDifference:difference/first.length};
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.renderer.draw();});
  if(errors.length)throw Error(errors.join('\n'));
  return {results,seam,errors};
}
