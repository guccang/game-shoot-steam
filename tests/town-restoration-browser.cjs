// 隔离浏览器验证自动投料与解锁闭环，正式绘制器覆盖手机昼夜和窄屏底板。
async page=>{
 if(new URL(page.url()).port!=='4291')throw Error('仅限隔离测试端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};p.weapons[14]=1;p.weapon=0;
  p.mainline.completed=['first-map'];p.mainline.phase='doing';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game;g.enemies=[];g.attackTimer=g.fireClock=999;
  window.normalUpdate=Object.getPrototypeOf(g).update.bind(g);
  window.fs=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
  window.ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});
 });
 await page.setViewportSize({width:390,height:844});
 // 以真实键盘输入从门外走近，不点击修复。
 await page.evaluate(()=>{
  const f=fs[0],g=a.game;g.progress.wood=200;g.progress.restoration.gathered[f.id]=f.wood;
  Object.assign(g.player,{x:f.site.x,y:f.site.y+130,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
 });
 await page.locator('#game').click({position:{x:10,y:250}});
 await page.keyboard.down('ArrowUp');
 await page.waitForFunction(()=>!!a.game.progress.restoration.build,null,{timeout:15000});
 await page.keyboard.up('ArrowUp');
 await page.waitForFunction(()=>a.game.progress.restoration.build?.elapsed>.2);
 await page.screenshot({path:'output/playwright/restoration-transfer.png'});
 await page.waitForFunction(()=>a.game.progress.restoration.repaired.includes('clearing'));
 const first=await page.evaluate(()=>({wood:a.game.progress.wood,repaired:a.game.progress.restoration.repaired}));
 if(first.wood!==160)throw Error('自动修复重复扣费 '+JSON.stringify(first));
 // 修好之后仍需点击进入功能，自动修复不能直接弹出清缴页。
 if(await page.locator('#clearing-dialog').isVisible())throw Error('修复后不应自动进入玩法');
 await page.evaluate(()=>{a.game.update=()=>{};Object.assign(a.game.player,fs[0].site);a.renderer.camera.time=null;a.refresh();});
 await page.locator('#nearby-interaction').click();
 await page.locator('#clearing-dialog').waitFor({state:'visible'});
 await page.locator('#clearing-close').click();
 // 远处菜单点到未修复功能，必须显示修复条件。
 await page.evaluate(()=>document.getElementById('vehicles-button').click());
 await page.locator('#restoration-dialog').waitFor({state:'visible'});
 if(!(await page.locator('#restoration-title').textContent()).includes('载具'))throw Error('载具入口未拦截');
 for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('#restoration-dialog .ui-panel__footer button,#restoration-close')].map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))}));
  if(layout.overflow||layout.buttons.some(b=>b.h<44))throw Error('手机底板不合格 '+JSON.stringify(layout));
  await page.screenshot({path:'output/playwright/restoration-panel-'+size.width+'.png'});
 }
 await page.locator('#restoration-close').click();
 // 各建筑原地破败与修复完成使用同一正式场景，保留原体积和遮挡。
 for(const time of ['day','night']){
  await page.evaluate(async time=>{
   const {LIVING_PHASES}=await import('/src/config/living-world.js');
   a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start;
   a.environment.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();
   const {EnvironmentTransition}=await import('/src/world/environment.js');
   const {SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
  },time);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:width===1280?900:width===320?568:844});
   for(const group of ['home','workshops','tasks','challenges','fire','neighbors']){
    await page.evaluate(group=>{
     const positions={home:[850,355],workshops:[350,1045],tasks:[900,970],challenges:[770,1315],fire:[1420,1160],neighbors:[650,1850]};
     a.game.progress.restoration.repaired=[];a.game.progress.restoration.build=null;
     const [x,y]=positions[group];Object.assign(a.game.player,{x,y,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();a.renderer.draw();
    },group);
    await page.waitForTimeout(180);
    await page.screenshot({path:'output/playwright/restoration-'+group+'-'+width+'-'+time+'.png'});
   }
  }
 }
 if(errors.length)throw Error('浏览器错误 '+JSON.stringify(errors));
 await page.evaluate(result=>window.restorationBrowserResult=result,{autoRepair:first,screenCount:40,errors});
 console.log(JSON.stringify({autoRepair:first,screenCount:40,errors}));
}
