// 工坊升级按钮与站立候门实机验收：默认4175，已有服务运行时允许4176隔离验证。
async page=>{
 if(!['4175','4176'].includes(new URL(page.url()).port))throw Error('请使用本地验收端口');
 const errors=[],samples=[];page.on('pageerror',error=>errors.push(error.message));
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.progress.weapon=0;
  g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.enemies=[];g.vehicle.active=false;
  window.originalUpdate=g.update.bind(g);g.update=()=>{};
  window.rooms=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});a.refresh();
 });
 // 两种工坊只显示升级按钮，逐一验证昼夜、窄屏、横屏和宽视窗。
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,800]])for(const time of ['day','night'])for(const kind of ['weapons','vehicle']){
  await page.setViewportSize({width,height});
  await page.evaluate(async({kind,time})=>{
   const g=a.game,door=rooms[kind].door;g.cottage=null;g.vehicle.active=false;g.mainlineSpeech=null;Object.assign(g.player,{x:door.x,y:door.y+55,vx:0,vy:0});
   g.enemies=[];g.spawnEnemy(0,0,{x:door.x+140,y:door.y+80},{ambient:true});
   g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time});
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.refresh();
  },{kind,time});
  await page.waitForTimeout(200);
  const info=await page.locator('#nearby-interaction').evaluate(node=>({hidden:node.hidden,text:node.innerText,buttons:[node].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,disabled:b.disabled};}),overflow:document.documentElement.scrollWidth>innerWidth}));
  if(info.hidden||info.overflow||info.buttons.some(b=>b.w<44||b.h<44||b.x<0||b.y<0||b.x+b.w>width||b.y+b.h>height||b.disabled))throw Error(JSON.stringify({kind,width,height,time,info}));
  if(await page.locator('#operation-guide').isVisible())throw Error('主线提示覆盖工坊操作');
  samples.push({kind,width,height,time,info});
  if([320,390,844,1280].includes(width))await page.screenshot({path:`output/playwright/workshop-entry-actions/${kind}-${width}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 // 真实升级按钮打开与关闭，不扣款、不移动、不自动进入室内。
 for(const kind of ['weapons','vehicle']){
  await page.evaluate(kind=>{const g=a.game,door=rooms[kind].door;g.state='playing';g.cottage=null;g.vehicle.active=false;g.mainlineSpeech=null;Object.assign(g.player,{x:door.x,y:door.y+55});a.renderer.camera.time=null;a.refresh();},kind);
  const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,coins:a.game.progress.coins,wood:a.game.progress.wood}));
  await page.locator('#nearby-interaction').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
  const state=await page.evaluate(()=>({kind:document.querySelector('#workshop-dialog').dataset.workshopKind,room:a.game.cottage,x:a.game.player.x,y:a.game.player.y,coins:a.game.progress.coins,wood:a.game.progress.wood}));
  if(state.kind!==kind||state.room||state.x!==before.x||state.y!==before.y||state.coins!==before.coins||state.wood!==before.wood)throw Error(JSON.stringify(state));
  await page.locator('#ws-close').click();await page.locator('#workshop-dialog').waitFor({state:'hidden'});
  // 驾驶时升级仍可打开，候门不会启动。
  await page.evaluate(()=>{const g=a.game;g.vehicle.active=true;g.vehicle.index=0;a.refresh();});
  await page.locator('#nearby-interaction').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
  if(!await page.evaluate(()=>a.game.vehicle.active&&!a.game.cottage))throw Error('升级界面改变驾驶状态');
  await page.locator('#ws-close').click();
 }
 // 三栋建筑恢复真实逻辑更新，实际按键走到门前、松开后等满三秒。
 for(const kind of ['weapons','vehicle','cottage']){
  await page.evaluate(async kind=>{
   const g=a.game,room=(await import('/src/config/workshop-interiors.js')).interiorLayout({kind});
   g.cottage=null;g.cottageEntry=null;g.cottageEntryKind=null;g.cottageDoorLatch=false;g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.enemies=[];g.boss=null;g.spawnTimer=g.fireClock=g.attackTimer=999;
   Object.assign(g.player,{x:room.door.x,y:room.door.y+50,vx:0,vy:0});g.update=originalUpdate;a.renderer.camera.time=null;a.refresh();
  },kind);
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(200);await page.keyboard.up('ArrowUp');
  await page.waitForFunction(()=>a.game.cottageEntry>0,{},{timeout:5000});
  if(await page.locator('#nearby-workshop-actions').count())throw Error('不应残留双入口');
  await page.screenshot({path:`output/playwright/workshop-entry-actions/${kind}-countdown.png`});
  await page.waitForFunction(kind=>a.game.cottage?.kind===kind,kind,{timeout:5000});
  if(await page.locator('#workshop-dialog').isVisible())throw Error('自动入室不能打开升级界面');
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>!a.game.cottage);await page.keyboard.up('ArrowDown');
  await page.evaluate(()=>{a.game.update=()=>{};});
 }
 // 骑乘门前超过三秒仍在室外；离开范围不残留升级按钮。
 await page.evaluate(()=>{const g=a.game;g.cottageDoorLatch=false;g.vehicle.active=true;g.vehicle.index=0;Object.assign(g.player,{x:rooms.weapons.door.x,y:rooms.weapons.door.y+20,vx:0,vy:0});g.update=originalUpdate;a.refresh();});
 await page.waitForTimeout(3200);
 if(await page.evaluate(()=>!!a.game.cottage||!!a.game.cottageEntry))throw Error('驾驶触发候门');
 await page.evaluate(()=>{a.game.update=()=>{};a.game.vehicle.active=false;a.game.player.x+=500;a.refresh();});
 await page.locator('#nearby-interaction[data-interaction="workshop"]').waitFor({state:'hidden'});
 if(errors.length)throw Error(errors.join('\n'));
 return {samples:samples.length,interactions:'升级/关闭/步行倒计时/出门/驾驶通过',errors};
}
