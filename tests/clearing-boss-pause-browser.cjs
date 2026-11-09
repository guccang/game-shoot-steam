// 隔离手机会话，正式点击未击败领主的暂停、售货员购弹和继续本轮按钮。
async original=>{
 const out='output/playwright/clearing-boss-pause/',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 // 抵达真实告示牌并点击场景热点，不直接调用暂停或恢复函数。
 async function board(){await page.evaluate(async()=>{const g=a.game;Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH,{vx:0,vy:0});g.mainlineSpeech=null;a.renderer.camera.time=null;a.refresh();});await page.locator('#nearby-interaction[data-interaction=clearing]').tap();await page.locator('#clearing-dialog[open]').waitFor();}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.coins=1000;p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;p.weapon=0;p.weapons[0]=1;p.supplies.hand.light=0;p.living.patrolActive=true;p.living.clearingSite={id:'patrol-clearing',name:'本次清缴地点',mapId:'forest',x:2000,y:2000,radius:300,origin:{x:1000,y:2000}};
   g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.trees=[];g.vehicle.active=false;g.progress.campParking.owned=[];Object.assign(g.player,{x:2000,y:2000});
   const total=(await import('/src/config/waves.js')).waveDifficulty(g.wave).total;g.bossReady=true;g.bossWave=g.wave;g.waveKills=total;g.waveSpawned=g.waveKills;g.kills=g.waveKills;g.waveRest=0;
   if(!g.summonBoss())throw Error('未能建立真实清缴领主 '+JSON.stringify({map:g.mapId,active:g.progress.living.patrolActive,site:g.progress.living.clearingSite,arena:g.player.arena,cottage:g.cottage,ready:g.bossReady,wave:g.wave,kills:g.waveKills,story:g.story,realm:g.realm,arrival:g.arrivalCinematic}));Object.assign(g.boss,{x:1900,y:2000,hp:321,speed:0,attack:999});g.attackTimer=g.spawnTimer=g.fireClock=999;g.player.invincible=999;a.renderer.camera.time=null;a.refresh();
  });

  await board();await page.locator('#clearing-stop').tap();await page.waitForFunction(()=>!document.getElementById('clearing-dialog').open);
  if(!await page.evaluate(()=>!a.game.progress.living.patrolActive&&a.game.boss.hp===321&&a.game.boss.disengaged))throw Error('未击败领主不能暂停');checks.push('pause-live-boss');
  // 暂停事务本身须保存当前 Boss；立即刷新不依赖下一次自动存档。
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.attackTimer=g.spawnTimer=g.fireClock=99999;g.mainlineSpeech=null;g.enemies=[];if(g.progress.living.patrolActive||g.boss?.hp!==321||!g.boss.disengaged)throw Error('立即重载未保留暂停');});checks.push('immediate-reload');
  await board();
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;},time);await page.waitForTimeout(200);
   if(await page.locator('#clearing-accept').textContent()!=='继续本轮清缴'||await page.locator('#clearing-accept').isDisabled())throw Error('恢复按钮不可用');
   const layout=await page.locator('#clearing-accept').boundingBox();if(layout.width<44||layout.height<44||layout.y+layout.height>height)throw Error('操作按钮被遮挡');await page.screenshot({path:out+'paused-'+width+'-'+time+'.png'});
  }
  await page.locator('#clearing-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.ammo.door,{vx:0,vy:0});a.game.cottageDoorLatch=false;a.renderer.camera.time=null;});
  await page.waitForFunction(()=>a.game.cottage?.kind==='ammo');await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('[data-npc-service]').tap();await page.locator('#field-equipment-dialog[open]').waitFor();
  const before=await page.evaluate(()=>({coins:a.game.progress.coins,hand:a.game.progress.supplies.hand.light,car:{...a.game.progress.supplies.vehicles[a.game.vehicle.index]}}));
  await page.locator('[data-supply-target=hand]').tap();await page.locator('[data-ammo-buy=light]').tap();await page.locator('[data-supply-target=vehicle]').tap();
  for(const key of ['light','shell','heavy','water'])await page.locator('[data-ammo-buy='+key+']').tap();
  const after=await page.evaluate(()=>({coins:a.game.progress.coins,hand:a.game.progress.supplies.hand.light,car:{...a.game.progress.supplies.vehicles[a.game.vehicle.index]},hp:a.game.boss.hp}));
  if(after.hand!==before.hand+300||after.coins!==before.coins-360||after.hp!==321)throw Error('猫猫弹药或费用异常 '+JSON.stringify({before,after}));
  for(const [key,count] of [['light',300],['shell',50],['heavy',30],['water',200]])if(after.car[key]!==before.car[key]+count)throw Error('载具弹药购买失败 '+key);checks.push('all-ammo-purchases');await page.screenshot({path:out+'ammo-purchased.png'});
  await page.locator('#field-equipment-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  await page.evaluate(async()=>{const g=a.game;g.cottage.sleep=null;if(!(await import('/src/core/home/cottage.js')).leaveCottage(g))throw Error('无法离店');});
  await board();await page.locator('#clearing-accept').tap();await page.waitForFunction(()=>a.game.progress.living.patrolActive&&!document.getElementById('clearing-dialog').open);
  await page.evaluate(()=>{const g=a.game;Object.assign(g.player,{x:g.boss.x+100,y:g.boss.y,vx:0,vy:0});g.player.invincible=999;g.attackTimer=99999;g.boss.attack=999;g.boss.speed=0;a.renderer.camera.time=null;});
  await page.waitForFunction(()=>!a.game.boss.disengaged);if(await page.evaluate(()=>a.game.boss.hp)!==321)throw Error('继续挑战重置血量');checks.push('resume-original-boss');await page.screenshot({path:out+'resumed.png'});
  if(errors.length)throw Error(errors.join('\n'));return {checks,before,after,errors};
 }catch(e){await page.screenshot({path:out+'failure.png'});throw e;}finally{await context.close();}
}
