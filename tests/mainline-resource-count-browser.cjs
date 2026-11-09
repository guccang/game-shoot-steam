// 手机实测资源任务：车载收成、待入库木材和仓库存种子均显示真实进度。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});await page.waitForFunction(()=>a.menu.page==='game');
  for(const [id,width,height,time] of [['upgrade-harvest',390,844,'day'],['buy-shotgun',320,568,'night'],['neighbor-seed-shop',390,844,'day']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async({id,time})=>{
    const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS,MAINLINE_TASKS}=await import('/src/config/mainline.js'),{mainlineConditionCost}=await import('/src/progression/story/mainline-cost.js'),{FARM_CROPS}=await import('/src/config/farm.js');
    const p=freshProgress();p.mainline.currentId=id;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.coins=p.wood=0;p.vehicleHulls[0]=1;p.vehicleIndex=0;
    (await import('/src/progression/story/mainline-gardening.js')).beginGardeningLesson(p);
    if(id==='upgrade-harvest'){const cost=(await import('/src/core/farming/harvest-guide.js')).harvestBudget(p,MAINLINE_TASKS.find(t=>t.id===id)).cost;p.mainline.gardening.harvested=1;p.logistics.builds[0].cargo[0]=Math.ceil(cost/FARM_CROPS[0].value);}
    if(id==='buy-shotgun'){const cost=mainlineConditionCost(p,MAINLINE_TASKS.find(t=>t.id===id).goal);p.coins=cost.coins;p.materials={parts:999,crystal:999,core:999};p.logistics.bagWood=Math.floor(cost.wood/2);p.logistics.builds[0].wood=cost.wood-p.logistics.bagWood;}
    if(id==='neighbor-seed-shop'){p.mainline.gardening.purchased=2;p.warehouse.seeds[0]=2;}
    const g=a.game;g.update=()=>{};g.progress=p;g.reset();g.start();g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.vehicle.active=false;Object.assign(g.player,{x:2600,y:1800});
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   },{id,time});
   const hud=page.locator('#mainline-hud');await hud.waitFor({state:'visible'});const text=await hud.textContent();
   if(/还差|缺资源|不足/.test(text))throw Error('已够资源仍报不足 '+id+' '+text);
   if(id==='upgrade-harvest'&&!text.includes('收成已够'))throw Error('未识别车载收成 '+text);
   if(id==='buy-shotgun'&&!text.includes('已采齐'))throw Error('未识别木材 '+text);
   if(id==='neighbor-seed-shop'&&!text.includes('种子已收集齐'))throw Error('未识别仓库存种子 '+text);
   await page.screenshot({path:`output/playwright/mainline-resource-count/${id}-${width}-${time}.png`});
   await hud.click();await page.locator('#mainline-dialog').waitFor({state:'visible'});const book=await page.locator('#mainline-current').textContent();
   if(id==='neighbor-seed-shop'&&(!book.includes('2/2')||!book.includes('从小屋仓库取出')))throw Error('种子任务详情不一致 '+book);
   await page.locator('#mainline-close').click();
   if(id==='upgrade-harvest'){
    const result=await page.evaluate(async()=>{const g=a.game,{WAREHOUSE}=await import('/src/config/warehouse.js');Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+60});(await import('/src/core/inventory/warehouse-harvest.js')).updateWarehouseHarvest(g,.1);(await import('/src/core/story/mainline-manager.js')).updateMainline(g,0);a.refresh();return {id:g.progress.mainline.currentId,coins:g.progress.coins,cargo:g.progress.logistics.builds[0].cargo[0]};});
    if(result.id!=='pistol-upgrade'||result.coins<=0||result.cargo!==0)throw Error('结算未接续升级 '+JSON.stringify(result));
   }
   checks.push({id,width,time,text,book});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
