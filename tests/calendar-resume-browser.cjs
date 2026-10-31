// 使用独立浏览器存档验证真实退出、离线重进与剩余轮转，不改写累计值。
async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
 try {
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:4174/');await p.locator('#start').tap();
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.game.enemies=[];a.game.spawnTimer=999999;});
  await p.clock.install();await p.clock.runFor(50);
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();
  for(const key of ['season','day','dusk','night','weather'])await p.locator(`#timing-${key}`).fill('0.5');
  await p.locator('#timing-save').tap();await p.locator('[data-forest-season="spring"]').tap();await p.locator('button[data-time="day"]').tap();
  await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();await p.clock.runFor(50);
  await p.clock.fastForward(349000);await p.locator('#settings-button').tap();
  const before=await p.evaluate(()=>JSON.parse(JSON.stringify(a.chronicle)));
  if(before.years!==2||before.days!==3||before.cycles.season.steps!==3||before.cycles.day.steps!==2)throw Error('准备阶段不正确');
  await p.goto('about:blank');await p.clock.fastForward(86400000);await p.goto('http://localhost:4174/');
  const after=await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;return JSON.parse(JSON.stringify(a.chronicle));});
  for(const kind of ['season','day']){
   if(before.cycles[kind].phase!==after.cycles[kind].phase||before.cycles[kind].steps!==after.cycles[kind].steps||Math.abs(before.cycles[kind].elapsed-after.cycles[kind].elapsed)>1)throw Error('退出丢失未完成进度：'+kind);
  }
  if(before.years!==after.years||before.days!==after.days||JSON.stringify(before.weatherMs)!==JSON.stringify(after.weatherMs))throw Error('离线增加累计');
  if(await p.evaluate(()=>a.environment.forestSeason!=='winter'||a.environment.time!=='night'))throw Error('季节/时段被入场随机覆盖');
  await p.reload();await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;});
  if(await p.evaluate(()=>a.chronicle.cycles.season.steps!==3||a.chronicle.cycles.day.steps!==2))throw Error('再次刷新丢失阶段进度');
  await p.locator('#resume').tap();await p.evaluate(()=>{a.game.enemies=[];a.game.spawnTimer=999999;});await p.clock.runFor(50);
  const left=Math.max(after.cycles.season.duration-after.cycles.season.elapsed,after.cycles.day.duration-after.cycles.day.elapsed);
  await p.clock.fastForward(Math.ceil(left)+1000);
  if(await p.evaluate(()=>a.chronicle.years!==3||a.chronicle.days!==4))throw Error('未接着剩余轮转入账');
  await p.locator('#settings-button').tap();await p.locator('#chronicle-button').tap();
  await p.screenshot({path:'output/playwright/calendar-resume-progress/resumed-chronicle.png'});
  if(errors.length)throw Error(errors.join(';'));
  return {before,after,final:{years:3,days:4},offlineHours:24,errors};
 }finally{await context.close();}
}
