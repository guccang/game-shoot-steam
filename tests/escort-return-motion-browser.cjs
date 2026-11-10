// 手机验证停车场搬迁后的就近分叉，以及正式世界昼夜与规划界面。
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const out='output/playwright/escort-return-motion';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>console.log('请求失败',r.url(),r.failure()));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});page.setDefaultTimeout(45000);try{
 // 同端口加载工作树模块，资产沿用正式服务器，不触碰用户存档。
 await context.route('http://localhost:4175/src/**',r=>{const name=new URL(r.request().url()).pathname.slice(1),file=path.resolve(name);return fs.existsSync(file)?r.fulfill({path:file,contentType:name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/javascript'}):r.continue();});await context.route('http://localhost:4175/',r=>r.fulfill({path:path.resolve('index.html'),contentType:'text/html'}));
 await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();});await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{window.g=a.game;g.update=()=>{};const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.trackingPaused=true;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.coins=100000;p.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(p=>p.id);g.progress=p;g.reset();g.livingPreview=false;g.progress.living.patrolActive=false;g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.trees=[];g.parkingVisitors=[];g.vehicle.active=false;Object.assign(g.player,{x:300,y:600,vx:0,vy:0});a.renderer.camera.time=null;Object.assign(a.environment,{livingPreview:false,time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();window.baseline=structuredClone(g.progress);});








 // 正式失败后持续更新返程状态，记录画内运动与画外回收。
 await page.evaluate(async()=>{const {TRADE_SITES}=await import('/src/config/camp-trade.js');const {tradeAction,updateTradeEscort}=await import('/src/core/camp/camp-trade.js');g.livingPersist=()=>true;Object.assign(g.player,TRADE_SITES[0]);tradeAction(g,'escort',TRADE_SITES[1].id);Object.assign(g.player,{x:1800,y:3200});Object.assign(g.progress.trade.escort,{x:1800,y:3200,hp:0});g.tradeViewport=null;updateTradeEscort(g,.05);g.update=dt=>{g.time+=dt;g.previewTime+=dt;updateTradeEscort(g,dt);};a.renderer.camera.time=null;a.refresh();});
 await page.waitForTimeout(400);await page.screenshot({path:out+'/return-start.png'});const first=await page.evaluate(()=>g.tradeDepartures.map(e=>({x:e.x,y:e.y})));await page.waitForTimeout(800);await page.screenshot({path:out+'/return-moving.png'});const later=await page.evaluate(()=>g.tradeDepartures.map(e=>({x:e.x,y:e.y})));assert.equal(first.length,1);assert.equal(later.length,1);assert.ok(Math.hypot(first[0].x-later[0].x,first[0].y-later[0].y)>20);await page.waitForFunction(()=>g.tradeDepartures.length===0);await page.screenshot({path:out+'/return-gone.png'});assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({first,later,removed:true,errors},null,2));console.log('失败返程实际运动及画外回收通过');
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

