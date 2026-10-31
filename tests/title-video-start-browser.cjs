// 首页启动与背景媒体解耦：延迟真实网络请求，使用原生按钮进入与正式视频解码。
async original=>{
 const browser=original.context().browser(),results=[],address=original.url()||'http://localhost:4175';
 for(const scenario of ['early-start','late-video','video-error','startup-error']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let releaseMain,releaseVideo;const mainGate=new Promise(resolve=>releaseMain=resolve),videoGate=new Promise(resolve=>releaseVideo=resolve);
  try{
   if(['early-start','startup-error'].includes(scenario))await page.route('**/src/main.js',async route=>{await mainGate;await route.continue().catch(()=>{});});
   if(scenario==='startup-error')await page.route('**/src/app/create-app.js',route=>route.fulfill({status:503,body:'startup unavailable'}));
   await page.route('**/assets/title/background.mp4',async route=>{if(scenario==='video-error'){await route.fulfill({status:404,body:'missing'});return;}await videoGate;await route.continue().catch(()=>{});});
   await page.goto(address,{waitUntil:'commit'});await page.locator('#start').waitFor({state:'visible'});await page.waitForFunction(()=>!document.getElementById('start').disabled);
   if(['early-start','startup-error'].includes(scenario)){
    await page.locator('#start').tap();
    if(!await page.evaluate(()=>document.getElementById('start').disabled&&document.getElementById('start').getAttribute('aria-busy')==='true'&&document.getElementById('title-start-status').textContent.includes('准备')))throw Error('启动模块未就绪时点击没有被接收');
    await page.screenshot({path:`output/playwright/title-video-start/${scenario}-pending.png`});releaseMain();
   }else{
    await page.evaluate(async()=>{window.app=(await import('/src/main.js')).application;});
   }
   if(scenario==='startup-error'){
    await page.waitForFunction(()=>!document.getElementById('title-startup-error').hidden);
    if(!await page.evaluate(()=>document.getElementById('start').disabled&&document.getElementById('start').getAttribute('aria-busy')==='false'&&!document.getElementById('title-start-status').textContent&&document.getElementById('game-frame').dataset.page==='title'))throw Error('启动失败后仍尝试进入');
    results.push({scenario,blockedCorrectly:true});continue;
   }
   if(scenario==='late-video'){
    const pending=await page.evaluate(()=>({disabled:document.getElementById('start').disabled,poster:!document.getElementById('title-poster').hidden,videoHidden:document.getElementById('title-video').hidden,paused:document.getElementById('title-video').paused}));
    if(pending.disabled||!pending.poster||!pending.videoHidden||!pending.paused)throw Error('媒体缓冲影响按钮或提前播放 '+JSON.stringify(pending));
    await page.screenshot({path:'output/playwright/title-video-start/video-pending.png'});releaseVideo();
    await page.waitForFunction(()=>{const v=document.getElementById('title-video');return v.readyState>=3&&!v.paused&&v.currentTime>.1&&!v.hidden;});
    await page.screenshot({path:'output/playwright/title-video-start/video-playing.png'});await page.locator('#start').tap();
   }else if(scenario==='video-error'){
    await page.waitForFunction(()=>document.getElementById('title-video-status').textContent.includes('失败'));await page.locator('#start').tap();
   }
   await page.waitForFunction(()=>document.getElementById('game-frame').dataset.page==='game',null,{timeout:20000});
   await page.evaluate(async()=>{window.app=(await import('/src/main.js')).application;window.firstPlayer=app.game.player;});
   if(!await page.evaluate(()=>document.getElementById('title-video').paused))throw Error('进入游戏后背景视频仍播放');
   if(scenario==='early-start'){
    // 进入时媒体请求仍被阻塞；随后资源加载完也不能在战场背后重新播放。
    if(await page.locator('#title-video').evaluate(v=>v.readyState!==0))throw Error('没有在视频加载前进入');
    releaseVideo();await page.waitForFunction(()=>document.getElementById('title-video').readyState>=3);await page.waitForTimeout(150);
    if(!await page.evaluate(()=>document.getElementById('title-video').paused&&app.game.player===firstPlayer))throw Error('迟到的视频或重复点击重入游戏');
    await page.evaluate(()=>app.menu.home());await page.waitForFunction(()=>!document.getElementById('title-video').paused);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('title-video').hidden&&!document.getElementById('title-poster').hidden&&document.getElementById('title-video').paused);
   }
   if(errors.length)throw Error(errors.join('\n'));results.push({scenario,entered:true,errors});
  }finally{releaseMain();releaseVideo();await context.close();}
 }
 return {passed:true,results};
}
