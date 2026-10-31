// 昼夜与手机尺寸下检查立体罩体，以及正式弹丸在盾面被拦截后的局部反馈。
async original=>{
 const results=[],errors=[];
 for(const [width,height,time,mounted] of [[390,844,'day',true],[320,568,'night',false],[1100,800,'night',true]]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:width<500,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async({time,mounted})=>{
    const a=window.a=(await import('/src/main.js')).application;await a.ready;
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.weapons[18]=1;p.weapon=18;p.vehicleHulls[1]=1;p.vehicleIndex=1;
    p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
    p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
    const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.workshopTrial=true;g.updateWaves=()=>{};
    if(mounted)g.summonVehicle();g.enemies=[];g.boss=null;g.waveWarning=0;g.spawnTimer=9999;
    const {blocked}=await import('/src/physics/motion.js'),{settlementAt}=await import('/src/world/settlements.js');let origin=null;
    for(let y=1200;y<2200&&!origin;y+=60)for(let x=350;x<900;x+=60)if(!settlementAt({x,y})&&[-100,0,200].every(dx=>!blocked(x+dx,y,75,[],{mapId:'forest'}))){origin={x,y};break;}
    if(!origin)throw Error('缺少验收场地');Object.assign(g.player,origin,{invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-origin.x,t.y-origin.y)>240);
    window.tick=g.update.bind(g);g.update=()=>{};
    Object.assign(a.environment,{time,livingPreview:true,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },{time,mounted});
   await page.waitForTimeout(250);await page.screenshot({path:`output/playwright/shield-impact-surface/idle-${width}.png`});
   const impact=await page.evaluate(async()=>{
    const g=a.game,{energyShieldShape}=await import('/src/combat/energy-shield-surface.js'),s=energyShieldShape(g.player,g.vehicle.active);
    const e=g.spawnEnemy(0,0,{x:s.x+s.rx+100,y:s.y});Object.assign(e,{hp:1000,maxHp:1000,speed:0,damage:0});
    const hp=g.player.hp,vhp=g.vehicle.hp;g.enemyBolts=[{owner:e.id,x:s.x+s.rx+60,y:s.y,dx:-1,dy:0,radius:3,speed:500,remaining:600,damage:40,age:0,splash:0}];
    // 三颗同帧来弹必须各扣40点，不能被角色的受伤无敌吞掉后两次命中。
    g.enemyBolts=Array.from({length:3},()=>({...g.enemyBolts[0]}));
    (await import('/src/combat/ranged-enemies.js')).updateEnemyBolts(g,.2,g.player);a.refresh();
    return {shield:g.magazines[18].ammo,angle:g.magazines[18].shieldImpacts[0]?.angle,bolts:g.enemyBolts.length,invincible:g.player.invincible,hpUnchanged:g.player.hp===hp&&g.vehicle.hp===vhp,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   if(impact.shield!==360||impact.angle!==0||impact.bolts||impact.invincible!==0||!impact.hpUnchanged||impact.overflow)throw Error(JSON.stringify(impact));
   await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/shield-impact-surface/impact-${width}.png`});
   const motion=await page.evaluate(()=>{
    const g=a.game,x=g.player.x,y=g.player.y;tick(.05,{x:0,y:1});a.refresh();
    return {distance:Math.hypot(g.player.x-x,g.player.y-y),angle:g.magazines[18].shieldImpacts[0]?.angle,life:g.magazines[18].shieldImpacts[0]?.life};
   });
   if(motion.distance<=0||motion.angle!==0||motion.life>=.42)throw Error(JSON.stringify(motion));
   await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/shield-impact-surface/moving-${width}.png`});
   results.push({width,time,mounted,...impact,...motion});
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'energy-shield-surface',results,errors};
}
