// 驾驶中真实短按同一田块播种、浇水、收获，战斗期间不响应。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   const a=window.a=(await import('/src/main.js')).application;await a.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.vehicleHulls[5]=1;p.vehicleIndex=5;p.farm.seeds[0]=3;p.farm.lessonRewarded=true;
   p.farm.plots=[{id:0,mapId:'forest',x:921,y:2960,crop:null,readyAt:0,plantedAt:0,watered:false}];p.farm.nextId=1;
   g.progress=p;g.reset();g.state='playing';g.vehicle.active=true;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.spawnTimer=g.attackTimer=g.fireClock=99999;
   Object.assign(g.player,{x:865,y:2960,vx:0,vy:0});a.renderer.camera.time=null;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.refresh();
  });
  const cell=page.locator('[data-farm-cell="0"]');await cell.tap();await page.locator('[data-farm-seed="0"]').tap();
  await page.waitForFunction(()=>a.game.progress.farm.plots[0].crop===0);
  if(await page.evaluate(()=>a.game.progress.farm.seeds[0])!==2)throw Error('种子扣除数量不符');
  await cell.tap();await page.waitForFunction(()=>a.game.progress.farm.plots[0].watered);
  await page.evaluate(()=>{const p=a.game.progress.farm.plots[0];p.readyAt=Date.now()-1;p.plantedAt=p.readyAt-1000;});
  await cell.tap();await page.waitForFunction(()=>a.game.progress.farm.plots[0].crop===null);
  if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.progress.farm.harvested===1))throw Error('驾驶状态或收获次数不符');
  // 满载时取消保留本茬；确认后只结算一次，车上始终保留驾驶员。
  await page.evaluate(()=>{const g=a.game,p=g.progress.farm.plots[0];Object.assign(p,{crop:0,plantedAt:1,readyAt:2});g.progress.logistics.builds[g.vehicle.index].wood=500;});
  await cell.tap();await page.locator('#farm-harvest-cancel').tap();
  await page.waitForFunction(()=>a.game.state==='playing');
  if(await page.evaluate(()=>a.game.progress.farm.harvested)!==1)throw Error('取消后仍然收获');
  await cell.tap();await page.locator('[data-harvest-continue]').tap();
  await page.waitForFunction(()=>a.game.progress.farm.harvested===2&&a.game.vehicle.active);
  await cell.tap();await page.waitForSelector('#farm-picker:not([hidden])');
  await page.evaluate(()=>{const g=a.game,e=g.spawnEnemy(0,0,{x:g.player.x+45,y:g.player.y});Object.assign(e,{hp:9999,maxHp:9999,speed:0,damage:0});});
  await cell.waitFor({state:'hidden'});await page.locator('#farm-picker').waitFor({state:'hidden'});
  await page.evaluate(()=>{a.game.enemies=[];});await cell.waitFor({state:'visible'});
 }finally{await context.close();}
}
