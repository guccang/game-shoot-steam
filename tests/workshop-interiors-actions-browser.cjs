// 室内交易和触控补验，读取正式验收入口并保存连续行走帧。
async page=>{
 if(new URL(page.url()).port!=='4282')throw Error('仅限隔离端口4282');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.enemies=[];g.spawnTimer=g.fireClock=999;g.vehicle.active=false;g.progress.weapons[1]=0;g.progress.coins=g.progress.wood=g.progress.bosses=100000;for(const key of Object.keys(g.progress.materials))g.progress.materials[key]=100000;Object.assign(g.player,{x:530,y:680,vx:0,vy:0});a.renderer.camera.time=null;});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
 await page.locator('.world-workshop-entry[data-workshop-kind="weapons"]').click();await page.waitForFunction(()=>a.game.cottage?.kind==='weapons');
 // 真正触屏短按展品，不能误触为摇杆移动。
 const cdp=await page.context().newCDPSession(page),box=await page.locator('[data-room-index="1"]').boundingBox();
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 await page.locator('#workshop-dialog').waitFor({state:'visible'});await page.locator('#ws-purchase').click();await page.waitForFunction(()=>a.game.progress.weapons[1]>0);
 await page.screenshot({path:'output/playwright/workshop-interiors/weapon-purchased.png'});await page.locator('#ws-close').click();
 if(!await page.evaluate(()=>a.game.cottage?.kind==='weapons'&&!a.game.vehicle.active))throw Error('购买改变室内步行状态');
 checks.push('建筑点击进入、手机触屏选品、真实购买成功');
 await page.keyboard.down('ArrowRight');
 for(let i=0;i<3;i++){await page.waitForTimeout(130);await page.screenshot({path:`output/playwright/workshop-interiors/walk-${i}.png`});}
 await page.keyboard.up('ArrowRight');
 const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopInteriors(a.game,document,a.renderer));
 if(sample.portraitBytes>663552||sample.overflow||sample.weapons.length!==6)throw Error('正式画像预算或布局错误');checks.push(sample);
 await page.locator('#cottage-exit').click();
 await page.evaluate(()=>{Object.assign(a.game.player,{x:350,y:740,vx:0,vy:0});a.renderer.camera.time=null;});await page.waitForTimeout(200);
 await page.locator('.world-workshop-entry[data-workshop-kind="vehicle"]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>a.game.cottage?.kind==='vehicle');
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.refresh();},phase);await page.waitForTimeout(100);
  await page.screenshot({path:`output/playwright/workshop-interiors/vehicle-${width}-${phase}.png`});
 }
 await page.locator('[data-room-item="bay"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});await page.locator('#ws-close').click();
 const previous=await page.evaluate(()=>a.game.player.x);await page.keyboard.down('ArrowLeft');await page.waitForTimeout(200);await page.keyboard.up('ArrowLeft');
 if(!await page.evaluate(x=>a.game.player.x<x-3,previous))throw Error('车库关窗后不能行走');
 // 通过室内交互保存，再刷新验证恢复到室外，不把局部坐标写进世界存档。
 const outside=await page.evaluate(()=>{a.game.onEvent('cottage-change');return a.game.cottage.outside;});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
 if(saved.living.position.x!==outside.x||saved.living.position.y!==outside.y||saved.campParking.owned.filter(r=>r.spot==='garage').length!==1)throw Error('室内保存错误');
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 if(!await page.evaluate(({x,y})=>!a.game.cottage&&Math.hypot(a.game.player.x-x,a.game.player.y-y)<3,outside))throw Error('重载未恢复世界坐标');
 checks.push('车库键盘进入、关窗继续步行、真实泊位和室外存档重载');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'workshop-interiors-sci-fi-parking',checks,errors};
}
