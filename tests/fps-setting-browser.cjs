// 默认4175，隔离worktree可沿用当前本地端口；只使用独立浏览器存档。
async page=>{
 if(!['localhost','127.0.0.1'].includes(new URL(page.url()).hostname))throw Error('仅允许本地验收');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();localStorage.clear();
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=['first-map','first-patrol'];p.mainline.phase='doing';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  const storage=await import('/src/platform/storage.js');localStorage.setItem(storage.STORAGE_KEYS.worldRevision,storage.WORLD_SAVE_REVISION);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem(storage.STORAGE_KEYS.gameplay,JSON.stringify({pauseOnBlur:false}));localStorage.setItem('forest-patrol-audio-v1','{"enabled":false}');
  window.a=(await import('/src/app/create-app.js')).createApplication();
 });
 await page.locator('#title-settings').click();if(await page.locator('#show-fps').isChecked())throw Error('旧档默认开启FPS');
 await page.locator('#show-fps').check();await page.screenshot({path:'output/playwright/fps-setting/settings.png'});await page.locator('#settings-done').click();
 await page.reload();await page.evaluate(()=>import('/src/main.js'));await page.locator('#title-settings').click();if(!await page.locator('#show-fps').isChecked())throw Error('重新进入丢失FPS设置');await page.locator('#settings-done').click();
 await page.locator('#start').click();await page.waitForFunction(()=>!document.getElementById('fps-display').hidden&&/^\d+ FPS$/.test(document.getElementById('fps-display').textContent));
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.mainlineTalkDelay=999;g.mainlineSpeech=null;g.encounterTimer=999;g.player.invincible=1e6;Object.assign(g.player,{x:800,y:900});g.vehicle.active=false;g.enemies=[];g.spawnEnemy(0,0,{x:925,y:930},{ambient:true});a.diagnostics.monitor.enabled=false;Object.assign(a.environment,{autoTime:false,autoWeather:false,livingPreview:true,weather:'sun'});a.renderer.camera.time=null;a.refresh();});
 // 真实循环仍绘制，关闭诊断记录也必须继续显示FPS。
 for(const [width,height]of [[320,568],[390,844],[844,390],[1080,921]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{a.environment.time=time;a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(1100);
  const info=await page.evaluate(async()=>{
   const r=(await import('/src/rendering/visual-review.js')).inspectFpsDisplay(document),f=r.fps;
   r.collisions=['mainline-hud','quest','boss-hud','ranger-arrival'].filter(id=>{const n=document.getElementById(id);if(!n||n.hidden||!n.offsetHeight)return false;const b=n.getBoundingClientRect();return f.left<b.right&&f.right>b.left&&f.top<b.bottom&&f.bottom>b.top;});return r;
  });
  if(info.hidden||!info.enabled||!/^\d+ FPS$/.test(info.text)||info.fps.top<info.button.bottom||Math.abs(info.fps.right-info.button.right)>1||info.fps.right>width||info.button.width<44||info.button.height<44||info.overflow||info.collisions.length)throw Error('FPS布局不合格 '+JSON.stringify(info));
  samples.push({width,height,time,...info});await page.screenshot({path:`output/playwright/fps-setting/hud-${width}-${time}.png`});
 }
 // 关闭立即释放数值行，按钮仍可点；开关写回同一份偏好且保留失焦选择。
 await page.locator('#settings-button').click();await page.locator('#show-fps').uncheck();await page.locator('#settings-done').click();
 if(!await page.locator('#fps-display').evaluate(n=>n.hidden))throw Error('关闭未隐藏FPS');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-gameplay-v1')));if(saved.showFps!==false||saved.pauseOnBlur!==false)throw Error('偏好写入错误');
 if(errors.length)throw Error(errors.join(' / '));return {samples,saved,errors};
}
