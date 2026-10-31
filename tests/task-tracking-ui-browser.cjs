// 补验任务卡详情页、地图目标与载具同屏；使用已完成主流程的浏览器会话。
async page=>{
 await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;Object.assign(a.game.player,{x:650,y:1520});a.game.mainlineTalkDelay=999;});
 if(!await page.locator('#living-menu').isVisible())await page.locator('#field-menu-toggle').click();
 await page.locator('#living-menu').click();await page.locator('[data-living-track="neighbors-night"]').click();
 await page.locator('[data-living-tab="news"]').click();await page.locator('#living-close').click();await page.waitForTimeout(200);
 await page.locator('#mainline-hud').click();
 if(await page.locator('[data-living-tab="board"]').getAttribute('aria-pressed')!=='true')throw Error('任务卡未打开委托页');
 await page.screenshot({path:'output/playwright/active-task/board-320.png'});
 await page.locator('#living-close').click();await page.waitForTimeout(200);
 if(!await page.locator('#map-button').isVisible())await page.locator('#field-menu-toggle').click();
 await page.locator('#map-button').click();
 const map=await page.locator('#map-description').textContent();
 if(!map.includes('叶蝠的夜班假条')||map.includes('领主的午饭也会凉'))throw Error('地图任务不一致 '+map);
 await page.screenshot({path:'output/playwright/active-task/map-320.png'});await page.locator('#map-done').click();
 await page.waitForTimeout(200);await page.evaluate(()=>{a.game.progress.vehicleHulls[0]=1;a.game.selectVehicle(0);});await page.locator('#vehicle-button').click();
 if(!await page.evaluate(()=>a.game.vehicle.active))throw Error('载具未入场');
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:900});
  await page.evaluate(async time=>{Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);},time);
  await page.waitForTimeout(200);await page.screenshot({path:'output/playwright/active-task/vehicle-'+width+'-'+time+'.png'});
 }
 await page.keyboard.down('s');await page.waitForTimeout(350);await page.keyboard.up('s');await page.waitForTimeout(1800);
 return {pass:true,map,performance:await page.evaluate(()=>a.game.profiler.summary()),textureBytesAdded:0,maxRouteDots:24};
}
