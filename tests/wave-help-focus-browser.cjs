// 问号焦点专项：真实鼠标、触摸与键盘交替操作，保留原生弹窗焦点恢复。
async(page)=>{
 if(new URL(page.url()).port!=='4243')throw Error('仅使用隔离端口4243');
 const samples=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 固定正式战场作为UI夹具，避免无关战斗或失焦暂停干扰焦点测试。
 async function prepare(p){
  await p.evaluate(()=>localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false})));
  await p.reload();await p.locator('#start').click();
  await p.evaluate(async()=>{const a=(await import('/src/main.js')).application;window.focusApp=a;Object.assign(a.game,{state:'playing',waveWarning:0,waveRest:0,enemies:[],spawnTimer:999});a.game.player.hp=100000;a.refresh();});
 }
 // 通过正式读取器检查可见轮廓，不依赖浏览器对focus-visible的启发式结果。
 async function check(p,outline,label){
  const s=await p.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectWaveProgress(document));
  if(!s.helpFocus.active||s.helpFocus.outline!==outline||s.helpBox.width<44||s.helpBox.height<44)throw Error(label+' '+JSON.stringify(s.helpFocus));
  if(!await p.evaluate(()=>focusApp.game.state==='playing'))throw Error(label+' 未恢复战斗');
  samples.push({label,...s.helpFocus});
 }
 await prepare(page);
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{const a=focusApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();},time);
  // 鼠标点击关闭后焦点仍在问号，但不得出现黄色外圈。
  await page.locator('#wave-help').click();await page.locator('#wave-help-close').click();
  await page.waitForFunction(()=>focusApp.game.state==='playing');await check(page,'none',`mouse-${width}-${time}`);
  await page.screenshot({path:`output/playwright/wave-help-focus/mouse-${width}-${time}.png`});
  // 从相邻焦点Tab回到问号，Enter与空格均能打开；Esc关闭保留键盘提示。
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await check(page,'solid',`tab-${width}-${time}`);
  await page.keyboard.press('Enter');await page.locator('#wave-help-dialog').waitFor({state:'visible'});await page.keyboard.press('Escape');
  await page.waitForFunction(()=>focusApp.game.state==='playing');await check(page,'solid',`escape-${width}-${time}`);
  if(width===320)await page.screenshot({path:`output/playwright/wave-help-focus/keyboard-320-${time}.png`});
  await page.keyboard.press('Space');await page.locator('#wave-help-dialog').waitFor({state:'visible'});
  await page.locator('#wave-help-close').click();await page.waitForFunction(()=>focusApp.game.state==='playing');await check(page,'none',`keyboard-to-mouse-${width}-${time}`);
 }
 // 独立启用触摸的浏览器上下文，tap生成真实touch pointer事件。
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 try{
  const touch=await context.newPage();touch.on('pageerror',e=>errors.push(e.message));await touch.goto('http://localhost:4243');await prepare(touch);
  for(const time of ['day','night']){
   await touch.evaluate(async time=>{const a=focusApp;Object.assign(a.environment,{time,autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();},time);
   await touch.locator('#wave-help').tap();await touch.locator('#wave-help-close').tap();await touch.waitForFunction(()=>focusApp.game.state==='playing');await check(touch,'none','touch-'+time);
   await touch.screenshot({path:`output/playwright/wave-help-focus/touch-390-${time}.png`});
   await touch.keyboard.press('Tab');await touch.keyboard.press('Shift+Tab');await check(touch,'solid','touch-to-keyboard-'+time);
  }
 }finally{await context.close();}
 if(errors.length)throw Error(errors.join(';'));
 return {pass:true,designCriterion:'wave-compact-help',samples,errors};
}
