// 从青芽接取到营地清空再交付，检查正式任务栏、路线、落点与库存事务。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_SITES}=await import('/src/config/mainline.js');
   const p=freshProgress();p.mainline.completed=['first-map'];p.mainline.currentId='neighbor-seeds';p.mainline.phase='meet';p.coins=100;p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.wildScatterVersion=1;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=0;g.enemies=[];g.update=()=>{};Object.assign(g.player,MAINLINE_SITES.camp);
   (await import('/src/core/mainline-manager.js')).updateMainline(g,0);a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#mainline-speech-skip').waitFor({state:'visible'});await page.locator('#mainline-speech-skip').tap();
  const route=await page.evaluate(async()=>{
   const g=a.game,{worldNavigationObjective}=await import('/src/core/world-navigation.js'),{mainlineObjective}=await import('/src/core/mainline-manager.js'),{storyGuidanceState}=await import('/src/rendering/story-guidance.js'),{storyRouteState}=await import('/src/core/story-route.js');
   const o=mainlineObjective(g),nav=worldNavigationObjective(g),target=storyGuidanceState(g).target;let route;
   for(let i=0;i<1800;i++){g.time+=.025;route=storyRouteState(g);if(route?.reachable)break;}
   return {objective:o.key,nav:nav.key,target,site:o.site,reachable:route?.reachable,route:route?.site,repaired:g.progress.restoration.repaired,patrol:g.progress.living.patrolActive};
  });
  if(route.objective!=='seedCamp'||route.nav!=='seedCamp'||route.route!=='seedCamp'||!route.reachable||JSON.stringify(route.target)!==JSON.stringify(route.site)||route.repaired.length||route.patrol)throw Error('任务导航不一致 '+JSON.stringify(route));
  for(const [width,time] of [[320,'day'],[390,'night']]){
   await page.setViewportSize({width,height:width===320?568:844});
   await page.evaluate(async time=>{const e=a.environment;Object.assign(e,{time,livingPreview:false,autoTime:false,autoWeather:false,weather:'sun'});a.game.progress.living.calendar.elapsed=time==='night'?250000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(e,a.game.progress.living.calendar);a.game.livingPreview=false;a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.refresh();},time);
   const label=await page.locator('#mainline-hud').innerText();if(!label.includes('歪锅营地')||label.includes('清缴'))throw Error(label);
   samples.push({width,time,label});await page.screenshot({path:`output/playwright/seed-task-monster-camp/task-${width}-${time}.png`});
  }
  await page.evaluate(async()=>{
   const g=a.game,c=(await import('/src/config/monster-camps.js')).MONSTER_CAMPS[0];Object.assign(g.player,{x:c.x,y:c.y+110});
   (await import('/src/core/monster-camps.js')).updateMonsterCamps(g,.04);const enemies=g.enemies.filter(e=>e.monsterCamp===c.id);
   if(enemies.length!==5)throw Error('营地怪物不完整');for(const e of enemies.slice(0,4))g.hit(e,99999);
   if(g.progress.mainline.gardening.seedDrops)throw Error('未清空营地提前完成');g.hit(enemies[4],99999);
   (await import('/src/core/mainline-manager.js')).updateMainline(g,0);a.renderer.camera.time=null;a.refresh();
  });
  const reward=await page.evaluate(async()=>({seeds:a.game.progress.farm.seeds[0],fact:a.game.progress.mainline.gardening.seedDrops,phase:a.game.progress.mainline.phase,target:(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game)?.key}));
  if(reward.fact!==1||reward.seeds!==1||reward.phase!=='report'||reward.target!=='camp')throw Error(JSON.stringify(reward));
  await page.screenshot({path:'output/playwright/seed-task-monster-camp/seed-return.png'});
  await page.evaluate(async()=>{const g=a.game;Object.assign(g.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp);g.enemies=[];g.mainlineTalkDelay=0;(await import('/src/core/mainline-manager.js')).updateMainline(g,0);a.renderer.camera.time=null;a.refresh();});
  await page.locator('#mainline-speech-skip').waitFor({state:'visible'});await page.locator('#mainline-speech-skip').tap();
  await page.locator('#task-reward-close').waitFor({state:'visible'});await page.locator('#task-reward-close').tap();
  const delivered=await page.evaluate(()=>({seeds:a.game.progress.farm.seeds[0],coins:a.game.progress.coins,completed:a.game.progress.mainline.completed.includes('neighbor-seeds'),patrol:a.game.progress.living.patrolActive}));
  if(delivered.seeds!==0||delivered.coins!==140||!delivered.completed||delivered.patrol||errors.length)throw Error(JSON.stringify({delivered,errors}));
  return {designCriterion:'monster-camps',route,samples,reward,delivered,errors};
 }finally{await context.close();}
}
