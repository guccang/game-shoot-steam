// 4175 正式应用中的手机触控、布局事务、真实驾驶和昼夜画面验收。
const {chromium}=require('D:/ChatGPT/perf-tools/node_modules/playwright'),fs=require('fs'),assert=require('node:assert/strict');
const out='output/playwright/camp-parking-layout';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;const q=(await import('/src/progression/progress.js')).freshProgress();q.arrival={version:3,phase:'complete',keys:true};q.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];q.mainline.phase='complete';q.mainline.trackingPaused=true;q.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);q.coins=q.wood=10000;q.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(p=>p.id);g.progress=q;g.reset();g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.spawnTimer=g.mainlineTalkDelay=99999;g.mainlineSpeech=null;g.parkingVisitors=[];g.parking=null;Object.assign(g.player,{x:440,y:750,vx:0,vy:0});a.renderer.camera.time=null;Object.assign(a.environment,{livingPreview:true,time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();});
 // 使用正式环境过渡器检查昼夜。
 async function phase(time){await page.evaluate(async time=>{Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},time);}
 // 保存实际运行画面用于人工复核。
 async function shot(name){await page.waitForTimeout(250);await page.screenshot({path:out+'/'+name+'.png'});}

 // 从营地管理进入布局，用真实触摸拖动停车场并保存。
 await page.evaluate(async()=>{g.progress.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(p=>p.id);g.trees=[];g.progress.vehicleHulls[0]=1;g.progress.campParking.owned=[{hull:0,spot:'north-0-0',hp:1,ammo:0,reload:0}];g.restorationPersist(g.progress);g.openCampManagement();});
 await page.locator('[data-manager-layout]').tap();
 assert.equal(await page.locator('[data-layout-select] option[value="north"]').innerText(),'北门停车场');
 // 短屏和长屏保留原手机框架，未增加桌面布局。
 for(const [width,height] of [[320,568],[390,844]]){await page.setViewportSize({width,height});await shot('planner-'+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.locator('[data-layout-select]').selectOption('north');
 await page.locator('[data-layout-step="right"]').tap();await page.locator('[data-layout-undo]').tap();assert.equal(await page.evaluate(()=>g.inspectCampLayout().draft.positions.north),undefined);
 // 将规划坐标投影成触点，拖动只修改草稿。
 const canvas=page.locator('#camp-layout-canvas');await canvas.scrollIntoViewIfNeeded();const line=await page.evaluate(()=>{const r=document.querySelector('#camp-layout-canvas').getBoundingClientRect(),s=g.inspectCampLayout(),scale=s.view.scale*s.view.zoom;return {x1:r.left+r.width/2+(35-s.view.x)*scale,y1:r.top+r.height/2+(285-s.view.y)*scale,x2:r.left+r.width/2+(-880-s.view.x)*scale,y2:r.top+r.height/2+(1140-s.view.y)*scale};});
 const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:line.x1,y:line.y1}]});for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:line.x1+(line.x2-line.x1)*i/10,y:line.y1+(line.y2-line.y1)*i/10}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
 assert.deepEqual(await page.evaluate(()=>g.inspectCampLayout().draft.positions.north),{x:-880,y:1280});assert.equal(await page.evaluate(()=>g.progress.campLayout.positions.north),undefined);await shot('drag-draft');
 await page.locator('[data-layout-save]').tap();await page.locator('#camp-layout-dialog').waitFor({state:'hidden'});
 assert.deepEqual(await page.evaluate(()=>g.progress.campLayout.positions.north),{x:-880,y:1280});
 const checks=await page.evaluate(async()=>{const p=await import('/src/config/parking.js'),m=await import('/src/config/mainline.js'),r=await import('/src/progression/vehicles/roadside-parking.js');return {lot:{x:p.NORTH_PARKING.x,y:p.NORTH_PARKING.y},entrance:p.NORTH_PARKING.entrance,nav:m.MAINLINE_SITES.northParking,car:r.parkingRecordSite(g.progress.campParking.owned.find(v=>v.hull===0))};});assert.equal(checks.lot.x,-1070);assert.equal(checks.car.x,-1005);assert.equal(checks.entrance.x,checks.nav.x);
 await page.evaluate(()=>{Object.assign(g.player,{x:-850,y:1160,vx:0,vy:0});g.enemies=[];const e=g.spawnEnemy(0,900);Object.assign(e,{x:-770,y:1180,speed:0,hp:100000,maxHp:100000});g.spawnTimer=99999;a.renderer.camera.time=null;a.refresh();});
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await phase(time);await shot('moved-'+width+'-'+time);}}
 // 靠近搬迁后的车辆，由正式一秒倒计时上车，验证交互与碰撞使用新车位。
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{g.enemies=[];Object.assign(g.player,{x:-940,y:1070,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});await page.waitForFunction(()=>g.vehicle.active&&g.vehicle.index===0);
 await page.reload();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;});assert.deepEqual(await page.evaluate(()=>g.progress.campLayout.positions.north),{x:-880,y:1280});
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({designCriterion:'camp-layout-planner',checks,errors,touchDrag:true,reloaded:true},null,2));console.log('停车场手机拖动、保存、读档与昼夜截图通过');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
