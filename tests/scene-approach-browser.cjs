// 4175正式页面手机触控验收：建筑本体和门前、楼梯、床、拖动取消及昼夜同屏。
async original=>{
 // 宿主页仅提供浏览器连接，停止其后台游戏循环，避免与实测手机页面争抢帧预算。
 await original.evaluate(async()=>{(await import('/src/main.js')).application.destroy();});
 const output='output/playwright/scene-approach',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:output+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
 // 只准备已解锁的正式存档和室外起点，后续移动和进屋均由真实触摸驱动。
 async function fixture(id,time='day'){
  await page.evaluate(async({id,time})=>{
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls[6]=1;p.homeDecor.floors=2;
   g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=g.attackTimer=999;g.enemies=[];g.progress.campParking.owned=[];g.progress.living.patrolActive=false;g.sceneApproach=null;
   const b=(await import('/src/core/scene-approach.js')).CLICK_BUILDINGS.find(b=>b.id===id);Object.assign(g.player,{x:b.door.x,y:b.door.y+95,vx:0,vy:0});a.renderer.camera.time=null;
   const {LIVING_DAY_MS}=await import('/src/config/living-world.js');g.progress.living.calendar.elapsed=LIVING_DAY_MS*(time==='night'?.85:.3);Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
   // 光照固定到目标时段，截图不把20秒过渡的起始白昼误记成夜景。
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
  },{id,time});
  // 跨房间夹具重置后等待镜头收敛，避免旧室内插值使按下和抬起之间热点仍在移动。
  await page.locator('[data-building-entry="'+id+'"]').waitFor({state:'visible'});await page.waitForTimeout(700);
 }
 // 从真实世界投影取得门前坐标，避免强制DOM事件掩盖空地命中问题。
 async function doorTap(id){
  const point=await page.evaluate(async id=>{
   const b=(await import('/src/core/scene-approach.js')).CLICK_BUILDINGS.find(b=>b.id===id),v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect(),p=(await import('/src/world/coordinates.js')).nearest(b.door,{x:v.x+v.w/2,y:v.y+v.h/2});
   // 居民本体继续可交谈；门前遇到居民时选择同一门口旁可见的空地。
   for(const [dx,dy] of [[0,32],[-30,16],[30,16],[0,-12]]){const x=r.left+(p.x+dx-v.x)*v.zoom,y=r.top+(p.y+dy-v.y)*v.zoom;if(document.elementFromPoint(x,y)?.dataset.buildingEntry===id)return {x,y};}
   throw Error('门前没有可点击空地：'+id);
  },id);await page.touchscreen.tap(point.x,point.y);
 }
 // 截图读取正式验收入口，核对透明触点尺寸；运行逻辑及动作时钟持续推进。
 async function shot(name){const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectSceneApproach(a.game,a.renderer,document));if(review.hits.some(hit=>hit.text||hit.width<43.99||hit.height<43.99))throw Error('透明触点尺寸或文案错误：'+JSON.stringify(review));await page.screenshot({path:output+'/'+name+'.png'});}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;});
  const start=await original.evaluate(()=>window.sceneApproachStart||0),ids=(await page.evaluate(async()=>(await import('/src/core/scene-approach.js')).CLICK_BUILDINGS.map(b=>b.id))).slice(start);
  for(const id of ids){for(const where of ['body','door']){
   await fixture(id);const button=page.locator('[data-building-entry="'+id+'"]');await button.waitFor({state:'visible'});
   if(await button.textContent())throw Error('建筑出现文字入口：'+id);
   if(where==='body')await button.tap();else await doorTap(id);
   if(id==='warehouse'){await page.locator('#warehouse-dialog').waitFor({state:'visible'});await page.evaluate(()=>document.getElementById('warehouse-dialog').close());await page.evaluate(()=>{a.game.state='playing';});}
   else await page.waitForFunction(id=>a.game.cottage?.kind===id,id);
   checks.push(id+'-'+where);
  }}
  const screenStart=await original.evaluate(()=>window.sceneApproachScreenStart||0);
  for(const [width,height,time] of [[320,568,'day'],[390,844,'night'],[844,390,'night'],[900,1280,'day'],[320,568,'night'],[390,844,'day']].slice(screenStart)){
   await page.setViewportSize({width,height});await fixture('cottage',time);await shot(width+'-'+time+'-outside');await doorTap('cottage');await page.waitForFunction(()=>a.game.cottage?.kind==='cottage');
   const stairs=page.locator('[data-cottage-target="stairs-up"]');await stairs.tap();await page.waitForFunction(()=>a.game.cottage.floor===1);await shot(width+'-'+time+'-up');await page.waitForTimeout(1250);if(await page.evaluate(()=>a.game.cottage.floor)!==1)throw Error('楼梯重复触发');
   await page.locator('[data-cottage-target="stairs-down"]').tap();await page.waitForFunction(()=>a.game.cottage.floor===0);
   // 短屏先通过真实移动让床进入镜头，再点可见床体；长屏直接点击。
   if(!await page.locator('[data-cottage-target="bed"]').isVisible()){await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>a.game.player.x<210);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>a.game.player.y<270);await page.keyboard.up('ArrowUp');}
   const day=await page.evaluate(()=>{a.game.player.hp=20;return a.game.progress.living.calendar.day;});await page.locator('[data-cottage-target="bed"]').tap();await page.waitForFunction(day=>a.game.progress.living.calendar.day===day+1,day);if(!await page.evaluate(()=>a.game.player.hp===a.game.maxHp()))throw Error('睡眠未回血');await shot(width+'-'+time+'-rest');checks.push(width+'-'+time+'-stairs-bed');
  }
  // 从建筑触点开始拖动只移动，不安排进门；方向键接管后也不得继续自动走。
  await page.setViewportSize({width:390,height:844});await fixture('cottage');const box=await page.locator('[data-building-entry="cottage"]').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+65,box.y+box.height/2,{steps:8});await page.mouse.up();if(await page.evaluate(()=>!!a.game.sceneApproach||!!a.game.cottage))throw Error('拖动误触建筑');
  await fixture('cottage');await doorTap('cottage');await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');if(await page.evaluate(()=>!!a.game.sceneApproach))throw Error('手动移动没有取消');checks.push('drag-and-manual-cancel');
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }catch(error){await shot('failure');const state=await page.evaluate(()=>({room:a.game.cottage?.kind,position:{x:a.game.player.x,y:a.game.player.y},approach:a.game.sceneApproach&&{id:a.game.sceneApproach.id,elapsed:a.game.sceneApproach.elapsed,search:a.game.sceneApproach.search?.result},state:a.game.state,dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>n.id)}));throw Error(JSON.stringify({error:error.message,checks,state,errors}));}finally{await context.close();}
}
