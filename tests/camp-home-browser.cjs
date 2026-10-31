// 隔离端口实机验收，夹具只准备起点，停车、下车、走动与睡眠均走正式运行时。
async page=>{
 if(new URL(page.url()).port!=='4268')throw Error('仅限隔离验收端口');
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.vehicleHulls.fill(1);p.vehicleIndex=0;
  p.arrival={version:2,phase:'complete',elapsed:0,keys:true,parked:false,x:260,y:785};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await page.setViewportSize({width:390,height:844});
 // 在泊位门前准备，真实等待倒车后核验工坊和步行。
 for(const id of ['garage','weapons-west']){
  await page.evaluate(async id=>{const g=a.game,s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id===id);g.progress.campParking.owned=[];g.vehicle.active=false;g.progress.vehicleIndex=0;g.vehicle=g.vehicles[0];g.summonVehicle();g.parking=null;g.enemies=[];g.spawnTimer=999;Object.assign(g.player,{x:s.x+20,y:s.approachY+15,vx:0,vy:0});a.renderer.camera.time=null;},id);
  await page.locator('#workshop-dialog').waitFor({state:'visible',timeout:20000});
  const info=await page.evaluate(()=>({mounted:a.game.vehicle.active,parked:a.game.progress.campParking.owned,kind:document.querySelector('#workshop-dialog').dataset.workshopKind}));
  if(info.mounted||info.parked.length!==1||info.parked[0].spot!==id)throw Error('停车未完成下车：'+JSON.stringify(info));results.push(info);
  await page.locator('#ws-close').click();await page.waitForTimeout(300);
  await page.screenshot({path:`output/playwright/camp-home/${id}-dismounted.png`});
  const before=await page.evaluate(()=>a.game.player.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(220);await page.keyboard.up('ArrowRight');
  if(!await page.evaluate(x=>a.game.player.x>x+3,before))throw Error('关闭工坊后不能步行');
  // 回到车旁，仅准备点击起点，不直接调用上车函数。
  await page.evaluate(async id=>{const s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id===id);Object.assign(a.game.player,{x:s.x+60,y:s.approachY,vx:0,vy:0});a.renderer.camera.time=null;},id);
  await page.waitForTimeout(300);await page.locator('[data-parked-hull="0"]').focus();await page.keyboard.press('Enter');
  if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.progress.campParking.owned.length===0))throw Error('靠近车辆不能点击上车');
  await page.waitForTimeout(3300);if(!await page.evaluate(()=>a.game.vehicle.active))throw Error('上车后被重复自动下车');
 }
 // 正式门口计时：移动取消，再静止进入。
 await page.evaluate(async()=>{const g=a.game;g.dismountVehicle();g.parking=null;Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door,{vx:0,vy:0});a.renderer.camera.time=null;});
 await page.waitForFunction(()=>a.game.cottageEntry>.4);await page.screenshot({path:'output/playwright/camp-home/door-countdown.png'});
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
 if(!await page.evaluate(()=>!a.game.cottageEntry))throw Error('走动未取消入门');
 await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/cottage.js')).COTTAGE.door,{vx:0,vy:0}));
 await page.waitForFunction(()=>!!a.game.cottage,null,{timeout:6000});
 // 真实键盘沿房间中间通道走向床边。
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(1150);await page.keyboard.up('ArrowUp');
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(480);await page.keyboard.up('ArrowLeft');
 await page.locator('#cottage-sleep-morning').waitFor({state:'visible'});
 if(await page.locator('#cottage-sleep-morning').isDisabled())throw Error('实际走到床边仍不能睡觉');
 const day=await page.evaluate(()=>a.game.progress.living.calendar.day);
 await page.locator('#cottage-sleep-morning').click();await page.waitForFunction(day=>a.game.progress.living.calendar.day===day+1,day);
 if(!await page.evaluate(()=>!a.game.vehicle.active&&a.game.progress.living.calendar.elapsed<2000))throw Error('睡到清晨失败');
 await page.screenshot({path:'output/playwright/camp-home/room-after-sleep.png'});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?220000:1000;a.renderer.draw();a.refresh();},phase);
  await page.waitForTimeout(150);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('小屋窄屏溢出');
  await page.screenshot({path:`output/playwright/camp-home/room-${width}-${phase}.png`});
 }
 await page.locator('#cottage-exit').click();await page.waitForTimeout(3500);
 if(!await page.evaluate(()=>!a.game.cottage))throw Error('出门自动弹回室内');
 // 实际访客调度只在镜头外生成，随后走到停车场查看。
 await page.evaluate(async()=>{const g=a.game;g.parkingVisitTimer=0;g.parkingView={x:700,y:700,w:300,h:300};g.random=()=>.7;(await import('/src/core/camp-parking.js')).updateParkingVisitors(g,.05);Object.assign(g.player,{x:410,y:480,vx:0,vy:0});a.renderer.camera.time=null;});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'output/playwright/camp-home/visitors.png'});
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'camp-home-parking',results,errors};
}
