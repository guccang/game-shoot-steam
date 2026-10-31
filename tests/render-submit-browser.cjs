// 正式游戏采样、同场景名称路径对比以及手机昼夜验收；默认服务端口 4175。
async page => {
  if(!['localhost','127.0.0.1'].includes(new URL(page.url()).hostname))throw Error('仅允许独立本地测试会话');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await page.evaluate(async()=>{
    (await import('/src/main.js')).application.destroy();window.a?.destroy();localStorage.clear();
    const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
    const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
    const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');
    localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
    localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
    localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
    window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
    a.game.player.invincible=1e6;a.game.encounterTimer=999;a.game.mainlineTalkDelay=999;
    Object.assign(a.environment,{weather:'sun',forestSeason:'summer',livingPreview:true,autoTime:false,autoWeather:false});a.refresh();
  });
  await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
  await page.waitForTimeout(1500);
  // 继续正式帧以核验分段导出和逻辑节拍，没有覆盖游戏 update。
  await page.waitForTimeout(5500);
  const diagnostics=await page.evaluate(()=>{
    const report=a.diagnostics.report(),frames=report.combatFrames.slice(-120);
    return {version:report.version,summary:report.summary,commands:report.rendering.canvasCommands,
      frames:frames.map(f=>({sections:f.sections,unfinished:f.unfinished,sampled:f.canvasCommandSample,steps:f.logicSteps,interval:f.interval}))};
  });
  if(!diagnostics.frames.some(f=>f.sections['render.canvas']>0&&f.sections['render.panels']>0)||diagnostics.frames.some(f=>f.unfinished.length))throw Error('分段计时缺失或未结束');
  if(!diagnostics.commands.samples.length)throw Error('没有主场景指令采样');
  // 静态截图夹具只在性能测量之后冻结游戏，保留正式绘制器、猫和载具。
  await page.evaluate(()=>{
    const g=a.game;g.update=()=>{};g.player.x=1300;g.player.y=1900;g.enemies=[];g.vehicle.active=true;
    for(const [i,x,y] of [[0,1360,1960],[1,1210,1960],[2,1300,2020]]){const e=g.spawnEnemy(0,i,{x,y});e.level=12;e.rank=i;e.speed=0;}
  });
  const views=[];
  for(const [width,height] of [[320,568],[390,844],[1080,921]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:width>400?1:2,mobile:width<400});
    await page.evaluate(async time=>{
      const e=a.environment;e.time=time;a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);
      a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
    },time);
    await page.waitForTimeout(150);
    views.push(await page.evaluate(async()=>({width:innerWidth,time:a.environment.time,
      ...(await import('/src/rendering/visual-review.js')).inspectRenderSubmit(a.renderer,document),overflow:document.documentElement.scrollWidth>innerWidth})));
    await page.screenshot({path:`output/playwright/render-submit/${width}-${time}.png`});
  }
  if(views.some(v=>v.overflow))throw Error('画面或名称预算不合格');
  if(errors.length)throw Error(errors.join('\n'));await cdp.detach();return {diagnostics,views,errors};
}
