// 来信背景与可选寻路验收：隔离存档，检查手机阅读、正式读信和任务推进。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('游戏测试使用4175端口');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],checks=[];t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto('http://localhost:4175');await t.locator('#start').tap();await t.locator('#arrival-skip').tap();await t.locator('#arrival-goal').tap();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};});
  if(!(await t.locator('#arrival-letter-dialog').textContent()).includes('前阵子的暴风雨'))throw Error('来信缺少小镇损毁背景');
  for(const [width,height]of [[320,568],[390,844]]){
   await t.setViewportSize({width,height});
   for(const selector of ['#arrival-letter-dialog','#arrival-letter-done','#arrival-letter-close']){
    const b=await t.locator(selector).boundingBox();if(!b||b.x<0||b.y<0||b.x+b.width>width+1||b.y+b.height>height+1)throw Error('信件控件越界：'+selector);
   }
   const body=t.locator('#arrival-letter-dialog .ui-panel__body');
   await body.evaluate(e=>e.scrollTop=0);await t.screenshot({path:`output/playwright/letter-navigation/letter-top-${width}.png`});
   const layout=await body.evaluate(e=>{e.scrollTop=e.scrollHeight;return {width:e.clientWidth,scrollWidth:e.scrollWidth,top:e.scrollTop,height:e.clientHeight,scrollHeight:e.scrollHeight};});
   if(layout.scrollWidth>layout.width+1||layout.top+layout.height<layout.scrollHeight-1)throw Error('信件不能完整阅读');
   await t.screenshot({path:`output/playwright/letter-navigation/letter-bottom-${width}.png`});
  }
  await t.locator('#arrival-letter-done').tap();if(!await t.evaluate(()=>a.game.progress.arrival.phase==='ride-guide'))throw Error('读信后任务没有推进');checks.push('两种手机尺寸完整阅读、读信后进入上车任务');
  await t.evaluate(async()=>{const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.phase='doing';a.game.progress=p;a.game.reset();a.game.state='playing';a.game.mainlineTalkDelay=99999;a.refresh();});
  await t.locator('#field-menu-toggle').tap();await t.locator('#map-button').tap();await t.locator('#close-map').tap();
  await t.evaluate(async()=>{a.game.progress.mainline.distance=80;(await import('/src/core/mainline-manager.js')).updateMainline(a.game,.05);a.refresh();});
  if(!await t.evaluate(()=>a.game.progress.mainline.phase==='report'&&a.game.progress.mainline.navigationEnabled!==false&&a.game.progress.mainline.seen.navigation===0))throw Error('完成任务仍要求切换寻路');
  if(await t.locator('#task-navigation-toggle.operation-source').count())throw Error('仍强制高亮寻路开关');
  await t.screenshot({path:'output/playwright/letter-navigation/navigation-optional.png'});
  await t.locator('#task-navigation-toggle').tap();if(!await t.evaluate(()=>a.game.progress.mainline.navigationEnabled===false&&a.game.progress.mainline.phase==='report'))throw Error('自主关闭影响任务');checks.push('实际打开地图后推进交付，无需切换寻路，仍可自主关闭');
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(result=>window.letterNavigationResult=result,{checks,errors});
 }finally{await context.close();}
}
