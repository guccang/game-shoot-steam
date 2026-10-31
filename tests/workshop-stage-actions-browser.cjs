// 工作台顶角操作回归：正式UI、靶场和车辆入口共用，夹具仅在隔离端口运行。
async page=>{
 if(new URL(page.url()).port!=='4231')throw Error('仅允许隔离端口4231');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.reload();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;await a.ready;const g=a.game;
  g.progress.arrival={...g.progress.arrival,phase:'complete'};g.progress.weapons[0]=1;g.progress.mastery.fill(40);
  g.progress.vehicleHulls[1]=1;g.progress.coins=g.progress.wood=100000;g.reset();g.update=()=>{};a.menu.enter();g.start();
  Object.assign(g.player,{x:415,y:740});g.selectVehicle(1);g.summonVehicle();g.spawnEnemy(.4,125);g.spawnEnemy(2.5,150);a.refresh();
 });
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:900});
  await page.evaluate(async time=>{
   const a=(await import('/src/main.js')).application;
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.refresh();
  },time);
  await page.screenshot({path:`output/playwright/workshop-stage-actions/scene-${width}-${time}.png`});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.workshop.open('vehicle',1);});
  await page.waitForTimeout(100);
  const s=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopStageActions(document));
  // 顶角按钮须同排、留在舞台内，不压状态标签或实际连接点。
  const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  if(s.overflow||s.actions.right>s.stage.right||s.actions.top<s.stage.top||s.actions.top-s.stage.top>20||s.stage.right-s.actions.right>20||overlap(s.actions,s.label)||overlap(s.actions,s.socket))throw Error('布局或遮挡 '+JSON.stringify(s));
  if(s.buttons.some(b=>b.width<44||b.height<44)||s.buttons[0].top!==s.buttons[1].top)throw Error('触控区域或同行失败');
  samples.push({width,time,...s});
  await page.screenshot({path:`output/playwright/workshop-stage-actions/workshop-${width}-${time}.png`});
  // 桌面鼠标、手机真实触控启动；结束按钮保持键盘可访问。
  if(width===1280)await page.locator('#ws-test').click();
  else{
   const cdp=await page.context().newCDPSession(page),b=await page.locator('#ws-test').boundingBox();
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  }
  await page.waitForFunction(()=>!document.getElementById('ws-trial').hidden);
  if(await page.locator('#ws-equip').isVisible())throw Error('试射覆盖后驾驶仍可聚焦');
  await page.locator('#ws-trial-stop').press('Enter');
  if(!await page.locator('#ws-equip').isVisible())throw Error('结束后未恢复');
  await page.locator('#ws-close').click();
 }
 // 键盘放入套件后驾驶禁用，切换取消草稿；驾驶按钮仍走正式上下车逻辑。
 await page.evaluate(async()=>{(await import('/src/main.js')).application.workshop.open('vehicle',1);});
 await page.locator('#ws-back-body').click();await page.locator('[data-ws-part="0"]').click();await page.locator('#ws-socket').press('Enter');
 if(!await page.locator('#ws-equip').isDisabled())throw Error('草稿未禁用驾驶');
 await page.locator('[data-ws-item="0"]').click();await page.locator('[data-ws-item="1"]').click();
 await page.locator('#ws-equip').press('Enter');
 if(await page.locator('#workshop-dialog').isVisible())throw Error('下车未关闭工坊');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.vehicle.active)throw Error('未下车');a.workshop.open('vehicle',1);});
 await page.locator('#ws-equip').click();
 if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.vehicle.active))throw Error('未驾驶');
 await page.evaluate(async()=>{(await import('/src/main.js')).application.workshop.open('weapons',0);});
 if(!await page.locator('.ws-stage-actions #ws-equip').isDisabled())throw Error('已装备状态错误');
 await page.locator('#ws-test').press('Enter');await page.locator('#ws-trial-stop').press('Enter');
 await page.screenshot({path:'output/playwright/workshop-stage-actions/weapon-320.png'});await page.locator('#ws-close').click();
 if(errors.length)throw Error(errors.join('\n'));return {samples,errors};
}

