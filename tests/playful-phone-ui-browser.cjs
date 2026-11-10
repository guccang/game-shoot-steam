// 巡林手机浅色纸页在正式运行时的尺寸、交互与昼夜检查。
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const out='output/playwright/playful-phone-ui';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>console.log('请求失败',r.url(),r.failure()));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});page.setDefaultTimeout(45000);try{
 // 同端口加载工作树模块，资产沿用正式服务器，不触碰用户存档。
 await context.route('http://localhost:4175/src/**',r=>{const name=new URL(r.request().url()).pathname.slice(1),file=path.resolve(name);return fs.existsSync(file)?r.fulfill({path:file,contentType:name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/javascript'}):r.continue();});await context.route('http://localhost:4175/',r=>r.fulfill({path:path.resolve('index.html'),contentType:'text/html'}));
 await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();});await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{window.g=a.game;g.update=()=>{};const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.trackingPaused=true;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.coins=100000;p.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(p=>p.id);g.progress=p;g.reset();g.livingPreview=false;g.progress.living.patrolActive=false;g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.trees=[];g.parkingVisitors=[];g.vehicle.active=false;Object.assign(g.player,{x:300,y:600,vx:0,vy:0});a.renderer.camera.time=null;Object.assign(a.environment,{livingPreview:false,time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();window.baseline=structuredClone(g.progress);});









 // 手机正式入口验证短屏、长屏和横屏的纸页配色与滚动。
 await page.locator('#phone-button').tap();await page.locator('#phone-dialog').waitFor({state:'visible'});
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390]]){await page.setViewportSize({width,height});await page.locator('#phone-dialog .ui-panel__body').evaluate(n=>n.scrollTop=0);await page.screenshot({path:out+'/'+width+'x'+height+'.png'});const sizes=await page.locator('#phone-dialog').evaluate(n=>{const b=n.getBoundingClientRect(),f=n.querySelector('.ui-panel__footer').getBoundingClientRect();return {overflow:n.scrollWidth>n.clientWidth,bottom:f.bottom,viewport:innerHeight,header:getComputedStyle(n.querySelector('header')).backgroundColor};});assert.equal(sizes.overflow,false);assert.ok(sizes.bottom<=sizes.viewport);assert.equal(sizes.header,'rgb(245, 217, 143)');}
 await page.setViewportSize({width:390,height:844});await page.locator('#phone-dialog .ui-panel__body').evaluate(n=>n.scrollTop=n.scrollHeight);await page.screenshot({path:out+'/contacts.png'});await page.locator('#phone-dialog [data-pack-action="close"]').tap();await page.locator('#phone-dialog').waitFor({state:'hidden'});
 await page.evaluate(async()=>{a.environment.time='night';a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();});await page.locator('#phone-button').tap();await page.screenshot({path:out+'/night.png'});
 assert.deepEqual(errors,[]);console.log('手机纸页五种视口、关闭操作与昼夜检查通过');
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
