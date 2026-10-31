// 正式画面验证点击入库、展品及昼夜安全区；场景起点为隔离验收夹具。
async page=>{
 const checks=[],views=[];
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;
  const g=a.game;g.dismissFireRescue();g.enemies=[];g.spawnTimer=g.fireClock=999;
  window.clickTick=Object.getPrototypeOf(g).update.bind(g);g.update=()=>{};
  window.clickSteps=(seconds,input={x:0,y:0})=>{for(let i=0;i<Math.ceil(seconds/.05);i++)clickTick(.05,input);};
  Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.door,{vx:0,vy:0});a.renderer.camera.time=null;
 });
 await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='room-weapons');
 await page.locator('#nearby-interaction').click();await page.waitForFunction(()=>a.game.cottage?.kind==='weapons');
 await page.evaluate(async()=>{
  const g=a.game,r=(await import('/src/config/workshop-interiors.js')).interiorWeaponDisplays()[0];
  // 沿中间走廊向上，再横向到柜前，全程使用正式房间移动和碰撞。
  clickSteps((g.player.y-r.y-35)/115,{x:0,y:-1});
  clickSteps((g.player.x-r.x)/115,{x:-1,y:0});
  clickSteps(10);a.renderer.draw();a.refresh();
 });
 await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target.startsWith('display-'));
 if(await page.locator('#workshop-dialog').isVisible())throw Error('展品自动打开');
 await page.screenshot({path:'output/playwright/click-display-mobile.png'});
 await page.locator('#nearby-interaction').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 await page.locator('#workshop-dialog button').filter({hasText:'×'}).first().click();
 await page.locator('#cottage-exit').click();checks.push('工坊步行到展品并点击打开');
 await page.evaluate(async()=>{
  const g=a.game;g.progress.vehicleHulls[0]=1;g.selectVehicle(0);g.summonVehicle();
  const s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id==='north-0-1');
  Object.assign(g.player,{x:s.x,y:s.approachY,vx:0,vy:0});g.parking=null;clickSteps(10);
  if(!g.vehicle.active||g.parking?.phase!=='waiting')throw Error('停留自动停车');
  a.renderer.camera.time=null;a.renderer.draw();a.refresh();
 });
 await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target.startsWith('parking-'));
 await page.locator('#nearby-interaction').click();
 await page.evaluate(()=>{const g=a.game;if(!['align','reverse'].includes(g.parking?.phase))throw Error('点击未停车');clickSteps(8);if(g.vehicle.active)throw Error('倒车未下车');});
 checks.push('停车等待十秒不触发，点击连续倒车下车');
 // 消防原接警流程连续出车，夹具只把已扑灭火势设定为返站场景。
 await page.evaluate(async()=>{
  const g=a.game;Object.assign(g.player,(await import('/src/world/fire-navigation.js')).FIRE_EXIT,{vx:0,vy:0});g.requestFireRescue();if(!g.startFireRescue())throw Error('接警失败');
  for(let i=0;i<3000&&g.fireTransit;i++)clickTick(.05);
  for(const f of g.fireRescue.fires){f.lit=false;f.hp=0;}g.enemies=[];
  clickTick(.05);clickSteps(10);if(g.fireRescue.phase!=='returning')throw Error('消防自动入库');
  a.renderer.camera.time=null;a.renderer.draw();a.refresh();
 });
 await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='fire-parking');
 await page.screenshot({path:'output/playwright/click-fire-mobile.png'});
 await page.locator('#nearby-interaction').click();
 await page.evaluate(()=>{const g=a.game;if(g.fireRescue.phase!=='parking')throw Error('消防点击未入库');for(let i=0;i<2000&&g.fireTransit;i++)clickTick(.05);if(g.fireRescue.phase!=='won')throw Error('消防交接失败');g.dismissFireRescue();});
 checks.push('消防等待不入库，点击后连续交接');
 await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&a.game.state==='playing');
 // 固定正式日夜渲染状态，画面保留猫、停车场载具及远处怪物。
 await page.evaluate(async()=>{
  const g=a.game;Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door,{vx:0,vy:0});g.enemies=[];g.spawnEnemy(.5,220);a.renderer.camera.time=null;
 });
 for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time,forestSeason:'summer'});
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.renderer.resize();a.renderer.draw();a.refresh();
  },time);
  await page.waitForTimeout(150);
  const v=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectNearbyInteraction(a.game,document);return {...r,time:a.environment.time};});
  if(!v.visible||!v.touchTarget||v.overflow)throw Error('按钮尺寸或溢出 '+JSON.stringify(v));
  await page.screenshot({path:'output/playwright/click-'+width+'-'+time+'.png'});views.push({width,height,...v});
 }
 if(await page.locator('#nearby-interaction').textContent()!=='点击 · 进入巡林小屋')throw Error('目标错误');
 await page.locator('#nearby-interaction').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!!a.game.cottage);checks.push('电脑键盘确认同一按钮');
 return {checks,views};
}
