// 温馨小屋实机验收使用正式场景；默认4175，隔离工作树允许其他本地端口。
async page => {
  if (!['localhost','127.0.0.1'].includes(new URL(page.url()).hostname)) throw Error('仅允许本地验收');
  const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#start').click();
  await page.evaluate(async()=>{
    window.a=(await import('/src/main.js')).application;await a.ready;
    const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();
    g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();
    g.progress.restoration.repaired=['garage','cottage'];g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;
    g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999;
    g.enemies=[];g.vehicle.active=false;g.spawnTimer=g.fireClock=999;
    window.originalUpdate=g.update.bind(g);g.update=()=>{};
    Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,forestSeason:'summer'});
  });
  // 手机窄屏、长屏和既有桌面竖版容器，均保留正式猫、持枪及周边树木同屏。
  for(const [width,height] of [[320,568],[390,844],[1280,800]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    await page.evaluate(async time=>{
      const g=a.game;Object.assign(g.player,{x:850,y:365,vx:0,vy:0});g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};
      Object.assign(a.environment,{time});a.renderer.seasons.reset('summer',performance.now());
      a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
      a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
      a.renderer.camera.time=null;a.refresh();
    },time);
    await page.waitForTimeout(400);
    const info=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCozyCottage(a.renderer,document));
    if(!info.asset.ready||info.asset.decodedBytes>1048576||info.overflow)throw Error(JSON.stringify(info));
    await page.screenshot({path:`docs/art-reference/cozy-cottage/${width}-${time}.png`});views.push({width,time,...info});
  }
  await page.setViewportSize({width:390,height:844});
  // 同一绘制器检查雪层与屋后透显，不改变建筑碰撞或门口坐标。
  for(const mode of ['winter','behind']){
    await page.evaluate(async mode=>{
      Object.assign(a.game.player,{x:mode==='behind'?845:850,y:mode==='behind'?235:365});
      const season=mode==='winter'?'winter':'summer';Object.assign(a.environment,{time:'day',forestSeason:season});
      a.renderer.seasons.reset(season,performance.now());a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
      a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
    },mode);
    await page.waitForTimeout(400);await page.screenshot({path:`docs/art-reference/cozy-cottage/${mode}.png`});
  }
  // 从门前实际走入并候门，保留三秒进入和一秒自动出门的真实计时。
  await page.evaluate(()=>{
    const g=a.game;g.cottage=null;g.cottageEntry=null;g.cottageDoorLatch=false;g.cottageEntryKind=null;
    Object.assign(g.player,{x:850,y:362,vx:0,vy:0});g.enemies=[];g.boss=null;g.update=originalUpdate;
    a.renderer.camera.time=null;a.refresh();
  });
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(200);await page.keyboard.up('ArrowUp');
  await page.waitForFunction(()=>a.game.cottageEntry>0,null,{timeout:5000});
  await page.waitForFunction(()=>a.game.cottage?.kind==='cottage',null,{timeout:5000});
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>!a.game.cottage,null,{timeout:5000});await page.keyboard.up('ArrowDown');
  if(errors.length)throw Error(errors.join('\n'));
  return {views,entryExit:'实际按键进入和出门通过',errors};
}
