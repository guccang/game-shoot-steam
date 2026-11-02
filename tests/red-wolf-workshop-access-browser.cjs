// 手机隔离存档验证钥匙特性、地图路线、门口候停和匠人解锁，不修改玩家存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[6]=1;p.keepsakes.items.push('patrol-phone');p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.player.invincible=9999;
   const room=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.vehicle;Object.assign(g.player,room.door);if(!(await import('/src/core/cottage.js')).enterWorkshop(g,'vehicle'))throw Error('载具工坊真实入室失败');a.refresh();a.workshop.open('vehicle',6);
  });
  await page.locator('[data-legendary-trait]').tap();
  if(!await page.locator('#legendary-primary').isEnabled())throw Error('室内钥匙入口仍被禁用');
  if(!(await page.locator('#legendary-content').innerText()).includes('无需额外道具'))throw Error('钥匙说明缺失');
  await page.screenshot({path:'output/playwright/red-wolf-workshop-access/trait-390.png'});
  await page.locator('#legendary-primary').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.evaluate(async()=>{
   const g=a.game,d=(await import('/src/core/world-navigation.js')).worldNavigationDiagnostics(g);if(g.cottage?.kind!=='vehicle'||d.intent?.site.id!=='legendary-workshop-door'||g.progress.legendaryWorkshop.unlocked)throw Error('标记路线误传送或远程解锁');
   Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.vehicle.exit,{vx:0,vy:0});
  });
  await page.waitForFunction(()=>!a.game.cottage);
  if(!await page.locator('#phone-button').isVisible())await page.locator('#field-menu-toggle').tap();
  await page.locator('#phone-button').tap();await page.locator('#phone-dialog [data-pack-action="map"]').tap();
  await page.locator('[data-legendary-route]').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/red-wolf-workshop-access/map-390.png'});
  await page.locator('[data-legendary-route]').tap();await page.waitForFunction(()=>a.game.state==='playing');
  // 仅省略长途赶路，把玩家放在门前空地；最后的移动、候停和营业服务仍走正式循环。
  await page.evaluate(async()=>{const room=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.legendary;Object.assign(a.game.player,{x:room.door.x,y:room.door.y+90,vx:0,vy:0});a.renderer.camera.time=null;});
  for(const time of ['day','night']){
   await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},time);
   await page.waitForTimeout(250);await page.screenshot({path:`output/playwright/red-wolf-workshop-access/world-${time}.png`});
  }
  await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>a.game.player.y<1645);await page.keyboard.up('ArrowUp');await page.waitForFunction(()=>a.game.cottage?.kind==='legendary');
  await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/core/workshop-display-entry.js')).shopkeeperApproach(a.game.cottage),{vx:0,vy:0});});
  await page.locator('#legendary-dialog').waitFor({state:'visible'});await page.locator('#legendary-primary').tap();
  if(!await page.evaluate(()=>a.game.progress.legendaryWorkshop.unlocked))throw Error('匠人未解锁工坊');
  await page.setViewportSize({width:320,height:568});await page.screenshot({path:'output/playwright/red-wolf-workshop-access/unlocked-320.png'});
  // 在已经实际进入的传奇工坊长按锻造，检查真实扣费和保存，不绕过界面提交。
  await page.evaluate(()=>{a.game.progress.weapons[0]=20;a.game.progress.coins=a.game.progress.wood=100000;});
  await page.locator('[data-legendary-upgrade]').tap();await page.locator('[data-ws-upgrade="damage"]').tap();await page.waitForTimeout(1300);
  const hold=await page.locator('#ws-hold').boundingBox();if(!hold)throw Error('锻造按钮缺失');await page.mouse.move(hold.x+hold.width/2,hold.y+hold.height/2);await page.mouse.down();await page.waitForTimeout(1800);await page.mouse.up();
  await page.waitForFunction(()=>a.game.progress.weapons[0]===21);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));if(saved.weapons[0]!==21||saved.coins!==75000||saved.wood!==90000||!saved.legendaryWorkshop.unlocked)throw Error('传奇锻造扣费或保存错误');
  await page.screenshot({path:'output/playwright/red-wolf-workshop-access/forge-320.png'});
  if(errors.length)throw Error(errors.join('\n'));return {trait:true,indoorNavigation:true,mapRoute:true,doorEntry:true,unlock:true,forge:true,errors};
 }finally{await context.close();}
}
