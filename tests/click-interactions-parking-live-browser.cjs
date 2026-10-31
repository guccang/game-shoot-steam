// 原速录制停车：在泊位等待、明确点击、连续倒车、下车，保留正式运动帧。
async page=>{
 if(new URL(page.url()).port!=='4291')throw Error('仅限隔离端口4291');
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.spawnTimer=a.game.fireClock=999;});

 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const g=a.game;g.progress.vehicleHulls[0]=1;g.selectVehicle(0);g.summonVehicle();
  const s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id==='north-0-1');
  Object.assign(g.player,{x:s.x,y:s.approachY,vx:0,vy:0});g.parking=null;a.renderer.camera.time=null;
 });
 await page.locator('#nearby-interaction').waitFor({state:'visible'});
 await page.waitForTimeout(3600);
 if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.parking?.phase==='waiting'))throw Error('未点击就入位');
 await page.screenshot({path:'output/playwright/click-parking-mobile.png'});
 await page.locator('#nearby-interaction').click();
 await page.waitForFunction(()=>!a.game.vehicle.active&&a.game.progress.campParking.owned.some(s=>s.spot==='north-0-1'));
 return {waitWithoutAction:true,clickParked:true};
}
