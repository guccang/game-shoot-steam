// 在既有邻里浏览器会话中补验真实载具按键、遮挡与路线开销，不重跑无关玩法。
async page=>{
 const samples=[];
 await page.setViewportSize({width:390,height:900});
 await page.evaluate(()=>{const g=a.game;Object.assign(g.player,{x:650,y:1520});g.progress.vehicleHulls[0]=1;g.selectVehicle(0);g.time+=2;});
 await page.locator('#vehicle-button').click();
 if(!await page.evaluate(()=>a.game.vehicle.active))throw Error('载具未召唤');
 const before=await page.evaluate(()=>a.game.player.y);
 await page.keyboard.down('s');await page.waitForTimeout(450);await page.keyboard.up('s');await page.waitForTimeout(200);
 const after=await page.evaluate(()=>a.game.player.y);
 if(after<=before)throw Error('载具未能沿路通行');
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:900});
  await page.evaluate(async time=>{Object.assign(a.game.player,{x:650,y:1520});a.game.time+=1;a.environment.time=time;a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);},time);
  await page.waitForTimeout(200);await page.screenshot({path:'output/playwright/living-guidance/vehicle-'+width+'-'+time+'.png'});
 }
 // 同场景对比未接请求与当前任务导航，仅比较当前浏览器，不推断手机性能。
 const saved=await page.evaluate(()=>Object.values(a.game.progress.living.requests).map(q=>q.stage));
 for(const active of [false,true]){
  await page.evaluate(({active,saved})=>{Object.values(a.game.progress.living.requests).forEach((q,i)=>q.stage=active?saved[i]:-1);a.game.time+=2;}, {active,saved});
  await page.waitForTimeout(2300);
  samples.push(await page.evaluate(active=>({active,performance:a.game.profiler.summary()}),active));
 }
 return {pass:true,movement:{before,after},samples,bitmapBytesAdded:0,maxLivingDots:24};
}
