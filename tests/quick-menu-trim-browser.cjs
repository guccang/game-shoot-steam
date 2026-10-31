// 快捷菜单精简实机检查：删除入口不留空格，剩余菜单仍可点击，昼夜复用正式场景。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired.push('garage');
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game;g.update=()=>{};g.enemies=[];Object.assign(g.player,{x:630,y:360});
  g.spawnEnemy(0,80);Object.assign(g.enemies[0],{x:660,y:420});a.renderer.camera.time=null;a.refresh();
 });
 for(const [width,height] of [[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  },phase);
  if(!await page.locator('#phone-button').isVisible())await page.locator('#field-menu-toggle').click();
  const sample=await page.locator('#field-menu-items').evaluate(n=>({names:[...n.children].filter(b=>b.checkVisibility()).map(b=>b.textContent.trim()),rect:n.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth}));
  if(await page.locator('#monster-camps-menu,#farm-delivery-menu,#seed-shop-menu,#mainline-book-menu').count())throw Error('已移除入口仍被创建');
  if(sample.overflow||sample.rect.y<0||sample.rect.bottom>height)throw Error('菜单超出手机屏幕');
  for(const name of ['种地','任务','邻里','手机','娱乐','角色','武器','载具','背包'])if(!sample.names.includes(name))throw Error('剩余入口缺失：'+name);
  samples.push({width,phase,...sample});await page.screenshot({path:`output/playwright/quick-menu-trim/${width}-${phase}.png`});
  await page.locator('#phone-button').click();await page.locator('#phone-dialog').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'quick-menu-trim',samples,errors};
}
