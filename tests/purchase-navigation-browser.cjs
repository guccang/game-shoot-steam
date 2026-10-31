// 在隔离端口用真实任务卡验证购买导航，手机昼夜保留原缺口提示。
async page=>{
 if(new URL(page.url()).port!=='4299')throw Error('仅限隔离测试端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();localStorage.clear();const p=(await import('/src/progression/progress.js')).freshProgress(),ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=ids.slice(0,ids.indexOf('buy-shotgun'));p.mainline.phase='doing';p.equipmentGoal={kind:'weapons',index:3};p.coins=0;p.wood=0;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};a.game.enemies=[];Object.assign(a.game.player,{x:2200,y:2200});a.renderer.camera.time=null;a.refresh();});
 const samples=[];
 for(const width of [320,390])for(const phase of ['day','night']){
  await page.setViewportSize({width,height:844});await page.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},phase);
  await page.locator('#mainline-hud').click();await page.waitForTimeout(100);
  const state=await page.evaluate(async()=>({nav:(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game),route:(await import('/src/core/story-route.js')).storyRouteState(a.game),bearing:document.querySelector('.mainline-bearing').hidden,shortage:document.getElementById('equipment-goal').textContent,overflow:document.documentElement.scrollWidth>innerWidth}));
  if(state.nav||state.route||!state.bearing||!state.shortage.includes('还差')||state.overflow)throw Error(JSON.stringify(state));samples.push({width,phase,...state});await page.screenshot({path:`output/playwright/purchase-navigation/shortage-${width}-${phase}.png`});
 }
 await page.evaluate(async()=>{const g=a.game;for(const r of (await import('/src/progression/equipment-goals.js')).equipmentRequirements(g.progress,'weapons',3)){if(['coins','wood'].includes(r.key))g.progress[r.key]=r.need;else g.progress.materials[r.key]=r.need;}a.refresh();});
 await page.locator('#mainline-hud').click();await page.waitForTimeout(100);
 if(!await page.evaluate(async()=>!!(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game)))throw Error('可购买时未建立路线');
 await page.evaluate(()=>{a.game.progress.coins=0;a.refresh();});await page.waitForTimeout(100);
 if(!await page.locator('.mainline-bearing').evaluate(n=>n.hidden))throw Error('消费资源后旧路线未撤销');
 if(errors.length)throw Error(errors.join('；'));return {samples,ready:true,revoked:true,errors};
}
