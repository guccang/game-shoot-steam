// 正式营地移动回归：默认本地4175，可用独立端口；同一初始进度比较优化前后，不改游戏时钟。
async page=>{
 if(!['localhost','127.0.0.1'].includes(new URL(page.url()).hostname))throw Error('仅允许本地测试');
 await page.setViewportSize({width:1080,height:921});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();window.a?.destroy();localStorage.clear();
  const {freshProgress}=await import('/src/progression/progress.js'),{STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');
  const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=['first-map','first-patrol'];p.mainline.phase='doing';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
  const g=a.game;g.player.invincible=1e6;g.encounterTimer=999;g.mainlineTalkDelay=999;
  Object.assign(a.environment,{weather:'rain',time:'day',forestSeason:'spring',livingPreview:true,autoTime:false,autoWeather:false});a.refresh();
 });
 await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(()=>{
  const g=a.game;Object.assign(g.player,{x:740,y:1940});g.vehicle.active=false;g.enemies=[];g.attackTimer=999;g.fx.items=[];
  a.renderer.camera.time=null;a.refresh();
 });
 await page.waitForTimeout(1500);await page.evaluate(()=>a.diagnostics.monitor.clear());
 const start=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,time:a.game.time,ground:a.renderer.ground.stats()}));
 for(const key of ['d','a','a','d']){await page.keyboard.down(key);await page.waitForTimeout(1500);await page.keyboard.up(key);}
 const result=await page.evaluate(()=>({summary:a.diagnostics.monitor.summary(),ground:a.renderer.ground.stats(),end:{x:a.game.player.x,y:a.game.player.y,time:a.game.time},bubble:{hidden:document.getElementById('resident-chatter').hidden,text:document.getElementById('resident-chatter').textContent},frames:a.diagnostics.report().combatFrames}));
 if(errors.length||result.end.time-start.time<4)throw Error('营地运行异常 '+JSON.stringify(errors));
 return {start,...result,errors};
}
