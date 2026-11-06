// 实际浏览器中点草、喂牛并回栏；昼夜截图共用正式场景绘制器。
async original=>{
 const context=await original.context().browser().newContext({isMobile:true,hasTouch:true,viewport:{width:390,height:844}});
 const page=await context.newPage(),out='output/playwright/wild-pasture',errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   const g=a.game;g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999999;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const sites=(await import('/src/core/wild-pasture.js')).wildPastureObjects(g);window.ox=sites.find(s=>s.type==='wild-ox');window.grass=sites.find(s=>s.type==='sweet-grass');
   Object.assign(g.player,{x:ox.x-53,y:ox.y+47});a.renderer.camera.time=null;a.refresh();
  });
  const cow=page.locator('[data-meadow="wild-ox"]'),grass=page.locator('[data-meadow="sweet-grass"]');
  for(const [w,h,time] of [[390,844,'day'],[320,568,'night'],[1280,900,'day'],[1280,900,'night']]){
   await page.setViewportSize({width:w,height:h});
   await page.evaluate(async time=>{
    const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
    a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{time,autoTime:false,livingPreview:false,weather:'sun',autoWeather:false});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);
    a.renderer.camera.time=null;a.refresh();
   },time);
   await cow.waitFor({state:'visible'});await grass.waitFor({state:'visible'});await page.waitForTimeout(280);
   await page.screenshot({path:out+'/meadow-'+w+'-'+time+'.png'});
  }
  await page.setViewportSize({width:390,height:844});
  await cow.tap();await page.waitForFunction(()=>document.getElementById('farm-notice')?.textContent.includes('嗅了嗅'));
  await grass.tap();await page.waitForFunction(()=>a.game.progress.farm.forage===1);
  await cow.tap();await page.waitForFunction(()=>a.game.progress.farm.oxPlow&&a.game.progress.farm.forage===0);
  await page.evaluate(async()=>{const gate=(await import('/src/config/pasture.js')).PEN_GATE;Object.assign(a.game.player,gate);a.renderer.camera.time=null;a.refresh();});
  await page.locator('#farm-pasture-gate').tap();await page.locator('#production-dialog[open]').waitFor();
  if(!(await page.locator('#production-body').innerText()).includes('已领养'))throw Error('牧栏未登记耕牛');
  await page.locator('[data-production-close]').last().tap();
  await page.locator('#farm-ox-hit').tap();await page.waitForFunction(()=>a.game.farmWork?.tool==='ox');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await context.close();}
}
