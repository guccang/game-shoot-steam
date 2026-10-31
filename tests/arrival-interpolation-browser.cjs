// 实际主循环播放剧情，记录绘制器采样、暂停恢复及手机昼夜画面；默认使用4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  recordVideo:{dir:'output/playwright/arrival-jitter/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   window.inspectArrival=(await import('/src/rendering/visual-review.js')).inspectArrivalInterpolation;
   window.samples=[];const draw=a.renderer.draw.bind(a.renderer);
   // 包装只采样真实绘制结果，不改变逻辑时间、位置或主循环频率。
   a.renderer.draw=(...args)=>{draw(...args);const sample=inspectArrival(a.renderer);
    if(sample.phase==='ride'&&sample.elapsed>.15&&sample.elapsed<2.65){sample.uninterpolatedError=(a.game.arrivalScene.scooter.y-28-a.renderer.renderGame.player.y)*a.renderer.view.zoom;samples.push(sample);}
   };
  });
  for(const width of [390,320,1280])for(const time of ['day','night']){
   await page.setViewportSize({width,height:width===320?568:width===390?844:900});
   await page.evaluate(async({width,time})=>{
    const p=(await import('/src/progression/progress.js')).freshRangerProgress();
    if(width!==390)Object.assign(p.arrival,{phase:'ride',elapsed:0});
    a.game.progress=p;a.game.reset();a.game.start();samples.length=0;
    Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoTime:false,autoWeather:false,seasonAt:Date.now()});
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },{width,time});
   await page.waitForFunction(()=>a.game.progress.arrival.phase==='ride'&&a.game.progress.arrival.elapsed>.6);
   await page.screenshot({path:`output/playwright/arrival-jitter/ride-${width}-${time}.png`});
   if(width===390&&time==='day'){
    await page.locator('#settings-button').tap();await page.waitForFunction(()=>a.game.state==='paused');
    const paused=await page.evaluate(()=>({y:a.game.arrivalScene.scooter.y,elapsed:a.game.progress.arrival.elapsed}));
    await page.waitForTimeout(250);if(!await page.evaluate(p=>a.game.arrivalScene.scooter.y===p.y&&a.game.progress.arrival.elapsed===p.elapsed,paused))throw Error('暂停继续开车');
    await page.locator('#settings-done').tap();
   }
   await page.waitForFunction(()=>a.game.progress.arrival.phase==='letter');
   const report=await page.evaluate(()=>{
    if(samples.length<15)throw Error('行驶样本不足');
    const maximum=key=>Math.max(...samples.map(s=>Math.abs(s[key]))),range=key=>Math.max(...samples.map(s=>s[key]))-Math.min(...samples.map(s=>s[key]));
    const result={frames:samples.length,seatError:maximum('seatError'),elderError:maximum('elderError'),screenRange:range('screenY'),uninterpolatedError:maximum('uninterpolatedError'),wheelRange:range('wheelPhase')};
    if(result.seatError>1e-6||result.elderError>1e-6||result.screenRange>1e-6||result.wheelRange<1)throw Error('车辆仍抖动或轮胎停止：'+JSON.stringify(result));return result;
   });
   results.push({width,time,...report});
  }
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'arrival-vehicle-interpolation',results,video:await page.video().path(),errors};
 }catch(error){await page.screenshot({path:'output/playwright/arrival-jitter/failure.png'});throw error;}
 finally{await context.close();}
}
