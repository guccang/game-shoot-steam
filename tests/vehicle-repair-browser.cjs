// 默认4175，调用页可指定独立端口；隔离存储和手机触摸，不改用户存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/vehicle-repair/video/',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],checks=[],out='output/playwright/vehicle-repair/';page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 // 打开手机沿用实际菜单按钮；页面选择和确认都使用真实触摸。
 async function phone(){await page.locator('#field-menu-toggle').tap();await page.locator('#phone-button').tap();await page.locator('[data-pack-action=repair]').tap();}
 // 对正式手机底板测量触控与视口边界，再保存截图供审美复核。
 async function inspect(name){const result=await page.evaluate(async()=>{const r=await (await import('/src/rendering/visual-review.js')).inspectVehicleRepair(a.game,document),panel=document.getElementById('vehicle-repair-dialog'),b=panel.getBoundingClientRect();return {...r,open:panel.open,box:{x:b.x,y:b.y,right:b.right,bottom:b.bottom},width:innerWidth,height:innerHeight};});if(result.overflow||result.buttons.some(b=>b.height<44)||result.open&&(result.box.x<0||result.box.y<0||result.box.right>result.width+1||result.box.bottom>result.height+1))throw Error(JSON.stringify(result));checks.push({name,objects:result.objects.length});await page.screenshot({path:out+name+'.png'});}
 try{
  await page.goto(original.url().startsWith('http')?original.url():'http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.vehicleHulls[0]=1;p.vehicleIndex=0;p.coins=100000;p.restoration.repaired=['cottage','neighbors','travel','vehicle','weapons'];p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.spawnTimer=999;g.fireClock=999;g.progress.living.patrolActive=false;Object.assign(g.player,{x:220,y:835});g.progress.campParking.owned=[];g.summonVehicle();(await import('/src/combat/vehicle.js')).absorbVehicleHit(g,999999);a.environment.autoWeather=false;a.environment.weather='sun';g.livingWeather='sun';a.refresh();});
  await page.locator('#nearby-interaction[data-interaction=vehicle-wreck]').tap();
  await page.waitForFunction(()=>document.body.textContent.includes('载具已损坏，需要维修'));
  await inspect('wreck-day');await phone();await page.locator('[data-repair-hull="0"]').tap();await inspect('phone-quote');
  const before=await page.evaluate(()=>({coins:a.game.progress.coins,quote:document.querySelector('[data-repair-confirm]').textContent}));await page.locator('[data-repair-confirm]').tap();
  if(!await page.evaluate(()=>a.game.progress.vehicleService[0].phase==='outbound'&&a.game.progress.coins<100000))throw Error('救援未扣费出发');
  const paused=await page.evaluate(()=>JSON.stringify(a.game.progress.vehicleService[0]));await page.waitForTimeout(500);if(await page.evaluate(()=>JSON.stringify(a.game.progress.vehicleService[0]))!==paused)throw Error('弹窗暂停未冻结');
  await page.locator('#vehicle-repair-close').tap();await page.locator('#phone-close').tap();
  await page.waitForFunction(()=>a.game.progress.vehicleService[0].phase==='hooking');await inspect('tow-hook');
  await page.waitForFunction(()=>a.game.progress.vehicleService[0].phase==='towing');await inspect('tow-moving');
  await page.waitForFunction(()=>a.game.progress.vehicleService[0].phase==='repairing');await inspect('repairing');
  await page.waitForFunction(()=>a.game.progress.vehicleService[0].phase==='ready');
  await page.evaluate(()=>{Object.assign(a.game.player,{x:90,y:845,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});
  await page.locator('#nearby-interaction[data-interaction=vehicle-repair]').tap();await page.locator('[data-repair-hull="0"]').tap();await inspect('collect');await page.locator('[data-repair-confirm]').tap();if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.vehicle.hp===a.game.vehicle.maxHp))throw Error('取车失败');await page.locator('#vehicle-repair-close').tap();
  // 实际损耗再交车保养，确认价格明显低于报废服务。
  await page.evaluate(async()=>{(await import('/src/combat/vehicle.js')).absorbVehicleHit(a.game,a.game.vehicle.maxHp*.25);});
  await page.locator('#nearby-interaction[data-interaction=vehicle-repair]').tap();await page.locator('[data-repair-hull="0"]').tap();await inspect('maintenance-quote');await page.locator('[data-repair-confirm]').tap();if(!await page.evaluate(()=>a.game.progress.vehicleService[0].phase==='repairing'&&!a.game.vehicle.active))throw Error('保养交车失败');await page.locator('#vehicle-repair-close').tap();
  await page.waitForFunction(()=>a.game.progress.vehicleService[0].phase==='ready');
  // 真实按键绕行，保留前后侧连续录像；工坊底座应阻挡，门前与两侧可通行。
  await page.evaluate(()=>{Object.assign(a.game.player,{x:50,y:840,vx:0,vy:0});a.game.state='playing';a.renderer.camera.time=null;});await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowUp');await page.waitForTimeout(600);await page.keyboard.up('ArrowUp');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(500);await page.keyboard.up('ArrowLeft');await inspect('walk-around');
  // 复核不同视口的昼夜世界和正式页面，桌面保持原竖版舞台。
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]]){
   await page.setViewportSize({width,height});
   for(const phase of ['day','night']){
    await page.evaluate(async phase=>{const g=a.game;Object.assign(g.player,{x:115,y:850,vx:0,vy:0});g.enemies=[];Object.assign(g.spawnEnemy(0,0,{x:270,y:840}),{hp:1000000,maxHp:1000000,speed:0,damage:0});g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);Object.assign(a.environment,{time:phase,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},phase);
    await page.waitForTimeout(150);await inspect('world-'+width+'-'+phase);await page.locator('#nearby-interaction[data-interaction=vehicle-repair]').tap();await inspect('panel-'+width+'-'+phase);await page.locator('#vehicle-repair-close').tap();
   }
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors,before,workflow:true};
 }catch(e){await page.screenshot({path:out+'failure.png'});throw e;}finally{await context.close();}
}
