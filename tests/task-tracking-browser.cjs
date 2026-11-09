// 同时保留主线和多个委托，验证真实接取/切换/刷新/E键/昼夜画面的一致目标。
async page=>{
 if(new URL(page.url()).port!=='4252')throw Error('仅使用任务指引隔离端口4252');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;await a.ready;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress(),ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;
  p.mainline.completed=ids.slice(0,ids.indexOf('neighbors'));p.mainline.phase='doing';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;Object.assign(a.game.player,{x:650,y:1840});a.game.mainlineTalkDelay=999;});
 // 手机与桌面走同一真实入口；当前卡片也可直接打开所追踪任务的详情。
 async function openBoard(){
  if(!await page.locator('#living-menu').isVisible())await page.locator('#field-menu-toggle').click();
  await page.locator('#living-menu').click();
 }
 async function closeBoard(){await page.locator('#living-close').click();await page.waitForTimeout(250);}
 async function inspect(label,id,kind='living'){
  const state=await page.evaluate(async()=>{a.refresh();return (await import('/src/rendering/visual-review.js')).inspectActiveTask(a.game,document);});
  if(state.card.hidden||state.card.id!==id||state.card.kind!==kind||state.overflow||kind==='living'&&(state.mainline||state.speech||state.routes.length!==1||state.routes[0]!==id)||kind==='mainline'&&(state.living||state.routes.length))throw Error(label+JSON.stringify(state));
  samples.push({label,...state});return state;
 }
 await openBoard();await page.locator('[data-living-accept="neighbors-lunch"]').click();await closeBoard();await inspect('accept-lunch','neighbors-lunch');
 await page.locator('#mainline-hud').click();await page.locator('[data-living-accept="neighbors-night"]').click();await closeBoard();await inspect('accept-night','neighbors-night');
 await page.locator('#mainline-hud').click();await page.locator('[data-living-track="neighbors-lunch"]').click();await closeBoard();await inspect('switch-lunch','neighbors-lunch');
 await page.locator('#mainline-hud').click();await page.locator('[data-living-mainline]').click();await closeBoard();await inspect('switch-mainline','neighbors','mainline');
 await openBoard();await page.locator('[data-living-track="neighbors-lunch"]').click();await closeBoard();
 await page.evaluate(()=>a.save());await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;Object.assign(a.game.player,{x:650,y:1520});a.game.time+=2;});
 await page.waitForTimeout(650);await inspect('reload-lunch','neighbors-lunch');
 const before=await page.evaluate(()=>a.game.player.y);await page.keyboard.down('s');await page.waitForTimeout(400);await page.keyboard.up('s');
 if(await page.evaluate(()=>a.game.player.y)<=before)throw Error('真实按键未移动');
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:900});
  await page.evaluate(async time=>{
   const g=a.game;Object.assign(g.player,{x:650,y:1520});g.progress.living.calendar.elapsed=time==='day'?100000:1000000;
   Object.assign(a.environment,{livingPreview:true,time,weather:'sun',forestSeason:'spring',autoTime:false,autoWeather:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);g.time+=1;
  },time);
  await page.waitForTimeout(200);await inspect(width+'-'+time,'neighbors-lunch');
  await page.screenshot({path:'output/playwright/active-task/'+width+'-'+time+'.png'});
 }
 // 每步真实按E提交；贴近委托板也必须推进当前目标，而不是只打开另一份列表。
 await page.evaluate(()=>{a.environment.livingPreview=false;a.game.livingPreview=false;});
 for(let stage=0;stage<4;stage++){
  await page.evaluate(async()=>{
   const spec=(await import('/src/config/living-world.js')).LIVING_REQUESTS[0],t=(await import('/src/core/camp/living-world.js')).livingRequestTarget(a.game,spec);
   Object.assign(a.game.player,{x:t.x,y:t.y});a.game.time+=1;a.refresh();
  });
  await page.waitForTimeout(120);await page.keyboard.press('e');await page.locator('#living-dialog').waitFor({state:'visible'});
  const actual=await page.evaluate(()=>a.game.progress.living.requests['neighbors-lunch'].stage);
  if(actual!==stage+1)throw Error('现场E键没有推进阶段 '+stage+' -> '+actual);
  await closeBoard();
 }
 await inspect('completed-return-mainline','neighbors','mainline');
 const completed=await page.evaluate(()=>a.game.progress.living.requests['neighbors-lunch'].completed);
 if(!completed)throw Error('午餐未完成');
 await openBoard();await page.locator('[data-living-track="neighbors-night"]').click();await closeBoard();await inspect('manual-resume-night','neighbors-night');
 await openBoard();await page.locator('[data-living-mainline]').click();await closeBoard();await inspect('return-mainline','neighbors','mainline');
 if(await page.evaluate(()=>a.game.progress.mainline.phase)!=='report')throw Error('主线未识别真实午餐完成');
 if(errors.length)throw Error(errors.join(';'));
 return {pass:true,designCriterion:'active-task-guidance',samples,completed,errors};
}
