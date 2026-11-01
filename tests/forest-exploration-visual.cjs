// 正式昼夜过渡完成后再采样；触屏、现场闲聊和木门开合均使用实际运行界面。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;Object.assign(g.player,{x:650,y:1940});g.mainlineTalkDelay=999;g.enemies=[];g.progress.living.patrolActive=false;
  g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicles[0]=(await import('/src/combat/vehicle.js')).createVehicle(g.progress, 0);g.vehicle=g.vehicles[0];g.summonVehicle();
  a.environment.weather='sun';a.environment.autoWeather=false;a.refresh();
 });
 const samples=[];
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?500000:1000000};a.refresh();},phase);
  await page.waitForTimeout(16000);
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(400);
   await page.screenshot({path:`output/playwright/forest-exploration/accepted-${width}-${phase}.png`});
   samples.push(await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {...(await import('/src/rendering/visual-review.js')).inspectForestExploration(a.game,document),time:a.environment.time};}));
  }
 }
 await page.setViewportSize({width:390,height:900});
 await page.waitForSelector('#resident-chatter:not([hidden])',{timeout:30000});
 await page.screenshot({path:'output/playwright/forest-exploration/ambient-chatter.png'});
 const chatter=await page.locator('#resident-chatter').textContent();
 // 手机通过真实触摸点击接近入口，气泡不能阻挡交互。
 await page.evaluate(async()=>(await import('/src/main.js')).application.living.open());
 const before=await page.locator('#living-dialog').evaluate(n=>n.open),close=await page.locator('#living-close').boundingBox();
 const session=await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:close.x+close.width/2,y:close.y+close.height/2}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForTimeout(250);
 if(!before||await page.locator('#living-dialog').evaluate(n=>n.open))throw Error('触摸无法关闭面板');
 // 验证购船任务世界路线按需出现，完成购买条件后无需按钮确认就清除旧路线。
 const navigation=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,{MAINLINE_TASKS}=await import('/src/config/mainline.js'),n=await import('/src/core/world-navigation.js');
  g.progress.taskTracking={kind:'mainline'};g.progress.mainline.completed=MAINLINE_TASKS.slice(0,MAINLINE_TASKS.findIndex(t=>t.id==='own-hover')).map(t=>t.id);g.progress.mainline.phase='doing';g.progress.vehicleHulls[3]=0;
  const before=n.worldNavigationObjective(g);n.requestMainlineNavigation(g);const selected=n.worldNavigationObjective(g);g.progress.vehicleHulls[3]=1;const after=n.worldNavigationObjective(g);return {before,selected:!!selected,after};
 });
 if(navigation.before||!navigation.selected||navigation.after)throw Error('购船导航没有按意图清理');
 const frameErrors=await page.evaluate(async()=>(await import('/src/main.js')).application.game.profiler.events.filter(e=>e.type==='frame-error'));
 if(errors.length||frameErrors.length||samples.some(s=>s.viewportOverflow||s.dialogOverflow||!s.waveHudHidden))throw Error(JSON.stringify({errors,frameErrors,samples}));
 return {samples,chatter,navigation,errors,frameErrors};
}
