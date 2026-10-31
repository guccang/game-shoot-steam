// 统一头顶徽记的多端昼夜实机采样：正式猫、房间、车辆、敌人与世界UI均保留。
async page=>{
 if(new URL(page.url()).port!=='4283')throw Error('仅限隔离端口4283');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.entryTick=a.game.update.bind(a.game);a.game.update=()=>{};a.game.enemies=[];a.game.vehicle.active=false;a.game.fireRescue=null;});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';},phase);
  await page.waitForFunction(phase=>a.environment.time===phase,phase);
  for(const scene of ['home-exit','home-bed','weapons-exit','vehicle-exit','home-enter','clearing','gate-top','realm-fire']){
   await page.evaluate(async scene=>{
    const g=a.game,{COTTAGE}=await import('/src/config/cottage.js'),{BUILDING_ENTRIES}=await import('/src/config/building-entries.js');g.cottage=null;g.cottageEntry=null;g.buildingEntry=null;g.buildingEntryLatch=null;g.enemies=[];g.progress.campParking.owned=[{hull:0,spot:scene==='vehicle-exit'?'garage':'cottage',hp:1,ammo:0,reload:0,wheel:0,track:0}];
    if(scene.endsWith('-exit')||scene==='home-bed'){
     const kind=scene.startsWith('home')?'cottage':scene.split('-')[0],layout=(await import('/src/config/workshop-interiors.js')).interiorLayout({kind});
     Object.assign(g.player,layout.door,{vx:0,vy:0});const core=await import('/src/core/cottage.js');if(!(kind==='cottage'?core.enterCottage(g):core.enterWorkshop(g,kind)))throw Error('入室夹具失败');
     Object.assign(g.player,scene==='home-bed'?{x:150,y:170}:layout.exit);g.cottage.exitElapsed=scene==='home-bed'?0:1.4;g.cottage.restElapsed=scene==='home-bed'?1.4:0;
    }else{
     const entry=scene==='home-enter'?COTTAGE.door:BUILDING_ENTRIES.find(e=>e.id===scene);Object.assign(g.player,entry,{vx:0,vy:0});
     if(scene==='home-enter'){g.cottageEntry=1.4;g.cottageEntryKind='cottage';}else g.buildingEntry={...entry,elapsed:1.4};
     // 只用于同屏美术采样的原生敌人，冻结正式更新，不进入玩法或污染成绩。
     g.spawnEnemy(0,80);Object.assign(g.enemies[0],{x:g.player.x+85,y:g.player.y+10});
     a.renderer.camera.time=null;
    }
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.refresh();
   },scene);await page.waitForTimeout(100);
   const result=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBuildingEntry(a.game,document,a.renderer));
   if(!result.badge||result.overflow||result.badge.y-17<0||result.badge.y+17>height||result.badge.x-34<0)throw Error('徽记布局错误 '+JSON.stringify(result));
   if(await page.locator('#resident-chatter').isVisible())throw Error('闲聊遮住徽记');
   await page.screenshot({path:`output/playwright/building-entry-countdown/${scene}-${width}-${phase}.png`});samples.push({width,phase,scene,...result});
  }
 }
 await page.evaluate(()=>{a.game.enemies=[];a.game.buildingEntry=null;a.game.buildingEntryLatch=null;a.game.update=window.entryTick;});
 // 工坊实际三秒入内及三秒离开，沿用小屋控制器与新的屏幕徽记。
 for(const kind of ['weapons','vehicle']){
  await page.evaluate(async kind=>{const g=a.game;g.cottage=null;g.cottageEntry=null;g.cottageDoorLatch=false;g.enemies=[];g.spawnTimer=g.fireClock=999;Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS[kind].door,{vx:0,vy:0});a.renderer.camera.time=null;},kind);
  await page.waitForFunction(()=>a.renderer.actionCountdownView?.icon==='home');await page.waitForFunction(kind=>a.game.cottage?.kind===kind,kind,{timeout:6500});
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>a.game.player.y>=350);await page.keyboard.up('ArrowDown');await page.waitForFunction(()=>a.renderer.actionCountdownView?.icon==='exit');await page.waitForFunction(()=>!a.game.cottage,null,{timeout:6500});
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'building-entry-countdown',samples,errors};
}
