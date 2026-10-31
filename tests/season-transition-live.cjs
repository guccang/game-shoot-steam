// 连续录制真实融雪与移动，测量完成后的缓存回收和过渡帧耗时。
async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:'output/playwright/season-soft-transition/video',size:{width:390,height:844}}});
 try {
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:4174/');
  await p.locator('#start').tap();
  await p.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;
   Object.assign(a.environment,{forestSeason:'winter',time:'day',weather:'sun',autoTime:false,autoWeather:false});a.renderer.seasons.reset('winter',performance.now());
   a.game.enemies=[];a.game.spawnTimer=999;a.game.attackTimer=999;Object.assign(a.game.player,{x:900,y:800});
   window.renderSamples=[];const original=a.renderer.draw.bind(a.renderer);
   // 仅记录暖缓存绘制开销，首次生成地块另列，不混作稳定帧性能。
   a.renderer.draw=()=>{const start=performance.now();original();if(a.renderer.seasonVisual.active)renderSamples.push(performance.now()-start);};
  });
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();await p.locator('[data-forest-season="spring"]').tap();await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  await p.waitForFunction(()=>a.renderer.seasonVisual.progress>.05);
  const from=await p.evaluate(()=>a.game.player.x);
  await p.keyboard.down('ArrowRight');try {await p.waitForFunction(x=>a.game.player.x>x+35,from);}finally{await p.keyboard.up('ArrowRight');}
  await p.waitForFunction(()=>a.renderer.seasonVisual.progress>.45);
  await p.screenshot({path:'output/playwright/season-soft-transition/live-middle.png'});
  await p.waitForFunction(()=>!a.renderer.seasonVisual.active,{},{timeout:30000});
  const result=await p.evaluate(()=>{
   const samples=renderSamples.slice(4).sort((a,b)=>a-b),d=a.renderer.diagnosticInfo();
   if([...a.renderer.ground.tiles.values()].some(t=>t.fromDay||t.fromNight))throw Error('过渡完成仍保留来源地块');
   return {frames:samples.length,median:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),ground:d.groundCache.bytes,trees:d.trees.bytes,scratch:d.seasonScratch.bytes,season:a.environment.forestSeason};
  });
  if(errors.length)throw Error(errors.join(';'));
  const video=await p.video().path();await context.close();return {designCriterion:'season-soft-transition',result,video,errors};
 }catch(error){await context.close();throw error;}
}
