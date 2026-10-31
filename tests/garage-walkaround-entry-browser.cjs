// 维修间实机验收：绕车行走、地图直达页面、触屏拖动与昼夜多端采样。
async page=>{
 if(new URL(page.url()).port!=='4287')throw Error('仅限隔离端口4287');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';for(const i of [0,2,4])p.vehicleHulls[i]=1;p.campParking.owned=[{hull:0,spot:'garage',hp:1,ammo:0,reload:0,wheel:0,track:0}];localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.vehicle.active=false;a.game.spawnTimer=a.game.fireClock=999;});
 // 地图上的两座建筑短按都打开原工坊，关闭后仍在室外；入职入口由原分支保留。
 for(const kind of ['weapons','vehicle']){
  await page.evaluate(async kind=>{const l=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS[kind];Object.assign(a.game.player,{x:l.site.x+90,y:l.site.y+60,vx:0,vy:0});a.renderer.camera.time=null;},kind);
  await page.locator(`[data-workshop-kind="${kind}"].world-workshop-entry`).click(kind==='vehicle'?{position:{x:25,y:20}}:{});await page.locator('#workshop-dialog').waitFor({state:'visible'});
  if(await page.evaluate(()=>!!a.game.cottage)||await page.locator('#workshop-dialog').getAttribute('data-workshop-kind')!==kind)throw Error('地图点击未直达对应工坊');
  await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(80);
 }
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.vehicle.door,{vx:0,vy:0});});
 await page.waitForFunction(()=>a.game.cottage?.kind==='vehicle',null,{timeout:6500});
 const depth=await page.evaluate(async()=>(await import('/src/config/workshop-interiors.js')).VEHICLE_GALLERY.depth);
 // 用真实键盘输入依次经过左、后、右、前四侧，再回到入口。
 for(const [key,axis,target,sign] of [['ArrowLeft','x',110,-1],['ArrowUp','y',200,-1],['ArrowRight','x',330,1],['ArrowDown','y',430,1],['ArrowLeft','x',110,-1],['ArrowDown','y',480,1],['ArrowRight','x',220,1]]){
  await page.keyboard.down(key);await page.waitForFunction(({axis,target,sign})=>sign<0?a.game.player[axis]<=target:a.game.player[axis]>=target,{axis,target:target+(axis==='y'?depth:0),sign},{timeout:5500});await page.keyboard.up(key);
 }
 const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 await page.locator('[data-room-item="bay"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 if(await page.locator('#workshop-dialog').getAttribute('data-guide-index')!=='0')throw Error('点车没有选中停车车辆');
 await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(80);
 if(!await page.evaluate(p=>a.game.cottage?.kind==='vehicle'&&a.game.player.x===p.x&&a.game.player.y===p.y,before))throw Error('关闭页面改变角色位置');
 // 从车辆热点起手拖动仍能走动；短按才打开整备。
 const cdp=await page.context().newCDPSession(page),box=await page.locator('[data-room-item="bay"]').boundingBox();
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2+65,y:box.y+box.height/2}]});await page.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 if(await page.locator('#workshop-dialog').isVisible()||!await page.evaluate(x=>a.game.player.x>x+10,before.x))throw Error('拖动车辆热点没有正确移动');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#workshop-dialog').waitFor({state:'visible'});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(80);
 await page.evaluate(()=>{a.game.progress.campParking.owned=[];});await page.waitForFunction(()=>!document.querySelector('[data-room-item="bay"]'));
 await page.locator('[data-room-item="catalog"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(80);
 await page.evaluate(()=>{window.garageTick=a.game.update.bind(a.game);a.game.update=()=>{};a.game.progress.campParking.owned=[{hull:0,spot:'garage',hp:1,ammo:0,reload:0,wheel:0,track:0}];});
 // 正式车辆、角色与工具台同屏采样；额外采样直升机/消防车的大车体边界。
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(({phase,depth})=>{Object.assign(a.game.player,{x:110,y:300+depth,vx:0,vy:0});a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';},{phase,depth});await page.waitForFunction(phase=>a.environment.time===phase,phase);await page.waitForTimeout(100);
  const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectGarageWalkaround(a.game,document,a.renderer));if(sample.overflow||!['bay','catalog'].every(id=>sample.visible.some(item=>item.id===id)))throw Error('布局溢出或热点缺失');
  await page.screenshot({path:`output/playwright/garage-walkaround-entry/garage-${width}-${phase}.png`});samples.push({width,phase,...sample});
 }
 for(const hull of [2,4]){await page.evaluate(hull=>{a.game.progress.campParking.owned[0].hull=hull;},hull);await page.waitForTimeout(100);await page.screenshot({path:`output/playwright/garage-walkaround-entry/large-hull-${hull}.png`});await page.locator('[data-room-item="bay"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});if(Number(await page.locator('#workshop-dialog').getAttribute('data-guide-index'))!==hull)throw Error('大车点击选中错误');await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(80);}
 await page.evaluate(async()=>{a.game.update=window.garageTick;Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.vehicle.exit);});await page.waitForFunction(()=>!a.game.cottage,null,{timeout:6000});
 if(errors.length)throw Error(errors.join(' / '));return {designCriterion:'garage-walkaround-entry',loop:true,mapClicks:true,touch:true,emptyCatalog:true,exit:true,samples,errors};
}
