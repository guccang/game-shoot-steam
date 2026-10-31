// 正式首页过场验收：隔离存档，保留真实视频、地图和绘制器。
async page=>{
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离端口4187');
  const checks=[],samples=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  // 重挂载只改测试端口存档，真实建图逻辑保持原样。
  async function mount(){
    await page.evaluate(async()=>{
      (window.loadingApp||(await import('/src/main.js')).application).destroy();
      for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
      const p=(await import('/src/progression/progress.js')).freshProgress();p.coins=2468;
      localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
      window.loadingApp=(await import('/src/app/create-app.js')).createApplication();
    });
  }
  // 采集正式节点、媒体时间与轮辐变换，供截图与顺序断言复核。
  async function sample(){return page.evaluate(async()=>{const {inspectStartLoading}=await import('/src/rendering/visual-review.js');return inspectStartLoading(document,loadingApp);});}
  // 同步点击并监听100%帧，避免自动等待错过短暂完成态。
  async function start(){return page.evaluate(()=>{
    const $=id=>document.getElementById(id);window.loadingStarted=performance.now();window.loadingEntered=0;window.sawComplete=false;
    window.loadingObserver?.disconnect();window.loadingObserver=new MutationObserver(()=>{if($('start-loading-progress').getAttribute('aria-valuenow')==='100'&&!$('start-loading').hidden&&loadingApp.menu.page==='title')window.sawComplete=true;if(loadingApp.menu.page==='game'&&!window.loadingEntered)window.loadingEntered=performance.now();});
    window.loadingObserver.observe($('start-loading-progress'),{attributes:true,attributeFilter:['aria-valuenow']});
    window.loadingObserver.observe($('game-frame'),{attributes:true,attributeFilter:['data-page']});
    $('start').click();loadingApp.menu.enter();return {percent:$('start-loading-progress').getAttribute('aria-valuenow'),hidden:getComputedStyle($('start')).visibility==='hidden',video:$('title-video').currentSrc};
  });}
  for(const [width,height] of [[320,568],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await mount();
    const initial=await start();if(initial.percent!=='0'||!initial.hidden||!initial.video.endsWith('/assets/title/background.mp4'))throw Error('点击当帧未保留原背景并显示0%');
    await page.waitForTimeout(550);const middle=await sample();await page.screenshot({path:`output/playwright/start-loading/loading-${width}.png`});
    if(!middle.loading||!middle.homeHidden||!middle.inert||middle.videoCount!==1||middle.videoPaused)throw Error('过场未隐藏首页或视频停止');
    for(const edge of ['left','right','bottom'])if(Math.abs(middle.barBox[edge]-middle.frameBox[edge])>1)throw Error('进度条没有底部全宽 '+edge);
    await page.waitForTimeout(300);const later=await sample();
    if(later.percent<middle.percent||later.van.x<=middle.van.x||later.wheel===middle.wheel)throw Error('车或独立轮辐未前进');
    await page.waitForFunction(()=>loadingApp.menu.page==='game');
    const ended=await page.evaluate(()=>({elapsed:loadingEntered-loadingStarted,coins:loadingApp.game.progress.coins,complete:sawComplete,hidden:document.getElementById('start-loading').hidden}));
    if(ended.elapsed<1000||ended.elapsed>3000||ended.coins!==2468||!ended.complete||!ended.hidden)throw Error('时长/续档/100%顺序错误 '+JSON.stringify(ended));
    samples.push({width,height,initial,middle,later,ended});checks.push(`${width}原视频、行车、独立轮辐、0至100及1–3秒入场`);
    // 再次开始只播放过场，保存地图身份和时钟以排除重建或后台推进。
    await page.evaluate(()=>{loadingApp.game.pause();loadingApp.refresh();loadingApp.menu.home();window.savedTrees=loadingApp.game.trees;window.savedPlayer=loadingApp.game.player;window.savedTime=loadingApp.game.time;});
    const resumed=await start();if(resumed.percent!=='0'||!resumed.hidden)throw Error('再次开始跳过过场');
    await page.waitForTimeout(400);
    if(!await page.evaluate(()=>loadingApp.menu.page==='title'&&!document.getElementById('start-loading').hidden&&loadingApp.game.time===savedTime))throw Error('再次过场提前恢复游戏');
    await page.waitForFunction(()=>loadingApp.menu.page==='game');
    const resumeResult=await page.evaluate(()=>({elapsed:loadingEntered-loadingStarted,complete:sawComplete,sameTrees:loadingApp.game.trees===savedTrees,samePlayer:loadingApp.game.player===savedPlayer,coins:loadingApp.game.progress.coins}));
    if(resumeResult.elapsed<1000||resumeResult.elapsed>3000||!resumeResult.complete||!resumeResult.sameTrees||!resumeResult.samePlayer||resumeResult.coins!==2468)throw Error('再次过场破坏现场 '+JSON.stringify(resumeResult));
    samples[samples.length-1].resumeResult=resumeResult;checks.push(`${width}再次开始完整过场、保留现场、底部全宽`);
  }
  await page.setViewportSize({width:390,height:844});await mount();
  await page.evaluate(()=>{const ready=loadingApp.renderer.ground.ready.bind(loadingApp.renderer.ground);window.releaseLoading=false;loadingApp.renderer.ground.ready=view=>releaseLoading&&ready(view);});
  await start();await page.waitForTimeout(3200);const slow=await sample();if(slow.percent!==90||slow.page!=='title'||!slow.loading)throw Error('慢加载提前完成');
  await page.evaluate(()=>{window.releaseLoading=true;});await page.waitForFunction(()=>loadingApp.menu.page==='game');checks.push('慢加载停留90直到实际准备完成');
  await mount();await page.evaluate(()=>{loadingApp.game.initializeWorld=()=>{throw Error('验收建图失败');};});await start();await page.waitForFunction(()=>!document.getElementById('title-save-warning').hidden);
  if(await page.locator('#start-loading').isVisible()||!await page.locator('#title-settings').isVisible())throw Error('失败没有恢复首页');checks.push('失败结束过场并恢复首页');
  await mount();await start();await page.evaluate(()=>loadingApp.destroy());await page.waitForTimeout(2100);
  if(await page.locator('#start-loading').isVisible()||await page.evaluate(()=>loadingApp.menu.page)!=='title')throw Error('销毁后过场继续或误入场');checks.push('销毁取消过场和入场');
  await mount();await page.emulateMedia({reducedMotion:'reduce'});await start();await page.waitForTimeout(300);const reduced=await sample();
  await page.waitForTimeout(300);const reducedLater=await sample();if(reduced.van.x!==reducedLater.van.x||reduced.wheel!==reducedLater.wheel)throw Error('减少动态仍在行驶');
  await page.waitForFunction(()=>loadingApp.menu.page==='game');checks.push('减少动态静止车正常完成进度');await page.emulateMedia({reducedMotion:'no-preference'});
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,checks,samples,slow,errors};
}
