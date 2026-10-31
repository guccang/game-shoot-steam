// 载具连续展区实机检查：行走、全部展车选择、触屏、实际购买与多端昼夜。
async page=>{
 if(new URL(page.url()).port!=='4288')throw Error('仅限隔离端口4288');
 const errors=[],visited=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[4]=1;p.campParking.owned=[{hull:4,spot:'garage',hp:.7,ammo:0,reload:0,wheel:0,track:0}];localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.enemies=[];g.vehicle.active=false;g.spawnTimer=g.fireClock=999;Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.vehicle.door,{vx:0,vy:0});});
 await page.waitForFunction(()=>a.game.cottage?.kind==='vehicle',null,{timeout:6500});
 const config=await page.evaluate(async()=>{const m=await import('/src/config/workshop-interiors.js');return {layout:m.WORKSHOP_INTERIORS.vehicle,depth:m.VEHICLE_GALLERY.depth,displays:m.interiorVehicleDisplays()};});
 const initial=await page.evaluate(()=>({top:a.renderer.cottageView.top,fleet:JSON.stringify({hulls:a.game.progress.vehicleHulls,parking:a.game.progress.campParking,loadouts:a.game.progress.vehicleLoadouts})}));
 if(await page.locator('[data-room-page]').count())throw Error('仍有翻页控件');
 // 入口真实维修车可整备，关闭后仍站在同一室内位置。
 await page.locator('[data-room-item="bay"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 if(await page.locator('#workshop-dialog').getAttribute('data-guide-index')!=='4')throw Error('维修泊位车型错误');
 await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(70);
 // 绕过维修位、穿过工具台中央进入展区，三张连续行走帧检查正式猫动作。
 for(const [key,axis,target,sign] of [['ArrowLeft','x',110,-1],['ArrowUp','y',config.depth+200,-1],['ArrowRight','x',220,1]]){
  await page.keyboard.down(key);await page.waitForFunction(({axis,target,sign})=>sign<0?a.game.player[axis]<=target:a.game.player[axis]>=target,{axis,target,sign},{timeout:6000});await page.keyboard.up(key);
 }
 for(let row=0;row<Math.ceil(config.displays.length/2);row++){
  const pair=config.displays.slice(row*2,row*2+2),target=pair[0].y+65;
  await page.keyboard.down('ArrowUp');if(row===0)for(let i=0;i<3;i++){await page.waitForTimeout(130);await page.screenshot({path:`output/playwright/vehicle-gallery/walk-${i}.png`});}
  await page.waitForFunction(y=>a.game.player.y<=y,target,{timeout:6000});await page.keyboard.up('ArrowUp');
  for(const car of pair){
   const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await page.locator(`[data-room-item="${car.id}"]`).click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
   if(Number(await page.locator('#workshop-dialog').getAttribute('data-guide-index'))!==car.index)throw Error('展车打开错误车型');
   visited.push(await page.locator('#ws-name').innerText());await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(70);
   if(!await page.evaluate(p=>a.game.cottage?.kind==='vehicle'&&a.game.player.x===p.x&&a.game.player.y===p.y,before))throw Error('关窗改变室内落点');
  }
 }
 if(!await page.evaluate(initial=>a.renderer.cottageView.top<initial.top-100&&JSON.stringify({hulls:a.game.progress.vehicleHulls,parking:a.game.progress.campParking,loadouts:a.game.progress.vehicleLoadouts})===initial.fleet,initial))throw Error('展车修改玩家车库或镜头未跟随');
 // 真正触屏从展车起手拖动保持中央行走，短按才打开车型。
 const cdp=await page.context().newCDPSession(page),car=config.displays.at(-1),box=await page.locator(`[data-room-item="${car.id}"]`).boundingBox(),beforeTouch=await page.evaluate(()=>a.game.player.y);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2-65}]});await page.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 if(await page.locator('#workshop-dialog').isVisible()||!await page.evaluate(y=>a.game.player.y<y-10,beforeTouch))throw Error('展车拖动阻止移动');
 const tap=await page.locator(`[data-room-item="${car.id}"]`).boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tap.x+tap.width/2,y:tap.y+tap.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#workshop-dialog').waitFor({state:'visible'});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 if(Number(await page.locator('#workshop-dialog').getAttribute('data-guide-index'))!==car.index)throw Error('触屏选车错误');await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(70);
 // 回第一排购买松果战车，验证沿原事务送北停车场，不替换维修车或直接驾驶。
 await page.keyboard.down('ArrowDown');await page.waitForFunction(y=>a.game.player.y>=y,config.displays[0].y+65,{timeout:6000});await page.keyboard.up('ArrowDown');
 await page.evaluate(()=>{const p=a.game.progress;p.coins=p.wood=p.bosses=100000;for(const key of Object.keys(p.materials))p.materials[key]=100000;});
 await page.locator(`[data-room-item="${config.displays[0].id}"]`).click();await page.locator('#workshop-dialog').waitFor({state:'visible'});await page.locator('#ws-purchase').click();await page.waitForFunction(index=>a.game.progress.vehicleHulls[index]>0,config.displays[0].index);
 if(!await page.evaluate(index=>a.game.progress.campParking.owned.some(r=>r.hull===index&&r.spot.startsWith('north-'))&&a.game.progress.campParking.owned.some(r=>r.hull===4&&r.spot==='garage'&&r.hp===.7)&&!a.game.vehicle.active&&a.game.cottage?.kind==='vehicle',config.displays[0].index))throw Error('购买破坏停车或步行状态');
 await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));await page.waitForTimeout(70);
 // 同一个正式场景采样维修区、过渡处与顶部展区；仅冻结更新，不替换绘制器。
 await page.evaluate(()=>{window.vehicleGalleryTick=a.game.update.bind(a.game);a.game.update=()=>{};});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night'])for(const location of ['entrance','middle','showroom']){
  await page.setViewportSize({width,height});await page.evaluate(({phase,location,depth})=>{Object.assign(a.game.player,{x:location==='entrance'?110:220,y:location==='entrance'?depth+300:location==='middle'?depth+50:230,vx:0,vy:0});a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';},{phase,location,depth:config.depth});await page.waitForFunction(phase=>a.environment.time===phase,phase);await page.waitForTimeout(90);
  const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectVehicleGallery(a.game,document,a.renderer));if(sample.overflow||sample.pages||sample.all.length!==config.displays.length||sample.parked!==4)throw Error('显示目录或维修车丢失');
  const canvas=await page.locator('#game').boundingBox();for(const item of sample.visible)if(item.rect.top<canvas.y+sample.view.clip.y-1||item.rect.bottom>canvas.y+sample.view.clip.y+sample.view.clip.height+1)throw Error('热点越过场景视窗');
  await page.screenshot({path:`output/playwright/vehicle-gallery/${location}-${width}-${phase}.png`});samples.push({width,phase,location,...sample});
 }
 await page.evaluate(()=>{a.game.update=window.vehicleGalleryTick;});
 // 从上方展厅一路走回门口，绕维修位后按原三秒逻辑退出。
 for(const [key,axis,target,sign] of [['ArrowDown','y',config.depth+200,1],['ArrowLeft','x',110,-1],['ArrowDown','y',config.layout.spawn.y,1],['ArrowRight','x',220,1],['ArrowDown','y',config.layout.exit.y-12,1]]){
  await page.keyboard.down(key);await page.waitForFunction(({axis,target,sign})=>sign<0?a.game.player[axis]<=target:a.game.player[axis]>=target,{axis,target,sign},{timeout:8000});await page.keyboard.up(key);
 }
 await page.waitForFunction(()=>!a.game.cottage,null,{timeout:6000});
 if(errors.length)throw Error(errors.join(' / '));return {designCriterion:'vehicle-gallery',visited,purchaseToNorth:true,touch:true,walkAndExit:true,samples,errors};
}
