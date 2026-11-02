// 触屏补充验收：独立移动端上下文，实际点击、拖动及昼夜同屏，不访问用户浏览器。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,storageState:await page.context().storageState()});
 const phone=await context.newPage(),errors=[];phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto('http://localhost:4175');await phone.locator('#start').tap();
 await phone.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await phone.getByRole('button',{name:'展开功能菜单',exact:true}).tap();
 await phone.getByRole('button',{name:'任务簿：主线、故事与邻里委托',exact:true}).tap();
 await phone.getByRole('button',{name:'打开巡林簿',exact:true}).tap();
 await phone.locator('#mainline-action').tap();
 if(!await phone.evaluate(()=>!a.game.progress.mainline.trackingPaused))throw Error('触屏继续失败');
 // 再次打开任务簿，检查三按钮在最窄手机上的点击尺寸。
 await phone.getByRole('button',{name:'展开功能菜单',exact:true}).tap();
 await phone.getByRole('button',{name:'任务簿：主线、故事与邻里委托',exact:true}).tap();
 await phone.getByRole('button',{name:'打开巡林簿',exact:true}).tap();
 await phone.setViewportSize({width:320,height:568});
 const sizes=await phone.locator('.mainline-book-actions button').evaluateAll(nodes=>nodes.filter(n=>!n.hidden).map(n=>{const r=n.getBoundingClientRect();return {w:r.width,h:r.height,right:r.right,bottom:r.bottom};}));
 if(sizes.some(r=>r.w<44||r.h<44||r.right>320||r.bottom>568))throw Error('短屏触控尺寸不足');
 await phone.screenshot({path:'output/playwright/exploration-pacing/touch-320-active.png'});
 await phone.locator('#mainline-pause').tap();
 await phone.setViewportSize({width:390,height:844});
 await phone.evaluate(async()=>{
  const g=a.game;g.update=()=>{};g.vehicle.active=true;g.vehicle.index=0;g.progress.vehicleHulls[0]=1;g.player.invincible=999;
  g.enemies=[];g.spawnEnemy(0,0,{x:g.player.x+80,y:g.player.y+70},{ambient:true});
  Object.assign(a.environment,{livingPreview:true,autoSeason:false,autoTime:false,autoWeather:false,weather:'sun',forestSeason:'summer'});a.refresh();
 });
 for(const time of ['day','night']){
  await phone.evaluate(async time=>{a.environment.time=time;a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
  await phone.waitForTimeout(250);await phone.screenshot({path:`output/playwright/exploration-pacing/world-${time}.png`});
  if(await phone.locator('#mainline-hud').isVisible()||await phone.locator('#operation-guide').isVisible())throw Error('探索仍有引导');
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {touch:true,sizes,dayNight:true,errors};
}
