// 采样正式故事野外的载具、怪物和导航同屏，不修改运行素材或镜头倍率。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;Object.assign(g.player,{x:970,y:790});if(!g.enterStory('sunleaf-01','sunleaf-post'))throw Error('进入故事失败');g.story.phase='prepare';g.chooseStoryLoadout('line-patrol');Object.assign(g.story,{stageId:'Q20',phase:'active',dialogue:null,combat:null});Object.assign(g.player,{x:2600,y:2550});g.state='playing';g.player.invincible=999;g.loadout.vehicleHulls[0]=1;g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicles[0]=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),0);g.vehicle=g.vehicles[0];g.summonVehicle();g.attackTimer=999;for(const d of document.querySelectorAll('dialog[open]'))d.close();a.environment.autoTime=false;a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();});
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.environment.time=phase;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};a.game.enemies=[];a.refresh();},phase);await page.waitForTimeout(21000);
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.enemies=[];g.player.hp=g.maxHp();g.player.invincible=999;Object.assign(g.player,{x:2600,y:2550});g.vehicles[0]=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),0);g.vehicle=g.vehicles[0];g.summonVehicle();(await import('/src/core/enemy-manager.js')).spawnEnemy(g,0,180,{x:2730,y:2510},{ambient:true});a.refresh();});
  await page.waitForTimeout(300);await page.screenshot({path:`output/playwright/navigation-clarity/field-${phase}.png`});
  const s=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,v=(await import('/src/rendering/visual-review.js')).inspectNavigationClarity(a.game,a.renderer.view);return {phase:a.environment.time,vehicle:a.game.vehicle.active,enemies:a.game.enemies.length,points:v.dots.length,target:v.targets,reachable:v.route?.reachable,zoom:v.zoom};});if(s.phase!==phase||!s.points||!s.reachable||!s.vehicle||!s.enemies)throw Error(JSON.stringify(s));samples.push(s);
 }
 if(errors.length)throw Error(errors.join(';'));return {designCriterion:'navigation-clarity',samples,errors};
}
