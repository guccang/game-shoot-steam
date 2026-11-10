// 手机验证停车场搬迁后的就近分叉，以及正式世界昼夜与规划界面。
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const out='output/playwright/camp-night-dimmer';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>console.log('请求失败',r.url(),r.failure()));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});page.setDefaultTimeout(45000);try{
 // 同端口加载工作树模块，资产沿用正式服务器，不触碰用户存档。
 await context.route('http://localhost:4175/src/**',r=>{const name=new URL(r.request().url()).pathname.slice(1),file=path.resolve(name);return fs.existsSync(file)?r.fulfill({path:file,contentType:name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/javascript'}):r.continue();});await context.route('http://localhost:4175/',r=>r.fulfill({path:path.resolve('index.html'),contentType:'text/html'}));
 await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();});await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{window.g=a.game;g.update=()=>{};const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.trackingPaused=true;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.coins=100000;p.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(p=>p.id);g.progress=p;g.reset();g.livingPreview=false;g.progress.living.patrolActive=false;g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.trees=[];g.parkingVisitors=[];g.vehicle.active=false;Object.assign(g.player,{x:300,y:600,vx:0,vy:0});a.renderer.camera.time=null;Object.assign(a.environment,{livingPreview:false,time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();window.baseline=structuredClone(g.progress);});








 // 正式维修区昼夜与手机短屏对照，保留角色、载具和建筑窗光。
 await page.evaluate(()=>{Object.assign(g.player,{x:-440,y:729});g.vehicle.index=0;g.progress.vehicleHulls[0]=1;g.summonVehicle();g.spawnEnemy(0,0,{x:-330,y:820});a.renderer.camera.time=null;});
 for(const time of ['day','night']){await page.evaluate(async time=>{g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time).start+1000;a.environment.time=time;a.environment.weather='sun';a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);await page.waitForTimeout(450);await page.screenshot({path:out+'/'+time+'.png'});}
 const review=await page.evaluate(()=>a.renderer.surfaceFogReview);assert.ok(review.regions.length>0);assert.ok(review.regions.every(r=>r.power===.4));await page.setViewportSize({width:320,height:568});await page.waitForTimeout(300);await page.screenshot({path:out+'/short-night.png'});assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({designCriterion:'camp-night-lighting',review,errors},null,2));console.log('营地昼夜与短屏检查通过');
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
