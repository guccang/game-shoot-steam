// 正式手机地图入口与小屏、既有宽窗口容器的昼夜画面；默认沿用4175服务。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;
   p.restoration.repaired=['cottage','neighbors'];a.game.progress=p;a.game.reset();a.game.state='playing';a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;
   Object.assign(a.game.player,{x:400,y:280,invincible:1e6});a.game.vehicle.active=true;
   Object.assign(a.environment,{livingPreview:true,forestSeason:a.renderer.ground.season,seasonAt:Date.now(),time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();
  });
  for(const width of [320,1280]){
   await page.setViewportSize({width,height:width===320?568:900});
   for(const time of ['day','night']){
    await page.evaluate(time=>{a.environment.time=time;a.renderer.light.set(a.environment,performance.now());for(const key in a.renderer.light.started)a.renderer.light.started[key]=performance.now()-20000;a.refresh();},time);
    await page.waitForTimeout(500);await page.screenshot({path:`output/playwright/season-staging/visual-${width}-${time}.png`});
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.cachedPool=a.renderer.ground.current;window.cachedPreview=a.renderer.ground.mapPreview;window.cachedTile=[...cachedPool.tiles.values()][0];a.environment.forestSeason=a.renderer.ground.season==='winter'?'spring':'winter';});
  await page.waitForFunction(()=>!!a.renderer.ground.staged);
  await page.locator('#field-menu-toggle').tap();await page.locator('#phone-button').tap();await page.locator('[data-pack-action=map]').tap();
  await page.locator('#map-dialog').waitFor({state:'visible'});await page.waitForFunction(()=>!document.getElementById('region-map').hidden);
  const result=await page.evaluate(()=>{
   const g=a.renderer.ground;if(g.current!==cachedPool||g.mapPreview!==cachedPreview||cachedTile.day.width===1||g.stats().seasonStaging.pools!==2)throw Error('打开地图影响正在预制的战场缓存');
   return {designCriterion:'season-cache-staging',mapPreserved:true,map:g.mapPreview.stats(),stage:g.stats().seasonStaging};
  });
  await page.screenshot({path:'output/playwright/season-staging/map-while-preparing.png'});
  await page.locator('#map-done').tap();await page.locator('#phone-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  if(errors.length)throw Error(errors.join('\n'));return {...result,errors};
 }finally{await context.close();}
}
