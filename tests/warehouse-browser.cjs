// 隔离手机会话验证仓库真实入口、滑条存取、车辆弹药去向与刷新持久化。
async original=>{
 const out='output/playwright/warehouse/',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'video/',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 // 检查实际弹窗与视口并保存原场景，不制作替代预览。
 async function shot(name){const bad=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('dialog[open]')].some(d=>{const r=d.getBoundingClientRect();return r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1;}));if(bad)throw Error('布局溢出 '+name);await page.screenshot({path:out+name+'.png'});checks.push(name);}
 // 只把角色放在真实入口；一秒等待和房间切换由游戏执行。
 async function door(kind){await page.evaluate(async kind=>{const g=a.game,l=(await import('/src/config/workshop-interiors.js')).interiorLayout({kind});Object.assign(g.player,l.door,{vx:0,vy:0});g.cottageDoorLatch=false;g.mainlineSpeech=null;a.renderer.camera.time=null;a.refresh();},kind);await page.waitForFunction(kind=>a.game.cottage?.kind===kind,kind);}
 // 正式出口计时离开房间，保留实际商店及小屋会话。
 async function exitRoom(){await page.evaluate(async()=>{const l=(await import('/src/config/workshop-interiors.js')).interiorLayout(a.game.cottage);Object.assign(a.game.player,l.exit,{vx:0,vy:0});});await page.waitForFunction(()=>!a.game.cottage);}
 try{
  await page.goto(original.url());await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.coins=10000;p.vehicleHulls[0]=1;p.vehicleIndex=0;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;p.logistics.bagWood=16;p.supplies.hand.heavy=8;p.farm.seeds[0]=12;p.supplies.vehicles[0].shell=10;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999;g.progress.living.patrolActive=false;g.parkingVisitors=[];g.enemies=[];const s=(await import('/src/config/warehouse.js')).WAREHOUSE;g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:s.x+55,y:s.y+90,hp:1,ammo:0,reload:0,wheel:0,track:0}];Object.assign(g.spawnEnemy(0,0,{x:s.x-75,y:s.y+100}),{hp:1e6,maxHp:1e6,speed:0,damage:0});Object.assign(a.environment,{autoWeather:false,weather:'sun',autoTime:false,time:'day',livingPreview:true});});
  for(const [width,height] of [[320,568],[390,844],[844,390],[900,1280]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const s=(await import('/src/config/warehouse.js')).WAREHOUSE;Object.assign(a.game.player,{x:s.x+25,y:s.y+(innerHeight<450?-135:innerHeight<600?-65:75),vx:0,vy:0});a.game.cottageDoorLatch='warehouse';Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(220);await shot('exterior-'+width+'-'+time);
  }
  await page.setViewportSize({width:390,height:844});await door('warehouse');await shot('inside-day');
  await page.evaluate(async()=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id==='night').start;});await page.waitForTimeout(100);await shot('inside-night');
  await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#warehouse-dialog[open]').waitFor();await shot('wood-stock');
  await page.locator('[data-item="material:wood"][data-direction=deposit]').tap();await page.locator('[data-amount="16"]').tap();await shot('wood-quantity');await page.locator('[data-confirm]').tap();
  if(!await page.evaluate(()=>a.game.progress.logistics.bagWood===0))throw Error('木材未入库');
  await page.locator('[data-category=ammo]').tap();await page.locator('[data-item="ammo:heavy"][data-direction=deposit]').tap();await page.locator('#warehouse-range').fill('5');await page.locator('[data-confirm]').tap();
  if(!await page.evaluate(()=>a.game.progress.supplies.hand.heavy===3&&a.game.progress.warehouse.ammo.heavy===5))throw Error('滑条存弹药失败');
  await page.locator('[data-category=seed]').tap();await page.locator('[data-item="seed:0"][data-direction=deposit]').tap();await page.locator('[data-amount="12"]').tap();await page.locator('[data-confirm]').tap();await shot('seed-stock');
  await page.locator('#warehouse-source').selectOption('0');await page.locator('[data-category=ammo]').tap();await page.locator('[data-item="ammo:shell"][data-direction=deposit]').tap();await page.locator('[data-amount="10"]').tap();await page.locator('[data-confirm]').tap();
  await page.locator('[data-item="ammo:shell"][data-direction=withdraw]').tap();await page.locator('#warehouse-range').fill('4');await page.locator('[data-confirm]').tap();await shot('vehicle-ammo');
  if(!await page.evaluate(()=>a.game.progress.supplies.vehicles[0].shell===4&&a.game.progress.supplies.hand.shell===0&&a.game.progress.warehouse.ammo.shell===6))throw Error('车载弹药去向错误');
  await page.locator('#warehouse-source').selectOption('bag');await page.locator('[data-item="ammo:heavy"][data-direction=withdraw]').tap();await page.locator('[data-cancel]').tap();
  for(const [width,height] of [[320,568],[844,390],[900,1280]]){await page.setViewportSize({width,height});await shot('panel-'+width);}
  await page.setViewportSize({width:390,height:844});await page.locator('[data-close]').tap();await page.waitForFunction(()=>a.game.state==='playing');await exitRoom();checks.push('one-second-exit');
  await page.reload();await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  if(!await page.evaluate(()=>a.game.progress.warehouse.ammo.heavy===5&&a.game.progress.warehouse.ammo.shell===6&&a.game.progress.warehouse.seeds[0]===12))throw Error('刷新丢失仓库');checks.push('reload-stock');
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }catch(e){await page.screenshot({path:out+'failure.png'});throw e;}finally{await context.close();}
}
