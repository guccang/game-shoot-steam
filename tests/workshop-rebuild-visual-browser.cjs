// 重建视觉补验：真实泊车、前后遮挡、三建筑对照、雪屋与施工连续采样。
async page=>{
 if(new URL(page.url()).port!=='4277')throw Error('仅限隔离验收端口4277');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 接上主验收完成后的停驻坦克，实际点击上车并驶离，再候停倒回原车位。
 await page.evaluate(()=>{const g=a.game;g.enemies=[];g.update=window.buildTick;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.spawnTimer=999;a.refresh();});
 if(!await page.evaluate(()=>a.game.vehicle.active))await page.locator('[data-parked-hull="0"]').click();
 // 正式上车保护要求驶出泊位及入口115单位后才允许再次候停。
 await page.keyboard.down('ArrowDown');try{await page.waitForFunction(()=>a.game.player.y>=875);}finally{await page.keyboard.up('ArrowDown');}
 await page.keyboard.down('ArrowUp');try{await page.waitForFunction(()=>a.game.player.y<=750);}finally{await page.keyboard.up('ArrowUp');}
 await page.waitForFunction(()=>!a.game.vehicle.active&&a.game.progress.campParking.owned.some(v=>v.hull===0&&v.spot==='weapons-west'),null,{timeout:12000});
 await page.locator('#workshop-dialog').waitFor({state:'visible'});await page.locator('#ws-close').click();
 await page.screenshot({path:'output/playwright/workshop-rebuild/parked-live.png'});
 // 屋后与门前用同一角色真实行走，确认原透显和脚底排序保留。
 await page.evaluate(()=>{Object.assign(a.game.player,{x:500,y:580,vx:0,vy:0});a.game.mainlineSpeech=null;a.renderer.camera.time=null;});
 await page.screenshot({path:'output/playwright/workshop-rebuild/behind.png'});
 await page.keyboard.down('ArrowDown');try{await page.waitForFunction(()=>a.game.player.y>=645);}finally{await page.keyboard.up('ArrowDown');}
 await page.screenshot({path:'output/playwright/workshop-rebuild/in-front.png'});
 await page.evaluate(()=>{a.game.update=()=>{};a.game.mainlineSpeech=null;});
 // 同屏比较新工坊、车库与小屋，并保留角色、停驻车、怪物和原环境。
 for(const [width,height] of [[1280,800],[390,844]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{
   const g=a.game;Object.assign(g.player,{x:650,y:450,vx:0,vy:0});g.progress.living.calendar.elapsed=time==='night'?260000:75000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   g.enemies=[];const e=g.spawnEnemy(0,0,{x:600,y:610},{ambient:true});Object.assign(e,{x:600,y:610,speed:0,damage:0});a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },time);await page.screenshot({path:`output/playwright/workshop-rebuild/overview-${width}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 for(const state of ['ruined','ready'])for(const time of ['day','night']){
  await page.evaluate(async({state,time})=>{
   const g=a.game;g.enemies=[];Object.assign(g.player,{x:500,y:650,vx:0,vy:0});Object.assign(g.progress.arrival,{phase:state==='ruined'?'gather':'complete',elapsed:0});
   Object.assign(a.environment,{livingPreview:true,forestSeason:'winter',time,weather:'sun'});a.renderer.seasons.reset('winter');
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },{state,time});await page.screenshot({path:`output/playwright/workshop-rebuild/winter-${state}-${time}.png`});
 }
 // 五秒中连续取样屋面片的独立落位，不以单张静帧宣称施工动画通过。
 await page.evaluate(async()=>{Object.assign(a.environment,{forestSeason:'spring',time:'day'});a.renderer.seasons.reset('spring');a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);});
 for(const elapsed of [0,.4,.8,1.6,2.4,3.2,4.4,4.9]){
  await page.evaluate(elapsed=>{Object.assign(a.game.progress.arrival,{phase:'repairing',elapsed});a.renderer.draw();a.refresh();},elapsed);
  await page.screenshot({path:`output/playwright/workshop-rebuild/motion-${String(elapsed).replace('.','_')}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'weapon-workshop-rebuild',parking:'倒车入位、下车与打开工坊通过',occlusion:'前后真实行走通过',winter:'昼夜两造型完成',motionSamples:8,errors};
}
