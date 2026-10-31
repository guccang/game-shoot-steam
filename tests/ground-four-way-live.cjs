// 正式主循环中移动，并检查角色、载具、怪物、地形和HUD昼夜同屏；不替换绘制器。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:440,height:793},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=['cottage','neighbors','weapon','vehicle'];p.living.calendar.day=1;
   a.game.progress=p;a.game.reset();a.game.state='playing';a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;
   Object.assign(a.game.player,{x:400,y:280,invincible:1e6});a.game.vehicle.active=true;
   a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();
  });
  const start=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,misses:a.renderer.ground.syncMisses}));
  await page.keyboard.down('KeyD');await page.waitForTimeout(1200);await page.keyboard.up('KeyD');
  const end=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,misses:a.renderer.ground.syncMisses}));
  if(Math.hypot(end.x-start.x,end.y-start.y)<30)throw Error('实际移动未生效');
  await page.evaluate(()=>{const g=a.game;const e=g.spawnEnemy(0,0,{x:g.player.x+100,y:g.player.y-65},{ambient:true});Object.assign(e,{hp:1e6,maxHp:1e6,damage:0,speed:0});});
  const frames=[];
  for(const size of [{width:440,height:793},{width:1280,height:900}]){
   await page.setViewportSize(size);
   for(const phase of ['day','night']){
    await page.evaluate(async phase=>{
     const {LIVING_PHASES}=await import('/src/config/living-world.js');const {projectLivingCalendar}=await import('/src/world/living-calendar.js');
     a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;
     projectLivingCalendar(a.environment,a.game.progress.living.calendar,Date.now());
     a.renderer.light.set(a.environment,performance.now());for(const key in a.renderer.light.started)a.renderer.light.started[key]=performance.now()-20000;
     a.renderer.draw();a.refresh();
    },phase);
    await page.waitForTimeout(500);await page.screenshot({path:`output/playwright/ground-four-way/world-${size.width}-${phase}.png`});
    frames.push(await page.evaluate(()=>({time:a.environment.time,light:a.renderer.light.sample(performance.now()).night,vehicle:a.game.vehicle.active,enemies:a.game.enemies.length,ground:a.renderer.ground.stats().count})));
   }
  }
  if(errors.length)throw Error(errors.join('\n'));return {start,end,frames,errors};
 }finally{await context.close();}
}
