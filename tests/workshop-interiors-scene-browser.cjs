// 正式广场合成检查：角色、普通敌人、六款科幻车、环境和HUD共用实际绘制器。
async page=>{
 if(new URL(page.url()).port!=='4282')throw Error('仅限隔离端口4282');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const g=a.game;window.sceneTick=g.update.bind(g);g.update=()=>{};g.cottage=null;g.vehicle.active=false;g.enemies=[];Object.assign(g.player,{x:330,y:280});g.spawnEnemy(0,80);Object.assign(g.enemies[0],{x:405,y:290});a.renderer.camera.time=null;});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night'])for(let batch=0;batch<2;batch++){
  await page.setViewportSize({width,height});
  await page.evaluate(async({phase,batch})=>{const g=a.game,models=(await import('/src/config/parking-visitors.js')).SCIENCE_VEHICLES,spots=(await import('/src/config/parking.js')).PARKING_SPOTS.filter(s=>s.building==='north');g.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';g.parkingVisitors=models.slice(batch*3,batch*3+3).map((m,i)=>({spot:spots[i].id,model:m.id}));a.renderer.camera.time=null;},{phase,batch});
  await page.waitForFunction(phase=>a.environment.time===phase,phase);
  await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.refresh();});await page.waitForTimeout(90);
  await page.screenshot({path:`output/playwright/workshop-interiors/scene-${batch}-${width}-${phase}.png`});
  samples.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopInteriors(a.game,document,a.renderer)));
 }
 await page.evaluate(()=>{a.game.enemies=[];a.game.update=window.sceneTick;});
 if(errors.length||samples.some(s=>s.overflow))throw Error('场景错误 '+errors.join('\n'));
 return {designCriterion:'workshop-interiors-sci-fi-parking',samples,errors};
}
