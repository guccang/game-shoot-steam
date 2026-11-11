// 隔离浏览器使用4175正式运行时，真实触控购地与建设，保留昼夜连续截图。
const {chromium}=require('D:/ChatGPT/perf-tools/node_modules/playwright'),fs=require('fs'),assert=require('node:assert/strict');
const out='output/playwright/four-camp-signs';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],reviews=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.CAMP_TEST_URL||'http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;const q=(await import('/src/progression/progress.js')).freshProgress();q.arrival={version:3,phase:'complete',keys:true};q.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];q.mainline.phase='complete';q.mainline.trackingPaused=true;q.coins=1000;q.wood=1000;g.progress=q;g.reset();g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.spawnTimer=g.mainlineTalkDelay=99999;g.mainlineSpeech=null;g.parkingVisitors=[];Object.assign(g.player,{x:155,y:670,vx:0,vy:0});a.renderer.camera.time=null;Object.assign(a.environment,{livingPreview:true,time:'day',weather:'sun',autoTime:false,autoWeather:false});a.refresh();});
 async function phase(time){await page.evaluate(async time=>{Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},time);}
 async function shot(name){await page.waitForTimeout(250);await page.screenshot({path:out+'/'+name+'.png'});}
 for(const [width,height] of [[390,844],[320,568],[844,390],[1280,900]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await phase(time);await shot('starter-'+width+'-'+time);}}
 await page.setViewportSize({width:390,height:844});await phase('day');
 await page.locator('[data-camp-plot="east"]').tap();assert.match(await page.locator('[data-land-detail]').innerText(),/仓库/);await page.locator('#camp-land-dialog .ui-close').tap();
 await page.evaluate(()=>{g.openCampManagement();});await page.locator('[data-manager-land]').tap();await page.locator('[data-land-select="north"]').tap();await page.locator('[data-land-buy]').tap();await page.locator('[data-land-select="commons"]').tap();
 await page.locator('[data-land-buy]').tap();assert.ok(await page.evaluate(()=>g.progress.restoration.repaired.includes('neighbors')));
 await page.locator('#camp-land-dialog .ui-close').tap();
 await page.locator('#local-minimap').dispatchEvent('click');await page.locator('#map-camp-land').tap();await page.locator('[data-land-select="south"]').tap();
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390]]){await page.setViewportSize({width,height});await shot('panel-'+width);const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCampLand(g,a.renderer));reviews.push(r);assert.equal(r.overflow,false);assert.ok(r.controls.every(b=>b.height>=44),JSON.stringify(r.controls));}
 await page.setViewportSize({width:390,height:844});
 // 故障注入只替换保存回执，确认真实点击失败不扣款并可原地重试。
 await page.evaluate(()=>{window.saveLand=g.restorationPersist;g.restorationPersist=()=>false;});await page.locator('[data-land-buy]').tap();assert.match(await page.locator('[data-land-message]').innerText(),/未保存/);assert.equal(await page.evaluate(()=>g.progress.coins),982);
 await page.evaluate(()=>g.restorationPersist=window.saveLand);await page.locator('[data-land-buy]').tap();assert.equal(await page.evaluate(()=>g.progress.coins),958);assert.deepEqual(await page.evaluate(()=>g.progress.campLand.owned),['core','north-yard','commons','workyard']);await shot('purchased');
 assert.ok(await page.evaluate(()=>g.progress.restoration.repaired.includes('garage')));await page.locator('#camp-land-dialog .ui-close').tap();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));assert.ok(stored.campLand.owned.includes('workyard'));assert.ok(stored.restoration.repaired.includes('garage'));
 // 实际移动确认地基到成品后的通路仍然可走。
 const before=await page.evaluate(()=>g.player.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');assert.ok(await page.evaluate(x=>g.player.x>x+3,before));
 // 同屏复核复用正式怪物与自有车绘制器；只准备验收站位，不替代购地交互。
 await page.evaluate(()=>{g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:g.player.x-70,y:g.player.y+75,hp:1,ammo:0,reload:0}];g.enemies=[];const e=g.spawnEnemy(0,900);Object.assign(e,{x:g.player.x+80,y:g.player.y+50,speed:0,hp:100000,maxHp:100000});g.cottageEntry=null;g.cottageDoorLatch=true;});
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await phase(time);await shot('ensemble-'+width+'-'+time);}}
 // 真正重新加载应用读取刚才写入的地契和施工结果。
 await page.reload();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;window.g=a.game;});assert.ok(await page.evaluate(()=>g.progress.campLand.owned.includes('workyard')&&g.progress.restoration.repaired.includes('garage')));
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({designCriterion:'camp-land-growth',reviews,errors,persisted:stored.campLand},null,2));console.log('管理与大地图购地、失败重试、整组开放、存档及手机昼夜检查通过');
}catch(e){console.error(e);console.log('页面错误',errors);console.log(await page.evaluate(()=>({state:window.g?.state,player:window.g&&{x:g.player.x,y:g.player.y},land:window.g?.progress.campLand,build:window.g?.progress.restoration.build,dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)})));await page.screenshot({path:out+'/failure.png'});process.exitCode=1;}finally{await browser.close();}})();
