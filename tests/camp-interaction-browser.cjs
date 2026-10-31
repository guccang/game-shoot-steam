// 独立端口实机回归：快捷上车、小屋短按和消防三秒入库使用正式输入与控制器。
async page=>{
 if(new URL(page.url()).port!=='4269')throw Error('仅限隔离验收端口4269');
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.vehicleHulls.fill(1);p.vehicleIndex=0;
  p.arrival={version:2,phase:'complete',elapsed:0,keys:true,parked:false,x:260,y:785};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.spawnTimer=999;a.game.fireClock=999;window.tick=a.game.update.bind(a.game);});
 await page.setViewportSize({width:390,height:844});
 // 模拟已停放的唯一车体，实际点击HUD快捷入口，巡游点击并保留原车耐久；暂停核心由单测覆盖。
 for(const paused of [false]){
  await page.evaluate(paused=>{const g=a.game;g.vehicle=g.vehicles[0];g.vehicle.active=false;g.progress.vehicleIndex=0;g.progress.campParking.owned=[{hull:0,spot:'garage',hp:.7,ammo:3,reload:0,wheel:1,track:0}];Object.assign(g.player,{x:260,y:783,vx:0,vy:0});g.state=paused?'paused':'playing';a.renderer.camera.time=null;a.refresh();},paused);
  await page.locator('#vehicle-button').click();
  if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.progress.campParking.owned.length===0&&Math.abs(a.game.vehicle.hp/a.game.vehicle.maxHp-.7)<.001))throw Error('快捷上车失败或免费修车');
  results.push({shortcut:paused?'暂停':'巡游',passed:true});
 }
 // 点击小屋本体进入；同一热点按住拖动必须仍能走路，不能误进门。
 await page.evaluate(async()=>{const g=a.game;g.state='playing';g.dismountVehicle();g.parking=null;Object.assign(g.player,{x:860,y:400,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});
 await page.locator('#cottage-enter').waitFor({state:'visible'});await page.waitForTimeout(250);
 const box=await page.locator('#cottage-enter').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+45,box.y+box.height/2,{steps:8});await page.waitForTimeout(220);await page.mouse.up();
 if(await page.evaluate(()=>!!a.game.cottage))throw Error('小屋拖动误进入');
 await page.locator('#cottage-enter').click();await page.waitForFunction(()=>!!a.game.cottage);await page.screenshot({path:'output/playwright/camp-interaction/cottage-click.png'});
 await page.locator('#cottage-exit').click();await page.locator('#cottage-enter').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!!a.game.cottage);
 await page.locator('#cottage-exit').click();results.push({cottage:'鼠标、键盘进入及拖动区分通过'});
 // 夹具只完成前置火情，正式返站从站前开始，按浏览器时钟计时和倒车。
 await page.evaluate(async()=>{
  const g=a.game,{FIRE_EXIT,FIRE_PARKING}=await import('/src/world/fire-navigation.js');g.update=()=>{};g.enemies=[];g.random=()=>.4;Object.assign(g.player,FIRE_EXIT);g.requestFireRescue();g.startFireRescue();
  for(let i=0;i<4000&&g.fireTransit;i++)tick(.05);
  for(const f of g.fireRescue.fires){f.hp=0;f.lit=false;}g.enemies=[];tick(.05);Object.assign(g.player,FIRE_PARKING,{vx:0,vy:0});g.fireRescue.dockTime=0;a.renderer.camera.time=null;
  window.motion=[];g.update=(dt,input)=>{const before={x:g.player.x,y:g.player.y},phase=g.fireRescue?.phase;tick(dt,input);motion.push({phase,next:g.fireRescue?.phase,dt,distance:Math.hypot(g.player.x-before.x,g.player.y-before.y),wheel:g.vehicle.wheelPhase});};
 });
 await page.waitForFunction(()=>a.game.fireRescue.dockTime>.6);await page.keyboard.down('ArrowRight');await page.waitForTimeout(100);await page.keyboard.up('ArrowRight');
 if(!await page.evaluate(()=>a.game.fireRescue.phase==='returning'&&a.game.fireRescue.dockTime<.2))throw Error('消防移动未取消倒计时');
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/world/fire-navigation.js')).FIRE_PARKING,{vx:0,vy:0});a.game.fireRescue.dockTime=0;});
 await page.waitForFunction(()=>a.game.fireRescue.dockTime>1.2);await page.evaluate(()=>{a.game.update=()=>{};});
 // 冻结实际计时中间帧，对照桌面、320和390宽度的昼夜正式绘制。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const g=a.game;g.progress.living.calendar.elapsed=phase==='night'?220000:1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.enemies=[];const e=g.spawnEnemy(0,900);Object.assign(e,{x:g.player.x+140,y:g.player.y+75,speed:0});a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);
  await page.waitForTimeout(200);await page.screenshot({path:`output/playwright/camp-interaction/fire-${width}-${phase}.png`});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('界面横向溢出');
 }
 await page.evaluate(()=>{a.game.enemies=[];a.game.update=(dt,input)=>{const before={x:a.game.player.x,y:a.game.player.y},phase=a.game.fireRescue?.phase;tick(dt,input);motion.push({phase,next:a.game.fireRescue?.phase,dt,distance:Math.hypot(a.game.player.x-before.x,a.game.player.y-before.y),wheel:a.game.vehicle.wheelPhase});};});
 await page.waitForFunction(()=>a.game.fireRescue.phase==='parking',null,{timeout:5000});await page.screenshot({path:'output/playwright/camp-interaction/fire-reverse.png'});
 await page.waitForFunction(()=>a.game.fireRescue.phase==='won',null,{timeout:15000});await page.screenshot({path:'output/playwright/camp-interaction/fire-dismounted.png'});
 const motionResult=await page.evaluate(()=>({phases:[...new Set(motion.map(s=>s.phase))],maxStep:Math.max(...motion.map(s=>s.distance)),wheelChanged:new Set(motion.filter(s=>s.phase==='parking').map(s=>s.wheel)).size>4,mounted:a.game.vehicle.active,parked:a.game.fireGarageParked,clears:a.game.progress.realms.records.fire.clears}));
 if(motionResult.mounted||!motionResult.parked||!motionResult.wheelChanged||motionResult.maxStep>7.51||motionResult.clears!==1)throw Error(JSON.stringify(motionResult));results.push(motionResult);
 // 消防车交接后快捷取回原车，并真实驶出车库。
 await page.locator('#vehicle-button').click();if(!await page.evaluate(()=>a.game.vehicle.active&&!a.game.fireGarageParked))throw Error('消防快捷入口仍被禁用');
 const y=await page.evaluate(()=>a.game.player.y);await page.keyboard.down('ArrowDown');await page.waitForTimeout(700);await page.keyboard.up('ArrowDown');if(!await page.evaluate(y=>a.game.player.y>y+30,y))throw Error('消防上车后无法驶出');
 await page.screenshot({path:'output/playwright/camp-interaction/fire-boarded.png'});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:['camp-home-parking','fire-garage-motion'],results,errors};
}

