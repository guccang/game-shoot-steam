// 隔离浏览器存档实际点击Debug，检查手机布局、写盘失败回滚与刷新后永久解锁。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url());await page.locator('#start').tap();
  await page.evaluate(async()=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.update=()=>{};a.refresh();
  });
  const layouts=[];
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,livingPreview:true,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);},time);
   await page.locator('#settings-button').tap();await page.locator('#settings-advanced>summary').tap();await page.locator('#debug-toggle').tap();await page.locator('#unlock-seeds').scrollIntoViewIfNeeded();
   const rect=await page.locator('#unlock-seeds').boundingBox();if(rect.height<44||rect.x<0||rect.x+rect.width>width)throw Error('按钮触控区域或边界错误');
   await page.screenshot({path:`output/playwright/debug-seeds/button-${width}-${time}.png`});layouts.push({width,height,buttonHeight:rect.height});
   await page.locator('#settings-done').tap();
  }
  await page.locator('#settings-button').tap();await page.locator('#settings-advanced>summary').tap();await page.locator('#debug-toggle').tap();
  await page.evaluate(()=>{window.before=structuredClone(a.game.progress);window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('验收：存储不可用');};});
  await page.locator('#unlock-seeds').tap();if(!await page.evaluate(()=>JSON.stringify(before)===JSON.stringify(a.game.progress)))throw Error('保存失败改变了进度');if(await page.locator('#unlock-seeds').isDisabled())throw Error('失败后不能重试');
  await page.evaluate(()=>{Storage.prototype.setItem=originalSet;});await page.locator('#unlock-seeds').tap();
  const data=await page.evaluate(()=>({unlocked:a.game.progress.farm.unlocked.every(Boolean),seeds:a.game.progress.farm.seeds,coins:a.game.progress.coins,bosses:a.game.progress.bosses}));
  if(!data.unlocked||data.seeds.some(Boolean)||data.coins!==60||data.bosses!==0||!await page.locator('#unlock-seeds').isDisabled())throw Error(JSON.stringify(data));
  await page.locator('#unlock-feedback').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/debug-seeds/success.png'});
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;if(!a.game.progress.farm.unlocked.every(Boolean))throw Error('刷新丢失购买资格');});
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'settings-layout',layouts,...data,persisted:true,failedSaveUnchanged:true,errors};
 }finally{await context.close();}
}
