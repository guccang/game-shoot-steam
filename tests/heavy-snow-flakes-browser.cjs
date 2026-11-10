// 手机正式场景检查鹅毛雪的昼夜可读性、连续运动及有界开销。
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const out='output/playwright/heavy-snow-flakes';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>console.log('请求失败',r.url(),r.failure()));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});page.setDefaultTimeout(45000);try{
 // 同端口加载工作树模块，资产沿用正式服务器，不触碰用户存档。
 await context.route('http://localhost:4175/src/**',r=>{const name=new URL(r.request().url()).pathname.slice(1),file=path.resolve(name);return fs.existsSync(file)?r.fulfill({path:file,contentType:name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/javascript'}):r.continue();});await context.route('http://localhost:4175/',r=>r.fulfill({path:path.resolve('index.html'),contentType:'text/html'}));
 await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();});await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{window.g=a.game;g.update=dt=>{g.time+=dt;g.previewTime+=dt;};const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.trackingPaused=true;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.coins=100000;p.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(p=>p.id);g.progress=p;g.reset();g.livingPreview=false;g.progress.living.patrolActive=false;g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.trees=[];g.parkingVisitors=[];g.vehicle.active=false;Object.assign(g.player,{x:300,y:600,vx:0,vy:0});a.renderer.camera.time=null;Object.assign(a.environment,{livingPreview:false,time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();window.baseline=structuredClone(g.progress);});








 await page.evaluate(()=>{g.vehicle.index=0;g.progress.vehicleHulls[0]=1;g.summonVehicle();g.spawnEnemy(0,0,{x:410,y:690});a.environment.weather='snow';const snow=a.renderer.snow,original=snow.draw.bind(snow);window.snowCosts=[];snow.draw=function(...args){const t=performance.now();original(...args);snowCosts.push(performance.now()-t);if(snowCosts.length>360)snowCosts.shift();};});
 const cases=[];
 for(const time of ['day','night']){await page.evaluate(async time=>{g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;a.environment.time=time;a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);await page.waitForTimeout(1800);await page.screenshot({path:out+'/'+time+'.png'});cases.push(await page.evaluate(time=>({time,...a.renderer.snow.stats()}),time));await page.waitForTimeout(1200);await page.screenshot({path:out+'/'+time+'-later.png'});}
 await page.setViewportSize({width:320,height:568});await page.waitForTimeout(500);await page.screenshot({path:out+'/short-phone.png'});
 const costs=await page.evaluate(()=>snowCosts);costs.sort((a,b)=>a-b);for(const c of cases){assert.ok(c.tuftCount>c.count*.6);assert.ok(c.count<=167&&c.largeCount<=3);}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({designCriterion:'snowfall-depth',cases,snowDrawP95:costs[Math.floor(costs.length*.95)],snowDrawMax:costs.at(-1),errors},null,2));console.log(fs.readFileSync(out+'/report.json','utf8'));
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

