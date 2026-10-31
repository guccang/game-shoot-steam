// 消防返站与正式昼夜截图的独立恢复入口，所有存档仅写隔离端口。
async page=>{
 if(new URL(page.url()).port!=='4291')throw Error('仅限隔离端口4291');
 const checks=[],views=[];
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.spawnTimer=a.game.fireClock=999;});

 await page.evaluate(()=>{window.clickTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};window.clickSteps=(seconds,input={x:0,y:0})=>{for(let i=0;i<Math.ceil(seconds/.05);i++)clickTick(.05,input);};});
 // 消防原接警流程连续出车，夹具只把已扑灭火势设定为返站场景。
 await page.evaluate(async()=>{
  const g=a.game;Object.assign(g.player,(await import('/src/world/fire-navigation.js')).FIRE_EXIT,{vx:0,vy:0});g.requestFireRescue();if(!g.startFireRescue())throw Error('接警失败');
  for(let i=0;i<3000&&g.fireTransit;i++)clickTick(.05);
  for(const f of g.fireRescue.fires){f.lit=false;f.hp=0;}g.enemies=[];
  clickTick(.05);clickSteps(10);if(g.fireRescue.phase!=='returning')throw Error('消防自动入库');
  a.renderer.camera.time=null;a.renderer.draw();a.refresh();
 });
 await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='fire-parking');
 await page.screenshot({path:'output/playwright/click-fire-mobile.png'});
 await page.locator('#nearby-interaction').click();
 await page.evaluate(()=>{const g=a.game;if(g.fireRescue.phase!=='parking')throw Error('消防点击未入库');for(let i=0;i<2000&&g.fireTransit;i++)clickTick(.05);if(g.fireRescue.phase!=='won')throw Error('消防交接失败');g.dismissFireRescue();});
 checks.push('消防等待不入库，点击后连续交接');
 await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&a.game.state==='playing');
 // 固定正式日夜渲染状态，画面保留猫、停车场载具及远处怪物。
 await page.evaluate(async()=>{
  const g=a.game;Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door,{vx:0,vy:0});g.enemies=[];g.spawnEnemy(.5,220);a.renderer.camera.time=null;
 });
 for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time,forestSeason:'summer'});
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.renderer.resize();a.renderer.draw();a.refresh();
  },time);
  await page.waitForTimeout(150);
  const v=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectNearbyInteraction(a.game,document);return {...r,time:a.environment.time};});
  if(!v.visible||!v.touchTarget||v.overflow)throw Error('按钮尺寸或溢出 '+JSON.stringify(v));
  await page.screenshot({path:'output/playwright/click-'+width+'-'+time+'.png'});views.push({width,height,...v});
 }
 if(await page.locator('#nearby-interaction').textContent()!=='点击 · 进入巡林小屋')throw Error('目标错误');
 await page.locator('#nearby-interaction').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!!a.game.cottage);checks.push('电脑键盘确认同一按钮');
 return {checks,views};
}
