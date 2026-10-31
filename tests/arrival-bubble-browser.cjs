// 原速剧情中的真实DOM气泡回归：检查头顶锚点、可见外框、暂停和说话者切换；默认4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  recordVideo:{dir:'output/playwright/arrival-bubble/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   window.speech=(await import('/src/core/ranger-arrival.js')).arrivalSpeech;window.samples=[];
   const advance=a.renderer.ground.advance.bind(a.renderer.ground);
   // 气泡面板已更新后采样，避免在Canvas绘制结束而DOM尚未刷新时误报一帧延迟。
   a.renderer.ground.advance=(...args)=>{
    advance(...args);const g=a.renderer.renderGame,info=speech(g),node=document.getElementById('arrival-speech');
    if(!info||node.hidden||g.progress.arrival.elapsed<.16)return;
    const v=a.renderer.view,frame=document.getElementById('game-frame').getBoundingClientRect(),canvas=a.renderer.canvas.getBoundingClientRect(),box=node.getBoundingClientRect();
    const x=(info.anchor.x-v.x)*v.zoom+canvas.left-frame.left,y=(info.anchor.y-info.head-v.y)*v.zoom+canvas.top-frame.top;
    samples.push({phase:info.phase,text:node.querySelector('p').textContent,speaker:node.dataset.speaker,
     anchorError:Math.hypot(Number(node.dataset.anchorX)-x,Number(node.dataset.anchorY)-y),
     topError:Math.abs(box.top-frame.top-Math.max(8,y-node.offsetHeight-12)),top:box.top,
     clipped:box.left<frame.left-1||box.right>frame.right+1||box.top<frame.top-1||box.bottom>frame.bottom+1});
   };
  });
  for(const width of [390,320,1280])for(const time of ['day','night']){
   await page.setViewportSize({width,height:width===320?568:width===390?844:900});
   await page.evaluate(async({time})=>{
    a.game.progress=(await import('/src/progression/progress.js')).freshRangerProgress();a.game.reset();a.game.start();samples.length=0;
    Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoTime:false,autoWeather:false,seasonAt:Date.now()});
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },{time});
   await page.waitForFunction(()=>a.game.progress.arrival.phase==='ride'&&a.game.progress.arrival.elapsed>.6);
   await page.screenshot({path:`output/playwright/arrival-bubble/ride-${width}-${time}.png`});
   if(width===390&&time==='day'){
    await page.locator('#settings-button').tap();await page.waitForFunction(()=>a.game.state==='paused');
    if(await page.locator('#arrival-speech').isVisible())throw Error('设置暂停时气泡仍然遮挡');
    await page.waitForTimeout(200);await page.locator('#settings-done').tap();await page.locator('#arrival-speech').waitFor({state:'visible'});
   }
   await page.waitForFunction(()=>a.game.progress.arrival.phase==='letter');
   const report=await page.evaluate(()=>{
    const ride=samples.filter(s=>s.phase==='ride'),max=key=>Math.max(...samples.map(s=>s[key]));
    const result={frames:samples.length,rideFrames:ride.length,anchorError:max('anchorError'),topError:max('topError'),rideTopRange:Math.max(...ride.map(s=>s.top))-Math.min(...ride.map(s=>s.top)),phases:[...new Set(samples.map(s=>s.phase))]};
    if(ride.length<20||result.anchorError>.02||result.topError>.03||result.rideTopRange>.03||samples.some(s=>s.clipped)||!samples.some(s=>s.phase==='watch'&&s.speaker==='我')||!ride.every(s=>s.speaker==='松伯'&&s.text==='坐稳，晴叶营地到啦！'))throw Error('气泡抖动或阶段显示错误：'+JSON.stringify(result));
    return result;
   });results.push({width,time,...report});
  }
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'arrival-vehicle-interpolation',results,video:await page.video().path(),errors};
 }finally{await context.close();}
}
