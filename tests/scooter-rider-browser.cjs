// 电动车实机复核：正式战斗、手机操纵、工坊排序和实际购买；截图与视频保留在 output。
async page => {
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 // 创建已完成入职的隔离存档，保留正式事件、碰撞、攻击和渲染。
 async function prepare(target){
  await target.goto('http://localhost:4233');
  await target.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const {freshProgress}=await import('/src/progression/progress.js');
   const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};
   a.game.progress=p;a.game.arrivalScene=null;a.game.reset();a.menu.enter();a.game.start();
   const g=a.game;g.updateWaves=()=>{};g.trees=[];g.enemies=[];
   Object.assign(g.player,{x:1800,y:1400});g.summonVehicle();
   for(const [dx,dy] of [[130,0],[-130,50],[60,140]]){const e=g.spawnEnemy(0,100,{x:1800+dx,y:1400+dy});Object.assign(e,{hp:99999,maxHp:99999,speed:0,damage:0});}
   window.shots=0;const event=g.onEvent;g.onEvent=(kind,data)=>{if(kind==='shot')shots++;event(kind,data);};
   Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
   a.renderer.seasons.reset('summer',performance.now());a.renderer.camera.time=null;a.renderer.resize();a.refresh();
  });
 }
 // 昼夜切换使用正式场景调色，保持物体和 UI 同屏。
 async function lighting(target,time){await target.evaluate(async time=>{a.environment.time=time;const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.refresh();},time);}
 await prepare(page);
 const samples=[];
 for(const [width,height,label] of [[1280,860,'desktop'],[390,844,'390'],[320,740,'320']]){
  await page.setViewportSize({width,height});
  for(const time of ['day','night']){
   await lighting(page,time);await page.waitForTimeout(650);
   await page.screenshot({path:`output/playwright/scooter-rider-weapon/${label}-${time}.png`});
   samples.push(await page.evaluate(async()=>({width:innerWidth,time:a.environment.time,shots,...(await import('/src/rendering/visual-review.js')).inspectScooterRider(a.game,document)})));
  }
 }
 await page.evaluate(()=>a.workshop.open('vehicle',5));
 const ids=await page.locator('[data-ws-item]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.wsItem)));
 if(ids.join(',')!=='5,0,1,2,3,4')throw Error('Vehicle order: '+ids);
 await page.locator('#ws-test').click();await page.waitForTimeout(1800);
 await page.screenshot({path:'output/playwright/scooter-rider-weapon/320-trial.png'});
 await page.locator('[data-ws-item="0"]').click();
 await page.screenshot({path:'output/playwright/scooter-rider-weapon/320-purchase-locked.png'});
 if(!(await page.locator('#ws-purchase').isDisabled()))throw Error('Poor player can buy tank');
 await page.evaluate(()=>{a.game.progress.coins=600;a.game.progress.wood=240;a.workshop.open('vehicle',0);});
 await page.locator('#ws-purchase').click();
 const bought=await page.evaluate(()=>({coins:a.game.progress.coins,wood:a.game.progress.wood,hull:a.game.progress.vehicleHulls[0],native:a.game.progress.vehicleWeapons[17],selected:a.game.progress.vehicleIndex}));
 if(bought.coins!==0||bought.wood!==0||bought.hull!==1||bought.native!==1||bought.selected!==5)throw Error(JSON.stringify(bought));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/scooter-rider-weapon/390-purchased.png'});
 // 独立手机上下文录制真实触摸拖动，起停期间保持自动射击。
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,recordVideo:{dir:'output/playwright/scooter-rider-weapon/video',size:{width:390,height:844}}});
 const mobile=await context.newPage();mobile.on('pageerror',e=>errors.push(String(e)));await prepare(mobile);await mobile.bringToFront();
 const session=await context.newCDPSession(mobile);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:550}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y:550}]});
 await mobile.waitForTimeout(800);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await mobile.waitForTimeout(900);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:550}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:600}]});
 await mobile.waitForTimeout(800);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await lighting(mobile,'night');await mobile.waitForTimeout(1800);
 const motion=await mobile.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,shots,animation:a.renderer.diagnosticInfo().catAnimation.status}));
 if(motion.x===1800&&motion.y===1400)throw Error('Touch did not move rider');
 if(motion.shots<1||motion.animation!=='ready')throw Error('Rider failed: '+JSON.stringify(motion));
 const video=mobile.video();await context.close();const videoPath=await video.path();
 if(errors.length)throw Error(errors.join('\n'));
 return {samples,ids,bought,motion,videoPath,errors};
}
