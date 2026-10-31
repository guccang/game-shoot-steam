// 专属主炮实机：真实工坊施工、鼠标/触摸/键盘、正式昼夜战斗及前后结构对照。
async page=>{
  if(new URL(page.url()).port!=='4208')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:960});await page.reload();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式素材未就绪');window.armamentApp=a;
    const {freshProgress,validateProgress}=await import('/src/progression/progress.js');const p=freshProgress();p.coins=p.wood=100000;p.bosses=100;p.materials={parts:10000,crystal:10000,core:10000};p.vehicleHulls.fill(1);
    a.game.progress=validateProgress(p);a.game.reset();a.game.state='ready';a.refresh();a.workshop.open('vehicle',1);
  });
  await page.locator('#ws-kits-tab').click();
  if(!await page.locator('#ws-name').innerText().then(t=>t.includes('125')))throw Error('未显示专属炮');
  await page.screenshot({path:'output/playwright/vehicle-armaments/workshop-tank-before.png'});
  const stats=await page.locator('#ws-stats').innerText();
  // 键盘选择部件、插入、选择工具并按住施工。
  await page.locator('[data-ws-upgrade="damage"]').focus();await page.keyboard.press('Enter');
  await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1300);
  await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up('Space');
  await page.waitForFunction(()=>armamentApp.game.progress.vehicleWeapons[18]===2);await page.waitForTimeout(650);
  if(await page.locator('#ws-stats').innerText()===stats)throw Error('伤害升级无反馈');
  await page.screenshot({path:'output/playwright/vehicle-armaments/workshop-tank-after.png'});
  // 手机实际触控拖入供给仓，工具就位后在下方施工，舞台保持可见。
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>armamentApp.workshop.open('vehicle',2));await page.locator('#ws-kits-tab').click();
  await page.locator('[data-ws-upgrade="capacity"]').scrollIntoViewIfNeeded();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const start=await page.locator('[data-ws-upgrade="capacity"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x+start.width/2,y:start.y+start.height/2}]});
  const socket=await page.locator('#ws-socket').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:socket.x+socket.width/2,y:socket.y+socket.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1300);
  await page.locator('#ws-tool').scrollIntoViewIfNeeded();
  const tool=await page.locator('#ws-tool').boundingBox(),point=await page.locator('#ws-socket').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tool.x+tool.width/2,y:tool.y+tool.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+point.width/2,y:point.y+point.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const hold=await page.locator('#ws-hold').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hold.x+hold.width/2,y:hold.y+hold.height/2}]});await page.waitForTimeout(800);
  await page.screenshot({path:'output/playwright/vehicle-armaments/touch-construction.png'});await page.waitForTimeout(1100);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  await page.waitForFunction(()=>armamentApp.game.progress.turretParts[19].capacity===2);
  await page.screenshot({path:'output/playwright/vehicle-armaments/touch-after.png'});
  // 鼠标拖部件后切换对象立即取消，气垫船提供新主炮入口和试射。
  await page.locator('[data-ws-upgrade="range"]').dragTo(page.locator('#ws-socket'));await page.waitForTimeout(1300);
  await page.locator('[data-ws-item="3"]').click();
  if(await page.locator('#ws-kits-tab').isDisabled()||await page.locator('#ws-test').isDisabled())throw Error('气垫船缺少潮汐炮');
  await page.setViewportSize({width:320,height:844});await page.screenshot({path:'output/playwright/vehicle-armaments/hovercraft-320.png'});
  await page.locator('#ws-close').click();await page.reload();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;window.armamentApp=a;if(a.game.progress.vehicleWeapons[18]!==2||a.game.progress.turretParts[19].capacity!==2)throw Error('施工未保存');});
  const scenes=[];
  for(const hull of [0,1,2,3])for(const width of [1280,390,320])for(const time of ['day','night']){
    await page.setViewportSize({width,height:width===1280?960:844});
    await page.evaluate(async({hull,time})=>{
      const a=armamentApp,g=a.game,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
      g.progress.vehicleIndex=hull;g.reset();g.start();g.summonVehicle();g.updateWaves=()=>{};g.attack=()=>{};g.updateWeaponAbility=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;g.trees=g.trees.filter(t=>Math.hypot(t.x-920,t.y-850)>210);
      Object.assign(g.player,{x:900,y:850,invincible:0});
      for(const [dx,dy] of [[90,70],[140,100],[155,-10]]){const e=g.spawnEnemy(0,0,{x:900+dx,y:850+dy});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0,flying:false});}
      Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();
    },{hull,time});
    await page.waitForTimeout(hull===1?450:650);
    scenes.push(await page.evaluate(({hull,width,time})=>({hull,width,time,weapon:armamentApp.game.vehicle.weaponIndex,particles:armamentApp.game.fx.items.length,rotor:armamentApp.game.vehicle.rotorSpeed}),{hull,width,time}));
    await page.screenshot({path:`output/playwright/vehicle-armaments/field-${hull}-${width}-${time}.png`});
    if(width===390&&time==='day'){await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');}
  }
  // 正式复核入口连续采样，三个炮型和低动态共用真实渲染。
  await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');
    const gallery=document.createElement('canvas');gallery.id='armament-gallery';gallery.width=1200;gallery.height=720;gallery.style.cssText='position:fixed;z-index:9999;top:0;left:0;width:1200px;background:#eee8c8';document.body.append(gallery);
    const c=gallery.getContext('2d'),tile=document.createElement('canvas');tile.width=300;tile.height=240;
    for(let hull=0;hull<3;hull++)for(let frame=0;frame<4;frame++){await renderVisualCase(tile.getContext('2d'),'vehicle-armament-'+hull,[.01,.06,.2,.7][frame]);c.drawImage(tile,frame*300,hull*240);}
  });
  await page.locator('#armament-gallery').screenshot({path:'output/playwright/vehicle-armaments/continuous-frames.png'});await page.evaluate(()=>document.getElementById('armament-gallery').remove());
  await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/vehicle-armaments/reduced.png'});await page.emulateMedia({reducedMotion:'no-preference'});
  if(errors.length)throw Error(errors.join('\n'));return {scenes,errors};
}
