// 手机实机验收：真实柜台购买分流、满载确认、离店自动换弹及刷新后库存守恒。
async original=>{
 const out='output/playwright/cat-ammo-storage/',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 // 数量与重量都读取正式进度，屏幕文字不能代替实际交易结果。
 async function stock(){return page.evaluate(async()=>{const g=a.game;return {coins:g.progress.coins,wood:g.progress.wood,hand:g.progress.supplies.hand.light,car:g.progress.supplies.vehicles[1].light,load:(await import('/src/progression/inventory/load-weight.js')).catLoad(g)};});}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.coins=p.wood=10000;p.materials.parts=100;p.vehicleHulls.fill(0);p.vehicleHulls[1]=1;p.vehicleIndex=1;p.weapon=0;p.weapons[0]=1;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999;g.enemies=[];g.progress.living.patrolActive=false;
   const room=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.ammo;
   g.progress.campParking.owned=[{hull:1,spot:null,mapId:'forest',x:room.door.x+1000,y:room.door.y+1000,hp:1,ammo:0,reload:0,wheel:0,track:0}];Object.assign(g.player,room.door,{vx:0,vy:0});g.cottageDoorLatch=false;a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForFunction(()=>a.game.cottage?.kind==='ammo');await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#field-equipment-dialog[open]').waitFor();
  await page.evaluate(async()=>{const g=a.game,{catLoad}=await import('/src/progression/inventory/load-weight.js'),load=catLoad(g);g.progress.supplies.hand.light+=Math.floor((load.capacity-load.weight-.1)/(await import('/src/config/supplies.js')).AMMO_TYPES.light.mass);});
  await page.locator('[data-supply-target=hand]').tap();const before=await stock();
  await page.locator('[data-ammo-buy=light]').tap();const bought=await stock();
  if(bought.hand<=before.hand||bought.hand>=before.hand+300||bought.hand+bought.car!==before.hand+before.car+300||bought.coins!==before.coins-30||bought.load.overloaded||await page.locator('#supply-load-confirm').isVisible())throw Error('购买未正确分流 '+JSON.stringify({before,bought}));
  if(!(await page.locator('#field-equipment-message').textContent()).includes('当前载具仓库'))throw Error('购买结果没有说明去向');
  await page.locator('[data-ammo-craft=light]').tap();const crafted=await stock();if(crafted.hand!==bought.hand||crafted.car!==bought.car+300||crafted.wood!==bought.wood-2)throw Error('制作分流错误');
  await page.locator('[data-ammo-bulk=light][data-batches="20"]').tap();const bulk=await stock();if(bulk.hand!==crafted.hand||bulk.car!==crafted.car+6000||bulk.coins!==crafted.coins-600)throw Error('批量分流错误');
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
   await page.locator('[data-supply-target=hand]').tap();
   const layout=await page.evaluate(async()=>await(await import('/src/rendering/visual-review.js')).inspectAmmoPurchaseStorage(a.game,document));
   if(layout.overflow||layout.bodyOverflow||layout.badDialog||layout.smallButtons)throw Error('手机布局异常 '+JSON.stringify(layout));
   if(!await page.locator('.ammo-equipped').isVisible()||!(await page.locator('#field-equipment-body').textContent()).includes('自动从当前载具仓库'))throw Error('弹药说明未正确渲染');
   await page.screenshot({path:out+width+'-'+time+'.png'});await page.locator('[data-ammo-buy=light]').scrollIntoViewIfNeeded();await page.screenshot({path:out+width+'-'+time+'-stock.png'});checks.push({width,height,time});
  }
  // 车辆也满载时仍需确认，取消不能扣费；确认明确展示背包和货舱的拆分。
  await page.evaluate(()=>{a.game.progress.logistics.builds[1].wood=10000;});const beforeCancel=await stock();await page.locator('[data-ammo-buy=light]').tap();await page.locator('#supply-load-confirm[open]').waitFor();
  const destination=await page.locator('[data-load-destination]').textContent();if(!destination.includes('背包 0 发')||!destination.includes('货舱 300 发'))throw Error('确认页分流发数错误 '+destination);
  await page.screenshot({path:out+'vehicle-full.png'});await page.locator('#supply-load-cancel').tap();if(JSON.stringify(await stock())!==JSON.stringify(beforeCancel))throw Error('取消购买仍扣款');
  await page.evaluate(()=>{a.game.progress.logistics.builds[1].wood=0;});await page.locator('#field-equipment-close').tap();
  await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).interiorLayout(a.game.cottage).exit,{vx:0,vy:0});});await page.waitForFunction(()=>!a.game.cottage);
  // 保持正式Game.update推进：背包三发用完后从远处车辆取九发，形成十二发弹匣。
  await page.evaluate(()=>{const g=a.game;g.progress.supplies.hand.light=3;g.progress.supplies.vehicles[1].light=20;g.magazines[0]={ammo:0,remaining:g.weapon().reloadTime};g.enemies=[];g.trees=[];g.boss=null;g.mainlineSpeech=null;g.spawnTimer=g.fireClock=999;Object.assign(g.player,{x:900,y:700});a.renderer.camera.time=null;a.refresh();});
  await page.waitForFunction(()=>a.game.magazines[0].ammo===12);
  const loaded=await stock();if(loaded.hand!==0||loaded.car!==11||loaded.load.overloaded)throw Error('正式换弹未从车辆取用 '+JSON.stringify(loaded));
  await page.screenshot({path:out+'automatic-reload.png'});await page.evaluate(()=>a.save());await page.reload();await page.locator('#start').tap();
  const restored=await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;return {hand:g.progress.supplies.hand.light,car:g.progress.supplies.vehicles[1].light,mag:g.magazines[0].ammo};});
  if(restored.hand!==0||restored.car!==11||restored.mag!==12)throw Error('刷新后库存改变 '+JSON.stringify(restored));
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'purchase-load-confirm',before,bought,crafted,bulk,checks,loaded,restored,errors};
 }catch(e){await page.screenshot({path:out+'failure.png'});const state=await page.evaluate(()=>({state:a.game.state,weapon:a.game.loadout.weapon,mag:a.game.magazines[0],hand:a.game.progress.supplies.hand.light,car:a.game.progress.supplies.vehicles[1].light,cottage:a.game.cottage?.kind}));throw Error(e.message+' '+JSON.stringify(state));}finally{await context.close();}
}
