// 展品候停和桥岸修复的正式交互与昼夜多端采样，使用原游戏循环与页面。
async page=>{
 if(new URL(page.url()).port!=='4289')throw Error('仅限隔离端口4289');
 const errors=[],samples=[],crossings=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[4]=1;p.campParking.owned=[{hull:4,spot:'garage',hp:1,ammo:0,reload:0,wheel:0,track:0}];localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.vehicle.active=false;a.game.spawnTimer=a.game.fireClock=999;});
 for(const kind of ['weapons','vehicle']){
  const target=await page.evaluate(async kind=>{const g=a.game,m=await import('/src/config/workshop-interiors.js'),core=await import('/src/core/cottage.js');Object.assign(g.player,m.WORKSHOP_INTERIORS[kind].door,{vx:0,vy:0});if(!core.enterWorkshop(g,kind))throw Error('入室失败');const t=m.interiorWorkshopTargets(g)[0];Object.assign(g.player,{x:t.x,y:t.y+t.height/2+20});return t;},kind);
  await page.waitForFunction(()=>a.game.cottage.displayEntry?.elapsed>.5);if(await page.locator('#workshop-dialog').isVisible())throw Error('候停未满三秒提前打开');
  // 真实键盘移开取消，回到同一展品重新计时。
  await page.keyboard.down('ArrowRight');await page.waitForFunction(x=>a.game.player.x>x+105,target.x,{timeout:4000});await page.keyboard.up('ArrowRight');await page.waitForFunction(()=>!a.game.cottage.displayEntry);
  await page.evaluate(t=>Object.assign(a.game.player,{x:t.x,y:t.y+t.height/2+20,vx:0,vy:0}),target);
  await page.waitForFunction(()=>a.game.cottage.displayEntry?.elapsed>1);await page.evaluate(()=>a.game.pause());
  // 暂停保留真实倒计时，连续采样各端昼夜；徽记来自最终屏幕层。
  const elapsed=await page.evaluate(()=>a.game.cottage.displayEntry.elapsed);
  for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';},phase);await page.waitForFunction(phase=>a.environment.time===phase,phase);await page.waitForTimeout(80);
   const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectExhibitCountdown(a.game,document,a.renderer));
   if(sample.overflow||!sample.badge||sample.badge.icon!==(kind==='weapons'?'weapon':'parking')||sample.workshop)throw Error('倒计时徽记或页面异常');
   if(!await page.evaluate(value=>Math.abs(a.game.cottage.displayEntry.elapsed-value)<.001,elapsed))throw Error('暂停继续计时');
   const canvas=await page.locator('#game').boundingBox();if(sample.badge.x-34<0||sample.badge.x+34>canvas.width||sample.badge.y-17<75||sample.badge.y+17>canvas.height-85)throw Error('头顶徽记越界');
   await page.screenshot({path:`output/playwright/exhibit-countdown-bridge/${kind}-${width}-${phase}.png`});samples.push({kind,width,phase,...sample});
  }
  await page.evaluate(()=>a.game.start());await page.locator('#workshop-dialog').waitFor({state:'visible',timeout:6500});
  if(Number(await page.locator('#workshop-dialog').getAttribute('data-guide-index'))!==target.index||await page.locator('#workshop-dialog').getAttribute('data-workshop-kind')!==kind)throw Error('自动打开错误装备');
  await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(3400);
  if(await page.locator('#workshop-dialog').isVisible()||await page.evaluate(()=>!!a.game.cottage.displayEntry))throw Error('关闭后原地重复打开');
  // 闩锁不禁用直接点击；点击立即打开原页面。
  await page.locator(`[data-room-item="${target.id}"]`).click();await page.locator('#workshop-dialog').waitFor({state:'visible',timeout:1500});await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(80);
  if(kind==='vehicle'){
   await page.evaluate(async()=>{const b=(await import('/src/config/workshop-interiors.js')).VEHICLE_BAY;Object.assign(a.game.player,{x:b.x,y:b.y+85,vx:0,vy:0});});await page.locator('#workshop-dialog').waitFor({state:'visible',timeout:6500});if(await page.locator('#workshop-dialog').getAttribute('data-guide-index')!=='4')throw Error('维修车自动整备车型错误');await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(80);
  }
  await page.locator('#cottage-exit').click();await page.waitForFunction(()=>!a.game.cottage);
 }
 // 正式步行按桥板上下内沿分别往返，保留地图树木、河水与真正移动碰撞。
 const bridge=await page.evaluate(async()=>(await import('/src/world/river-geometry.js')).BRIDGE);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 for(const edge of ['upper','lower'])for(const sign of [1,-1]){
  const y=edge==='upper'?bridge.y+6:bridge.y+bridge.height-6,start=sign===1?bridge.x-32:bridge.x+bridge.width+32,end=sign===1?bridge.x+bridge.width+28:bridge.x-28,key=sign===1?'ArrowRight':'ArrowLeft';
  await page.evaluate(({x,y})=>{Object.assign(a.game.player,{x,y,vx:0,vy:0,pushX:0,pushY:0});a.renderer.camera.time=null;},{x:start,y});await page.waitForTimeout(80);await page.keyboard.down(key);await page.waitForFunction(({end,sign})=>sign>0?a.game.player.x>=end:a.game.player.x<=end,{end,sign},{timeout:6500});await page.keyboard.up(key);crossings.push({edge,sign,position:await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}))});
 }
 // 桥面下沿和河岸交点同屏；以真实敌人、角色与正式场景检查昼夜关系。
 await page.evaluate(async()=>{window.bridgeTick=a.game.update.bind(a.game);a.game.update=()=>{};const b=(await import('/src/world/river-geometry.js')).BRIDGE;Object.assign(a.game.player,{x:b.x+65,y:b.y+b.height-6,vx:0,vy:0});a.game.enemies=[];a.game.spawnEnemy(0,100);Object.assign(a.game.enemies[0],{x:b.x-50,y:b.y+105});a.game.parkingVisitors=[];a.renderer.camera.time=null;});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';a.renderer.camera.time=null;},phase);await page.waitForFunction(phase=>a.environment.time===phase,phase);
  await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.refresh();});await page.waitForTimeout(90);await page.screenshot({path:`output/playwright/exhibit-countdown-bridge/bridge-${width}-${phase}.png`});
 }
 await page.evaluate(()=>{a.game.update=window.bridgeTick;a.game.enemies=[];});
 if(errors.length)throw Error(errors.join(' / '));return {designCriterion:'exhibit-countdown-bridge',moveCancels:true,pauseFreezes:true,noReopen:true,clickImmediate:true,garageAuto:true,crossings,samples,errors};
}
