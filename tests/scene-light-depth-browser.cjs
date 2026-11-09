// 正式手机场景的光影、移动、暂停、武器和资源预算验收；基线模式仅供同机性能对照。
async (page,{baseline=false}={})=>{
 const fs=require('node:fs'),assert=require('node:assert/strict'),out='output/scene-light-depth/'+(baseline?'before':'after');fs.mkdirSync(out,{recursive:true});const errors=[],reports=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.currentId=null;p.vehicleHulls[0]=1;p.vehicleIndex=0;
  const g=a.game;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.enemies=[];g.boss=null;g.updateWaves=()=>{};g.findAttackTarget=()=>null;g.attack=()=>false;g.mainlineSpeech=null;g.attackTimer=g.mainlineTalkDelay=g.fireClock=999999;g.vehicle.active=false;g.livingPersist=()=>true;
 });
 for(const [name,time,width,height] of [['camp','day',390,844],['camp','night',390,844],['camp','day',320,568],['camp','night',1280,900],['forest','day',390,844],['lamp','night',390,844]]){
  await page.setViewportSize({width,height});await page.evaluate(async({name,time})=>{
   const g=a.game;g.cottage=null;g.state='playing';g.enemies=[];g.cottageDoorLatch=true;
   let point={x:600,y:700};if(name==='forest'){const t=g.trees.filter(t=>t.hp>0).sort((u,v)=>Math.hypot(u.x-2000,u.y-1500)-Math.hypot(v.x-2000,v.y-1500))[0];point={x:t.x+30*(t.size||1),y:t.y+18*(t.size||1)};}
   if(name==='lamp'){const l=(await import('/src/world/lighting.js')).LIGHT_FIXTURES[3];point={x:l.x+l.offset+45,y:l.y+25};}
   Object.assign(g.player,{...point,vx:0,vy:0});g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:point.x+100,y:point.y+95,hp:1,ammo:0}];
   if(name==='camp'){const e=g.spawnEnemy(0,0,{x:point.x-95,y:point.y+70});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0});}
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true,randomGusts:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  },{name,time});
  await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${name}-${time}-${width}.png`});
  const report=await page.evaluate(()=>({light:a.renderer.sceneDepthReview,visible:a.renderer.visibleStats,overflow:document.documentElement.scrollWidth>innerWidth,phase:a.environment.time,body:a.game.player.bodyAnimation}));assert.equal(report.overflow,false);assert.equal(report.phase,time);if(!baseline)assert.equal(report.light.designCriterion,'scene-light-depth');reports.push({name,time,width,...report});
 }
 // 同一场景按真实触摸移动，保留正式镜头和缓存；统计预热后的逐帧画布耗时。
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{a.game.enemies=[];a.diagnostics.monitor.frames=[];});
 const cdp=await page.context().newCDPSession(page),frame=await page.locator('#game-frame').boundingBox(),x=frame.x+100,y=frame.y+500;
 const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y}]});await page.waitForTimeout(1600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 const moved=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));assert.ok(Math.hypot(moved.x-before.x,moved.y-before.y)>5);
 await page.screenshot({path:`${out}/moving-night.png`});
 const timing=await page.evaluate(()=>{const f=a.diagnostics.monitor.frames.filter(f=>f.state==='playing'),v=f.map(f=>f.sections['render.canvas']||0).sort((a,b)=>a-b);return {frames:f.length,mean:v.reduce((a,b)=>a+b,0)/v.length,p95:v[Math.floor(v.length*.95)]};});
 // 暂停不推进身体帧，受光参数在固定位置保持稳定。
 await page.evaluate(()=>{a.game.pause();});const paused=await page.evaluate(()=>JSON.stringify(a.game.player.bodyAnimation));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify(a.game.player.bodyAnimation)),paused);
 if(!baseline){
  // 四向长武器经过同一正式角色合成层，预算封顶且保留连续身体帧。
  await page.evaluate(()=>{a.game.state='playing';a.game.progress.weapon=14;a.refresh();});
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){await page.evaluate(angle=>{a.game.player.angle=angle;},angle);await page.waitForTimeout(100);await page.screenshot({path:`${out}/weapon-${Math.round(angle*100)}.png`});}
  const budget=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectSceneLightDepth(a.renderer));assert.ok(budget.actorBytes<=4194304);assert.ok(budget.grassBytes<=524288);
  // 正式召车/下车接口确认骑手与车体仍各自排序，触控行驶保留履带动画。
  await page.evaluate(()=>{const g=a.game;g.progress.weapon=0;const parked=g.progress.campParking.owned.find(v=>v.hull===g.vehicle.index);if(parked)Object.assign(g.player,{x:parked.x,y:parked.y});g.summonVehicle();a.refresh();});assert.equal(await page.evaluate(()=>a.game.vehicle.active),true);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');await page.screenshot({path:`${out}/riding-night.png`});
  await page.evaluate(()=>{a.game.vehicle.active=false;});
  // 进入真实地下层，通过手机工具放矿灯，检查身体受光与雾层读取同一组灯源。
  await page.evaluate(async()=>{
   const g=a.game,p=g.progress,{minePoint}=await import('/src/config/mining.js');p.homeDecor.basement=true;p.wood=10000;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.mining.ore=10000;p.mining.shafts=['7,3'];
   for(let x=4;x<=9;x++)for(let y=1;y<=5;y++){p.mining.dug[`${x},${y}`]=true;p.mining.bridges[`${x},${y}`]=true;}
   Object.assign(g.player,minePoint({x:7,y:3}),{vx:0,vy:0});(await import('/src/core/mining/mining.js')).enterMine(g,'7,3');g.cottage.scanWait=999999;a.refresh();
  });
  await page.waitForTimeout(200);await page.locator('#mine-tools-toggle').tap();await page.locator('[data-mine-tool="lamp"]').tap();await page.locator('#mine-tools-toggle').tap();
  for(const time of ['day','night']){
   await page.evaluate(async time=>{const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;a.refresh();},time);await page.waitForTimeout(250);
   const mine=await page.evaluate(()=>{a.renderer.draw();if(!a.renderer.mineFogReview)throw Error(JSON.stringify({errors:a.game.profiler.events.filter(e=>e.type==="frame-error"),state:a.game.state,room:a.game.cottage?.kind}));return {light:a.renderer.sceneDepthReview.light,sources:a.renderer.mineFogReview.sources};});assert.ok(mine.light.power>.1);assert.ok(mine.sources.some(p=>p.kind==='lamp'));await page.screenshot({path:`${out}/mine-${time}.png`});reports.push({name:'mine',time,...mine});
  }
  reports.push({name:'budget',...budget});
 }
 const frameErrors=await page.evaluate(()=>a.game.profiler.events.filter(e=>e.type==='frame-error'));assert.deepEqual(frameErrors,[]);assert.deepEqual(errors,[]);
 const result={reports,timing,before,moved,errors};fs.writeFileSync(out+'/review.json',JSON.stringify(result,null,2));return result;
}
