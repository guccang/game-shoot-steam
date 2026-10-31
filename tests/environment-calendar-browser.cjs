// 独立浏览器存档验证配置、历法、Debug和窄屏设置，不操作用户的游戏存档。
async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
 try {
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:4174/');
  await p.locator('#start').tap();await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.game.enemies=[];a.game.spawnTimer=999;});
  await p.waitForFunction(()=>Object.values(a.chronicle.weatherMs).reduce((x,y)=>x+y,0)>200);
  await p.locator('#settings-button').tap();
  if(await p.locator('#performance-summary').isVisible()||await p.locator('#unlock-weapons').isVisible())throw Error('设置直接暴露Debug');
  const beforePause=await p.evaluate(()=>JSON.stringify({years:a.chronicle.years,days:a.chronicle.days,weatherMs:a.chronicle.weatherMs}));
  await p.locator('#environment-button').tap();
  for(const [key,value] of Object.entries({season:'5',day:'2',dusk:'1',night:'2',weather:'2'}))if(await p.locator(`#timing-${key}`).inputValue()!==value)throw Error('默认配置错误');
  for(const key of ['season','day','dusk','night','weather'])await p.locator(`#timing-${key}`).fill('0.5');
  // 模拟环境配置写入失败，界面必须保留旧时长和锚点，不先提交半份设置。
  const originalTiming=await p.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='forest-patrol-environment-v1')throw Error('测试配额不足');return originalSetItem.call(this,key,value);};return JSON.stringify(a.environment.timings);});
  await p.locator('#timing-save').tap();
  if(!await p.locator('#timing-feedback').textContent().then(s=>s.includes('失败')))throw Error('配置保存失败未反馈');
  if(await p.evaluate(()=>JSON.stringify(a.environment.timings))!==originalTiming)throw Error('配置失败未回滚');
  await p.evaluate(()=>{Storage.prototype.setItem=originalSetItem;});
  await p.locator('#timing-save').tap();
  if(!await p.locator('#timing-feedback').textContent().then(s=>s.includes('已保存')))throw Error('配置未保存');
  if(await p.evaluate(()=>Object.values(a.environment.timings).some(v=>v!==30000)))throw Error('实际配置与表单不同');
  await p.locator('#timing-day').fill('0');await p.locator('#timing-save').tap();
  if(await p.evaluate(()=>a.environment.timings.day)!==30000)throw Error('非法时长被接受');
  await p.locator('#timing-day').fill('0.5');
  for(const width of [320,390,1100]) {
   await p.setViewportSize({width,height:844});await p.locator('#environment-dialog').evaluate(d=>{d.scrollTop=d.scrollHeight;});
   await p.screenshot({path:`output/playwright/environment-calendar/settings-${width}.png`});
   if(await p.locator('#environment-dialog').evaluate(d=>d.scrollWidth>d.clientWidth))throw Error('设置横向溢出');
  }
  if(await p.evaluate(()=>JSON.stringify({years:a.chronicle.years,days:a.chronicle.days,weatherMs:a.chronicle.weatherMs}))!==beforePause)throw Error('设置期间累计游玩');
  await p.locator('#environment-ok').tap();await p.locator('#debug-toggle').tap();
  await p.locator('#unlock-weapons').tap();await p.locator('#unlock-vehicles').tap();
  const old=await p.evaluate(()=>({coins:a.game.progress.coins,wood:a.game.progress.wood,materials:{...a.game.progress.materials}}));
  await p.locator('#grant-resources').tap();
  const grants=await p.evaluate(()=>({coins:a.game.progress.coins,wood:a.game.progress.wood,materials:a.game.progress.materials,weapons:a.game.progress.weapons,vehicles:a.game.progress.vehicleHulls}));
  if(grants.weapons.some(v=>v<1)||grants.vehicles.some(v=>v<1)||grants.coins!==old.coins+9999||grants.wood!==old.wood+9999||Object.keys(old.materials).some(k=>grants.materials[k]!==old.materials[k]+9999))throw Error('Debug奖励错误');
  await p.setViewportSize({width:390,height:844});await p.locator('#debug-toggle').scrollIntoViewIfNeeded();await p.screenshot({path:'output/playwright/environment-calendar/debug-expanded.png'});
  await p.locator('#settings-done').tap();await p.locator('#settings-button').tap();
  if(await p.locator('#debug-content').isVisible())throw Error('重新打开未折叠Debug');
  await p.screenshot({path:'output/playwright/environment-calendar/settings-clean.png'});
  await p.locator('#chronicle-button').tap();await p.screenshot({path:'output/playwright/environment-calendar/chronicle-live.png'});
  await p.locator('#chronicle-ok').tap();await p.locator('#settings-done').tap();
  await p.evaluate(()=>{a.environment.time='day';a.environment.dayCycleAt=Date.now()-29950;});
  await p.waitForFunction(()=>a.environment.time==='dusk');
  if(await p.evaluate(()=>Number(document.getElementById('time-picture-progress').style.strokeDashoffset))>5)throw Error('自定义周期未归满');
  const savedDays=await p.evaluate(()=>a.chronicle.days);await p.reload();
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;});
  const restored=await p.evaluate(()=>({timings:a.environment.timings,days:a.chronicle.days,coins:a.game.progress.coins}));
  if(restored.days<savedDays||restored.timings.day!==30000||restored.coins!==grants.coins)throw Error('刷新未恢复配置、档案或Debug');
  await p.locator('#settings-button').tap();
  // 用正式自然时钟生成完整轮转样本，检查独立年天与天气条形图，样本仅存在于隔离上下文。
  await p.evaluate(async()=>{const {createNaturalClock}=await import('/src/world/natural-clock.js');const {normalizeEnvironment}=await import('/src/world/environment.js');const env=normalizeEnvironment({forestSeason:'spring',time:'day',weather:'sun',autoWeather:false},1000000);createNaturalClock(env,a.chronicle,1000000).advance(1200000,2200000);});
  await p.locator('#chronicle-button').tap();
  for(const width of [320,390,1100]){await p.setViewportSize({width,height:844});await p.locator('#chronicle-dialog').evaluate(d=>{d.scrollTop=0;});await p.screenshot({path:`output/playwright/environment-calendar/chronicle-${width}.png`});if(await p.locator('#chronicle-dialog').evaluate(d=>d.scrollWidth>d.clientWidth))throw Error('档案横向溢出');}
  if(!await p.locator('#chronicle-calendar').textContent().then(s=>s.includes('1 年 4 天')))throw Error('跨年展示错误');
  if(errors.length)throw Error(errors.join(';'));return {designCriterion:'environment-calendar-light',grants,restored,errors};
 }finally{await context.close();}
}
