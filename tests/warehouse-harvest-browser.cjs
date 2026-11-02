// 实机检查点只准备库存与成熟田；靠近、收割、满载确认和仓库查看均走真实界面。
async original=>{
 const out='output/playwright/warehouse-harvest/',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'video',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 // 每个场景保留正式更新函数，仅设置测试前提，禁止在断言前直接写金币或收获结果。
 async function setup(kind='warehouse',time='day'){
  await page.evaluate(async({kind,time})=>{
   const p=(await import('/src/progression/progress.js')).freshProgress(),g=a.game,w=(await import('/src/config/warehouse.js')).WAREHOUSE;
   p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.farm.wildMaps=['forest','jiuzhaigou'];p.vehicleHulls.fill(0);p.vehicleIndex=0;p.coins=100;p.wood=0;p.farm.lessonRewarded=true;
   if(kind==='warehouse'){p.vehicleHulls[0]=p.vehicleHulls[1]=1;p.farm.inventory[0]=3;p.farm.inventory[1]=2;p.logistics.builds[0].cargo[3]=4;p.logistics.builds[1].cargo[0]=7;p.farm.seeds[0]=8;p.logistics.bagWood=5;}
   else{p.vehicleHulls[0]=kind==='cargo'?1:0;p.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:893+id*56,y:2752,crop:0,plantedAt:1,readyAt:2,watered:false}));p.farm.nextId=2;}
   g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.boss=null;g.parkingVisitors=[];g.spawnTimer=g.mainlineTalkDelay=g.fireClock=g.attackTimer=g.parkingVisitTimer=99999;g.progress.living.patrolActive=false;
   if(kind==='warehouse'){Object.assign(g.player,{x:w.x+190,y:w.y+80});g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:w.x-85,y:w.y+80,hp:1,ammo:0},{hull:1,spot:null,mapId:'forest',x:w.x+550,y:w.y+80,hp:1,ammo:0}];}
   else{
    Object.assign(g.player,{x:893,y:2814});g.trees=g.trees.filter(t=>Math.hypot(t.x-921,t.y-2752)>180);g.progress.campParking.owned=kind==='cargo'?[{hull:0,spot:null,mapId:'forest',x:1005,y:2844,hp:1,ammo:0}]:[];g.vehicleBoardingBlocked={hull:0,mapId:'forest'};
    const {catLoad,vehicleLoad}=await import('/src/progression/load-weight.js'),load=kind==='cargo'?vehicleLoad(g,0,{driver:true}):catLoad(g),remaining=load.capacity-(load.payload??load.weight)-.25;
    if(kind==='cargo'){const mass=(await import('/src/config/items.js')).itemDefinition('material:wood').mass,n=Math.floor(remaining/mass);g.progress.logistics.builds[0].wood=n;g.progress.supplies.vehicles[0].light+=Math.ceil((remaining-n*mass)/(await import('/src/config/supplies.js')).AMMO_TYPES.light.mass);}else if(kind==='bag')g.progress.supplies.hand.light+=Math.ceil(remaining/(await import('/src/config/supplies.js')).AMMO_TYPES.light.mass);
   }
   Object.assign(a.environment,{autoTime:false,time,autoWeather:false,weather:'sun',livingPreview:true});g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start;
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.refresh();
  },{kind,time});await page.waitForTimeout(150);
 }
 // 图像来自正式渲染器；手机底板与格子始终处于可滚动的既有竖版容器。
 async function shot(name){if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('dialog[open]')].some(n=>{const r=n.getBoundingClientRect();return r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5;})))throw Error('布局溢出 '+name);await page.screenshot({path:out+name+'.png'});}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  for(const [width,height,time] of [[390,844,'day'],[390,844,'night'],[320,568,'day'],[320,568,'night'],[844,390,'day']]){
   await page.setViewportSize({width,height});await setup('warehouse',time);if(await page.evaluate(()=>a.game.progress.coins)!==100)throw Error('远处提前结算');
   await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>{const g=a.game;if(g.drops.some(d=>d.warehouseHarvest&&d.age>=.2)){window.savedUpdate=g.update;g.update=()=>{};return true;}return false;});await page.keyboard.up('ArrowLeft');
   const receipt=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWarehouseHarvest(a.game,document));if(receipt.coins!==1190||receipt.bag.some(Boolean)||receipt.cargo[0][3]!==0||receipt.cargo[1][0]!==7||receipt.batches.length!==3||!receipt.icons)throw Error('结算错误 '+JSON.stringify(receipt));
   if(await page.locator('#nearby-interaction').isVisible())throw Error('附近按钮挡住作物飞行');await shot('fly-'+width+'-'+time);
   await page.evaluate(()=>{a.game.update=savedUpdate;});await page.waitForFunction(()=>!a.game.drops.some(d=>d.warehouseHarvest));
   await page.locator('#nearby-interaction[data-interaction=warehouse]').tap();await page.locator('[data-category=currency]').tap();await page.locator('[data-warehouse-currency]').tap();await shot('coins-'+width+'-'+time);
   if(await page.locator('[data-warehouse-currency] .warehouse-slot__count').innerText()!=='1190')throw Error('金币格非真实余额');if(await page.locator('#warehouse-quantity').isVisible())throw Error('金币被作为另一份库存取出');await page.locator('#warehouse-dialog [data-close]').tap();checks.push('入库和金币 '+width+' '+time);
  }
  // 货舱和背包均在达到上限前弹窗，取消保留；确认只提交本次一份，不发收获金币。
  for(const [kind,width,height,time] of [['cargo',390,844,'day'],['bag',320,568,'night']]){
   await page.setViewportSize({width,height});await setup(kind,time);await page.locator('[data-farm-cell="0"]').tap();await page.locator('#farm-harvest-confirm[open]').waitFor();await shot('harvest-limit-'+kind);
   if(!await page.evaluate(()=>a.game.progress.farm.plots[0].crop===0&&a.game.progress.farm.harvested===0))throw Error('确认前已割掉作物');await page.locator('#farm-harvest-cancel').tap();await page.waitForFunction(()=>a.game.state==='playing');
   if(!await page.evaluate(()=>a.game.progress.farm.plots[0].crop===0&&!a.game.farmWork.job))throw Error('取消没有保留田块');
   await page.locator('[data-farm-cell="0"]').tap();await page.locator('#farm-harvest-confirm[open]').waitFor();await page.locator('[data-harvest-continue]').tap();await page.waitForFunction(()=>a.game.progress.farm.harvested===1);
   const state=await page.evaluate(()=>({bag:a.game.progress.farm.inventory[0],car:a.game.progress.logistics.builds[0].cargo[0],coins:a.game.progress.coins,second:a.game.progress.farm.plots[1].crop}));if(state.bag!==(kind==='bag'?1:0)||state.car!==(kind==='cargo'?1:0)||state.coins!==100||state.second!==0)throw Error('收获去向错误 '+JSON.stringify(state));await shot('harvest-kept-'+kind);checks.push('满载取消和确认 '+kind);
  }
  // 普通无车收获无需确认，保存重载保留物品且不重复发奖。
  await page.setViewportSize({width:390,height:844});await setup('foot','day');await page.locator('[data-farm-cell="0"]').tap();await page.waitForFunction(()=>a.game.progress.farm.harvested===1);if(await page.locator('#farm-harvest-confirm').isVisible())throw Error('低负重误提示');await page.evaluate(()=>a.save());await page.reload();await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});if(!await page.evaluate(()=>a.game.progress.farm.inventory[0]===1&&a.game.progress.coins===100&&a.game.progress.farm.plots[0].crop===null))throw Error('读档重复或丢失收获');checks.push('无车收获和读档');
  if(errors.length)throw Error(errors.join('\n'));return {ok:true,checks,errors};
 }catch(e){await page.screenshot({path:out+'failure.png'});throw e;}finally{await context.close();}
}
