// 隔离实机验收：夹具只准备起点，候门、停车、点击陈列和出门均走正式交互。
async page=>{
 if(new URL(page.url()).port!=='4282')throw Error('仅限隔离端口4282');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;
  p.arrival={version:2,phase:'complete',elapsed:0,keys:true,parked:false,x:260,y:785};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const g=a.game;g.vehicle.active=false;g.enemies=[];g.spawnTimer=999;g.fireTimer=999;Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.door,{vx:0,vy:0});a.renderer.camera.time=null;});
 await page.waitForFunction(()=>a.game.cottageEntry>.4);await page.screenshot({path:'output/playwright/workshop-interiors/entry.png'});
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
 if(!await page.evaluate(()=>!a.game.cottageEntry))throw Error('移动未取消候门');
 await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.door,{vx:0,vy:0}));
 await page.waitForFunction(()=>a.game.cottage?.kind==='weapons',null,{timeout:6500});
 await page.locator('[data-room-index="0"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 if(await page.locator('#workshop-dialog').getAttribute('data-workshop-kind')!=='weapons')throw Error('武器展柜打开错误界面');
 await page.locator('#ws-close').click();
 if(!await page.evaluate(()=>a.game.cottage?.kind==='weapons'))throw Error('关窗后离开室内');
 const before=await page.evaluate(()=>a.game.player.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(220);await page.keyboard.up('ArrowRight');
 if(!await page.evaluate(x=>a.game.player.x>x+3,before))throw Error('关闭界面后不能步行');
 await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>!document.querySelector('[data-room-index="6"]').hidden);await page.keyboard.up('ArrowUp');await page.locator('[data-room-index="6"]').focus();await page.keyboard.press('Enter');await page.locator('#workshop-dialog').waitFor({state:'visible'});await page.locator('#ws-close').click();
 checks.push('武器展柜鼠标、键盘、步行浏览及关窗继续步行');
 await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.spawn));
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(280);await page.keyboard.up('ArrowDown');await page.waitForFunction(()=>a.game.cottage?.exitElapsed>.4);
 await page.screenshot({path:'output/playwright/workshop-interiors/exit.png'});
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);await page.keyboard.up('ArrowUp');
 if(!await page.evaluate(()=>a.game.cottage&&!a.game.cottage.exitElapsed))throw Error('移开未取消出门');
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(300);await page.keyboard.up('ArrowDown');await page.waitForFunction(()=>!a.game.cottage,null,{timeout:6500});
 checks.push('门口三秒进入与退出，移动取消');
 // 真正倒车入库后自动下车并进入室内，点击真实车辆打开其工坊。
 await page.evaluate(async()=>{const g=a.game,s=(await import('/src/config/parking.js')).PARKING_SPOTS.find(s=>s.id==='garage');g.progress.campParking.owned=[];g.vehicle.active=false;g.progress.vehicleIndex=0;g.vehicle=g.vehicles[0];g.summonVehicle();g.parking=null;g.enemies=[];g.spawnTimer=999;Object.assign(g.player,{x:s.x+20,y:s.approachY,vx:0,vy:0});a.renderer.camera.time=null;});
 await page.waitForFunction(()=>a.game.cottage?.kind==='vehicle',null,{timeout:20000});
 if(!await page.evaluate(()=>!a.game.vehicle.active&&a.game.progress.campParking.owned.length===1&&a.game.progress.campParking.owned[0].spot==='garage'))throw Error('入库车辆记录不唯一或未下车');
 await page.locator('[data-room-item="bay"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 if(await page.locator('#workshop-dialog').getAttribute('data-workshop-kind')!=='vehicle')throw Error('车辆打开错误界面');
 await page.locator('#ws-close').click();checks.push('实际倒车入库、自动下车、车库显示唯一车辆并可整备');
 // 固定正式运行状态进行昼夜与多端同屏采样，不用独立预览替代渲染器。
 await page.evaluate(()=>{window.roomTick=a.game.update.bind(a.game);a.game.update=()=>{};});
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';},phase);
  await page.waitForFunction(phase=>a.environment.time===phase,phase);
  for(const kind of ['vehicle','weapons']){
   await page.evaluate(async kind=>{a.game.cottage.kind=kind;Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS[kind].spawn);a.renderer.draw();a.refresh();},kind);await page.waitForTimeout(100);
   await page.screenshot({path:`output/playwright/workshop-interiors/${kind}-${width}-${phase}.png`});
   const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.workshop-room-hits button')].map(n=>({label:n.ariaLabel,box:n.getBoundingClientRect().toJSON()}))}));
   if(result.overflow||result.buttons.some(b=>b.box.x<0||b.box.right>width||b.box.y<0||b.box.bottom>height))throw Error('室内热点超屏');checks.push({kind,width,phase,...result});
  }
 }
 // 空车库不复制携带车辆，零件柜仍可打开图册；完整展厅可正常陈列。
 await page.evaluate(()=>{a.game.cottage.kind='vehicle';window.savedGarage=a.game.progress.campParking.owned;a.game.progress.campParking.owned=[];a.refresh();});
 await page.screenshot({path:'output/playwright/workshop-interiors/empty-garage-320.png'});
 if(await page.locator('[data-room-item="bay"]').count())throw Error('空车库生成车辆');
 await page.locator('[data-room-item="catalog"]').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});await page.locator('#ws-close').click();
 await page.evaluate(()=>{a.game.progress.campParking.owned=window.savedGarage;a.game.cottage.kind='weapons';a.refresh();});
 for(const y of [1400,760,100]){await page.evaluate(y=>{Object.assign(a.game.player,{x:200,y});a.renderer.draw();a.refresh();},y);await page.screenshot({path:`output/playwright/workshop-interiors/weapons-walk-${y}.png`});}
 // 六款科幻座驾、六款可获得访客各分两批在正式北广场展示，始终保留空位。
 await page.locator('#cottage-exit').click();
 for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const phase of ['day','night'])for(let batch=0;batch<4;batch++){
  await page.setViewportSize({width,height});
  await page.evaluate(async({phase,batch})=>{const g=a.game,models=(await import('/src/config/parking-visitors.js')).VISITOR_MODELS,spots=(await import('/src/config/parking.js')).PARKING_SPOTS.filter(s=>s.building==='north');g.progress.living.calendar.elapsed=phase==='night'?260000:75000;a.environment.time=phase==='day'?'night':'day';g.parkingVisitors=models.slice(batch*3,batch*3+3).map((m,i)=>({spot:spots[i].id,model:m.id}));Object.assign(g.player,{x:330,y:280,vx:0,vy:0});a.renderer.camera.time=null;}, {phase,batch});
  await page.waitForFunction(phase=>a.environment.time===phase,phase);
  await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.refresh();});await page.waitForTimeout(80);
  await page.screenshot({path:`output/playwright/workshop-interiors/visitors-${batch}-${width}-${phase}.png`});
 }
 await page.evaluate(()=>{a.game.update=window.roomTick;});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'workshop-interiors-sci-fi-parking',checks,errors};
}
