// 正式钱包栏在十万边界往返，验证完整五位数与昼夜手机布局。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.living.patrolActive=false;
   a.game.progress=p;a.game.reset();a.game.state='playing';a.game.mainlineSpeech=null;a.game.update=()=>{};a.refresh();
  });
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const e=a.environment;Object.assign(e,{time,autoTime:false,autoWeather:false,weather:'sun',livingPreview:true});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);
   },time);
   for(const [amount,expected] of [[16000,'16000'],[99999,'99999'],[100000,'10w'],[101000,'10.1w'],[99999,'99999']]){
    await page.evaluate(amount=>{a.game.progress.coins=a.game.progress.wood=amount;a.refresh();},amount);await page.waitForTimeout(80);
    const r=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectHudCompact(document));
    if(!r.contained||r.overlap||r.resources.some(v=>v.text!==expected||v.clipped||v.full!==amount.toLocaleString('en-US')))throw Error(JSON.stringify({width,time,amount,r}));
    samples.push({width,time,amount,...r});
   }
   await page.screenshot({path:`output/playwright/wallet-number-threshold/${width}-${time}.png`});
  }
  // 顶部资源整块触控区仍可打开说明并正常关闭。
  await page.setViewportSize({width:320,height:568});
  for(const key of ['coins','wood']){
   await page.locator(`.hud-resources [data-resource-info="${key}"]`).tap();
   await page.locator('#resource-help-dialog').waitFor({state:'visible'});
   await page.locator('#close-resource-help').tap();
   await page.locator('#resource-help-dialog').waitFor({state:'hidden'});
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'mobile-single-row-hud',samples,errors};
 }finally{await context.close();}
}
