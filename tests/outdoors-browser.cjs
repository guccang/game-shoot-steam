// 检查点只准备自由巡林进度与位置；交易、驻营、休息和钓鱼通过真实按钮及触控完成。
async original=>{
 for(const old of original.context().browser().contexts())if(old!==original.context())await old.close();
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/camping-fishing',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;window.outdoorCore=await import('/src/core/activities/outdoors.js');window.sites=await import('/src/world/outdoor-sites.js');
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.vehicleHulls[0]=1;p.vehicleIndex=0;p.coins=1000;
  const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=99999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.parkingVisitors=[];g.progress.campParking.owned=[];g.progress.living.patrolActive=false;g.cottage=null;
  Object.assign(g.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.ammoEntry);g.cottageDoorLatch=null;a.renderer.camera.time=null;Object.assign(a.environment,{autoTime:false,time:'day',autoWeather:false,weather:'sun',livingPreview:true});a.refresh();
  // 空地只从正式碰撞检测中选择，既不删除树木也不修改水面。
  window.openField=async()=>{const {blocked}=await import('/src/physics/motion.js');g.cottage=null;for(let y=1900;y<7000;y+=300)for(let x=1900;x<9000;x+=300){if(blocked(x,y,16,g.trees,{mapId:g.mapId,livingCollision:true}))continue;Object.assign(g.player,{x,y});if(sites.campPlacement(g)){a.renderer.camera.time=null;a.refresh();return;}}throw Error('没有开阔地');};
 });
 // 截图直接取正式页面，同时检查弹窗与动作条是否溢出手机边界。
 async function shot(name){await page.waitForTimeout(150);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('dialog[open],#fishing-hud:not([hidden])')].some(d=>{const r=d.getBoundingClientRect();return r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5;})))throw Error('页面溢出 '+name);await page.screenshot({path:'output/playwright/camping-fishing/'+name+'.png'});}
 // 通过折叠菜单进入野外页，覆盖菜单自动收起及暂停恢复。
 async function open(){if(!await page.locator('#outdoor-menu').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#outdoor-menu').tap();await page.locator('#outdoor-dialog[open]').waitFor();}
 await page.waitForFunction(()=>a.game.cottage?.kind==='ammo');await page.locator('[data-room-item]').tap();await page.locator('[data-outdoor-shop]').tap();
 for(const id of ['tent','rod','bait'])await page.locator('[data-outdoor-buy='+id+']').tap();await shot('shop-purchased');
 if(!await page.evaluate(()=>a.game.progress.outdoors.tent&&a.game.progress.outdoors.rod&&a.game.progress.outdoors.bait===20&&a.game.progress.coins===730))throw Error('柜台购买未记账');
 await page.locator('#outdoor-close').tap();await page.waitForFunction(()=>a.game.state==='playing');await page.evaluate(()=>openField());
 await open();await page.locator('[data-outdoor-action=tent]').tap();await page.waitForFunction(()=>a.game.progress.outdoors.camp);
 await page.evaluate(()=>{Object.assign(a.game.player,a.game.progress.outdoors.camp);a.renderer.camera.time=null;a.refresh();});
 for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.refresh();},time);await shot('camp-'+width+'-'+time);
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{a.game.player.hp=20;});await open();await page.locator('[data-outdoor-action=sleep]').tap();await shot('camp-sleep');await page.waitForFunction(()=>!a.game.campSleep&&a.game.player.hp===a.game.maxHp());
 await open();await page.locator('[data-outdoor-action=pack]').tap();await page.waitForFunction(()=>!a.game.progress.outdoors.camp);
 await page.evaluate(()=>{Object.assign(a.game.vehicle,{x:a.game.player.x,y:a.game.player.y,mapId:a.game.mapId});a.game.vehicle.hp=a.game.vehicle.maxHp;});await open();await page.locator('[data-outdoor-action=vehicle]').tap();await page.waitForFunction(()=>a.game.progress.outdoors.camp?.mode==='vehicle');await shot('vehicle-camp');
 // 真实湖岸抛竿，触控起止走浏览器输入通道，未直接设置钓鱼阶段或鱼获。
 await page.evaluate(()=>{Object.assign(a.game.player,sites.fishingShores(a.game)[0]);a.renderer.camera.time=null;a.refresh();});await open();await page.locator('[data-outdoor-action=fish]').tap();await page.waitForFunction(()=>a.game.fishing?.phase==='ready');
 const cdp=await context.newCDPSession(page);let held=false;
 // 与指针捕获共用实际触控点，抬手时只结束这一根手指。
 async function touch(down,side=0){if(!down){if(held)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});held=false;return;}const r=await page.locator('#fishing-control').boundingBox();if(!r)throw Error('钓鱼控制不可见');{await cdp.send('Input.dispatchTouchEvent',{type:held?'touchMove':'touchStart',touchPoints:[{x:r.x+r.width*(side<0?.18:side>0?.82:.5),y:r.y+r.height/2}]});held=true;}}
 await touch(true);await page.waitForTimeout(1000);await shot('fishing-charge');await touch(false);await page.waitForFunction(()=>a.game.fishing?.phase==='waiting');await shot('fishing-wait');
 await page.waitForFunction(()=>a.game.fishing?.phase==='bite');await shot('fishing-black-float');await touch(true);await page.waitForFunction(()=>a.game.fishing?.phase==='fight');await shot('fishing-fight');
 for(let n=0;n<300;n++){const f=await page.evaluate(()=>a.game.fishing&&({phase:a.game.fishing.phase,tension:a.game.fishing.tension,direction:a.game.fishing.direction}));if(f?.phase==='landed')break;if(!f||f.phase!=='fight')throw Error('鱼跑了 '+JSON.stringify(f));if(f.tension>.7)await touch(false);else if(f.tension<.4||held)await touch(true,-(f.direction||1));await page.waitForTimeout(100);}
 await touch(false);await page.waitForFunction(()=>a.game.fishing?.phase==='landed');await shot('fishing-landed');await page.locator('[data-fish-keep]').tap();await page.waitForFunction(()=>a.game.progress.outdoors.caught===1);
 // 重新开竿检查短屏等漂和暂停恢复，不消耗第二份鱼饵前也能收竿。
 await page.setViewportSize({width:320,height:568});await open();await page.locator('[data-outdoor-action=fish]').tap();await page.waitForFunction(()=>a.game.fishing?.phase==='ready');await shot('fishing-320-ready');await page.locator('#fishing-cancel').tap();
 const result=await page.evaluate(async()=>({inspection:(await import('/src/rendering/visual-review.js')).inspectOutdoors(a.renderer,document),caught:a.game.progress.outdoors.caught,bait:a.game.progress.outdoors.bait}));
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {ok:true,...result,errors};
}
