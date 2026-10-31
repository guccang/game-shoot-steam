// 正式工坊熟练度浏览器验收：明示存档夹具，真实点击与键盘完成试装和帮助交互。
async page=>{
 if(new URL(page.url()).port!=='4238')throw Error('仅限隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('场景资源未就绪');
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{grantVehicleArmament}=await import('/src/config/vehicle-armaments.js');
  const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.coins=p.wood=10000;p.bosses=100;p.weapons[3]=1;p.mastery[0]=16;p.mastery[3]=120;
  p.vehicleHulls.fill(1);for(let i=0;i<6;i++)grantVehicleArmament(p,i);p.vehicleWeapons[0]=1;p.vehicleWeapons[3]=1;p.vehicleLoadouts[0]=0;p.vehicleIndex=0;
  const g=a.game;g.progress=p;g.arrivalScene=null;g.reset();a.menu.enter();g.start();g.enemies=[];g.boss=null;g.encounterTimer=999;g.mainlineTalkDelay=999;
  Object.assign(g.player,{x:1600,y:400});g.summonVehicle();
  for(let i=0;i<2;i++){const e=g.spawnEnemy(0,100,{x:1700,y:370+i*75});if(e)e.damage=1;}
  g.update=()=>{};Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false});a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  a.workshop.open('weapons',0);
 });
 if(!(await page.locator('#ws-mastery-count').innerText()).includes('16 / 40'))throw Error('未显示真实经验');
 await page.locator('#ws-kits-tab').click();await page.locator('[data-ws-part="1"]').focus();await page.keyboard.press('Enter');await page.locator('#ws-socket').click();
 if(!await page.locator('#ws-confirm').isDisabled())throw Error('未满足门槛仍能安装');
 if(!(await page.locator('#ws-feedback').innerText()).includes('还差 24 点'))throw Error('锁定原因无差额');
 if(await page.locator('#ws-mastery-progress').evaluate(n=>n.value)!==16)throw Error('试装污染实际经验');
 const draft=await page.evaluate(()=>a.workshop.guideState().draft);
 // 真实触摸打开说明，Esc关闭后验证焦点与底层试装保留。
 const cdp=await page.context().newCDPSession(page),button=await page.locator('#ws-mastery-help').boundingBox();
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 if(!(await page.locator('#ws-mastery-help-lines').innerText()).includes('怪物 +4'))throw Error('缺少获得途径');
 await page.keyboard.press('Escape');
 if(!await page.evaluate(()=>a.game.state==='paused'&&document.getElementById('workshop-dialog').open&&document.activeElement.id==='ws-mastery-help'))throw Error('说明关闭后暂停或焦点错误');
 if(JSON.stringify(await page.evaluate(()=>a.workshop.guideState().draft))!==JSON.stringify(draft))throw Error('帮助丢失试装');
 const samples=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{a.environment.time=time;a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();document.querySelector('.ws-layout').scrollTop=0;},time);
  const sample=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectWorkshopMastery(document));
  if(sample.overflow)throw Error('工坊溢出');
  await page.screenshot({path:`output/playwright/workshop-mastery/weapon-${width}-${time}.png`});
  await page.locator('#ws-mastery-help').click();
  const help=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectWorkshopMastery(document));
  if(help.help.overflow)throw Error('说明溢出');
  await page.screenshot({path:`output/playwright/workshop-mastery/help-${width}-${time}.png`});
  await page.locator('#ws-mastery-help-done').click();samples.push({width,time,...sample});
 }
 await page.locator('[data-ws-item="3"]').click();if(!(await page.locator('#ws-mastery-title').innerText()).includes('3 级'))throw Error('切换武器残留经验');
 await page.evaluate(()=>a.workshop.open('vehicle',0));
 if(!(await page.locator('#ws-mastery-count').innerText()).includes('16 / 40'))throw Error('车载枪共享经验未显示');
 await page.locator('#ws-kits-tab').click();
 await page.screenshot({path:'output/playwright/workshop-mastery/turret-320.png'});
 await page.locator('#ws-back-body').click();await page.locator('[data-ws-part="17"]').focus();await page.keyboard.press('Enter');
 if(!await page.locator('#ws-mastery-progress').isHidden()||!(await page.locator('#ws-mastery-title').innerText()).includes('无熟练度门槛'))throw Error('专属主炮显示虚假进度');
 await page.screenshot({path:'output/playwright/workshop-mastery/native-320.png'});
 await page.locator('[data-ws-item="5"]').click();if(!await page.locator('#ws-mastery-progress').isHidden())throw Error('电动车显示虚假经验');
 await page.evaluate(()=>{a.game.progress.mastery[0]=550;a.workshop.open('weapons',0);});
 if(!(await page.locator('#ws-mastery-count').innerText()).includes('已满级'))throw Error('满级状态错误');
 await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing');
 for(const width of [390,1280])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});await page.evaluate(async time=>{a.environment.time=time;a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();},time);
  await page.screenshot({path:`output/playwright/workshop-mastery/scene-${width}-${time}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {samples,helpPreservesDraft:true,sharedTurret:true,nativeNoGate:true,pausedAndFocus:true,errors};
}
