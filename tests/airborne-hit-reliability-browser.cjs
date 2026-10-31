// 浮空命中实机验收：正式枪口、弹道、Game.update 及按键追击，不修改游戏数值。
async page=>{
 if(new URL(page.url()).port!=='4293')throw Error('仅允许隔离验收端口');const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});
 // 从正式进入按钮加载隔离档案，使用单个高血量目标观察持续扣血。
 async function mount(width,phase){
  await page.setViewportSize({width,height:width===390?844:900});await page.evaluate(async phase=>{
   (window.airApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{LIVING_PHASES}=await import('/src/config/living-world.js');const p=freshProgress();p.vehicleHulls[0]=1;p.vehicleIndex=0;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:1600,y:400};p.living.calendar.elapsed=LIVING_PHASES.find(t=>t.id===phase).start+1000;
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));window.airApp=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
  },phase);await page.locator('#start').click();await page.waitForFunction(()=>airApp.menu.page==='game');
  await page.evaluate(async phase=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(airApp.environment,{time:phase,autoTime:false,weather:'sun',autoWeather:false});airApp.renderer.light=new EnvironmentTransition(airApp.environment,0);airApp.renderer.tone=new SceneTone(airApp.environment,0);
   const g=airApp.game;g.trees=[];g.enemies=[];g.encounterTimer=999;g.updateWaves=()=>{};g.attack=()=>false;g.updateWeaponAbility=()=>{};Object.assign(g.player,{x:1600,y:400,invincible:999,arena:{x:1600,y:400,radius:170}});g.summonVehicle();
   const e=g.spawnEnemy(0,0,{x:1600,y:520});Object.assign(e,{hp:400,maxHp:400,mass:1,damage:0,speed:48,arena:g.player.arena});window.airTarget=e;window.airCheck={elapsed:0,hits:0,airHits:0,maxHeight:0,maxGap:0,lastHit:0,killedAt:null,samples:[]};
   const hit=g.hit.bind(g);g.hit=(target,...args)=>{if(target===airTarget){airCheck.hits++;airCheck.airHits+=target.z>1?1:0;airCheck.maxGap=Math.max(airCheck.maxGap,airCheck.elapsed-airCheck.lastHit);airCheck.lastHit=airCheck.elapsed;}hit(target,...args);};
   const update=g.update.bind(g);g.update=(dt,input)=>{if(airCheck.elapsed>=5)return;update(dt,input);airCheck.elapsed+=dt;airCheck.maxHeight=Math.max(airCheck.maxHeight,airTarget.z||0);if(airTarget.hp<=0&&airCheck.killedAt===null)airCheck.killedAt=airCheck.elapsed;airCheck.samples.push({time:airCheck.elapsed,hp:airTarget.hp,z:airTarget.z||0});};airApp.refresh();
  },phase);
 }
 for(const width of [390,1280])for(const phase of ['day','night']){
  await mount(width,phase);await page.waitForFunction(()=>airCheck.elapsed>=2);
  await page.screenshot({path:`output/playwright/airborne-hit-reliability/air-${width}-${phase}.png`});
  await page.waitForFunction(()=>airCheck.elapsed>=5);const result=await page.evaluate(()=>({...airCheck,hp:airTarget.hp}));
  if(result.hp>0||result.airHits<10||result.maxGap>.4||result.killedAt>4.5)throw Error('浮空掉血异常 '+JSON.stringify(result));checks.push({width,phase,...result});
 }
 // 同一正式战场中，先保持距离验证停火，再用方向键靠近浮空目标。
 await page.evaluate(()=>{
  const g=airApp.game;Object.assign(g.player,{x:1600,y:400,arena:{x:1600,y:400,radius:900}});g.enemies=[];g.projectiles=[];g.remnants=[];g.vehicle.module.cooldown=0;g.vehicle.module.magazine.ammo=60;g.vehicle.aimInitialized=false;
  const e=g.spawnEnemy(0,0,{x:2010,y:400});Object.assign(e,{hp:400,maxHp:400,mass:1,damage:0,speed:0,z:300,vz:0,knockTime:2,arena:g.player.arena});window.airTarget=e;window.airCheck={elapsed:0,hits:0,airHits:0,lastHit:0,maxGap:0};window.rangeCheck={elapsed:0,firstHitHeight:null,startX:g.player.x};
  const hit=g.hit.bind(g);g.hit=(target,...args)=>{if(target===airTarget&&rangeCheck.firstHitHeight===null)rangeCheck.firstHitHeight=target.z;hit(target,...args);};const original=Object.getPrototypeOf(g).update;
  g.update=(dt,input)=>{original.call(g,dt,input);rangeCheck.elapsed+=dt;};
 });
 await page.waitForTimeout(200);const outside=await page.evaluate(()=>({hp:airTarget.hp,ammo:airApp.game.vehicle.module.magazine.ammo,distance:Math.hypot(airTarget.x-airApp.game.player.x,airTarget.y-airApp.game.player.y)}));
 if(outside.hp!==400||outside.ammo!==60||outside.distance<=380)throw Error('超出射程仍攻击');
 await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>airTarget.hp<400,null,{timeout:5000});await page.keyboard.up('ArrowRight');
 const resumed=await page.evaluate(()=>({...rangeCheck,hp:airTarget.hp,x:airApp.game.player.x,distance:Math.hypot(airTarget.x-airApp.game.player.x,airTarget.y-airApp.game.player.y)}));
 if(resumed.x<=resumed.startX||!(resumed.firstHitHeight>1))throw Error('靠近后未恢复空中命中');
 await page.screenshot({path:'output/playwright/airborne-hit-reliability/approach-resumed.png'});if(errors.length)throw Error(errors.join('\n'));
 return {passed:true,checks,outside,resumed,errors};
}
