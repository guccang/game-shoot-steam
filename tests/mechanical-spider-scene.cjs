// 蜘蛛与重装机械猫昼夜同屏、满编、实际运动/受击和工坊入口实机验收。
async page=>{
 if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口');await page.reload();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:960});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.weapon=16;p.weaponParts[16].coordination=8;p.vehicleLoadouts[0]=15;p.coins=p.wood=999999;p.bosses=100;p.materials={parts:9999,crystal:9999,core:999};const g=a.game;g.progress=p;g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];Object.assign(g.player,{x:1030,y:710});for(const [x,y] of [[890,820],[1060,820],[1180,750],[900,640],[1090,600]]){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,flying:false});}g.summonVehicle();for(let i=0;i<2700;i++)g.update(1/60);a.save();a.refresh();const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('正式图集缺失');});
 const full=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {small:g.spider.nodes.filter(n=>n.active&&n.hp>0).length,mother:g.spider.mother.hp,claws:g.vehicle.module.companions.nodes.filter(n=>n.active).map(n=>n.maxHp)};});if(full.small!==10||full.claws.some(h=>h!==300))throw Error('满编/车载重甲不正确');
 await page.locator('#settings-button').click();await page.locator('#environment-button').click();await page.locator('#auto-time').uncheck();await page.locator('#auto-weather').uncheck();await page.locator('button[data-forest-season="summer"]').click();await page.locator('button[data-weather="sun"]').click();await page.locator('#close-environment').click();if(await page.locator('#close-settings').isVisible())await page.locator('#close-settings').click();
 const results=[];
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:width===1280?960:844});
  for(const time of ['day','night']){
   const label=time==='day'?'白昼':'夜晚';for(let i=0;i<3&&(await page.locator('#time-picture-label').innerText())!==label;i++)await page.locator('#time-picture').click();
   await page.evaluate(async time=>{const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,forestSeason:'summer'});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.renderer.resize();a.refresh();},time);
   await page.waitForTimeout(700);await page.screenshot({path:`output/playwright/mechanical-spider/scene-${width}-${time}.png`});
   await page.locator('.world-workshop-entry').click();await page.locator('[data-ws-item="16"]').click();if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.state)!=='paused')throw Error('工坊未暂停');await page.screenshot({path:`output/playwright/mechanical-spider/full-${width}-${time}.png`});await page.locator('#ws-close').click();if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.state)!=='playing')throw Error('退出未恢复');
   const info=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {cache:a.renderer.diagnosticInfo().groundCache.count,small:a.game.spider.nodes.filter(n=>n.active).length};});if(info.cache>32||info.small>10)throw Error('预算超限');results.push({width,time,...info});
  }
 }
 // 键盘移动、停止均在真实场景执行；母体走路相位随位移变化，停驻后保持。
 await page.setViewportSize({width:1280,height:960});const before=await page.evaluate(async()=>{const n=(await import('/src/main.js')).application.game.spider.mother;return {x:n.x,y:n.y,phase:n.walkPhase};});
 await page.keyboard.down('d');await page.waitForTimeout(1000);await page.keyboard.up('d');await page.keyboard.down('s');await page.waitForTimeout(700);await page.keyboard.up('s');await page.waitForTimeout(2200);await page.screenshot({path:'output/playwright/mechanical-spider/movement.png'});
 const moved=await page.evaluate(async()=>{const n=(await import('/src/main.js')).application.game.spider.mother;return {x:n.x,y:n.y,phase:n.walkPhase};});if(moved.phase===before.phase)throw Error('八足未随实际移动');
 // 正式怪物攻击小蛛/母体；随后用正式承伤入口致死，观察倒塌与周期补召。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,m=g.spider.mother;const e=g.spawnEnemy(0,0,{x:m.x+2,y:m.y});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:15,flying:false});});await page.waitForTimeout(1800);await page.screenshot({path:'output/playwright/mechanical-spider/hit.png'});
 const damaged=await page.evaluate(async()=>(await import('/src/main.js')).application.game.spider.mother.hp);if(damaged>=480)throw Error('怪物未攻击母体');
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game,{hurtMechanical}=await import('/src/combat/mechanical.js');hurtMechanical(g,g.spider.mother,9999);hurtMechanical(g,g.spider.nodes[0],9999);});await page.waitForTimeout(150);await page.screenshot({path:'output/playwright/mechanical-spider/death.png'});await page.waitForTimeout(10000);await page.screenshot({path:'output/playwright/mechanical-spider/repair.png'});
 const repaired=await page.evaluate(async()=>(await import('/src/main.js')).application.game.spider.mother.hp);if(repaired<=0)throw Error('母体未消耗能源修复');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);await page.screenshot({path:'output/playwright/mechanical-spider/reduced.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 if(errors.length)throw Error(errors.join('\n'));return {full,results,before,moved,damaged,repaired,errors};
}
