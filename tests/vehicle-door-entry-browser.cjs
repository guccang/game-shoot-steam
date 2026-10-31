// CLI当前页面运行，默认服务4175；工作树沿用当前页面的独立测试地址。
async original=>{
 const out='output/playwright/vehicle-door-entry/',ctx=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'video/',size:{width:390,height:844}}}),page=await ctx.newPage(),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 // 每例在正式门外准备驾驶状态，真实键盘移动、倒计时与下车事务完成交互。
 async function fixture(kind,time){
  await page.evaluate(async({kind,time})=>{const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999;g.progress.living.patrolActive=false;g.enemies=[];g.parkingVisitors=[];g.progress.campParking.owned=[];window.layout=(await import('/src/config/workshop-interiors.js')).interiorLayout({kind});Object.assign(g.player,{x:layout.door.x,y:layout.door.y+80,vx:0,vy:0,pushX:0,pushY:0});if(!g.summonVehicle())throw Error('驾驶初始化失败');g.vehicle.hp*=.65;Object.assign(g.spawnEnemy(0,0,{x:layout.door.x+180,y:layout.door.y+250}),{hp:1e6,maxHp:1e6,speed:0,damage:0});Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;a.refresh();},{kind,time});
  await page.waitForTimeout(1300);
 }
 // 采样正式房门徽记与车队记录，不自行拼接测试画面。
 async function inspect(){return page.evaluate(async()=>await(await import('/src/rendering/visual-review.js')).inspectVehicleDoorEntry(a.game,document,a.renderer));}
 try{
  await page.goto(original.url());await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;});
  const kinds=['cottage','furniture','vehicle','repair','ammo','fire','cat-home','weapons'];let i=0;
  for(const [width,height] of [[320,568],[390,844],[844,390],[900,1280]])for(const time of ['day','night']){
   const kind=kinds[i++],name=kind+'-'+width+'-'+time;await page.setViewportSize({width,height});await fixture(kind,time);
   await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>a.game.player.y<=layout.door.y+16,null,{timeout:5000});await page.keyboard.up('ArrowUp');await page.waitForFunction(()=>a.game.cottageEntry>.1,null,{timeout:5000});
   const before=await inspect();if(!before.mounted||before.room||before.badge?.icon!=='home'||before.overflow)throw Error('门口倒计时异常 '+JSON.stringify(before));await page.screenshot({path:out+name+'-countdown.png'});
   if(i===1){const elapsed=await page.evaluate(()=>{a.game.state='paused';return a.game.cottageEntry;});await page.waitForTimeout(400);if(!await page.evaluate(t=>a.game.cottageEntry===t,elapsed))throw Error('暂停期间计时');await page.evaluate(()=>a.game.state='playing');}
   await page.waitForFunction(kind=>a.game.cottage?.kind===kind,kind,{timeout:5000});await page.waitForTimeout(200);const inside=await inspect();if(inside.mounted||!inside.parking||inside.parking.spot!==null||inside.parking.hp!==.65)throw Error('入屋停车状态异常 '+JSON.stringify(inside));await page.screenshot({path:out+name+'-inside.png'});
   // 使用真实移动走到室内出口，再等一秒出门观察车辆仍在门前。
   await page.keyboard.down('ArrowDown');await page.waitForTimeout(350);await page.keyboard.up('ArrowDown');await page.waitForFunction(()=>!a.game.cottage,null,{timeout:5000});await page.keyboard.down('ArrowRight');await page.waitForTimeout(700);await page.keyboard.up('ArrowRight');const outside=await inspect();if(outside.mounted||JSON.stringify(outside.parking)!==JSON.stringify(inside.parking))throw Error('出门丢车或挪车');await page.screenshot({path:out+name+'-outside.png'});checks.push({name,before,inside,outside});
  }
  const parked=await page.evaluate(()=>{a.save();return a.game.progress.campParking.owned.find(r=>r.hull===0);});await page.reload();await page.locator('#start').waitFor({state:'visible'});await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;});const restored=await page.evaluate(()=>a.game.progress.campParking.owned.find(r=>r.hull===0));if(restored?.x!==parked.x||restored?.y!==parked.y)throw Error('读档改变门口停车位置');
  if(errors.length)throw Error(errors.join('\n'));return {ok:true,checks,errors};
 }catch(error){await page.screenshot({path:out+'failure.png'});throw error;}finally{await ctx.close();}
}
