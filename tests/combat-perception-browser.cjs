// 实际手机镜头验收：未发现的屏外敌人不耗弹，进入画面后由正式武器击杀。
async page=>{
 if(new URL(page.url()).port!=='4297')throw Error('仅允许隔离端口4297');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],results=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4297');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await t.waitForFunction(()=>a.menu.page==='game');
 for(const [index,mounted,width,height,time] of [[0,false,320,568,'day'],[8,false,390,844,'night'],[0,true,390,844,'day']]){
  await t.setViewportSize({width,height});
  await t.evaluate(async({index,mounted,time})=>{
   const g=a.game;g.state='paused';
   const p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.weapon=index;p.vehicleIndex=0;p.vehicleHulls[0]=1;p.vehicleWeapons[17]=1;p.vehicleLoadouts[0]=17;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   g.progress=p;g.reset();g.workshopTrial=true;g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.trees=[];g.enemies=[];g.boss=null;g.parking=null;g.updateWaves=()=>{};g.fireClock=1e9;
   Object.assign(g.player,{x:1200,y:2400,angle:0,arena:{x:1200,y:2400,radius:1200,terrain:'trial'}});g.vehicle.active=mounted;g.vehicle.angle=0;g.attackTimer=mounted?1e9:0;
   Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,weather:'sun',forestSeason:'summer',time:time==='day'?'night':'dusk'});
   document.getElementById('time-picture').click();const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();
   const v=g.arrivalView;window.enemy=g.spawnEnemy(0,0,{x:g.player.x+v.right+70,y:g.player.y});
   Object.assign(enemy,{hp:1,maxHp:1,speed:0,damage:0,workshopTarget:true,arena:{...g.player.arena}});window.initialAmmo=mounted?g.vehicle.module.magazine.ammo:g.magazines[index].ammo;
  },{index,mounted,time});
  await t.waitForTimeout(1800);
  const off=await t.evaluate(({index,mounted})=>({hp:enemy.hp,ammo:mounted?a.game.vehicle.module.magazine.ammo:a.game.magazines[index].ammo,initialAmmo,lock:a.game.findAttackTarget()?.id,vehicleLock:a.game.vehicle.targetId,view:a.game.arrivalView,enemyX:enemy.x-a.game.player.x}),{index,mounted});
  if(off.hp!==1||off.ammo!==off.initialAmmo||off.lock||off.vehicleLock)throw Error('屏外提前攻击 '+JSON.stringify(off));
  await t.screenshot({path:'output/playwright/combat-perception/outside-'+index+'-'+mounted+'.png'});
  // 开火间隔暂缓一个截图，不改变正式索敌或伤害实现。
  await t.evaluate(mounted=>{const g=a.game;g.attackTimer=1e9;if(mounted)g.vehicle.module.cooldown=999;enemy.x=g.player.x+Math.min(120,g.arrivalView.right-80);enemy.y=g.player.y;a.renderer.draw();},mounted);
  await t.screenshot({path:'output/playwright/combat-perception/inside-'+index+'-'+mounted+'.png'});
  await t.evaluate(mounted=>{a.game.attackTimer=mounted?1e9:0;if(mounted)a.game.vehicle.module.cooldown=0;},mounted);
  await t.waitForFunction(()=>enemy.hp<=0,null,{timeout:10000});
  const result=await t.evaluate(()=>({hp:enemy.hp,view:a.game.arrivalView,zoom:a.renderer.view.zoom}));results.push({index,mounted,width,height,time,off,...result});
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();await page.evaluate(r=>window.combatPerceptionResult=r,{results,errors});
}
