// 局部动作、下雨和真实载具通行的补充采样，只改隔离端口测试夹具。
async page=>{
  await page.bringToFront();await page.setViewportSize({width:390,height:900});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:620,y:1830});a.game.progress.living.calendar={day:1,elapsed:500000};a.environment.weather='sun';a.environment.autoWeather=false;a.game.state='playing';});
  await page.waitForTimeout(22000);
  const motion=[];
  for(let i=0;i<4;i++){await page.screenshot({path:`output/playwright/living-world/work-frame-${i}.png`});motion.push(await page.evaluate(async()=>[...(await import('/src/main.js')).application.game.livingActors.values()].map(r=>({id:r.id,action:r.action,clock:r.clock,x:r.x,y:r.y}))));await page.waitForTimeout(180);}
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;if(g.vehicle.active)g.dismountVehicle();Object.assign(g.player,{x:780,y:1850});g.progress.vehicleHulls[0]=1;g.selectVehicle(0);if(!g.summonVehicle())throw Error('测试载具无法出发');});
  // 录屏与低帧率会限制单帧dt，按实际位移判定抵达，不拿固定墙钟时间当通行速度。
  await page.keyboard.down('ArrowDown');for(let i=0;i<20;i++){await page.waitForTimeout(200);if(await page.evaluate(async()=>(await import('/src/main.js')).application.game.player.y>2030))break;}await page.keyboard.up('ArrowDown');
  await page.screenshot({path:'output/playwright/living-world/vehicle-route-390.png'});
  const drive=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y,active:g.vehicle.active};});
  if(drive.y<2010||!drive.active)throw Error('地面载具被生活设施挡住');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.dismountVehicle();Object.assign(a.game.player,{x:650,y:1790});a.environment.weather='rain';});
  await page.waitForTimeout(22000);await page.screenshot({path:'output/playwright/living-world/rain-390.png'});
  const rain=await page.evaluate(async()=>[...(await import('/src/main.js')).application.game.livingActors.values()].map(r=>({id:r.id,action:r.action,place:r.place,x:r.x,y:r.y})));
  return {motion,drive,rain};
}
