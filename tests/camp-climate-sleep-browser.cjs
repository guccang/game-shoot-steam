// 隔离存档与手机浏览器，检查正式界面、时钟、睡眠事务和昼夜雪景；默认4175。
async original=>{
 const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),out='output/playwright/camp-climate-sleep';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 // 本机4175可能指向其他旧checkout；隔离上下文统一读取当前worktree全部正式资源。
 const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.ttf':'font/ttf','.wav':'audio/wav'};
 await context.route('http://localhost:4175/**',async r=>{
  const url=new URL(r.request().url()),file=path.resolve('.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(process.cwd()+path.sep))return r.abort();
  if(fs.existsSync(file)&&fs.statSync(file).isFile())return r.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
  return r.continue();
 });
 // 截图与预算均来自游戏的正式绘制器。
 async function shot(name){const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCampClimate(a.renderer));assert.equal(r.overflow,false);reviews.push({name,...r});await page.screenshot({path:out+'/'+name+'.png'});return r;}
 // 通过真实设置与Debug入口操作；不直接改写目标预览值。
 async function debug(){await page.locator('#settings-button').tap();if(!await page.locator('#settings-advanced').evaluate(n=>n.open))await page.locator('#settings-advanced > summary').tap();await page.locator('#debug-toggle').tap();await page.locator('#environment-button').tap();}
 async function scene(){await page.locator('#environment-ok').tap();await page.locator('#settings-done').tap();}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);p.vehicleHulls[0]=1;p.vehicleHulls[5]=1;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.enemies=[];g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999999;g.progress.living.patrolActive=false;g.parkingVisitors=[];Object.assign(g.player,{x:37002,y:5978,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});
  await debug();
  const before=await page.evaluate(()=>structuredClone(g.progress.living.calendar));
  for(const [selector,values] of [['data-forest-season',['summer','autumn','winter','spring']],['data-time',['night','dusk','day']],['data-weather',['rain','thunder','gust','snow']]])for(const value of values)await page.locator('button['+selector+'="'+value+'"]').tap();
  assert.deepEqual(await page.evaluate(()=>g.progress.living.calendar),before);
  await shot('debug-390');await scene();await page.waitForTimeout(1800);
  assert.equal(await page.evaluate(()=>a.environment.weather),'snow');assert.ok(await page.evaluate(old=>g.progress.living.calendar.elapsed>old.elapsed,before));
  const cover=await page.evaluate(()=>a.renderer.snowCover);assert.ok(cover>0&&cover<.2);
  // 大雪保持真实动态与原演员：怪物、停放车辆、猫和屋顶同时入镜。
  await page.evaluate(()=>{const e=g.spawnEnemy(0,100,{x:g.player.x-140,y:g.player.y+50});Object.assign(e,{hp:10000,maxHp:10000,speed:0,damage:0});g.progress.campParking.owned=[{hull:5,mapId:'forest',spot:null,x:g.player.x-100,y:g.player.y+35,hp:1,ammo:0}];});
  await shot('snow-start');await page.waitForTimeout(15000);await shot('snow-building');
  // 快进纯积雪时间用于端点同屏，连续实际运行增长已单独记录。
  await page.evaluate(async()=>{a.renderer.snowCover=(await import('/src/world/snow-cover.js')).advanceSnowCover(a.renderer.snowCover,'snow',90000);});
  for(const [width,height] of [[320,568],[390,844],[844,390],[1100,900]]){
   await page.setViewportSize({width,height});
   for(const time of ['day','night']){
    await debug();await page.locator('button[data-time="'+time+'"]').tap();await scene();
    await page.evaluate(()=>{a.renderer.light.started.night=performance.now()-20000;a.renderer.light.started.dusk=performance.now()-20000;});
    await page.waitForTimeout(400);await shot('snow-'+width+'-'+time);
   }
  }
  await page.setViewportSize({width:390,height:844});await debug();await page.locator('button[data-weather="sun"]').tap();await scene();
  const full=await page.evaluate(()=>a.renderer.snowCover);await page.waitForTimeout(5000);const melting=await page.evaluate(()=>a.renderer.snowCover);assert.ok(melting<full&&melting>0);await shot('snow-melting');
  await debug();await page.locator('#environment-reset').tap();await scene();
  assert.equal(await page.locator('#weather-picture').evaluate(n=>n.tagName),'DIV');
  // 五个营地抵达由主循环识别；同一地区停留不反复重抽，退出后恢复季节天气。
  const climates=[];
  for(const id of ['mossbrook','emberforge','snowcedar','rainbell','stratacove']){
   await page.evaluate(async id=>{const c=(await import('/src/config/regional-camps.js')).REGIONAL_CAMPS.find(c=>c.id===id);Object.assign(g.player,{x:c.x,y:c.y});g.enemies=[];},id);
   await page.waitForFunction(id=>a.environment.climateCamp===id,id);const weather=await page.evaluate(()=>a.environment.weather);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>a.environment.weather),weather);climates.push({id,weather});
  }
  await page.evaluate(()=>Object.assign(g.player,{x:37002,y:5978,vx:0,vy:0}));
  await page.waitForFunction(()=>a.environment.climateCamp==='snowcedar');
  await debug();await page.locator('button[data-weather="snow"]').tap();await page.locator('button[data-time="day"]').tap();await scene();
  await page.evaluate(()=>{a.renderer.snowCover=.65;g.enemies=[];const e=g.spawnEnemy(0,140,{x:g.player.x-140,y:g.player.y+60},{ambient:true});Object.assign(e,{hp:10000,maxHp:10000,speed:0,damage:0});g.progress.campParking.owned=[{hull:5,mapId:'forest',spot:null,x:g.player.x-100,y:g.player.y+35,hp:1,ammo:0}];a.renderer.camera.time=null;});
  const position=await page.evaluate(()=>({x:g.player.x,y:g.player.y})),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:80,y:560}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:100,y:590}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  const moved=await page.evaluate(()=>({x:g.player.x,y:g.player.y}));assert.ok(Math.hypot(moved.x-position.x,moved.y-position.y)>5);
  await shot('actors-day');await debug();const pausedSnow=await page.evaluate(()=>a.renderer.snowCover);await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>a.renderer.snowCover),pausedSnow);
  await page.locator('button[data-time="night"]').tap();await scene();await page.waitForTimeout(16000);await shot('actors-night');
  await debug();await page.locator('button[data-weather="sun"]').tap();await scene();const snowBefore=await page.evaluate(()=>a.renderer.snowCover);await page.waitForTimeout(2000);assert.ok(await page.evaluate(n=>a.renderer.snowCover<n,snowBefore));await shot('actors-melting');
  await debug();await page.locator('#environment-reset').tap();await scene();
  fs.writeFileSync(out+'/climate-report.json',JSON.stringify({designCriterion:'camp-climate-sleep',climates,position,moved,pausedSnow,reviews,errors},null,2));
  const pixels=await page.evaluate(async()=>{
   const {drawCachedCampArchitecture:draw,campBuildingCache:cache}=await import('/src/rendering/camp-building-cache.js'),canvas=document.createElement('canvas');canvas.width=300;canvas.height=240;const c=canvas.getContext('2d',{willReadFrequently:true});
   // 实际绘制器的两个端点预热后，半雪透明边界不能出现重复接触影。
   const sample=snow=>{c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,300,240);c.translate(150,180);draw(c,'warehouse',snow,0);return c.getImageData(0,0,300,240).data;};
   sample(0);sample(1);while(cache.pending.size)cache.advance();const dry=sample(0),snow=sample(1),half=sample(.5);let compared=0,maxDelta=0;
   for(let i=3;i<dry.length;i+=4)if(dry[i]===snow[i]&&dry[i]>10&&dry[i]<230){compared++;maxDelta=Math.max(maxDelta,Math.abs(half[i]-dry[i]));}
   return {compared,maxDelta};
  });assert.ok(pixels.compared>100);assert.ok(pixels.maxDelta<=2);
  for(const r of reviews){assert.ok(r.cache.campBuildings.bytes<=r.cache.campBuildings.maxBytes);assert.ok(r.cache.campBuildings.blendBytes<=819200);assert.ok(r.cache.trees.count<=96);}
  // 正式进入小屋、床边候停，取消与三种睡醒目标都通过真实按钮。
  for(const mode of ['cancel','dusk','night','morning']){
   await page.evaluate(async()=>{const {COTTAGE}=await import('/src/config/cottage.js');if(!g.cottage){Object.assign(g.player,COTTAGE.door);(await import('/src/core/home/cottage.js')).enterCottage(g);}g.progress.living.calendar.elapsed=1000;Object.assign(g.player,COTTAGE.bed);g.cottage.bedLatch=false;g.cottage.restElapsed=null;g.cottage.sleepRequested=false;g.player.hp=20;a.refresh();});
   await page.locator('#cottage-sleep-dialog').waitFor({state:'visible'});const date=await page.evaluate(()=>structuredClone(g.progress.living.calendar));await shot('sleep-'+mode);
   if(mode==='cancel'){await page.locator('[data-cancel-sleep]').tap();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>g.cottage.sleep),null);assert.equal(await page.locator('#cottage-sleep-dialog').isVisible(),false);continue;}
   await page.locator('[data-sleep="'+mode+'"]').tap();await page.waitForFunction(()=>!g.cottage.sleep&&g.player.hp===g.maxHp());
   const result=await page.evaluate(async()=>({calendar:g.progress.living.calendar,phase:(await import('/src/world/living-calendar.js')).calendarView(g.progress.living.calendar).id}));assert.equal(result.phase,mode==='morning'?'day':mode);assert.equal(result.calendar.day,date.day+(mode==='morning'?1:0));
  }
  const frames=await page.evaluate(()=>g.profiler.events.filter(e=>e.type==='frame-error'));assert.deepEqual(frames,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/report.json',JSON.stringify({designCriterion:'camp-climate-sleep',cover,full,melting,reviews,errors,frames},null,2));return {screenshots:reviews.length,cover,full,melting,errors};
 }catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();}
}
