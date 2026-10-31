// 新手对白与拆分后的双工坊字体复核，使用正式初始化和绘制器。
async page=>{
 if(new URL(page.url()).port!=='4199')throw Error('Use isolated port 4199');
 const errors=[],checks=[];page.on('pageerror',error=>errors.push(error.message));
 // 检查可见正文的实际字体与横向溢出，并保存正式界面。
 async function capture(name,selector){
  const node=page.locator(selector);await node.waitFor({state:'visible'});
  const result=await node.evaluate(root=>{
   const nodes=[root,...root.querySelectorAll('*')].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&[...n.childNodes].some(t=>t.nodeType===3&&t.textContent.trim()));
   return {status:document.documentElement.dataset.fontStatus,wrong:nodes.filter(n=>!getComputedStyle(n).fontFamily.includes('HYQiHei75S')).map(n=>n.id||n.tagName),
    clipped:nodes.filter(n=>!n.children.length&&n.clientWidth&&n.scrollWidth>n.clientWidth+3&&getComputedStyle(n).textOverflow!=='ellipsis').map(n=>n.textContent),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  if(result.status!=='ready'||result.wrong.length||result.clipped.length||result.overflow)throw Error(name+JSON.stringify(result));
  await page.screenshot({path:'output/playwright/font-'+name+'.png'});checks.push(name);
 }
 for(const lang of ['zh-CN','en-US']){
  await page.goto('http://localhost:4199/?lang='+lang);
  await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application;await a.ready;
   const tick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};
   a.menu.enter();a.game.resetProgress();a.game.start();
   for(let i=0;i<281;i++)tick(.05);for(let i=0;i<5;i++)a.game.advanceArrival();a.refresh();
  });
  for(const width of [1280,390,320])for(const time of ['day','night']){
   await page.setViewportSize({width,height:width===1280?900:844});
   await page.evaluate(async time=>{
    const a=(await import('/src/main.js')).application;
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.resize();a.renderer.draw();a.refresh();
   },time);
   await capture('arrival-'+lang+'-'+width+'-'+time,'.ranger-arrival');
  }
  await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application,{freshProgress}=await import('/src/progression/progress.js');
   a.destroy();localStorage.setItem('forest-patrol-v1',JSON.stringify(freshProgress()));
  });
  // 重新初始化旧档场景，避免测试直接替换进度时保留前一幕的演出对象。
  await page.reload();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.menu.enter();});
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:width===1280?900:844});
   for(const kind of ['weapons','vehicle']){
    await page.evaluate(async kind=>(await import('/src/main.js')).application.workshop.open(kind,kind==='vehicle'?5:0),kind);
    await capture(kind+'-'+lang+'-'+width,'#workshop-dialog');await page.locator('#ws-close').click();
   }
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {checks,errors};
}
