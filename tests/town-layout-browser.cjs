// 新镇实际入口、鼠标行走、停车及手机昼夜画面；只在隔离端口修改测试存档。
async page=>{
 if(new URL(page.url()).port!=='4291')throw Error('仅限隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.vehicleHulls[1]=1;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game;g.enemies=[];g.spawnTimer=g.fireClock=g.attackTimer=999;
  window.townTick=Object.getPrototypeOf(g).update.bind(g);g.update=()=>{};
  window.townSteps=(seconds,input={x:0,y:0})=>{for(let i=0;i<Math.ceil(seconds/.05);i++)townTick(.05,input);};
 });
 await page.setViewportSize({width:390,height:844});
 const checks=[];
 for(const id of ['room-weapons','room-vehicle','room-cottage','post-sunleaf-post','clearing','realm-tower','realm-rogue','realm-guardian']){
  await page.evaluate(async id=>{
   const {BUILDING_ENTRIES}=await import('/src/config/building-entries.js'),{WORKSHOP_INTERIORS}=await import('/src/config/workshop-interiors.js'),{COTTAGE}=await import('/src/config/cottage.js');
   const room=id==='room-cottage'?COTTAGE:Object.values(WORKSHOP_INTERIORS).find(r=>'room-'+r.id===id);
   const target=room?.door||BUILDING_ENTRIES.find(e=>e.id===id);if(!target)throw Error('缺少入口 '+id);
   Object.assign(a.game.player,target,{vx:0,vy:0});a.renderer.camera.time=null;townSteps(3.2);a.refresh();
  },id);
  await page.waitForFunction(id=>document.getElementById('nearby-interaction').dataset.target===id,id);
  await page.locator('#nearby-interaction').click();
  if(id.startsWith('room-')){
   await page.waitForFunction(()=>!!a.game.cottage);
   await page.locator('#cottage-exit').click();await page.waitForFunction(()=>!a.game.cottage);
  }else if(id.startsWith('realm-')){
   await page.waitForFunction(mode=>a.game.realm?.mode===mode,id.slice(6));
   if(!await page.locator('#realm-dialog').isVisible())await page.locator('#realm-button').click();
   await page.locator('[data-realm-exit]').click();
   await page.waitForFunction(()=>!a.game.realm);
   await page.evaluate(()=>{a.game.start();a.game.enemies=[];a.game.spawnTimer=a.game.fireClock=999;a.refresh();});
  }else{
   const dialog=id==='clearing'?'#clearing-dialog':id.startsWith('post-')?'#story-dialog':'#realm-dialog';
   await page.locator(dialog).waitFor({state:'visible'});
   await page.locator(dialog+' button').filter({hasText:'×'}).first().click();
  }
  checks.push(id+' 点击打开');
 }
 // 实际驾驶进工坊，保持连续倒车与下车。
 await page.evaluate(async()=>{
  const g=a.game;g.progress.vehicleIndex=1;g.selectVehicle(1);g.summonVehicle();
  const s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id==='garage');
  Object.assign(g.player,{x:s.x,y:s.approachY,vx:0,vy:0});g.parking=null;townSteps(3.2);a.renderer.camera.time=null;a.refresh();
 });
 await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='parking-garage');
 await page.locator('#nearby-interaction').click();
 await page.evaluate(()=>{townSteps(8);if(a.game.vehicle.active)throw Error('工坊倒车失败');});
 checks.push('新车库点击后连续倒车下车');
 if(await page.evaluate(()=>!!a.game.cottage))await page.locator('#cottage-exit').click();
 // 真实键盘行走穿过南门再返回，不直接修改目标落点。
 await page.evaluate(()=>{Object.assign(a.game.player,{x:690,y:1330,vx:0,vy:0});a.renderer.camera.time=null;a.game.update=townTick;});
 await page.keyboard.down('s');await page.waitForTimeout(1700);await page.keyboard.up('s');
 const walked=await page.evaluate(()=>a.game.player.y);if(walked<1420)throw Error('南门行走受阻 '+walked);
 await page.keyboard.down('w');await page.waitForTimeout(1700);await page.keyboard.up('w');
 await page.evaluate(()=>{a.game.update=()=>{};});checks.push('键盘双向穿过南门');
 const views=[];
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){
  await page.setViewportSize({width,height});
  for(const time of ['day','night'])for(const [zone,x,y] of [['home',810,385],['weapons',380,625],['garage',425,1040],['tasks',855,975],['challenges',800,1320]]){
   await page.evaluate(async({time,x,y})=>{
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time,forestSeason:'summer'});
    a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start;
    a.environment.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();
    Object.assign(a.game.player,{x,y,vx:0,vy:0});a.renderer.camera.time=null;
    a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
    a.renderer.resize();a.renderer.draw();a.refresh();
   },{time,x,y});
   await page.waitForTimeout(180);
   await page.screenshot({path:'output/playwright/town-'+zone+'-'+width+'-'+time+'.png'});
   views.push({zone,width,time});
  }
 }
 // 总览只替换验收镜头；场景、昼夜和实体排序仍走正式绘制器。
 await page.setViewportSize({width:1280,height:1100});
 await page.evaluate(()=>{
  window.normalTownCamera=a.renderer.camera.update.bind(a.renderer.camera);
  a.renderer.camera.update=(p,w,h)=>{const zoom=Math.min(w/1180,h/1550);return{x:20-(w/zoom-1180)/2,y:0,w:w/zoom,h:h/zoom,width:w,height:h,zoom};};
 });
 for(const time of ['day','night']){
  await page.evaluate(async time=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.environment.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.draw();a.refresh();
  },time);
  await page.waitForTimeout(500);await page.screenshot({path:'output/playwright/town-overview-'+time+'.png'});
 }
 const inspection=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectTownLayout(a.game,a.renderer,document));
 await page.evaluate(()=>{a.renderer.camera.update=normalTownCamera;a.renderer.camera.time=null;});
 if(errors.length||inspection.overflow)throw Error(JSON.stringify({errors,inspection}));
 return {checks,views,inspection,errors};
}
