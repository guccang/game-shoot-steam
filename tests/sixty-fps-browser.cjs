// 同一正式场景比较修改前后帧预算；默认4175，独立会话也允许其他本地测试端口。
async page=>{
 if(!['localhost','127.0.0.1'].includes(new URL(page.url()).hostname))throw Error('仅允许本地测试');
 // 可选历史对照由本地 git 导出的原文件供给；缺失基线时明确失败，不冒充对照数据。
 const baseline=new URL(page.url()).searchParams.has('performanceBaseline');
 if(baseline){
  const response=await page.request.get(new URL('/output/playwright/sixty-fps/baseline-files.json',page.url()).href);if(!response.ok())throw Error('请先导出历史基线文件');
  for(const path of await response.json())await page.route('**/'+path,async route=>{const response=await page.request.get(new URL('/output/playwright/sixty-fps/baseline/'+path,page.url()).href);if(!response.ok())throw Error('基线缺失：'+path);await route.fulfill({response});});
  await page.reload();
 }
 await page.setViewportSize({width:1080,height:921});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();window.a?.destroy();localStorage.clear();
  const {freshProgress}=await import('/src/progression/progress.js'),{STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');
  const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=['first-map','first-patrol'];p.mainline.phase='doing';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  p.weapons.fill(1);p.weapon=(await import('/src/config/weapons.js')).WEAPONS.findIndex(w=>w.id==='laser');
  localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
  const g=a.game;g.player.invincible=1e6;g.encounterTimer=999;g.mainlineTalkDelay=999;
  Object.assign(a.environment,{weather:'sun',forestSeason:'summer',livingPreview:true,autoTime:false,autoWeather:false});a.refresh();
 });
 await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(()=>{
  const g=a.game;Object.assign(g.player,{x:10565,y:7151});g.vehicle.active=false;g.enemies=[];g.attackTimer=999;g.fx.items=[];
  for(let i=0;i<260;i++)g.fx.add('spark',g.player.x+(i%20-10)*15,g.player.y+(Math.floor(i/20)-6)*18,999,{size:3,angle:i*.13});
  a.renderer.camera.time=null;a.refresh();
 });
 await page.waitForTimeout(3000);await page.evaluate(()=>a.diagnostics.monitor.clear());await page.waitForTimeout(6000);
 const measured=await page.evaluate(()=>({report:a.diagnostics.report(),navigation:{hidden:document.getElementById('task-navigation-toggle').hidden,anchor:document.querySelector('.task-route-anchor')?.id},fx:a.game.fx.items.length}));
 if(measured.navigation.hidden||measured.fx!==260||errors.length)throw Error('基准夹具异常 '+JSON.stringify({navigation:measured.navigation,fx:measured.fx,errors}));
 // 独立微基准保留同一正式状态，交替采样原插值与新插值，不把此阶段计入FPS。
 const hasBaseline=(await page.request.get(new URL('/output/playwright/sixty-fps/render-interpolation.js',page.url()).href)).ok();
 const interpolation=hasBaseline?await page.evaluate(async()=>{
  const current=(await import('/src/rendering/render-interpolation.js')).createRenderInterpolation();
  const previous=(await import('/output/playwright/sixty-fps/render-interpolation.js')).createRenderInterpolation();
  const g=a.game;current.beforeStep(g);previous.beforeStep(g);g.player.x+=2;g.time+=.04;for(const fx of g.fx.items)fx.x+=1;
  // 统计单次表现投影耗时，不推进逻辑或调用Canvas。
  function batch(instance){const start=performance.now();for(let i=0;i<100;i++)instance.sample(g,.37);return (performance.now()-start)/100;}
  for(let i=0;i<3;i++){batch(previous);batch(current);}
  const before=[],after=[];for(let i=0;i<8;i++){if(i%2){after.push(batch(current));before.push(batch(previous));}else{before.push(batch(previous));after.push(batch(current));}}
  return {before,after};
 }):null;
 if(baseline)await page.unrouteAll({behavior:'wait'});
 return {baseline,summary:measured.report.summary,navigation:measured.navigation,fx:measured.fx,interpolation,errors,version:measured.report.version};
}
