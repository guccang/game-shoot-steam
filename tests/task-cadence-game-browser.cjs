// 正式游戏数值反馈验收：新增主力门槛的任务簿、角色入口和工坊引导；截图为代表存档。
async page=>{
 if(new URL(page.url()).port!=='4288')throw Error('仅运行于隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4288/');await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源未就绪');
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js');
  const p=freshProgress();p.coins=2000;p.wood=1000;p.weapons[0]=4;p.heroes[0]=4;p.mainline.completed=MAINLINE_IDS.slice(0,4);p.mainline.phase='doing';
  const g=a.game;g.progress=p;g.arrivalScene=null;g.reset();a.menu.enter();g.start();g.mainlineTalkDelay=9999;
  g.enemies=[];g.boss=null;g.progress.living.patrolActive=false;Object.assign(g.player,MAINLINE_SITES.weaponsEntry);a.refresh();
 });
 const samples=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},time);
  await page.locator('#mainline-info').click();await page.locator('#mainline-dialog').waitFor({state:'visible'});
  const text=await page.locator('#mainline-dialog').innerText();if(!text.includes('5级')||!text.includes('金币 +200'))throw Error('新任务反馈缺失');
  const layout=await page.locator('#mainline-dialog').evaluate(el=>({width:el.getBoundingClientRect().width,overflow:el.scrollWidth>el.clientWidth+1}));if(layout.overflow||layout.width>width)throw Error('任务簿溢出');
  await page.screenshot({path:`output/playwright/task-cadence/game-${width}-${time}.png`});samples.push({viewportWidth:width,time,...layout});await page.locator('#mainline-close').click();
 }
 await page.locator('#mainline-hud').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 const workshop=await page.locator('#workshop-dialog').innerText();if(!workshop.includes('松果手枪'))throw Error('未指向主力手枪');
 await page.screenshot({path:'output/playwright/task-cadence/upgrade-guide.png'});
 await page.locator('#ws-close').click();await page.evaluate(()=>{a.game.progress.weapons[0]=5;a.refresh();});
 await page.locator('#mainline-hud').click();
 const hero=await page.locator('#camp-dialog').isVisible().catch(()=>false);
 if(!hero)throw Error('未打开角色升级页');
 await page.screenshot({path:'output/playwright/task-cadence/hero-guide.png'});
 if(errors.length)throw Error(errors.join('\n'));return {errors,samples,weaponEntry:true,heroEntry:true};
}
