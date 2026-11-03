// 隔离手机上下文检查真实石柱的敲击、裂纹、掉矿、武器破坏、暂停与昼夜。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-rocks/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],shots=[];
 const base=new URL(original.url()).origin;page.on('pageerror',e=>errors.push(e.message));
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(120);}
 // 截图来自正式场景，记录当前真实奖励与受伤状态。
 async function shot(name){
  if(name.startsWith('rubble')){await page.evaluate(()=>{Object.assign(a.game.player,{x:rock.x-70,y:rock.y+55});});await page.waitForTimeout(100);}
  await page.screenshot({path:'output/playwright/mine-rocks/'+name+'.png'});shots.push({name,...await page.evaluate(async()=>({...((await import('/src/rendering/visual-review.js')).inspectMineRocks(a.game,a.renderer)),ore:a.game.progress.mining.ore,damage:rocks.mineRockDamage(a.game,rock.key),harvested:a.game.progress.mining.harvested[rock.key],view:a.renderer.mineView}))});}
 // 只重置本场测试石柱，正式规则仍负责命中和结算。
 async function restore(){await page.evaluate(()=>{const g=a.game;g.state='playing';g.cottage.tool='pick';g.cottage.autoDig=true;g.cottage.dig=null;g.cottage.rockWork=null;g.cottage.rockDamage={};g.cottage.rockScan=null;g.cottage.combat=null;g.progress.mining.animals={};delete g.progress.mining.harvested[rock.key];Object.assign(g.player,{x:rock.x,y:rock.y+55,vx:0,vy:0});a.refresh();});await page.waitForTimeout(150);}
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();window.mc=await import('/src/config/mining.js');window.ec=await import('/src/config/mine-ecology.js');window.mi=await import('/src/core/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.wood=200;p.mining.ore=100;
   p.mining.layers[2]=(await import('/src/progression/mine-layers.js')).freshMineLayer(2,{x:8,y:4},()=>.31);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=99999;g.livingPersist=()=>true;g.progress.outdoors.rod=true;g.progress.outdoors.bait=20;

   window.rocks=await import('/src/core/mine-rocks.js');const physics=await import('/src/physics/mine-motion.js');
   outer:for(let y=-8;y<35;y++)for(let x=-8;x<35;x++){const r=rocks.mineRockSite(g.progress.mining,{x,y});if(r&&physics.mineOccupancy(g,r.x,r.y+55)&&physics.mineLineClear(g,r,{x:r.x,y:r.y+55})){window.rock=r;break outer;}}
   if(!window.rock)throw Error('找不到真实景观山体');g.cottage.tool='pick';g.cottage.autoDig=true;Object.assign(g.player,{x:rock.x,y:rock.y+55});a.refresh();
  });
  await restore();await phase('day');await shot('intact-day');await phase('night');await shot('intact-night');await phase('day');
  const before=await page.evaluate(()=>a.game.progress.mining.ore),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:520}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:460}]});
  await page.waitForFunction(()=>rocks.mineRockDamage(a.game,rock.key)?.hp<60);
  await page.evaluate(()=>{a.game.state='paused';});await shot('cracked-day');await phase('night');await shot('cracked-night');
  const frozen=await page.evaluate(()=>JSON.stringify({age:a.game.progress.mining.age,hp:rocks.mineRockDamage(a.game,rock.key)?.hp}));await page.waitForTimeout(250);if(await page.evaluate(()=>JSON.stringify({age:a.game.progress.mining.age,hp:rocks.mineRockDamage(a.game,rock.key)?.hp}))!==frozen)throw Error('暂停仍挖矿');
  await page.evaluate(()=>{a.game.state='playing';});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:450}]});
  await page.waitForFunction(()=>a.game.progress.mining.harvested[rock.key]>a.game.progress.mining.age);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(await page.evaluate(()=>a.game.progress.mining.ore)!==before+6)throw Error('矿镐奖励不正确');await shot('rubble-night');await phase('day');await shot('rubble-day');
  for(const size of [{width:320,height:568},{width:844,height:390},{width:1280,height:900}]){await page.setViewportSize(size);await restore();for(const time of ['day','night']){await phase(time);await shot('intact-'+size.width+'-'+time);await page.evaluate(()=>rocks.hitMineRock(a.game,rock,20));await shot('cracked-'+size.width+'-'+time);await page.evaluate(()=>rocks.hitMineRock(a.game,rock,100));await shot('rubble-'+size.width+'-'+time);await restore();}}
  await page.setViewportSize({width:390,height:844});await restore();await phase('day');
  const ore=await page.evaluate(()=>a.game.progress.mining.ore);await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-weapon').tap();await page.locator('#mine-tools-toggle').tap();
  await page.waitForFunction(()=>a.game.progress.mining.harvested[rock.key]>a.game.progress.mining.age);await shot('weapon-broken');
  if(await page.evaluate(()=>a.game.progress.mining.ore)<ore+6)throw Error('武器没有掉矿');
  await restore();await page.evaluate(()=>{
   const g=a.game,l=g.progress.mining,p={x:rock.x-95,y:rock.y+35},key=mc.mineKey(mc.mineCell(p));l.rails[key]=true;l.carts=[{id:99,...p,wheel:0,heading:1}];
   const q={x:rock.x-90,y:rock.y-25},animalKey=mc.mineKey(mc.mineCell(q));l.animals[animalKey]={key:animalKey,kind:'beetle',...q,hp:48,maxHp:48,phase:'recover',timer:999,clock:0};
  });for(const time of ['day','night']){await phase(time);await shot('shared-scene-'+time);}
  await cdp.detach();if(errors.length)throw Error(errors.join('/'));return {designCriterion:'mine-breakable-rocks',scenes:shots.length,errors,shots};
 }catch(e){await page.screenshot({path:'output/playwright/mine-rocks/failure.png'});throw e;}finally{await context.close();}
}
