// 作物实景验收：测试时间夹具缩短成长等待，正式图集、绘制器和收割交互不替换。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-growth/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const {freshRangerProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   const p=freshRangerProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.coins=0;const g=a.game;/* 单项农活夹具不额外放置示范田。 */p.farm.wildMaps=['forest','jiuzhaigou'];g.progress=p;g.reset();g.start();g.enemies=[];g.fireClock=999999;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();const now=Date.now();g.progress.farm.plots=Array.from({length:8},(_,i)=>({id:i,mapId:'forest',x:1537+i%4*56,y:464+Math.floor(i/4)*90,crop:i,plantedAt:now-14300,readyAt:now+45700}));g.progress.farm.nextId=8;Object.assign(g.player,{x:1621,y:650});a.renderer.camera.time=null;(await import('/src/core/farm.js')).setFarmTool(g,'hoe');await (await import('/src/rendering/farm.js')).loadFarmArt();
   window.light=async time=>{Object.assign(a.environment,{time,weather:'sun',season:'summer',autoWeather:false,autoTime:false,livingPreview:true});const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();};await light('day');
   // 动作录像中上排萌芽、下排成熟，使用相同正常时钟连续播放。
   const start=Date.now();for(const p of g.progress.farm.plots){p.plantedAt=start-(p.id<4?14300:58600);p.readyAt=p.plantedAt+60000;}
  });
  await page.waitForTimeout(2600);await page.screenshot({path:'output/playwright/farm-growth/transition.png'});
  // 暂停期间视觉时间与游戏动作时钟都必须保持，真实成熟条件仍来自原存档时间。
  const frozen=await page.evaluate(()=>{a.game.state='paused';return {now:a.renderer.farmVisualNow,time:a.game.time};});await page.waitForTimeout(500);
  const after=await page.evaluate(()=>({now:a.renderer.farmVisualNow,time:a.game.time}));if(JSON.stringify(frozen)!==JSON.stringify(after))throw Error('暂停未冻结作物视觉 '+JSON.stringify({frozen,after}));
  // 浇水跨过成熟边界时也先长成；真实成熟条件立即生效，过渡记录按时清理。
  await page.evaluate(()=>{const g=a.game,now=Date.now();g.state='playing';for(const p of g.progress.farm.plots){p.plantedAt=now-50000;p.readyAt=now+10000;p.watered=false;}Object.assign(g.player,{x:1537,y:526});a.renderer.camera.time=null;a.farm.open();});await page.waitForTimeout(500);await page.locator('#farm-water').tap();await page.locator('[data-farm-cell="0"]').tap();
  await page.waitForFunction(()=>a.renderer.farmGrowthEffects?.boosts?.length>0);const boosted=await page.evaluate(()=>({count:a.renderer.farmGrowthEffects.boosts.length,mature:a.game.progress.farm.plots[0].readyAt<=Date.now()}));if(!boosted.mature||boosted.count!==1)throw Error('浇水过渡与成熟条件不符');await page.screenshot({path:'output/playwright/farm-growth/watering-transition.png'});
  await page.waitForFunction(()=>a.renderer.farmGrowthEffects.boosts.length===0&&!a.game.farmWork.job);await page.evaluate(()=>{Object.assign(a.game.player,{x:1621,y:650});a.renderer.camera.time=null;a.farm.open();});
  await page.evaluate(()=>{a.game.state='playing';const now=Date.now();for(const p of a.game.progress.farm.plots){p.plantedAt=now-36000;p.readyAt=now+24000;}});
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[1280,900,'day'],[1280,900,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(time=>light(time),time);await page.waitForTimeout(350);await page.screenshot({path:`output/playwright/farm-growth/seedlings-${width}-${time}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(async()=>{await light('day');const now=Date.now();for(const p of a.game.progress.farm.plots){p.plantedAt=now-61000;p.readyAt=now-1000;}});await page.waitForTimeout(500);await page.screenshot({path:'output/playwright/farm-growth/mature-day.png'});await page.evaluate(()=>light('night'));await page.waitForTimeout(300);await page.screenshot({path:'output/playwright/farm-growth/mature-night.png'});
  // 采样正式渲染入口生成阶段与轻摆分镜，根部仍取同一世界坐标。
  const evidence=await page.evaluate(async()=>{
   const {drawFarmCrop,farmArtBudget}=await import('/src/rendering/farm.js'),now=Date.now(),p={...a.game.progress.farm.plots[0],plantedAt:now,readyAt:now+60000},canvas=document.createElement('canvas');canvas.id='growth-review';canvas.width=960;canvas.height=220;canvas.style.cssText='display:block;width:960px;height:220px';const c=canvas.getContext('2d');c.fillStyle='#b9cb8c';c.fillRect(0,0,960,220);
   const ages=[0,14.5,15,15.7,36,58.6,59.3,60];for(let i=0;i<ages.length;i++){drawFarmCrop(c,{x:i*120+60,y:92,plot:p},i*.4,false,now+ages[i]*1000);c.fillStyle='#36533c';c.font='12px sans-serif';c.fillText(ages[i]+'秒',i*120+40,118);drawFarmCrop(c,{x:i*120+60,y:198,plot:p},i*.45,false,now+61000);}
   document.body.append(canvas);
   const bench=document.createElement('canvas');bench.width=600;bench.height=200;const ctx=bench.getContext('2d'),times=[];for(let frame=0;frame<60;frame++){const start=performance.now();ctx.clearRect(0,0,600,200);for(let i=0;i<16;i++)drawFarmCrop(ctx,{x:i%8*65+30,y:80+Math.floor(i/8)*90,plot:{...p,id:i,crop:i%8}},frame/60,false,now+36000);times.push(performance.now()-start);}times.sort((a,b)=>a-b);
   return {budget:farmArtBudget(),sixteenCropsP95:times[56]};
  });await page.setViewportSize({width:1100,height:900});await page.locator('#growth-review').screenshot({path:'output/playwright/farm-growth/growth-and-sway.png'});
  // 收获进入背包，出售才产生金币；验证当前规则下真实点击仍完成收割。
  const expectedHarvest=await page.evaluate(()=>{const crop=a.game.progress.farm.plots[0].crop;return {crop,count:a.game.progress.farm.inventory[crop]+1};});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>a.farm.open());await page.locator('[data-farm-cell="0"]').tap();await page.waitForFunction(expected=>a.game.progress.farm.inventory[expected.crop]===expected.count&&a.game.progress.farm.plots[0].crop===null&&!a.game.farmWork.job,expectedHarvest);
  if(evidence.budget.sheets!==evidence.budget.maxSheets||errors.length)throw Error(JSON.stringify({evidence,errors}));return {...evidence,paused:frozen,boosted,coins:await page.evaluate(()=>a.game.progress.coins),video:await page.video().path(),errors};
 }finally{await context.close();}
}
