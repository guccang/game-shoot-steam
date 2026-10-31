// 真机浏览器检查正式领主援兵调度、接敌、手机昼夜画面和胜利撤离。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.restoration.repaired.push('clearing');
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.attackTimer=999;g.player.invincible=999;g.update=()=>{};
   Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);
   const accepted=(await import('/src/core/clearing-guide.js')).acceptClearingPost(g);if(!accepted.ok)throw Error(accepted.message);
   Object.assign(g.player,(await import('/src/progression/clearing-site.js')).clearingSite(g.progress));
   g.wave=5;g.bossReady=true;g.bossWave=5;g.waveKills=g.waveSpawned=(await import('/src/config/waves.js')).waveDifficulty(5).total;g.waveRest=0;if(!g.summonBoss())throw Error('无法召唤领主');
   Object.assign(g.boss,{x:g.player.x+70,y:g.player.y+50});window.before=[g.wave,g.waveKills,g.waveSpawned];
   window.support=(await import('/src/core/boss-reinforcements.js')).updateBossSupport;
   for(let i=0;i<41;i++)support(g,.05);a.renderer.camera.time=null;a.refresh();
  });
  await page.screenshot({path:'output/playwright/boss-dumplings/warning.png'});
  const arrival=await page.evaluate(async()=>{
   const g=a.game;for(let i=0;i<65;i++)support(g,.05);
   const adds=g.enemies.filter(e=>e.bossOwner===g.boss.id),{worldDistance}=await import('/src/world/coordinates.js'),{terrainLineClear}=await import('/src/physics/terrain-navigation.js');
   if(adds.length!==2)throw Error('首批数量错误');
   for(const e of adds)if(e.rank||e.flying||e.species||worldDistance(e,g.player)<220||worldDistance(e,g.player)>320||!terrainLineClear(g.player,e,14))throw Error('援兵类型或落点错误');
   const start=adds.map(e=>worldDistance(e,g.player)),{updateEnemies}=await import('/src/core/enemy-manager.js');
   for(let i=0;i<60;i++){g.time+=.05;updateEnemies(g,.05,{...g.player});}
   const end=adds.map(e=>worldDistance(e,g.player));if(end.some((d,i)=>d>=start[i]-20))throw Error('援兵没有接近玩家');
   if(JSON.stringify(before)!==JSON.stringify([g.wave,g.waveKills,g.waveSpawned]))throw Error('推进了波次');
   a.refresh();return {start,end,count:adds.length};
  });
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{
    const e=a.environment;Object.assign(e,{time,livingPreview:false,autoTime:false,autoWeather:false,weather:'sun'});a.game.progress.living.calendar.elapsed=time==='night'?250000:75000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(e,a.game.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.refresh();
   },time);await page.waitForTimeout(180);
   await page.screenshot({path:`output/playwright/boss-dumplings/${width}-${time}.png`});samples.push({width,time});
  }
  await page.evaluate(()=>{const g=a.game;g.hit(g.boss,1e9);if(g.enemies.some(e=>e.bossOwner))throw Error('胜利未撤离');a.refresh();});
  if(errors.length)throw Error(errors.join('\n'));return {arrival,samples,cleanup:true,errors};
 }finally{await context.close();}
}
