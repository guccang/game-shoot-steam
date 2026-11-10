// 在真实手机页面连续移动、伐木，验证昼夜表现、持久化和奖励事件没有重写主档。
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));fs.mkdirSync('output/tree-impact',{recursive:true});
 try{
  await page.goto(process.env.TEST_URL||'http://localhost:4175');await page.locator('#start').click({timeout:60000});
  await page.locator('#game-frame[data-page=game]').waitFor({timeout:120000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  const results=[];
  for(const night of [false,true]){
   await page.evaluate(async night=>{
    const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(t=>t.id);g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=g.attackTimer=g.parkingVisitTimer=999;g.enemies=[];g.progress.living.patrolActive=false;g.magazines.forEach(m=>m.ammo=0);Object.assign(g.player,{x:1980,y:1600,vx:0,vy:0});g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_DAY_MS*(night?.85:.3);
    Object.assign(a.environment,{time:night?'night':'day',weather:'sun',autoTime:false,autoWeather:false,livingPreview:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;
    window.hitTrees=g.trees.filter(t=>t.x>1800&&t.x<2100&&t.y>1400&&t.y<1700).slice(0,8);if(hitTrees.length!==8)throw Error('附近树木不足');(await import('/src/world/spatial-grid.js')).treeGrid(g.trees);a.save();a.refresh();window.writes=[];window.rawSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){writes.push({key:k,bytes:v.length});return rawSet.call(this,k,v);};window.frameTimes=[];let last=performance.now();window.collectFrames=true;requestAnimationFrame(function frame(now){frameTimes.push(now-last);last=now;if(collectFrames)requestAnimationFrame(frame);});window.startX=g.player.x;
   },night);
   await page.waitForTimeout(2500);await page.evaluate(()=>{frameTimes.length=0;startX=a.game.player.x;});
   await page.keyboard.down('ArrowRight');
   for(let i=0;i<8;i++){await page.evaluate(i=>a.game.hit(hitTrees[i],999999,false,{weaponIndex:0}),i);await page.waitForTimeout(90);}
   await page.screenshot({path:'output/tree-impact/'+(night?'night':'day')+'.png'});await page.keyboard.up('ArrowRight');
   results.push(await page.evaluate(async()=>{collectFrames=false;Storage.prototype.setItem=rawSet;const g=a.game,{createSaveStore,STORAGE_KEYS}=await import('/src/platform/storage.js'),saved=createSaveStore().loadProgress();if(g.progress.logistics.bagWood!==64||saved.logistics.bagWood!==64||saved.statistics.resources.wood!==64)throw Error('连续伐木奖励不一致');if(g.player.x<=startX)throw Error('伐木时未移动');return {wood:g.progress.logistics.bagWood,savedWood:saved.logistics.bagWood,moved:g.player.x-startX,mainWrites:writes.filter(w=>w.key===STORAGE_KEYS.progress).length,journalWrites:writes.filter(w=>w.key===STORAGE_KEYS.woodJournal).length,frameTimes};}));
  }
  // 不直接调用命中：由正式自动瞄准、弹丸移动和碰撞摧毁附近树木。
  await page.evaluate(()=>{const g=a.game;g.progress.weapon=0;g.progress.weapons[0]=1;g.magazines[0].ammo=12;g.magazines[0].remaining=0;g.attackTimer=0;g.gameplayPreferences.targetWood=true;g.parking=null;g.player.x=1980;g.player.y=1600;for(const t of g.trees)if(Math.hypot(t.x-1980,t.y-1600)<260)t.hp=1;window.beforeShotWood=g.progress.logistics.bagWood;window.beforeShotX=g.player.x;});
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1600);await page.keyboard.up('ArrowLeft');
  const shooting=await page.evaluate(async()=>{const g=a.game;const saved=(await import('/src/platform/storage.js')).createSaveStore().loadProgress();if(g.progress.logistics.bagWood<=beforeShotWood||saved.logistics.bagWood!==g.progress.logistics.bagWood||g.player.x===beforeShotX)throw Error('移动开枪或奖励恢复失败');return {before:beforeShotWood,after:g.progress.logistics.bagWood,saved:saved.logistics.bagWood,moved:g.player.x-beforeShotX};});
  await page.screenshot({path:'output/tree-impact/shooting-night.png'});console.log(JSON.stringify({shooting}));
  if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync('output/tree-impact/live.json',JSON.stringify({results,shooting,errors},null,2));console.log(JSON.stringify(results.map(({frameTimes,...rest})=>({...rest,maxFrame:Math.max(...frameTimes)}))));
 }catch(error){await page.screenshot({path:'output/tree-impact/live-failure.png'});throw error;}finally{await browser.close();}
})();
