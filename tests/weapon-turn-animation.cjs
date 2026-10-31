// 手持加特林与直升机火神炮实机复核，补充低动态及升级部件的连续帧。
async page=>{
  if(new URL(page.url()).port!=='4211')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const scenes=[];
  for(const hand of [true,false])for(const width of [1280,390,320])for(const time of ['day','night']){
    await page.setViewportSize({width,height:width===1280?960:844});
    await page.evaluate(async({hand,time})=>{
      const a=turnApp,g=a.game,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
      g.progress.weapon=hand?2:0;g.progress.vehicleIndex=2;g.progress.vehicleLoadouts[2]=19;g.reset();delete g.attack;delete g.updateWeaponAbility;g.start();if(!hand){g.summonVehicle();g.attack=()=>false;g.updateWeaponAbility=()=>{};}
      g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;g.trees=g.trees.filter(t=>Math.hypot(t.x-920,t.y-850)>200);Object.assign(g.player,{x:900,y:850,invincible:0});
      const e=g.spawnEnemy(0,0,{x:1020,y:880});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0,flying:false,football:true,mass:10000});
      Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();
    },{hand,time});
    await page.waitForTimeout(700);
    const speed=await page.evaluate(hand=>hand?turnApp.game.magazines[2].rotorSpeed:turnApp.game.vehicle.rotorSpeed,hand);if(!(speed>20))throw Error('枪管没有启动');scenes.push({hand,width,time,speed});
    await page.screenshot({path:`output/playwright/weapon-turn/${hand?'hand':'vulcan'}-${width}-${time}.png`});
  }
  // 保持真实帧循环运行，击倒右侧目标后录制手持与不同炮架向左侧转动。
  for(const hull of [-1,3,1]) {
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(hull=>{
      const a=turnApp,g=a.game;g.progress.weapon=2;g.progress.vehicleIndex=Math.max(0,hull);g.progress.vehicleLoadouts[Math.max(0,hull)]=hull===3?20:18;
      g.reset();delete g.attack;delete g.updateWeaponAbility;g.start();if(hull>=0){g.summonVehicle();g.attack=()=>false;g.updateWeaponAbility=()=>{};}
      g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.trees=[];g.waveWarning=0;Object.assign(g.player,{x:900,y:850,invincible:0});
      const e=g.spawnEnemy(0,0,{x:1030,y:855});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0,football:true,mass:10000});a.renderer.camera.time=null;a.refresh();
    },hull);
    await page.waitForTimeout(500);
    await page.evaluate(()=>{const g=turnApp.game;g.enemies.forEach(e=>e.hp=0);const e=g.spawnEnemy(0,0,{x:770,y:855});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0,football:true,mass:10000});});
    await page.waitForTimeout(90);await page.screenshot({path:`output/playwright/weapon-turn/turn-${hull}-during.png`});
    await page.waitForTimeout(950);await page.screenshot({path:`output/playwright/weapon-turn/turn-${hull}-after.png`});
  }
  // 满级结构不得覆盖所有转子管口；减少动态时静止，颜色和机匣不抖动。
  await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{
    turnApp.game.state='paused';const {drawWeapon}=await import('/src/rendering/characters.js');
    const canvas=document.createElement('canvas');canvas.id='upgraded-rotor';canvas.width=1000;canvas.height=220;canvas.style.cssText='position:fixed;z-index:9999;top:0;left:0;background:#eee8c8';document.body.append(canvas);const c=canvas.getContext('2d');
    for(let i=0;i<4;i++)drawWeapon(c,2,75+i*250,90,2.6,0,0,.5,0,{damage:20,rate:5,capacity:5,reload:5,range:5,accuracy:5},i*.25);
  });
  await page.locator('#upgraded-rotor').screenshot({path:'output/playwright/weapon-turn/upgraded-rotor.png'});await page.evaluate(()=>document.getElementById('upgraded-rotor').remove());
  if(errors.length)throw Error(errors.join('\n'));return {scenes,errors};
}
