// 团子家族浏览器验收：正式图鉴、战斗动作、手机/桌面昼夜与真实走位。
async page=>{
 if(new URL(page.url()).port!=='4246')throw Error('仅使用隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('资源加载失败');
  const {freshProgress}=await import('/src/progression/progress.js'),p=freshProgress();
  p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=['first-map'];p.mainline.phase='doing';p.living.patrolActive=true;
  a.game.progress=p;a.game.arrivalScene=null;a.game.reset();a.menu.enter();a.game.start();
  const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.updateWaves=()=>{};g.attack=()=>{};g.updateWeaponAbility=()=>{};g.encounterTimer=999;
  g.player.hp=1e6;g.player.invincible=999;Object.assign(g.player,{x:1600,y:400,arena:{x:1600,y:400,radius:1000}});g.trees=[];g.enemies=[];
  const {MONSTER_FAMILIES}=await import('/src/config/monster-families.js'),{RANGED_ENEMIES}=await import('/src/config/ranged-enemies.js');
  const positions=[[-105,-45],[105,-45],[-105,60],[105,60],[-90,165],[90,165],[-80,255],[80,255]];
  for(const [i,species] of MONSTER_FAMILIES.dumpling.members.entries()){
   const e=g.spawnEnemy(0,0,{x:1600+positions[i][0],y:400+positions[i][1]});
   Object.assign(e,{reviewId:i,species,flying:species==='leaf-bat',biome:'meadow',hp:1e6,maxHp:1e6,speed:32,damage:1,radius:species==='ironwood-bulwark'?25:RANGED_ENEMIES[species]?.bodyRadius||17,arena:g.player.arena,level:0,rank:0,tough:false});
  }
  g.progress.bossChallenge={kind:'dumpling',bosses:0,maxHp:1200,damage:5,blastDamage:10,speed:34};
  (await import('/src/core/battle/boss-manager.js')).restoreBoss(g,1200);Object.assign(g.boss,{x:1600,y:185,attack:0,arena:g.player.arena});
  Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});a.renderer.seasons.reset('summer',performance.now());a.refresh();
 });
 await page.setViewportSize({width:390,height:844});
 const samples=[];
 for(let i=0;i<32;i++){await page.waitForTimeout(160);samples.push(await page.evaluate(()=>({phase:a.game.boss?.ai.phase,xy:[a.game.boss?.x,a.game.boss?.y],bolts:a.game.enemyBolts.length,attacks:a.game.enemies.map(e=>e.assault?.phase)})));}
 for(const phase of ['windup','cast','recover'])if(!samples.some(s=>s.phase===phase))throw Error('缺少领主阶段 '+phase);
 const start=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');
 const moved=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));if(Math.hypot(moved.x-start.x,moved.y-start.y)<15)throw Error('实机走位失败');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:65,y:660}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:65,y:615}]});await page.waitForTimeout(300);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 const frames=await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{monsterAtlasStats}=await import('/src/rendering/monster-atlas.js');
  const gallery=document.createElement('canvas');gallery.id='dumpling-gallery';gallery.width=1000;gallery.height=580;gallery.style.cssText='position:absolute;z-index:9999;left:0;top:0;width:1000px;background:#eee8c8';document.body.append(gallery);
  const c=gallery.getContext('2d'),tile=document.createElement('canvas');tile.width=680;tile.height=340;await renderVisualCase(tile.getContext('2d'),'dumpling-camp-family',.5);c.drawImage(tile,0,0);
  tile.width=300;tile.height=340;await renderVisualCase(tile.getContext('2d'),'dumpling-lord',.5);c.drawImage(tile,700,0);
  const before=monsterAtlasStats(),data=[];tile.width=200;tile.height=240;
  for(const [i,t] of [.1,.9,1.4,1.9,2.6].entries()){await renderVisualCase(tile.getContext('2d'),'dumpling-lord',t);data.push(tile.toDataURL());c.drawImage(tile,i*200,340);}
  const after=monsterAtlasStats();return {before,after,unique:new Set(data).size};
 });
 await page.setViewportSize({width:1280,height:900});await page.locator('#dumpling-gallery').screenshot({path:'output/playwright/dumpling-family/family-and-lord.png'});await page.evaluate(()=>document.getElementById('dumpling-gallery').remove());
 await page.evaluate(()=>{
  const g=a.game;g.update=()=>{};Object.assign(g.player,{x:1600,y:400,flash:0,invincible:0});g.fx.items=[];g.numbers=[];g.enemyBolts=[];g.remnants=[];g.particles=[];g.drops=[];
  g.progress.vehicleHulls[0]=1;g.progress.vehicle=0;g.summonVehicle();
  const positions=[[-90,-30],[90,-30],[-100,65],[100,65],[-95,155],[95,155],[-20,230],[70,230]];
  g.enemies.forEach((e,i)=>{e.x=1600+positions[i][0];e.y=400+positions[i][1];e.z=e.rollAngle=e.knockTime=e.flash=0;e.assault={phase:'chase',elapsed:0};});
  Object.assign(g.boss,{x:1600,y:280,ai:{phase:'chase',elapsed:0}});g.hazards=[];a.refresh();
 });
 const scenes=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};a.environment.time=time;
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();
  },time);
  await page.waitForTimeout(150);await page.evaluate(()=>{document.querySelector('#toast')?.classList.remove('visible');});await page.waitForTimeout(350);await page.screenshot({path:`output/playwright/dumpling-family/field-${width}-${time}.png`});
  scenes.push({width,time,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 if(errors.length)throw Error(errors.join('\n'));if(frames.unique!==5||frames.before.bytes!==frames.after.bytes)throw Error('动作或缓存预算不符');
 return {designCriterion:'dumpling-camp-family',scenes,frames,movement:Math.hypot(moved.x-start.x,moved.y-start.y),phases:[...new Set(samples.map(s=>s.phase))],errors};
}
