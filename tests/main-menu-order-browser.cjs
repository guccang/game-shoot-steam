// 主菜单真实交互回归：桌面和手机排序、地图入口、消防保留入口及弹窗暂停。
async page => {
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const {freshProgress}=await import('/src/progression/progress.js');
  const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};
  a.game.progress=p;a.game.arrivalScene=null;a.game.reset();a.menu.enter();a.game.start();
  a.game.update=()=>{};a.game.enemies=[];Object.assign(a.game.player,{x:950,y:700});
  Object.assign(a.environment,{weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
  a.renderer.seasons.reset('summer',performance.now());a.refresh();
 });
 for(const [width,height,label] of [[1280,860,'desktop'],[390,844,'390'],[320,740,'320']]){
  await page.setViewportSize({width,height});
  if(!await page.locator('#map-button').isVisible())await page.locator('#field-menu-toggle').click();
  for(const time of ['day','night']){
   await page.evaluate(async time=>{a.environment.time=time;const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.refresh();},time);
   await page.waitForTimeout(180);
   const sample=await page.locator('#field-menu-items').evaluate(n=>({ids:[...n.children].map(b=>b.id),text:n.innerText,overflow:document.documentElement.scrollWidth>innerWidth}));
   if(sample.ids.join(',')!=='story-button,realm-button,heroes-button,weapons-button,vehicles-button,map-button')throw Error(JSON.stringify(sample));
   if(await page.locator('#fire-dispatch-button').count())throw Error('主菜单仍有消防按钮');
   if(sample.overflow)throw Error('页面横向溢出');samples.push({width,time,...sample});
   await page.screenshot({path:`output/playwright/main-menu-order/${label}-${time}.png`});
  }
  await page.locator('#map-button').click();
  if(!await page.locator('#map-dialog').isVisible())throw Error('地图无法打开');
  await page.keyboard.press('Escape');
 }
 if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();
 await page.locator('#realm-button').click();await page.locator('[data-enter-realm="fire"]').click();
 if(!await page.locator('#fire-dialog').isVisible())throw Error('消防玩法入口失效');
 await page.locator('#fire-dialog [data-fire-close]').first().click();
 await page.locator('#fire-notice [data-fire-open]').click();
 if(!await page.locator('#fire-dialog').isVisible())throw Error('火警通知入口失效');
 await page.locator('#fire-dialog [data-fire-dismiss]').click();
 if(errors.length)throw Error(errors.join('\n'));
 return {samples,fireEntry:true,errors};
}
