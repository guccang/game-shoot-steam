// 正式地图入口的重复打开基准与缓存回归；仅操作独立浏览器会话。
async page => {
  // 默认4175；并行任务占用时可使用空闲本地端口，不停止别人的开发服务。
  if(!['localhost','127.0.0.1'].includes(new URL(page.url()).hostname))throw Error('仅允许本地测试服务');
  if(!(await (await page.request.get(new URL('/src/rendering/ground-cache.js',page.url()).href)).text()).includes('MapPreviewCache'))throw Error('测试服务并非本次工作树');
  await page.setViewportSize({width:390,height:844});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{
    (await import('/src/main.js')).application.destroy();window.a?.destroy();localStorage.clear();
    const {freshProgress}=await import('/src/progression/progress.js');
    const {MAINLINE_IDS}=await import('/src/config/mainline.js');
    const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
    const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');
    localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
    localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
    localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
    window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
    a.game.player.invincible=1e6;a.game.encounterTimer=999;a.game.mainlineTalkDelay=999;
    Object.assign(a.environment,{weather:'sun',forestSeason:'summer',livingPreview:true,autoTime:false,autoWeather:false});
    a.refresh();window.mapSamples=[];
    // 单独计时底图贴图，区分地图生成与公共弹窗布局的耗时。
    const drawMap=a.renderer.ground.drawMap.bind(a.renderer.ground);
    a.renderer.ground.drawMap=(...args)=>{const start=performance.now(),result=drawMap(...args);window.mapBaseMs=performance.now()-start;return result;};
    // 捕获点击至处理器返回的时间、首个后续帧和战场缓存身份。
    const button=document.getElementById('map-button');let measured;
    button.addEventListener('click',()=>{
      const ground=a.renderer.ground;
      measured={start:performance.now(),tiles:[...ground.tiles.values()],before:ground.stats(),transition:ground.transition};
    },true);
    button.addEventListener('click',()=>{
      const ground=a.renderer.ground,{start,tiles,before,transition}=measured;
      const sample={handlerMs:performance.now()-start,baseMs:window.mapBaseMs,before,after:ground.stats(),
        preserved:tiles.every(tile=>[...ground.tiles.values()].includes(tile)),transitionPreserved:transition===ground.transition,
        loading:!document.getElementById('map-preview-loading')?.hidden};
      mapSamples.push(sample);requestAnimationFrame(()=>{sample.nextFrameMs=performance.now()-start;});
    });
  });
  await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
  await page.waitForTimeout(3000);
  const cdp=await page.context().newCDPSession(page);
  try{
    for(let i=0;i<4;i++){
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:i<2?1:4});
      if(!await page.locator('#map-button').isVisible())await page.locator('#field-menu-toggle').click();
      await page.locator('#map-button').click();await page.locator('#map-dialog').waitFor({state:'visible'});
      await page.waitForFunction(()=>!document.getElementById('region-map').hidden,{},{timeout:10000});
      await page.screenshot({path:`output/playwright/map-open/map-${i}.png`});
      await page.locator('#close-map').click();await page.waitForTimeout(350);
    }
    const result=await page.evaluate(()=>({samples:mapSamples,stats:a.renderer.ground.stats(),state:a.game.state,
      version:a.diagnostics.monitor.report().version}));
    if(result.samples.length!==4||result.samples.some(s=>!s.preserved||!s.transitionPreserved))throw Error('开图缓存回归：'+JSON.stringify(result.samples));
    if(result.stats.mapPreview.builds!==1)throw Error('重复开图重新生成底图');
    if(errors.length)throw Error(errors.join('\n'));
    return {...result,errors};
  }finally{await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await cdp.detach();}
}
