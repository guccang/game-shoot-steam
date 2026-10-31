// 独立触屏浏览器使用真实 touch 输入，验证按钮与单指拖动互不抢占。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const t=await context.newPage(),errors=[];t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto('http://localhost:4291/');
  await t.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();
   const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await t.reload();await t.locator('#start').tap();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.enemies=[];g.spawnTimer=g.fireClock=999;Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door,{vx:0,vy:0});a.renderer.camera.time=null;});
  await t.locator('#nearby-interaction').tap();await t.waitForFunction(()=>!!a.game.cottage);
  const before=await t.evaluate(()=>a.game.player.y),cdp=await context.newCDPSession(t);
  // 在画布空白处起拖，避开操作按钮，移动由原单指摇杆处理。
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:290,y:650}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:290,y:585}]});
  await t.waitForTimeout(500);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const after=await t.evaluate(()=>a.game.player.y);if(after>=before-10)throw Error('触屏拖动未移动');
  await t.locator('#cottage-exit').tap();await t.waitForFunction(()=>!a.game.cottage);
  await t.setViewportSize({width:844,height:390});await t.waitForTimeout(200);
  await t.screenshot({path:'output/playwright/click-touch-landscape.png'});
  await t.locator('#nearby-interaction').tap();await t.waitForFunction(()=>!!a.game.cottage);
  if(errors.length)throw Error(errors.join('\n'));
  return {touch:true,dragDistance:before-after,portraitAndLandscapeTap:true,errors};
 }finally{await context.close();}
}
