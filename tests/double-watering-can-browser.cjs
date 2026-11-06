// 在手机农具页直接改造水壶，再到田间验证一次浇湿两块田。
async original=>{
 const browser=original.context().browser(),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
 const out='output/playwright/double-watering-can';
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const {freshRangerProgress}=await import('/src/progression/progress.js'),p=freshRangerProgress();
   p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.mining.ore=4;
   const g=a.game;g.progress=p;g.reset();g.start();g.fireClock=999999;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const now=Date.now();g.progress.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:1537+56*id,y:464,crop:0,watered:false,plantedAt:now,readyAt:now+60000}));g.progress.farm.nextId=2;
   Object.assign(g.player,{x:1537,y:526});a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#field-menu-toggle').tap();await page.locator('#production-menu').tap();await page.locator('[data-production-tab="tools"]').tap();
  if(await page.getByRole('heading',{name:'两格试验田'}).count())throw Error('农具页仍显示试验田');
  if(!await page.locator('[data-can-upgrade]').isVisible())throw Error('缺少水壶改造入口');
  await page.screenshot({path:out+'/tools-390.png'});
  await page.setViewportSize({width:320,height:568});await page.locator('[data-can-upgrade]').tap();
  if(await page.evaluate(()=>a.game.progress.mining.ore!==4||a.game.progress.farm.doubleCan))throw Error('加购时提前改造了水壶');
  await page.locator('#production-dialog > .shop-dropzone').tap();await page.locator('#shop-checkout [data-pay]').tap();
  await page.waitForFunction(()=>a.game.progress.farm.doubleCan&&a.game.progress.mining.ore===0);
  await page.locator('[data-production-close]').last().tap();
  await page.evaluate(()=>a.farm.open());await page.locator('#farm-water').tap();await page.locator('[data-farm-cell="0"]').tap();
  await page.waitForFunction(()=>a.game.progress.farm.plots.slice(0,2).every(p=>p.watered));
  for(const [width,height,time] of [[320,568,'night'],[390,844,'day'],[1280,900,'day'],[1280,900,'night']]){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    Object.assign(a.environment,{time,autoTime:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   },time);await page.waitForTimeout(200);await page.screenshot({path:out+'/farm-'+width+'-'+time+'.png'});
  }
 }finally{await context.close();}
}
