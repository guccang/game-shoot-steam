// 正式工坊购买与正式森林战场验收，测试进度仅在隔离端口使用。
async page=>{
 if(new URL(page.url()).port!=='4282')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:960});await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.menu.enter();if(!await a.ready)throw Error('资源加载失败');window.reviewApp=a;const {freshProgress,validateProgress}=await import('/src/progression/progress.js');const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.coins=p.wood=99990000;p.materials={parts:99999,crystal:99999,core:99999};a.game.progress=validateProgress(p);a.game.reset();a.game.state='ready';a.refresh();a.workshop.open('vehicle',7);});
 await page.screenshot({path:'output/playwright/jinbei-cat-crew/shop.png'});await page.locator('#ws-purchase').click();await page.locator('#ws-test').click();await page.waitForTimeout(4500);await page.screenshot({path:'output/playwright/jinbei-cat-crew/trial.png'});await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
 const scenes=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async(time)=>{
   const a=reviewApp,g=a.game,{validateProgress}=await import('/src/progression/progress.js'),{restoreArrival}=await import('/src/core/ranger-arrival.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   if(g.reviewUpdate){g.update=g.reviewUpdate;delete g.reviewUpdate;}
   g.progress.vehicleIndex=7;g.progress=validateProgress(g.progress);g.reset();restoreArrival(g);g.start();g.workshopTrial=true;g.state='playing';if(!g.summonVehicle())throw Error('未成功上车');g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;g.spawnTimer=9999;g.workshopTrial=true;g.attack=()=>false;
   const origin={x:350,y:1260};Object.assign(g.player,origin);g.trees=g.trees.filter(t=>Math.hypot(t.x-origin.x,t.y-origin.y)>350);
   for(const [dx,dy] of [[150,10],[165,-75],[145,95]]){const at={x:origin.x+dx,y:origin.y+dy},e=g.spawnEnemy(0,0,at);Object.assign(e,{...at,hp:100000,maxHp:100000,speed:0,damage:0,mass:10,flying:false,football:true});}
   Object.assign(a.environment,{time,livingPreview:true,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();
  },time);
  await page.waitForTimeout(5000);await page.screenshot({path:`output/playwright/jinbei-cat-crew/${width}-${time}.png`});
  scenes.push(await page.evaluate(async({width,time})=>({actualTime:reviewApp.environment.time,...(await import('/src/rendering/visual-review.js')).inspectJinbeiCrew(reviewApp.game,document),width,time}),{width,time}));
 }
 if(errors.length)throw Error(errors.join('\n'));if(scenes.some(s=>s.overflow||s.nodes.length!==4||s.actualTime!==s.time))throw Error(JSON.stringify(scenes));return {scenes,errors};
}
