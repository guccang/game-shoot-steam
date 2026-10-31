// 接续正式应用，验证消防返站按钮锚定车库、点击入库以及连续驾驶阶段仍停留在原建筑上。
async page=>{
 await page.keyboard.press('Escape');
 await page.evaluate(async()=>{
  const g=a.game;g.state='playing';if(g.fireRescue)(await import('/src/core/fire-rescue.js')).dismissFireRescue(g,{silent:true});
  if(g.cottage)(await import('/src/core/cottage.js')).leaveCottage(g);g.vehicle.active=false;g.parking=null;g.enemies=[];
  Object.assign(g.player,(await import('/src/world/fire-navigation.js')).FIRE_EXIT,{vx:0,vy:0});
  if(!g.fireActive){g.requestFireRescue();if(!g.startFireRescue())throw Error('接警失败');}
  for(let i=0;i<3000&&g.fireTransit;i++)buildingTick(.04);
  for(const f of g.fireRescue.fires){f.lit=false;f.hp=0;}g.enemies=[];buildingTick(.04);
  Object.assign(g.player,(await import('/src/world/fire-navigation.js')).FIRE_PARKING,{vx:0,vy:0});
  if(g.fireRescue.phase!=='returning')throw Error('消防返站夹具失败');a.renderer.camera.time=null;a.refresh();
 });
 const samples=[];
 for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   Object.assign(a.environment,{time,livingPreview:true,autoTime:false,autoWeather:false,weather:'sun'});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  },time);await page.waitForTimeout(200);
  const info=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBuildingInteraction(a.renderer,document));
  if(!info.visible||info.target!=='fire-parking'||info.anchorError>1||info.overflow||!info.touchTarget)throw Error('消防建筑锚点异常 '+JSON.stringify(info));
  samples.push({width,height,time,...info});await page.screenshot({path:`output/playwright/building-interaction/fire-${width}-${time}.png`});
 }
 await page.locator('#nearby-interaction').click();
 await page.evaluate(()=>{if(a.game.fireRescue.phase!=='parking')throw Error('点击未入库');for(let i=0;i<20;i++)buildingTick(.04);});
 await page.waitForTimeout(100);await page.screenshot({path:'output/playwright/building-interaction/fire-reversing.png'});
 await page.evaluate(()=>{for(let i=0;i<3000&&a.game.fireTransit;i++)buildingTick(.04);if(a.game.fireRescue.phase!=='won')throw Error('连续入库未完成');});
 return {samples,clicked:true,completed:true};
}
