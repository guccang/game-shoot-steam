// 昼夜同屏、道路汇合与厚木门实机验收；摆位只用于采样，不代替门洞行驶。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.enemies=[];g.progress.living.patrolActive=false;g.progress.fireDispatch.next=600;
  g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicles[0]=(await import('/src/combat/vehicle.js')).createVehicle(g.progress, 0);g.vehicle=g.vehicles[0];g.summonVehicle();Object.assign(g.player,{x:415,y:1850});
  a.environment.weather='sun';a.environment.autoWeather=false;a.environment.season='spring';a.environment.autoSeason=false;a.refresh();});
 const samples=[];
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};a.refresh();},phase);
  await page.waitForTimeout(21000);
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(450);
   await page.screenshot({path:`output/playwright/arrival-world-polish/fences-${width}-${phase}.png`});
   samples.push(await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {...(await import('/src/rendering/visual-review.js')).inspectArrivalWorld(a.game,document),time:a.environment.time};}));
  }
 }
 await page.setViewportSize({width:390,height:844});
 // 真正开车穿过纵向门洞，再返回，确认厚度没有堵住路。
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(950);await page.keyboard.up('ArrowLeft');
 const outside=await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.x);
 if(outside>=330)throw Error('车辆无法驶出木门 '+outside);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(1100);await page.keyboard.up('ArrowRight');
 const inside=await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.x);
 if(inside<=370)throw Error('车辆无法返回木门 '+inside);
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:400000};Object.assign(a.game.player,{x:690,y:970});a.refresh();});
 await page.waitForTimeout(21000);await page.screenshot({path:'output/playwright/arrival-world-polish/road-junction.png'});
 if(samples.some(s=>s.overflow))throw Error('手机页面横向溢出');
 return {samples,outside,inside,errors};
}
