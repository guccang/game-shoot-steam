// 正式手机流程：离开领主、回营进店补弹、刷新后保留原战区、返回继续战斗。
async original=>{
 const out='output/playwright/boss-disengage/',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.coins=1000;p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;p.weapon=0;p.weapons[0]=1;p.supplies.hand.light=0;p.living.patrolActive=true;p.living.clearingSite={id:'patrol-clearing',name:'本次清缴地点',mapId:'forest',x:2000,y:2000,radius:300,origin:{x:1000,y:2000}};
   g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.trees=[];g.vehicle.active=false;g.progress.campParking.owned=[];Object.assign(g.player,{x:2000,y:2000});
   const total=(await import('/src/config/waves.js')).waveDifficulty(g.wave).total;g.bossReady=true;g.bossWave=g.wave;g.waveKills=total;g.waveSpawned=g.waveKills;g.kills=g.waveKills;g.waveRest=0;
   if(!g.summonBoss())throw Error('未能建立真实清缴领主 '+JSON.stringify({map:g.mapId,active:g.progress.living.patrolActive,site:g.progress.living.clearingSite,arena:g.player.arena,cottage:g.cottage,ready:g.bossReady,wave:g.wave,kills:g.waveKills,story:g.story,realm:g.realm,arrival:g.arrivalCinematic}));Object.assign(g.boss,{x:1900,y:2000,hp:321,speed:0,attack:999});g.attackTimer=g.spawnTimer=g.fireClock=999;g.player.invincible=999;a.renderer.camera.time=null;a.refresh();
  });
  // 战斗中仍阻止进店；离开边界使用正常键盘移动，不直接改脱战标记。
  if(!await page.locator('#boss-hud').isVisible())throw Error('交战时Boss条未显示');
  if(await page.evaluate(async()=>(await import('/src/core/home/cottage.js')).canEnterCottage(a.game)))throw Error('交战中提前解除进店限制');
  await page.evaluate(()=>{a.game.player.x=a.game.boss.x+680;a.renderer.camera.time=null;});
  await page.keyboard.down('d');try{await page.waitForFunction(()=>a.game.boss.disengaged);}finally{await page.keyboard.up('d');}
  await page.waitForFunction(()=>document.getElementById('boss-hud').hidden);if(await page.evaluate(()=>a.game.boss.hp)!==321)throw Error('撤退改变Boss血量');
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);Object.assign(a.game.player,{x:900,y:700});a.renderer.camera.time=null;a.refresh();},time);
   await page.waitForTimeout(100);if(await page.locator('#boss-hud').isVisible())throw Error('回营仍显示交战Boss条');await page.screenshot({path:out+width+'-'+time+'-camp.png'});checks.push({width,height,time});
  }
  await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.ammo.door,{vx:0,vy:0});a.game.cottageDoorLatch=false;a.renderer.camera.time=null;});
  await page.waitForFunction(()=>a.game.cottage?.kind==='ammo');await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('[data-npc-service]').tap();await page.locator('#field-equipment-dialog[open]').waitFor();await page.locator('[data-supply-target=hand]').tap();
  const before=await page.evaluate(()=>({coins:a.game.progress.coins,ammo:a.game.progress.supplies.hand.light}));await page.locator('[data-ammo-buy=light]').tap();
  const after=await page.evaluate(()=>({coins:a.game.progress.coins,ammo:a.game.progress.supplies.hand.light,hp:a.game.boss.hp,x:a.game.boss.x,y:a.game.boss.y,disengaged:a.game.boss.disengaged}));
  if(after.coins!==before.coins-30||after.ammo!==before.ammo+300||after.hp!==321||!after.disengaged)throw Error('回营购弹失败 '+JSON.stringify(after));await page.screenshot({path:out+'shop-purchase.png'});
  // 购买事务已经保存室外落点；刷新不能把Boss放到商店门前。
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.attackTimer=a.game.spawnTimer=a.game.fireClock=999;a.game.enemies=[];a.game.trees=[];a.game.mainlineSpeech=null;});
  const restored=await page.evaluate(()=>({x:a.game.boss.x,y:a.game.boss.y,hp:a.game.boss.hp,disengaged:a.game.boss.disengaged}));
  if(restored.hp!==321||Math.hypot(restored.x-after.x,restored.y-after.y)>1||!restored.disengaged)throw Error('刷新把Boss带回营地或重置血量 '+JSON.stringify(restored));
  await page.evaluate(async()=>{const g=a.game;if(g.cottage){g.cottage.sleep=null;(await import('/src/core/home/cottage.js')).leaveCottage(g);}g.cottageDoorLatch=false;g.state='playing';Object.assign(g.player,{x:g.boss.x+100,y:g.boss.y});g.player.invincible=999;g.attackTimer=999;g.boss.attack=999;g.boss.speed=0;a.renderer.camera.time=null;});
  await page.waitForFunction(()=>!a.game.boss.disengaged&&!document.getElementById('boss-hud').hidden);
  if(await page.evaluate(()=>a.game.boss.hp)!==321)throw Error('重新接战重置血量');await page.screenshot({path:out+'boss-resumed.png'});
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'clearing-compact-hud',checks,before,after,restored,resumed:true,errors};
 }catch(e){await page.screenshot({path:out+'failure.png'});const state=await page.evaluate(()=>({state:a.game.state,player:{x:a.game.player.x,y:a.game.player.y},boss:{x:a.game.boss?.x,y:a.game.boss?.y,hp:a.game.boss?.hp,disengaged:a.game.boss?.disengaged},cottage:a.game.cottage?.kind}));throw Error(e.message+' '+JSON.stringify(state));}finally{await context.close();}
}
