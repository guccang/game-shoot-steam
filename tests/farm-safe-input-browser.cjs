// 手机真实触摸验证田地误触保护、短按快捷操作和显式种田入口，使用独立存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(new URL(original.url()).origin);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;
   p.farm.plots=[{id:0,mapId:'forest',x:893,y:2752,crop:null,plantedAt:0,readyAt:0,watered:false}];p.farm.nextId=1;p.farm.seeds[0]=10;
   p.vehicleIndex=0;p.vehicleHulls[0]=1;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,0);
   g.progress=p;g.reset();g.state='playing';g.update=()=>{};g.vehicle.active=false;g.trees=[];g.enemies=[];g.boss=null;g.mainlineSpeech=null;
   Object.assign(g.player,{x:893,y:2814});if(!g.summonVehicle())throw Error('上车失败');g.vehicle.hp=73;
   window.farmCore=await import('/src/core/farming/farm.js');a.refresh();a.renderer.draw();
  });
  const cdp=await context.newCDPSession(page);let menuCalls=0;
  // 从田地中心开始拖动，必须进入统一摇杆，不能开始农活或下车。
  async function drag(){
   const point=await page.evaluate(()=>{const v=a.renderer.view,c=a.renderer.canvas.getBoundingClientRect();return {x:c.left+(893-v.x)*v.zoom,y:c.top+(2752-v.y)*v.zoom};});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+38,y:point.y+30,id:1}]});
   if(!await page.evaluate(()=>!document.getElementById('joystick').hidden))throw Error('田地拦截了移动手势');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  // 快捷菜单仍可按，危险时给出提示而不改变驾驶或农活状态。
  async function menu(){
   menuCalls++;
   if(await page.locator('#field-menu-toggle').getAttribute('aria-expanded')!=='true')await page.locator('#field-menu-toggle').tap();
   try{await page.locator('#farm-menu').waitFor({state:'visible',timeout:5000});}catch(e){await page.screenshot({path:'output/playwright/farm-safe-input/menu-failure.png'});throw Error('菜单第'+menuCalls+'次展开失败：'+JSON.stringify(await page.evaluate(()=>({expanded:document.getElementById('field-menu-toggle').getAttribute('aria-expanded'),state:a.game.state,dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)}))));}await page.locator('#farm-menu').tap();
   await page.waitForFunction(()=>document.getElementById('field-menu-toggle').getAttribute('aria-expanded')==='false');
  }
  await page.locator('[data-farm-cell="0"]').waitFor({state:'hidden'});await drag();
  if(!await page.evaluate(()=>a.game.vehicle.active&&!a.game.farmWork&&a.game.vehicle.hp===73))throw Error('驾驶碰到田地下车');
  await page.evaluate(()=>{a.game.enemies=[{id:991,type:'enemy',x:893+80,y:2814,hp:100,radius:12}];a.refresh();});
  await menu();if(!await page.evaluate(()=>a.game.vehicle.active&&!a.game.farmWork))throw Error('战斗入口导致下车');
  if(!await page.locator('#farm-notice').textContent().then(s=>s.includes('战斗中暂不可种地')))throw Error('缺少战斗提示');
  await page.evaluate(()=>{a.game.enemies=[];a.refresh();});await menu();await page.locator('#farm-tools').waitFor({state:'visible'});
  if(await page.evaluate(()=>a.game.vehicle.active))throw Error('安全时主动种地无法下车');
  await page.locator('#farm-exit').tap();if(!await page.evaluate(()=>a.game.vehicle.active&&a.game.vehicle.hp===73))throw Error('退出没有恢复原车');
  await page.evaluate(()=>{a.game.dismountVehicle();a.refresh();});await page.locator('[data-farm-cell="0"]').waitFor({state:'visible'});await drag();
  if(await page.evaluate(()=>!!a.game.farmWork))throw Error('安全步行拖动误开农活');
  const cell=page.locator('[data-farm-cell="0"]'),r=await cell.boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});
  if(await page.evaluate(()=>!!a.game.farmWork))throw Error('按下即切农具');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await cell.tap();await page.locator('#farm-picker').waitFor({state:'visible'});
  for(const time of ['day','night']){await page.evaluate(async time=>{a.game.progress.living.calendar.elapsed=time==='day'?400000:1100000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.refresh();},time);await page.screenshot({path:`output/playwright/farm-safe-input/shortcut-${time}.png`});}
  // 成熟田也不能在拖动时自动换镰刀；短按才真正安排收割。
  await page.locator('#farm-exit').tap();await page.evaluate(()=>{a.game.progress.farm.plots[0].crop=0;a.refresh();});await drag();
  if(await page.evaluate(()=>!!a.game.farmWork))throw Error('成熟田拖动误收割');
  await cell.tap();if(!await page.evaluate(()=>a.game.farmWork?.tool==='harvest'&&a.game.farmWork.queue.length===1))throw Error('成熟田短按未安排收割');
  // 已主动开始的农活遇敌保留队列，警戒期间不能切工具清掉待办，脱战后恢复。
  await page.evaluate(()=>{a.game.enemies=[{id:992,type:'enemy',x:973,y:2814,hp:100,radius:12}];farmCore.updateFarmWork(a.game,.05,{x:0,y:0});a.refresh();});
  await cell.waitFor({state:'hidden'});if(!await page.locator('#farm-water').isDisabled())throw Error('迎敌时仍能切农具');
  await menu();if(!await page.evaluate(()=>a.game.farmWork.autoCombat&&a.game.farmWork.queue.length===1))throw Error('迎敌入口破坏队列');
  await page.evaluate(()=>{a.game.enemies=[];for(let i=0;i<120&&a.game.farmWork.autoCombat;i++)farmCore.updateFarmWork(a.game,.05,{x:0,y:0});a.refresh();});
  if(!await page.evaluate(()=>!a.game.farmWork.autoCombat&&!!(a.game.farmWork.job||a.game.farmWork.queue.length)))throw Error('脱战未恢复原农活');
  if(errors.length)throw Error(errors.join('\n'));return {passed:true,errors};
 }finally{await context.close();}
}
