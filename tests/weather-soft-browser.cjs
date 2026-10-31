// 真实主界面验证有序切季、双圆环和雨雪起停，不通过点击修改战斗状态。
async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:'output/playwright/weather-soft-cycle/video',size:{width:390,height:844}}});
 try {
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:4174/');await p.locator('#start').tap();
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.game.enemies=[];a.game.spawnTimer=999;a.game.attackTimer=999;});
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();await p.locator('[data-forest-season="spring"]').tap();await p.locator('#auto-time').uncheck();await p.locator('#auto-weather').check();await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  const order=[];
  for(const expected of ['summer','autumn','winter','spring','summer','autumn','winter','spring']){
   const before=await p.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await p.locator('#season-picture').tap();
   const state=await p.evaluate(()=>({season:a.environment.forestSeason,x:a.game.player.x,y:a.game.player.y,state:a.game.state,offset:Number(document.getElementById('season-picture-progress').style.strokeDashoffset)}));
   if(state.season!==expected||state.state!=='playing'||state.x!==before.x||state.y!==before.y||state.offset>1)throw Error('季节顺序/圆环/战斗状态异常');order.push(state.season);
  }
  await p.evaluate(()=>{a.environment.weatherAt=Date.now()-a.environment.timings.weather/2;});
  await p.waitForFunction(()=>Number(document.getElementById('weather-picture-progress').style.strokeDashoffset)>49);
  await p.screenshot({path:'output/playwright/weather-soft-cycle/rings-half.png'});
  const seasonAt=await p.evaluate(()=>a.environment.seasonAt),weather=await p.evaluate(()=>a.environment.weather);
  await p.locator('#weather-picture').tap();
  const manual=await p.evaluate(()=>({seasonAt:a.environment.seasonAt,weather:a.environment.weather,offset:Number(document.getElementById('weather-picture-progress').style.strokeDashoffset)}));
  if(manual.weather===weather||manual.seasonAt!==seasonAt||manual.offset>1)throw Error('随机天气或独立圆环异常');
  await p.evaluate(()=>{a.environment.weatherAt=Date.now()-a.environment.timings.weather+100;});
  await p.waitForFunction(old=>a.environment.weather!==old,manual.weather);
  if(await p.evaluate(()=>Number(document.getElementById('weather-picture-progress').style.strokeDashoffset))>1)throw Error('自动天气圆环未重置');
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();await p.locator('#auto-weather').uncheck();await p.locator('button[data-weather="sun"]').tap();await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  await p.evaluate(async()=>{const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,performance.now());a.renderer.tone=new SceneTone(a.environment,performance.now());});
  if(await p.locator('#weather-picture').getAttribute('data-running')!=='false')throw Error('固定天气未暂停圆环');
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();await p.locator('button[data-weather="rain"]').tap();await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  await p.waitForFunction(()=>a.renderer.light.sample(performance.now()).rain>.05);
  const early=await p.evaluate(()=>a.renderer.light.sample(performance.now()).rain);if(early>=.9)throw Error('降雨瞬间出现');
  await p.screenshot({path:'output/playwright/weather-soft-cycle/rain-start.png'});
  await p.waitForFunction(()=>a.renderer.light.sample(performance.now()).rain===1,{},{timeout:30000});
  await p.screenshot({path:'output/playwright/weather-soft-cycle/rain-full.png'});
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();await p.locator('button[data-weather="sun"]').tap();await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  const stopping=await p.evaluate(()=>a.renderer.light.sample(performance.now()).rain);if(stopping<=.5)throw Error('降雨瞬间消失');
  await p.waitForFunction(()=>a.renderer.light.sample(performance.now()).rain===0,{},{timeout:30000});
  if(await p.evaluate(()=>a.renderer.rain.drops.length)!==0)throw Error('晴天残留雨滴');
  for(const width of [320,390,1100]){
   await p.setViewportSize({width,height:844});
   const valid=await p.evaluate(()=>['season','weather'].every(kind=>{const b=document.getElementById(`${kind}-picture`),r=b.getBoundingClientRect();return r.width>=44&&r.x>=0&&r.right<=innerWidth&&!/\d/.test(b.textContent+b.getAttribute('aria-label'));})&&document.documentElement.scrollWidth<=innerWidth);
   if(!valid)throw Error('圆环有数字或触控区域溢出');await p.screenshot({path:`output/playwright/weather-soft-cycle/hud-${width}.png`});
  }
  const video=await p.video().path();await context.close();if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:['weather-soft-transition','weather-ring-clock','season-ordered-click'],order,manual,early,stopping,widths:[320,390,1100],video,errors};
 }catch(error){await context.close();throw error;}
}
