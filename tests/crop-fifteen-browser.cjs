// 藜麦、芦笋、水仙的手机分类、价格排序、实际购买播种与昼夜同屏验收。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   let p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.mainline.currentId=null;p.coins=100000;p.farm.wildMaps=['forest'];p.farm.lessonRewarded=true;
   p=(await import('/src/progression/debug-grants.js')).debugGrantProgress(p,'seed-purchases');p.farm.seeds.fill(3);const g=a.game;g.progress=p;g.reset();g.state='playing';g.update=()=>{};g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.vehicle.active=false;
   Object.assign(g.player,{x:921,y:2855});a.renderer.camera.time=null;a.refresh();await(await import('/src/rendering/farm.js')).loadFarmArt();
  });
  for(const [width,height,phase] of [[390,844,'day'],[320,568,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async phase=>{const g=a.game;g.vehicle.active=false;g.enemies=[];Object.assign(g.player,{x:921,y:2855});a.renderer.camera.time=null;Object.assign(a.environment,{time:phase,livingPreview:true,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},phase);
   await page.waitForTimeout(350);
   await page.evaluate(()=>{const v=a.renderer.view;a.game.progress.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:v.x+v.w/2+id*56,y:v.y+v.h*.55,crop:null,plantedAt:0,readyAt:0,watered:false}));a.game.progress.farm.nextId=2;a.farm.open();});
   for(const [category,index] of [['grain',57],['vegetable',58],['ornamental',59]]){
    await page.evaluate(()=>a.farm.open());await page.locator('[data-farm-cell="0"]').press('Enter');await page.locator(`[data-farm-category="${category}"]`).tap();const ids=[];
    while(true){ids.push(...await page.locator('[data-farm-seed]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.farmSeed))));if(await page.locator('[data-farm-page="1"]').isDisabled())break;await page.locator('[data-farm-page="1"]').tap();}
    const ordered=await page.evaluate(async ids=>{const {FARM_CROPS}=await import('/src/config/farm.js');return ids.every((id,i)=>!i||FARM_CROPS[ids[i-1]].cost<=FARM_CROPS[id].cost);},ids);
    if(ids.length!==15||!ids.includes(index)||!ordered)throw Error('分类数量或排序错误：'+category);
    await page.locator(`[data-farm-category="${category}"]`).tap();while(!await page.locator(`[data-farm-seed="${index}"]`).count())await page.locator('[data-farm-page="1"]').tap();
    await page.screenshot({path:`output/playwright/crop-fifteen/${width}-${category}.png`});await page.locator(`[data-farm-seed="${index}"]`).tap();await page.locator('[data-farm-cell="1"]').tap();
    if(!await page.evaluate(index=>a.game.farmWork.queue.some(j=>j.crop===index),index))throw Error('新作物播种索引错误');checks.push({width,index,count:ids.length,ordered,plant:true});
   }
   await page.evaluate(()=>a.farm.open());await page.locator('[data-farm-cell="0"]').press('Enter');await page.locator('[data-farm-shop]').tap();
   await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/farm.js')).FARM_SEED_DOOR);a.refresh();});
   for(const [category,index] of [['grain',57],['vegetable',58],['ornamental',59]]){
    await page.locator(`[data-seed-shop-category="${category}"]`).tap();if(await page.locator('.seed-shop-good').count()!==15)throw Error('商店分类未达到15种');
    const before=await page.evaluate(index=>({coins:a.game.progress.coins,seeds:a.game.progress.farm.seeds[index]}),index);await page.locator(`[data-buy-seed="${index}"][data-count="1"]`).tap();
    const valid=await page.evaluate(async({index,before})=>{const {FARM_CROPS}=await import('/src/config/farm.js');return a.game.progress.coins===before.coins-FARM_CROPS[index].cost&&a.game.progress.farm.seeds[index]===before.seeds+1;},{index,before});if(!valid)throw Error('新种子购买错误');checks.push({width,index,bought:true});
   }
   await page.screenshot({path:`output/playwright/crop-fifteen/${width}-shop.png`});await page.locator('#seed-shop-close').tap();await page.waitForFunction(()=>!document.querySelector('#toast')?.classList.contains('visible'));
   // 各阶段与原作物、角色、载具、怪物共用正式投影和深度排序。
   await page.evaluate(async()=>{const g=a.game,now=Date.now();Object.assign(g.player,{x:921,y:2855});g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicle=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),0);g.vehicles[0]=g.vehicle;g.vehicle.active=true;g.enemies=[];for(const dx of [-130,130]){const e=g.spawnEnemy(0,0,{x:921+dx,y:2980});Object.assign(e,{hp:500,maxHp:500,speed:0,damage:0});}g.progress.farm.plots=Array.from({length:12},(_,id)=>{const stage=Math.floor(id/3),age=[5000,90000,110000,110000][stage];return {id,mapId:'forest',x:846+id%3*75,y:2670+stage*85,crop:id<9?57+id%3:[8,10,15][id%3],plantedAt:now-age,readyAt:now-age+100000,watered:true};});a.renderer.camera.time=null;a.refresh();});
   await page.waitForTimeout(250);await page.screenshot({path:`output/playwright/crop-fifteen/${width}-world.png`});
  }
  await page.setViewportSize({width:600,height:430});
  const budget=await page.evaluate(async()=>{const {drawFarmCrop,farmArtBudget}=await import('/src/rendering/farm.js'),{FARM_CROPS}=await import('/src/config/farm.js');const n=document.createElement('canvas');n.id='crop-review';n.width=600;n.height=430;n.style.cssText='position:fixed;inset:0;z-index:1000;width:600px;height:430px';document.body.append(n);const c=n.getContext('2d');c.fillStyle='#f6edce';c.fillRect(0,0,600,430);for(let i=0;i<3;i++){c.font='16px sans-serif';c.fillStyle='#34543b';c.fillText(FARM_CROPS[57+i].name,i*200+65,28);for(let stage=0;stage<3;stage++)drawFarmCrop(c,{x:i*200+100,y:120+stage*130,plot:{id:i,crop:57+i,plantedAt:0,readyAt:100000}},0,true,[5000,90000,110000][stage]);}return farmArtBudget();});
  await page.locator('#crop-review').screenshot({path:'output/playwright/crop-fifteen/stages.png'});if(errors.length||budget.sheets!==4||budget.pixels!==4591968)throw Error(JSON.stringify({errors,budget}));return {checks,errors,budget};
 }finally{await context.close();}
}
