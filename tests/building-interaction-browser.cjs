// 默认4175，允许独立本地端口；验证正式按钮和真实点击事务，截图阶段冻结逻辑以便比对锚点。
async page=>{
 if(!['localhost','127.0.0.1'].includes(new URL(page.url()).hostname))throw Error('仅允许本地测试');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();window.a?.destroy();localStorage.clear();
  const {freshProgress}=await import('/src/progression/progress.js'),{STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');
  const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls[0]=p.vehicleHulls[4]=1;
  localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
  window.a=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
 });
 await page.locator('#start').click();await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(()=>{const g=a.game;window.buildingTick=g.update.bind(g);g.update=()=>{};g.enemies=[];g.encounterTimer=g.fireClock=999;g.mainlineTalkDelay=999;});
 // 真正的游戏场景切换夹具保留建筑、人物、载具及原版渲染器，只有定位设置为指定测试点。
 for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const g=a.game,s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id==='garage');
   g.cottage=null;g.parking=null;g.progress.campParking.owned=[];g.vehicle.index=0;g.progress.vehicleIndex=0;g.vehicle.active=true;g.vehicle.hp=g.vehicle.maxHp||100;Object.assign(g.player,{x:s.x,y:s.approachY,vx:0,vy:0});
   Object.assign(a.environment,{time,weather:'sun',livingPreview:true,autoTime:false,autoWeather:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  },time);await page.waitForTimeout(250);
  const info=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBuildingInteraction(a.renderer,document));
  if(!info.visible||info.target!=='parking-garage'||info.anchorError>1||!info.touchTarget||info.overflow)throw Error('建筑按钮异常 '+JSON.stringify(info));
  await page.screenshot({path:`output/playwright/building-interaction/garage-${width}-${time}.png`});samples.push({width,height,time,...info});
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
 const before=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBuildingInteraction(a.renderer,document));
 await page.evaluate(()=>{a.game.player.x+=12;a.game.player.y+=4;});await page.waitForTimeout(200);
 const after=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBuildingInteraction(a.renderer,document));
 if(JSON.stringify(before.anchor)!==JSON.stringify(after.anchor)||after.anchorError>1)throw Error('移动玩家带走了按钮');
 await page.locator('#nearby-interaction').click();
 await page.evaluate(()=>{if(!['align','reverse'].includes(a.game.parking?.phase))throw Error('停车点击未执行');for(let i=0;i<400&&a.game.vehicle.active;i++)buildingTick(.04);if(a.game.vehicle.active)throw Error('未完成停车');});
 // 在正式房间中验证床和展柜的投影，操作仍调用既有弹窗与休息流程。
 for(const kind of ['cottage','weapons']){
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(async kind=>{
   const g=a.game;g.state='playing';
   if(g.cottage)(await import('/src/core/home/cottage.js')).leaveCottage(g);
   g.state='playing';g.vehicle.active=false;g.buildingEntry=null;g.cottageEntry=null;
   const config=await import('/src/config/workshop-interiors.js'),core=await import('/src/core/home/cottage.js');Object.assign(g.player,config.interiorLayout({kind}).door);
   if(!(kind==='cottage'?core.enterCottage(g):core.enterWorkshop(g,kind)))throw Error('进入房间失败');
   const item=kind==='cottage'?(await import('/src/config/cottage.js')).COTTAGE.bed:config.interiorWorkshopTargets(g)[0];Object.assign(g.player,{x:item.x+25,y:item.y+20});a.refresh();
  },kind);await page.waitForTimeout(200);
  const info=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBuildingInteraction(a.renderer,document));if(!info.visible||info.anchorError>1||info.overflow)throw Error('室内锚点异常 '+JSON.stringify(info));samples.push({kind,...info});
  await page.screenshot({path:`output/playwright/building-interaction/${kind}.png`});await page.locator('#nearby-interaction').click();
  await page.waitForFunction(kind=>kind==='cottage'?!!a.game.cottage.restOpen:!!document.getElementById('workshop-dialog').open,kind);
  if(kind==='cottage')await page.locator('#cottage-rest-cancel').click();else await page.keyboard.press('Escape');
 }
 // 屋面进门徽记与建筑升级按钮同时可见，检查固定间距，保留正式计时状态。
 await page.keyboard.press('Escape');
 await page.evaluate(async()=>{const g=a.game;g.state='playing';if(g.cottage)(await import('/src/core/home/cottage.js')).leaveCottage(g);g.vehicle.active=false;g.cottageEntryKind='weapons';g.cottageEntry=1;Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.door);a.renderer.camera.time=null;a.refresh();});
 await page.waitForTimeout(200);
 const doorway=await page.evaluate(()=>{const badge=a.renderer.actionCountdownView,b=document.getElementById('nearby-interaction').getBoundingClientRect(),c=a.renderer.canvas.getBoundingClientRect();return {badge,gap:b.top-c.top-(badge.y+badge.height/2)};});
 if(doorway.gap<4)throw Error('进门徽记与升级按钮重叠 '+JSON.stringify(doorway));
 await page.screenshot({path:'output/playwright/building-interaction/doorway.png'});
 if(errors.length)throw Error(errors.join(' / '));return {samples,parkingClicked:true,roomClicks:true,errors};
}
