// 在正式天气面板选择降雨并独立开关阵风，跳过静歇时间以采样同一幕的风峰。
async original=>{
 const context=await original.context().browser().newContext({isMobile:true,hasTouch:true,viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[],out='output/playwright/gust-overlay/';
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999999;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   Object.assign(g.player,{x:700,y:2752});g.vehicle.active=false;
   g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:780,y:2812,hp:1,ammo:0}];
   const e=g.spawnEnemy(0,0,{x:620,y:2782});Object.assign(e,{hp:9999,maxHp:9999,speed:0,damage:0});a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#settings-button').tap();await page.locator('#environment-button').tap();
  await page.locator('button[data-weather="rain"]').tap();
  const toggle=page.locator('#random-gusts');await toggle.uncheck();await toggle.check();
  if(!await page.evaluate(()=>a.environment.randomGusts&&a.environment.weather==='rain'))throw Error('阵风开关覆盖了降雨');
  await page.locator('#environment-ok').tap();await page.locator('#settings-done').tap();
  for(const [width,height,time,weather] of [[390,844,'day','rain'],[320,568,'night','snow'],[950,844,'night','thunder']]){
   await page.setViewportSize({width,height});await page.evaluate(async({time,weather})=>{
    const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
    a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{time,weather,autoWeather:false});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);
    const c=a.renderer.gusts;c.sample(a.game.time,a.game.player.x,true);a.game.time=c.nextAt+.1;
    a.renderer.camera.time=null;a.refresh();
   },{time,weather});
   await page.waitForFunction(()=>a.renderer.gusts.wave);
   await page.evaluate(()=>{const w=a.renderer.gusts.wave;a.game.time=w.start+w.duration/2+.5;});
   await page.waitForTimeout(100);await page.screenshot({path:out+weather+'-wind.png'});
   if(!await page.evaluate(async weather=>{
    const g=a.game,s=a.renderer.light.sample(performance.now()),w=a.renderer.gusts.wave;
    const intensity=(await import('/src/world/gust.js')).gustStrength(g.time,g.player.x,w);
    return a.environment.weather===weather&&intensity>.3&&(weather==='snow'?s.snow:s.rain)===1;
   },weather))throw Error(weather+'的降水与阵风未同时出现');
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>a.renderer.gusts.wave===null);
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await context.close();}
}
