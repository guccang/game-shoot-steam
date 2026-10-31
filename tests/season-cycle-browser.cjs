// 真实设置与应用帧循环验证倒计时、四季轮转、手动重置和刷新入场随机。
async (page) => {
 if(new URL(page.url()).port!=='4174')throw Error('仅使用隔离端口');
 const context=await page.context().browser().newContext({viewport:{width:320,height:844},hasTouch:true});
 try {
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:4174/');
  const entries=[];
  for(let i=0;i<3;i++) {
   const entry=await p.evaluate(async()=>{
    window.a=(await import('/src/main.js')).application;
    const {SEASON_WEATHER_WEIGHTS}=await import('/src/world/season-weather.js');
    if(!(SEASON_WEATHER_WEIGHTS[a.environment.forestSeason]?.[a.environment.weather]>0))throw Error('入场天气不匹配');
    if(Date.now()-a.environment.seasonAt>15000)throw Error('入场未重置时钟');
    return {season:a.environment.forestSeason,weather:a.environment.weather,at:a.environment.seasonAt};
   });entries.push(entry);
   if(i<2) {
    // 写入与本次时钟明显不同的旧选择，重新加载必须开始新的随机进程。
    await p.evaluate(()=>{localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({...a.environment,forestSeason:'winter',weather:'thunder',seasonAt:1,autoTime:false,autoWeather:false}));});
    await p.reload();
   }
  }
  await p.locator('#start').tap();
  if(await p.evaluate(()=>a.environment.seasonAt)!==entries.at(-1).at)throw Error('开始战斗重复随机');
  await p.evaluate(()=>{a.game.spawnTimer=999;a.game.attackTimer=999;a.game.enemies=[];});
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();
  await p.locator('[data-forest-season="spring"]').tap();await p.locator('#auto-time').uncheck();await p.locator('#auto-weather').check();
  await p.screenshot({path:'output/playwright/season-cycle-entry/settings-320.png'});
  await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  const transitions=[];
  for(const next of ['summer','autumn','winter','spring']) {
   await p.evaluate(()=>{a.environment.seasonAt=Date.now()-299200;});
   await p.waitForFunction(()=>Number(document.getElementById('season-picture-progress').style.strokeDashoffset)>99);
   await p.screenshot({path:`output/playwright/season-cycle-entry/before-${next}.png`});
   await p.waitForFunction(next=>a.environment.forestSeason===next,next);
   await p.waitForFunction(next=>a.renderer.ground.season===next,next);
   const state=await p.evaluate(async()=>{
    const {SEASON_WEATHER_WEIGHTS}=await import('/src/world/season-weather.js');
    if(!SEASON_WEATHER_WEIGHTS[a.environment.forestSeason][a.environment.weather])throw Error('换季仍用旧季节天气');
    if(Number(document.getElementById('season-picture-progress').style.strokeDashoffset)>1)throw Error('换季圆环未重置');
    return {season:a.environment.forestSeason,weather:a.environment.weather,state:a.game.state};
   });transitions.push(state);
   await p.screenshot({path:`output/playwright/season-cycle-entry/after-${next}.png`});
  }
  await p.evaluate(()=>{a.environment.seasonAt=Date.now()-290000;});
  const prior=await p.evaluate(()=>a.environment.forestSeason);await p.locator('#season-picture').tap();
  const manual=await p.evaluate(()=>({season:a.environment.forestSeason,remaining:300000-(Date.now()-a.environment.seasonAt),at:a.environment.seasonAt}));
  if(manual.season===prior||manual.remaining<298000)throw Error('图片手动切季没有重置');
  await p.locator('#weather-picture').tap();if(await p.evaluate(()=>a.environment.seasonAt)!==manual.at)throw Error('切天气重置了四季');
  for(const width of [320,390,1100]) {
   await p.setViewportSize({width,height:844});
   const fit=await p.evaluate(()=>{const label=document.getElementById('season-picture-label').getBoundingClientRect(),button=document.getElementById('season-picture').getBoundingClientRect();return label.x>=button.x&&label.right<=button.right&&button.width>=44&&document.documentElement.scrollWidth<=innerWidth;});
   if(!fit)throw Error('倒计时挤出图片按钮');
   await p.screenshot({path:`output/playwright/season-cycle-entry/hud-${width}.png`});
  }
  await context.close();if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:'season-clock-entry',entries,transitions,manualReset:true,weatherKeepsClock:true,widths:[320,390,1100],errors};
 } catch(error){await context.close();throw error;}
}
