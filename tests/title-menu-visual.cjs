// 正式首页与白天/夜晚战场同屏验收；只摆放正式实体，不替换美术。
async(page)=>{
 if(new URL(page.url()).port!=='4186')throw Error('仅允许本任务隔离端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(window.visualApp||(await import('/src/main.js')).application).destroy();localStorage.clear();});
 await page.reload();
 await page.evaluate(async()=>{window.visualApp=(await import('/src/main.js')).application;});
 // 正式DOM与媒体元素共同验收，截图保存于本任务证据目录。
 async function inspect(){return page.evaluate(async()=>{const {inspectTitleMenu}=await import('/src/rendering/visual-review.js');return inspectTitleMenu(document,visualApp);});}
 for(const [width,height] of [[390,844],[320,568],[1280,900]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(160);
  const sample=await inspect();if(sample.overflow)throw Error('首页水平溢出');
  for(const control of sample.controls.filter(c=>!c.disabled&&c.id!=='title-video-play'))if(control.box.height<44||control.box.bottom>height+1)throw Error('触控尺寸或底部裁切 '+control.id);
  samples.push({width,height,...sample});await page.screenshot({path:`output/playwright/title-${width}-fresh.png`});
 }
 await page.locator('#start').click();await page.evaluate(()=>visualApp.ready);
 await page.evaluate(async()=>{
  const a=visualApp,g=a.game;g.enemies=[];g.waveWarning=0;g.spawnTimer=999;g.encounterTimer=999;g.attackTimer=999;
  Object.assign(g.player,{x:930,y:820,invincible:0});g.summonVehicle();
  const enemy=g.spawnEnemy(0,0,{x:1040,y:790});Object.assign(enemy,{hp:1e8,maxHp:1e8,mass:1e6,speed:0,damage:0});a.refresh();
 });
 for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const a=visualApp,g=a.game;if(g.state==='paused')g.start();g.player.invincible=0;g.attackTimer=999;g.spawnTimer=999;
   Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
   document.querySelector('[data-weather="sun"]').click();document.querySelector(`[data-time="${time}"]`).click();
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
   a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },time);await page.waitForTimeout(160);
  await page.screenshot({path:`output/playwright/menu-game-${width}-${time}.png`});
  await page.evaluate(()=>{visualApp.game.pause();visualApp.refresh();});
  await page.screenshot({path:`output/playwright/menu-pause-${width}-${time}.png`});
  await page.locator('#overlay-settings').click();
  if(await page.locator('#settings-dialog').evaluate(n=>n.scrollWidth>n.clientWidth+1))throw Error('设置横向溢出');
  await page.screenshot({path:`output/playwright/menu-settings-${width}-${time}.png`});
  await page.locator('#settings-done').click();
  await page.locator('#overlay').waitFor({state:'visible',timeout:2000});
  samples.push({width,height,time,gameState:await page.evaluate(()=>visualApp.game.state)});
 }
 await page.locator('#overlay-settings').click();await page.locator('#settings-home').click();
 for(const [width,height] of [[390,844],[320,568],[1280,900]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(120);
  await page.screenshot({path:`output/playwright/title-${width}-continue.png`});
  // 首页已合并工具入口，通过设置检查原有帮助的嵌套关闭。
  await page.locator('#title-settings').click();await page.locator('#help').click();await page.screenshot({path:`output/playwright/menu-help-${width}.png`});await page.locator('#help-ok').click();await page.locator('#settings-done').click();
  const sample=await inspect();if(sample.overflow)throw Error('继续页横向溢出');samples.push({width,height,...sample});
 }
 await page.setViewportSize({width:320,height:568});await page.locator('#title-settings').click();await page.locator('#reset-progress').click();
 await page.screenshot({path:'output/playwright/menu-reset-320.png'});await page.locator('#cancel-reset').click();await page.locator('#settings-done').click();
 // CDP触摸事件验证按钮点击不穿透到战场摇杆。
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const box=await page.locator('#start').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 // 每次开始均有加载过场，等待真正入场后检查触摸不穿透。
 await page.waitForFunction(()=>visualApp.menu.page==='game');
 if(await page.evaluate(()=>visualApp.menu.page!=='game'||!document.getElementById('joystick').hidden))throw Error('触摸继续未生效或穿透');
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 await page.evaluate(()=>visualApp.menu.home());
 if(errors.length)throw Error(errors.join('\n'));
 return {passed:true,criteria:['title-menu','menu-navigation'],samples,errors};
}
