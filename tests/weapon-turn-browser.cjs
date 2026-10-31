// 隔离端口实机回归：挂载/试射、有限转向、正式昼夜和手机同屏。
async page=>{
  if(new URL(page.url()).port!=='4211')throw Error('仅允许隔离测试端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:960});await page.reload();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源未就绪');window.turnApp=a;
    const {freshProgress,validateProgress}=await import('/src/progression/progress.js');const p=freshProgress();p.coins=p.wood=100000;p.bosses=100;p.materials={parts:10000,crystal:10000,core:10000};p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.vehicleLoadouts=[17,18,19,20];
    a.game.progress=validateProgress(p);a.game.reset();a.game.state='ready';a.refresh();a.workshop.open('vehicle',3);
  });
  await page.locator('#ws-kits-tab').click();
  if(!await page.locator('#ws-name').innerText().then(t=>t.includes('潮汐')))throw Error('气垫船无潮汐炮详情');
  await page.screenshot({path:'output/playwright/weapon-turn/tide-workshop.png'});
  await page.locator('#ws-test').click();await page.waitForTimeout(1800);await page.screenshot({path:'output/playwright/weapon-turn/tide-trial.png'});await page.locator('#ws-trial-stop').click();
  await page.locator('#ws-back-body').click();await page.locator('[data-ws-part="2"]').click();await page.locator('#ws-socket').click();
  await page.locator('#ws-confirm').click();
  if(await page.evaluate(()=>turnApp.game.progress.vehicleLoadouts[3])!==2)throw Error('气垫船挂载失败');
  await page.locator('#ws-kits-tab').click();
  if(!await page.locator('#ws-stats').innerText().then(t=>t.includes('120')))throw Error('车载加特林容量不是120');
  await page.locator('#ws-test').click();await page.waitForTimeout(650);await page.screenshot({path:'output/playwright/weapon-turn/gatling-trial.png'});await page.locator('#ws-trial-stop').click();
  // 手机触摸将自带主炮拖回炮架，再确认装配；按钮不会改变当前出战载具。
  await page.setViewportSize({width:390,height:844});await page.locator('#ws-back-body').click();
  await page.locator('[data-ws-part="20"]').scrollIntoViewIfNeeded();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const part=await page.locator('[data-ws-part="20"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:part.x+part.width/2,y:part.y+part.height/2}]});
  const socket=await page.locator('#ws-socket').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:socket.x+socket.width/2,y:socket.y+socket.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.locator('#ws-confirm').click();await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  if(await page.evaluate(()=>turnApp.game.progress.vehicleLoadouts[3])!==20)throw Error('触摸挂载失败');
  await page.screenshot({path:'output/playwright/weapon-turn/workshop-390.png'});
  await page.setViewportSize({width:320,height:844});await page.locator('#ws-kits-tab').click();await page.screenshot({path:'output/playwright/weapon-turn/workshop-320.png'});
  await page.locator('#ws-close').click();
  const scenes=[];
  // 实际场景使用正式地形、猫视频、怪物和车辆，只有波次及目标移动受控。
  for(const mounted of [20,2])for(const width of [1280,390,320])for(const time of ['day','night']){
    await page.setViewportSize({width,height:width===1280?960:844});
    await page.evaluate(async({mounted,time})=>{
      const a=turnApp,g=a.game,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
      g.progress.vehicleIndex=3;g.progress.vehicleLoadouts[3]=mounted;g.reset();g.start();g.summonVehicle();g.updateWaves=()=>{};g.attack=()=>false;g.updateWeaponAbility=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;g.trees=g.trees.filter(t=>Math.hypot(t.x-920,t.y-850)>200);
      Object.assign(g.player,{x:900,y:850,invincible:0});
      for(const [dx,dy] of [[95,58],[145,85],[150,-15]]){const e=g.spawnEnemy(0,0,{x:900+dx,y:850+dy});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0,flying:false,football:true,mass:10000});}
      Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();
    },{mounted,time});
    await page.waitForTimeout(550);
    scenes.push(await page.evaluate(({mounted,width,time})=>({mounted,width,time,ammo:turnApp.game.vehicle.module.magazine.ammo,rotor:turnApp.game.vehicle.module.magazine.rotorSpeed||0,particles:turnApp.game.fx.items.length,canvases:document.querySelectorAll('canvas').length}),{mounted,width,time}));
    await page.screenshot({path:`output/playwright/weapon-turn/field-${mounted}-${width}-${time}.png`});
    if(width===390&&time==='day'){const before=await page.evaluate(()=>turnApp.game.player.x);await page.keyboard.down('ArrowLeft');await page.waitForTimeout(350);await page.keyboard.up('ArrowLeft');if(Math.abs(await page.evaluate(()=>turnApp.game.player.x)-before)<3)throw Error('驾驶未移动');}
  }
  // 正式 Game 的炮塔换靶连续角度采样，不调用另一套动画插值。
  const turning=await page.evaluate(async()=>{
    const g=turnApp.game;g.state='paused';g.player.x=900;g.player.y=850;g.enemies=[];g.vehicle.angle=0;g.vehicle.aimInitialized=true;g.vehicle.module.cooldown=0;g.vehicle.module.magazine.ammo=120;g.vehicle.module.magazine.remaining=0;
    const e=g.spawnEnemy(0,0,{x:790,y:850});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0});
    const {updateVehicle}=await import('/src/combat/vehicle.js'),samples=[];g.state='playing';
    for(let i=0;i<36;i++){updateVehicle(g,1/60);samples.push({angle:g.vehicle.angle,ammo:g.vehicle.module.magazine.ammo});}g.state='paused';return samples;
  });
  if(turning[0].ammo!==120||Math.abs(turning[0].angle)>.101||turning.at(-1).ammo===120)throw Error('真实炮塔跳转或没有完成瞄准');
  // 每格采样正式程序化绘制器，观察六管错位、双炮管后坐和固定机匣。
  await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');const gallery=document.createElement('canvas');gallery.id='turn-gallery';gallery.width=1200;gallery.height=280;gallery.style.cssText='position:fixed;z-index:9999;top:0;left:0;background:#eee8c8';document.body.append(gallery);
    const c=gallery.getContext('2d'),tile=document.createElement('canvas');tile.width=300;tile.height=280;
    for(let frame=0;frame<4;frame++){await renderVisualCase(tile.getContext('2d'),'weapon-turn-hovercraft',frame*.075);c.drawImage(tile,frame*300,0);}
  });
  await page.locator('#turn-gallery').screenshot({path:'output/playwright/weapon-turn/continuous-frames.png'});await page.evaluate(()=>document.getElementById('turn-gallery').remove());
  await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/weapon-turn/reduced.png'});await page.emulateMedia({reducedMotion:'no-preference'});
  if(errors.length)throw Error(errors.join('\n'));return {scenes,turning,errors};
}
