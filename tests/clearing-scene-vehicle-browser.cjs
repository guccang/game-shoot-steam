// 只复核管理面板和新建筑的车辆遮挡，不扩大到装备或战斗数值测试。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.reload();await page.locator('#start').click();await page.setViewportSize({width:320,height:900});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.mainline.completed=['first-map'];g.progress.mainline.phase='doing';g.progress.living.patrolActive=true;g.mainlineSpeech=null;g.mainlineTalkDelay=999;Object.assign(g.player,{x:920,y:1000});a.refresh();});await page.waitForTimeout(400);await page.locator('#clearing-marker').click();await page.waitForTimeout(300);
 if(await page.locator('#clearing-dialog .clearing-steps svg').count()!==3||!(await page.locator('#operation-guide').textContent()).includes('继续前往清缴场'))throw Error('管理步骤提示错误');await page.screenshot({path:'output/playwright/clearing-scene-guide/manage-320.png'});await page.locator('#clearing-close').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.living.patrolActive=false;g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicles[0]=(await import('/src/combat/vehicle.js')).createVehicle(g.progress, 0);g.vehicle=g.vehicles[0];g.summonVehicle();g.player.invincible=999;g.attackTimer=999;a.refresh();});
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();},phase);await page.waitForTimeout(21000);
  await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(300);
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.enemies=[];(await import('/src/core/battle/enemy-manager.js')).spawnEnemy(g,0,200,{x:1120,y:1020},{ambient:true});a.refresh();});await page.waitForTimeout(80);await page.screenshot({path:`output/playwright/clearing-scene-guide/vehicle-board-${phase}.png`});
 }
 if(errors.length)throw Error(errors.join(';'));return {designCriterion:'clearing-scene-guide',management:true,vehicle:true,errors};
}
