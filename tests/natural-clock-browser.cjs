// 独立存档与浏览器受控时钟验收，快进真实应用帧而非直接修改累计值。
async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
 try {
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:4174/');await p.locator('#start').tap();
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.game.enemies=[];a.game.spawnTimer=999999;});
  await p.clock.install();await p.clock.runFor(50);
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();
  for(const key of ['season','day','dusk','night','weather'])await p.locator(`#timing-${key}`).fill('0.5');
  await p.locator('#timing-save').tap();
  await p.locator('[data-forest-season="spring"]').tap();await p.locator('button[data-time="day"]').tap();
  await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();await p.clock.runFor(50);
  await p.clock.fastForward(119000);
  if(await p.evaluate(()=>a.chronicle.years!==0||a.chronicle.days!==1))throw Error('完整轮转前计数错误');
  await p.clock.fastForward(2000);
  if(await p.evaluate(()=>a.chronicle.years!==1||a.chronicle.days!==1||a.environment.forestSeason!=='spring'))throw Error('四季/昼夜没有同步自然历法');
  const before=await p.evaluate(()=>({years:a.chronicle.years,days:a.chronicle.days}));
  for(let i=0;i<8;i++){await p.locator('#season-picture').tap();await p.locator('#time-picture').tap();}
  if(await p.evaluate(b=>a.chronicle.years!==b.years||a.chronicle.days!==b.days,before))throw Error('手动点击增加历法');
  await p.locator('#settings-button').tap();await p.clock.runFor(50);
  const paused=await p.evaluate(async()=>{
   const {seasonRemaining}=await import('/src/world/seasons.js');const {dayPhaseRemaining}=await import('/src/world/environment.js');
   return {record:JSON.stringify(a.chronicle),season:seasonRemaining(a.environment),day:dayPhaseRemaining(a.environment)};
  });
  await p.clock.fastForward(86400000);
  const resumed=await p.evaluate(async()=>{
   const {seasonRemaining}=await import('/src/world/seasons.js');const {dayPhaseRemaining}=await import('/src/world/environment.js');
   return {record:JSON.stringify(a.chronicle),season:seasonRemaining(a.environment),day:dayPhaseRemaining(a.environment)};
  });
  if(paused.record!==resumed.record||Math.abs(paused.season-resumed.season)>30||Math.abs(paused.day-resumed.day)>30)throw Error('暂停时历法或圆环继续运行');
  await p.locator('#chronicle-button').tap();
  if(!await p.locator('#chronicle-calendar').textContent().then(s=>s.includes('1 年 1 天')))throw Error('档案页数字错误');
  if(!await p.locator('#chronicle-dialog').textContent().then(s=>s.includes('两者独立累计')&&!s.includes('365')))throw Error('仍有旧历法说明');
  for(const width of [320,390,1100]){
   await p.setViewportSize({width,height:844});await p.locator('#chronicle-dialog').evaluate(d=>{d.scrollTop=0;});
   await p.screenshot({path:`output/playwright/calendar-natural-cycles/chronicle-${width}.png`});
   if(await p.locator('#chronicle-dialog').evaluate(d=>d.scrollWidth>d.clientWidth))throw Error('档案页横向溢出');
  }
  await p.reload();await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;});
  if(await p.evaluate(()=>a.chronicle.years!==1||a.chronicle.days!==1))throw Error('刷新丢失历史或补算离线');
  if(errors.length)throw Error(errors.join(';'));
  return {years:1,days:1,manualSwitches:16,pausedHours:24,widths:[320,390,1100],errors};
 }finally{await context.close();}
}
