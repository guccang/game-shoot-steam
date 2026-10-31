// 分类页签验收：小屋显示已解锁/总品种，选种显示库存；覆盖购买、播种、领取与手机布局，默认4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 小屋按品种解锁计数，播种页按库存计数，同时核对触控和读屏语义。
 async function checkCounts(selector){
  const result=await page.evaluate(async selector=>{
   const {FARM_CROPS,FARM_CATEGORIES}=await import('/src/config/farm.js'),shop=selector==='#seed-shop-categories',f=a.game.progress.farm;
   return [...document.querySelectorAll(selector+' button')].map((n,i)=>{
    const indices=FARM_CROPS.flatMap((c,j)=>c.category===FARM_CATEGORIES[i].id?[j]:[]),expected=indices.reduce((sum,j)=>sum+(shop?Number(!!f.unlocked[j]):f.seeds[j]),0);
    const count=n.querySelector('.farm-category-count'),r=n.getBoundingClientRect(),b=count?.getBoundingClientRect();
    return {expected,text:count?.textContent??null,expectedText:shop?`${expected}/${indices.length}`:expected>0?String(Math.min(expected,99)):null,accessible:n.getAttribute('aria-label').includes(shop?'已解锁'+expected+'种':'库存'+expected+'粒种子'),fit:r.width>=44&&r.height>=44&&(!b||b.left>=r.left&&b.right<=r.right&&b.bottom<=r.bottom)};
   });
  },selector);
  if(result.length!==4||result.some(r=>r.text!==r.expectedText||!r.accessible||!r.fit))throw Error(JSON.stringify(result));return result;
 }
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(c=>c.id);p.restoration.cottageRested=true;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.mainline.currentId=null;p.coins=10000;p.farm.wildMaps=['forest'];p.farm.lessonRewarded=true;p.farm.seeds=p.farm.seeds.map((_,i)=>i+1);p.farm.unlocked.fill(true);const g=a.game;g.progress=p;g.reset();g.state='playing';g.update=()=>{};g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];Object.assign(g.player,{x:921,y:2855});a.renderer.camera.time=null;a.refresh();await(await import('/src/rendering/farm.js')).loadFarmArt();});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.evaluate(()=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();a.game.progress.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:v.x+v.w/2+id*56,y:v.y+(335-r.top)/v.zoom,crop:null,plantedAt:0,readyAt:0,watered:false}));a.game.progress.farm.nextId=2;a.refresh();});
  await page.locator('[data-farm-cell="0"]').tap();checks.push({initial:await checkCounts('#farm-picker .farm-categories')});await page.screenshot({path:'output/playwright/seed-category-counts/390-picker.png'});
  await page.locator('[data-farm-shop]').tap();await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/farm.js')).FARM_SEED_DOOR);a.refresh();});await page.locator('[data-seed-shop-category="grain"]').tap();await page.locator('[data-buy-seed="3"][data-count="1"]').tap();checks.push({purchased:await checkCounts('#seed-shop-categories')});if(!await page.evaluate(()=>a.game.progress.farm.seeds[3]===5))throw Error('购买未入库');await page.locator('#seed-shop-dialog .ui-panel__body').evaluate(n=>n.scrollTop=0);await page.screenshot({path:'output/playwright/seed-category-counts/390-shop.png'});await page.locator('#seed-shop-close').tap();
  await page.evaluate(async()=>{const g=a.game,p=g.progress.farm.plots[0];Object.assign(g.player,{x:p.x,y:p.y});const result=(await import('/src/core/farm.js')).farmAction(g,'plant',{plot:0,crop:3});if(!result.ok)throw Error(result.message);a.renderer.camera.time=null;a.refresh();});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('[data-farm-cell="1"]').tap();checks.push({planted:await checkCounts('#farm-picker .farm-categories')});if(!await page.evaluate(()=>a.game.progress.farm.seeds[3]===4))throw Error('播种未扣库存');
  await page.evaluate(async()=>{const g=a.game;g.progress.farm.delivery.parcels=[{id:1,crop:14,count:3,sender:0,arrivedAt:1}];Object.assign(g.player,(await import('/src/config/farm.js')).FARM_DELIVERY);const result=(await import('/src/core/farm-delivery.js')).claimFarmParcel(g,1);if(!result.ok)throw Error(result.message);Object.assign(g.player,{x:921,y:2855});a.renderer.camera.time=null;a.refresh();});checks.push({claimed:await checkCounts('#farm-picker .farm-categories')});if(!await page.evaluate(()=>a.game.progress.farm.seeds[14]===18))throw Error('快递未入库');
  // 视觉边界覆盖短屏夜间和横持，零数隐藏，合法最大库存总数显示99。
  for(const [width,height,phase] of [[320,568,'night'],[844,390,'day']]){
   await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game,{FARM_CROPS,FARM_STOCK_CAP}=await import('/src/config/farm.js');g.progress.farm.seeds=FARM_CROPS.map(c=>c.category==='grain'?0:FARM_STOCK_CAP);g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},phase);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.locator('[data-farm-category="fruit"]').tap();checks.push({width,picker:await checkCounts('#farm-picker .farm-categories')});await page.screenshot({path:`output/playwright/seed-category-counts/${width}-picker.png`});
   await page.locator('[data-farm-shop]').tap();checks.push({width,shop:await checkCounts('#seed-shop-categories')});await page.screenshot({path:`output/playwright/seed-category-counts/${width}-shop.png`});await page.locator('#seed-shop-close').tap();
   if(width===320){await page.evaluate(()=>{const p=a.game.progress.farm.plots[1];Object.assign(a.game.player,{x:p.x,y:p.y});a.renderer.camera.time=null;a.refresh();});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('[data-farm-cell="1"]').tap();}
  }
  // 真实获种解锁与库存耗尽独立；0解锁也必须显示0/N，不受库存显示上限影响。
  await page.locator('#seed-shop-menu').evaluate(n=>n.click());
  await page.evaluate(()=>{a.game.progress.farm.unlocked.fill(false);a.game.progress.farm.seeds.fill(0);a.refresh();});
  checks.push({noneUnlocked:await checkCounts('#seed-shop-categories')});
  await page.evaluate(async()=>{const {grantFarmSeeds}=await import('/src/progression/farm.js');for(const i of [3,5,1,2,11])grantFarmSeeds(a.game.progress.farm,i,1000);a.refresh();});
  const partial=await checkCounts('#seed-shop-categories');checks.push({partial});
  await page.evaluate(()=>{a.game.progress.farm.seeds.fill(0);a.refresh();});
  const empty=await checkCounts('#seed-shop-categories');if(JSON.stringify(empty.map(c=>c.text))!==JSON.stringify(partial.map(c=>c.text)))throw Error('库存耗尽使解锁数减少');checks.push({emptyStock:empty});
  for(const [width,height] of [[320,568],[390,844],[1280,960]])for(const phase of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},phase);
   await page.locator('[data-seed-shop-category="grain"]').tap();checks.push({width,phase,unlocks:await checkCounts('#seed-shop-categories')});
   await page.screenshot({path:`output/playwright/seed-category-counts/unlocks-${width}-${phase}.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
