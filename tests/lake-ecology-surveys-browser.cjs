// 手机真实触控检查独立湖区、调查事务、可见鱼群和地下溜鱼；录像只来自正式运行画面。
async original=>{
 const base=new URL(original.url()).origin,out='output/playwright/lake-ecology-surveys';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],shots=[],catches=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 断言界面和正式状态一致，不以单纯按钮存在代替成功交互。
 function check(ok,message){if(!ok)throw Error(message);}
 // 沿用正式昼夜环境和场景调色，保持水域、角色和控件同屏。
 async function light(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;Object.assign(a.environment,{weather:'sun',autoWeather:false,autoTime:false,time:id,livingPreview:true,calendarActive:a.game.mapId==='forest'});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(250);}
 // 截图同时检查可见底板和手机触控尺寸。
 async function shot(name){await page.waitForTimeout(150);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('dialog[open]')].every(d=>{const r=d.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1;})),name+'底板溢出');await page.screenshot({path:out+'/'+name+'.png'});shots.push(name);}
 // 使用地表菜单或地下钓具入口，验证同一页可达。
 async function open(){if(await page.evaluate(()=>a.game.cottage?.kind==='mine'))await page.locator('#mine-tackle').tap();else{if(!await page.locator('#outdoor-menu').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#outdoor-menu').tap();}await page.locator('#outdoor-dialog[open]').waitFor();}
 // 实际手势蓄力、抛竿、扬竿，之后以正式收放线控制推进，保留咬钩和动作绘制。
 async function catchFish(label,failSave=false){
  await open();await page.locator('[data-outdoor-action="fish"]').tap();await page.waitForFunction(()=>a.game.fishing?.phase==='ready');
  const cdp=await context.newCDPSession(page),box=await page.locator('#fishing-control').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  check(await page.evaluate(()=>a.game.fishing?.phase==='casting'),'触控没有成功抛竿');
  const selected=await page.evaluate(()=>{const f=a.game.fishing;return {lake:f.lake.id,fish:f.species,mode:f.mode,odds:f.odds.map(e=>e.index),schools:f.schools.map(s=>s.species)};});check(selected.odds.includes(selected.fish),'抽中了本湖以外的鱼');catches.push(selected);
  await page.waitForFunction(()=>a.game.fishing?.phase==='bite',{}, {timeout:15000});await page.locator('#fishing-control').tap();await page.locator('#fishing-lean').fill('-1');await page.locator('#fishing-lean').dispatchEvent('input');
  await page.waitForTimeout(400);await shot(label+'-fight');await page.waitForTimeout(500);
  await page.evaluate(()=>{const g=a.game;for(let i=0;i<1600&&g.fishing?.phase==='fight';i++){const f=g.fishing;o.fishingControl(g,'lean',-(f.direction||1));o.fishingControl(g,f.tension>.7?'release':f.tension<.4?'press':f.reeling?'press':'release');g.update(.04);}if(g.fishing?.phase!=='landed')throw Error('正式溜鱼失败');a.refresh();});await shot(label+'-landed');
  if(failSave){const before=await page.evaluate(()=>JSON.stringify(a.game.progress.outdoors.surveys));await page.evaluate(()=>{window.persist=a.game.livingPersist;a.game.livingPersist=()=>false;});await page.locator('[data-fish-keep]').tap();check((await page.locator('#fishing-message').innerText()).includes('保存失败'),'保存失败没有保留待收鱼');check(await page.evaluate(()=>JSON.stringify(a.game.progress.outdoors.surveys))===before,'失败提前增加调查');await page.evaluate(()=>a.game.livingPersist=persist);}
  await page.locator('[data-fish-keep]').tap();await page.locator('#fish-discovery[open]').waitFor();await page.locator('[data-catch-close]').first().tap();await page.waitForFunction(()=>a.game.state==='playing');
 }
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.o=await import('/src/core/outdoors.js');window.lf=await import('/src/core/lake-fishing.js');window.af=await import('/src/world/ambient-fish.js');window.sites=await import('/src/world/outdoor-sites.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.homeDecor.basement=true;(await import('/src/progression/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.outdoors.rods.star=true;p.outdoors.selectedRod='star';p.outdoors.bait=40;p.coins=1000;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999999;g.enemies=[];g.boss=null;g.parkingVisitors=[];g.progress.campParking.owned=[];g.progress.living.patrolActive=false;g.random=()=>.4;
   const shore=sites.fishingShores(g).find(s=>lf.lakeFishingContext(g,s).schools.length>=2);if(!shore)throw Error('没有鱼群湖岸');Object.assign(g.player,{x:shore.x,y:shore.y});window.bank={x:shore.x,y:shore.y};a.renderer.camera.time=null;a.refresh();
  });await light('day');await shot('surface-day');const fish0=await page.evaluate(()=>JSON.stringify(a.renderer.ambientFishReview));await page.waitForTimeout(550);check(await page.evaluate(()=>JSON.stringify(a.renderer.ambientFishReview))!==fish0,'常态鱼停止游动');await light('night');await shot('surface-night');
  await open();await page.locator('.fishing-odds summary').tap();check(await page.evaluate(()=>{const p=lf.fishingPreview(a.game);return p.schools.length&&p.odds.every(e=>document.querySelector('[data-fish-probability="'+e.fish.id+'"] b')?.textContent===(e.probability*100).toFixed(3)+'%');}),'当地概率展示不一致');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){await page.setViewportSize(size);await page.locator('.fishing-odds').scrollIntoViewIfNeeded();await shot('odds-'+size.width);}await page.setViewportSize({width:390,height:844});
  await page.locator('[data-outdoor-action="survey-accept"]').tap();check(await page.evaluate(()=>!!a.game.progress.outdoors.surveys.active),'接单未保存');await shot('survey-accepted');await page.locator('#outdoor-close').tap();await light('day');
  for(let i=0;i<3;i++)await catchFish('surface-'+i,i===0);
  await open();await page.locator('[data-outdoor-action="survey-claim"]').scrollIntoViewIfNeeded();await shot('survey-ready');
  const coins=await page.evaluate(()=>a.game.progress.coins);await page.evaluate(()=>{window.persist=a.game.livingPersist;a.game.livingPersist=()=>false;});await page.locator('[data-outdoor-action="survey-claim"]').tap();check(await page.evaluate(()=>a.game.progress.coins)===coins,'失败发奖');await page.evaluate(()=>a.game.livingPersist=persist);await page.locator('[data-outdoor-action="survey-claim"]').tap();check(await page.evaluate(()=>a.game.progress.coins)===coins+180,'调查奖没有到账');await page.locator('#outdoor-close').tap();
  // 正式下矿，使用真实平滑水界周边可站立且可抛竿的湖岸。
  await page.evaluate(async()=>{
   const g=a.game,{MINING}=await import('/src/config/mining.js'),{mineFishingShore}=await import('/src/world/mine-fishing.js');g.cottage={kind:'cottage',floor:0,outside:MINING.home};Object.assign(g.player,MINING.hatch.goal);if(!(await import('/src/core/mining.js')).enterMine(g))throw Error('地下入口失败');g.cottage.scanWait=g.cottage.hurtWait=99999;
   const fish=af.mineAmbientFish(g.progress.mining,{x:0,y:0,w:1800,h:1800},0);let shore;
   outer:for(const f of fish)for(let r=48;r<=200;r+=12)for(let i=0;i<24;i++){Object.assign(g.player,{x:f.x+Math.cos(i*Math.PI/12)*r,y:f.y+Math.sin(i*Math.PI/12)*r});const q=mineFishingShore(g);if(q&&lf.lakeFishingContext(g,q).schools.length){shore=q;break outer;}}
   if(!shore)throw Error('地下鱼群岸边缺失');window.mineBank={x:g.player.x,y:g.player.y};g.progress.logistics.bagWood=0;g.progress.farm.inventory.fill(0);g.drops=[];a.refresh();
  });await light('day');await shot('mine-day');await light('night');await shot('mine-night');
  await open();await page.locator('[data-outdoor-action="survey-accept"]').tap();check(await page.evaluate(()=>a.game.progress.outdoors.surveys.active.depth===1),'地下委托没锁定层');await page.locator('.fishing-odds summary').tap();await shot('mine-odds');await page.setViewportSize({width:320,height:568});await page.locator('.fishing-surveys').scrollIntoViewIfNeeded();await shot('mine-survey-320');await page.setViewportSize({width:390,height:844});await page.locator('#outdoor-close').tap();
  await catchFish('mine',true);check(await page.evaluate(()=>a.game.progress.outdoors.surveys.active.species.length===1),'地下鱼没有调查进度');
  const saved=await page.evaluate(()=>{a.game.livingPersist(a.game.progress);return JSON.stringify(a.game.progress.outdoors.surveys);});await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});check(await page.evaluate(()=>JSON.stringify(a.game.progress.outdoors.surveys))===saved,'重载丢失地下委托');check(!errors.length,errors.join('\n'));
  return {errors,shots,catches,checks:'独立湖概率、附近鱼群、地表三次完整收鱼与调查原子发奖、地下触控钓获和调查、失败重试、刷新、昼夜与窄屏通过'};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
