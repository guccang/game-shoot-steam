// 4175 正式应用中的手机触控、布局事务、真实驾驶和昼夜画面验收。
const {chromium}=require('D:/ChatGPT/perf-tools/node_modules/playwright'),fs=require('fs'),assert=require('node:assert/strict');
const out='output/playwright/camp-sign-layout';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;const q=(await import('/src/progression/progress.js')).freshProgress();q.arrival={version:3,phase:'complete',keys:true};q.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];q.mainline.phase='complete';q.mainline.trackingPaused=true;q.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);q.coins=q.wood=10000;q.campLand.owned=(await import('/src/config/camp-land.js')).CAMP_PLOTS.map(p=>p.id);g.progress=q;g.reset();g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.spawnTimer=g.mainlineTalkDelay=99999;g.mainlineSpeech=null;g.parkingVisitors=[];g.parking=null;Object.assign(g.player,{x:440,y:750,vx:0,vy:0});a.renderer.camera.time=null;Object.assign(a.environment,{livingPreview:true,time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();});
 // 使用正式环境过渡器检查昼夜。
 async function phase(time){await page.evaluate(async time=>{Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},time);}
 // 保存实际运行画面用于人工复核。
 async function shot(name){await page.waitForTimeout(250);await page.screenshot({path:out+'/'+name+'.png'});}


 // 测试存档完成购地并清理新落点，实际编辑使用手机方向按钮。
 await page.evaluate(()=>{g.trees=[];g.restorationPersist(g.progress);g.openCampManagement();});await page.locator('[data-manager-layout]').tap();await page.locator('[data-layout-select]').selectOption('repair');
 for(let i=0;i<12;i++)await page.locator('[data-layout-step="left"]').tap();for(let i=0;i<4;i++)await page.locator('[data-layout-step="up"]').tap();
 await page.locator('[data-layout-save]').tap();await page.locator('#camp-layout-dialog').waitFor({state:'hidden'});
 const state=await page.evaluate(async()=>{const {TOWN_SIGNS,TOWN_LAYOUT}=await import('/src/config/town-layout.js');return {sign:{...TOWN_SIGNS.find(s=>s.id==='repair-district')},building:{...TOWN_LAYOUT.repair},layout:g.progress.campLayout};});assert.deepEqual(state.layout.positions.repair,{x:-680,y:860});assert.equal(state.sign.x,state.building.x-170);assert.equal(state.sign.y,state.building.y-145);
 // 维修木牌、房屋、角色与原车辆/怪物同屏，不改变其绘制器及连续动作。
 await page.evaluate(()=>{Object.assign(g.player,{x:-770,y:800,vx:0,vy:0});g.progress.vehicleHulls[0]=1;g.progress.campParking.owned=[{hull:0,spot:'repair-west',hp:1,ammo:0,reload:0}];g.enemies=[];const e=g.spawnEnemy(0,900);Object.assign(e,{x:-800,y:850,speed:0,hp:100000,maxHp:100000});a.renderer.camera.time=null;a.refresh();});
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await phase(time);await shot('repair-'+width+'-'+time);}}
 const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCampLayoutPlanner(g,a.renderer));assert.equal(review.signs.find(s=>s.id==='repair-district').x,state.sign.x);
 await page.reload();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;});const reloaded=await page.evaluate(async()=>({...((await import('/src/config/town-layout.js')).TOWN_SIGNS.find(s=>s.id==='repair-district'))}));assert.deepEqual(reloaded,state.sign);assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({state,review,reloaded,errors},null,2));console.log('站牌随实际布局保存及刷新恢复，手机昼夜检查通过');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
