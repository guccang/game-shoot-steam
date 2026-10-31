// 在既有隔离浏览器中检查手机昼夜、自然射击、真实触摸移动与画面边界；先运行horde-feel-browser。
async page=>{
 const rows=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const touch=await page.context().newCDPSession(page);
 for(const [width,height,time,mounted] of [[390,844,'day',false],[390,844,'night',true],[320,568,'day',true],[320,568,'night',false]]){
  await page.setViewportSize({width,height});
  await page.evaluate(async args=>{
   await hordeFixture(args);const g=hordeApp.game;
   g.wave=args.round*5+5;g.waveGroupStart=args.round*5+1;g.bossWave=g.wave;
   // 帧间隔只观察浏览器实际绘制节奏，不快进游戏时间。
   window.hordeFrames=[];window.hordeLast=performance.now();window.hordeMeasuring=true;
   const observe=now=>{if(!window.hordeMeasuring)return;hordeFrames.push(now-hordeLast);hordeLast=now;requestAnimationFrame(observe);};requestAnimationFrame(observe);
  },{weapon:3,mounted,time,round:3,level:3});
  await page.waitForTimeout(2200);
  const origin=await page.evaluate(()=>({x:hordeApp.game.player.x,y:hordeApp.game.player.y}));
  // 在空地拖动真实触控摇杆；避开HUD、设置与菜单。
  const y=Math.floor(height*.65),x=Math.floor(width*.32);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-45,y:y+12}]});
  await page.waitForTimeout(450);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(2200);
  const result=await page.evaluate(origin=>{
   const a=hordeApp,g=a.game;hordeMeasuring=false;
   const frames=hordeFrames.slice(10).sort((a,b)=>a-b);
   return {state:g.state,peak:hordeMetrics.peak,kills:g.kills,alive:g.enemies.filter(e=>e.hp>0).length,
    moved:Math.hypot(g.player.x-origin.x,g.player.y-origin.y),vehicle:g.vehicle.active,night:a.renderer.light.sample(performance.now()).night,
    overflow:document.documentElement.scrollWidth>innerWidth,p95:frames[Math.floor(frames.length*.95)]??0};
  },origin);
  if(result.state!=='playing'||result.moved<5||result.kills<1||result.alive>24||result.overflow||result.vehicle!==mounted||Math.abs(result.night-Number(time==='night'))>.01)throw Error(JSON.stringify(result));
  await page.screenshot({path:`output/playwright/horde-feel/${width}-${time}-${mounted?'vehicle':'shotgun'}.png`});
  rows.push({width,height,time,mounted,...result});
 }
 await touch.detach();if(errors.length)throw Error(errors.join('\n'));
 return {rows,errors};
}
