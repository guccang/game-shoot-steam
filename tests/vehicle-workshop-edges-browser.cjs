// 载具边界专项：购买、缺料、触摸暂停、武器回归及昼夜正式同屏。
async page=>{
 if(new URL(page.url()).port!=='4310')throw Error('仅允许隔离端口4310');
 for(const c of page.context().browser().contexts())if(c!==page.context())await c.close();
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4310');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});
 // 检查右侧无滚动、按钮可触达；左侧列表允许独立滑动。
 async function check(label,shot=false){
  await t.waitForTimeout(60);
  const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));
  const size=t.viewportSize();
  const bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);
  if(s.overflow.length||bad.length||s.territory){await t.screenshot({path:'output/playwright/vehicle-workshop-guide/failure.png'});throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));}
  samples.push({label,page:s.page,stage:s.stage,canvasBytes:s.canvasBytes});if(shot)await t.screenshot({path:'output/playwright/vehicle-workshop-guide/'+label+'.png'});
 }
 // 购买使用正式按钮，拥有状态变化后车型应转入升级目录。
 await t.evaluate(()=>{a.game.progress.vehicleHulls[0]=0;a.workshop.open('vehicle',0);});
 await t.locator('#ws-purchase').tap();
 if(!await t.evaluate(()=>a.game.progress.vehicleHulls[0]>0))throw Error('载具购买失败');
 await t.locator('#ws-function-upgrade').tap();await t.locator('[data-ws-item="0"]').tap();
 const before=await t.evaluate(()=>JSON.stringify(a.game.progress));
 await t.locator('[data-ws-upgrade="armor"]').tap();await t.waitForFunction(()=>!document.getElementById('ws-hold').disabled);
 const cdp=await context.newCDPSession(t),b=await t.locator('#ws-hold').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
 await t.waitForFunction(()=>parseFloat(document.getElementById('ws-hold').style.getPropertyValue('--work-progress'))>10);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 if(await t.locator('#ws-hold').isDisabled()||!(await t.locator('#ws-work-progress').textContent()).includes('暂停'))throw Error('载具中断触摸不能恢复');
 await check('vehicle-paused',true);await t.locator('#ws-change-part').tap();await t.waitForTimeout(300);
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==before)throw Error('取消载具施工扣费');
 await t.evaluate(()=>{a.game.progress.coins=a.game.progress.wood=0;a.workshop.render();});await t.locator('[data-ws-upgrade="engine"]').tap();await check('vehicle-shortage',true);
 if(!await t.locator('#ws-hold').isDisabled())throw Error('缺料允许施工');await t.locator('#ws-change-part').tap();
 await t.evaluate(()=>{a.game.progress.coins=a.game.progress.wood=100000;a.game.progress.vehicleHulls[0]=20;a.workshop.render();});
 if(!await t.locator('[data-ws-upgrade="armor"]').isDisabled())throw Error('满级未禁用');
 await t.evaluate(()=>{a.game.progress.vehicleHulls.fill(0);a.workshop.open('vehicle',0);});await t.locator('#ws-function-upgrade').tap();await check('vehicle-empty',true);
 if(!await t.locator('#ws-empty-action').isVisible())throw Error('空目录缺少购买入口');
 await t.locator('#ws-empty-action').tap();if(!await t.locator('#ws-purchase').isVisible())throw Error('空目录无法返回购买');
 // 武器沿用点选部件与套件安装入口，验证共用样式没有遮挡确认。
 await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('[data-ws-upgrade="rate"]').tap();await check('weapon-preview',true);await t.locator('#ws-change-part').tap();
 await t.locator('#ws-function-modify').tap();await t.locator('[data-ws-part="1"]').tap();await t.locator('#ws-socket').tap();await check('weapon-modify',true);await t.locator('#ws-confirm').tap();
 if(!await t.evaluate(()=>a.game.progress.mods[0]===1))throw Error('武器套件回归失败');
 await t.locator('#ws-function-unlock').tap();await check('weapon-growth');
 // 正式场景绘制白天与夜晚，移动与宽视口继续使用同一手机底板。
 await t.evaluate(async()=>{a.game.progress.vehicleHulls.fill(1);const {grantVehicleArmament}=await import('/src/config/vehicle-armaments.js');for(let i=0;i<a.game.progress.vehicleHulls.length;i++)grantVehicleArmament(a.game.progress,i);});
 for(const [width,height] of [[390,844],[1280,900]])for(const time of ['day','night']){
  await t.evaluate(()=>a.workshop.open('vehicle',0));await t.locator('#ws-close').tap();await t.setViewportSize({width,height});
  await t.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.game.selectVehicle(0);a.game.summonVehicle();a.game.spawnEnemy(0,125);a.renderer.resize();a.refresh();a.renderer.draw();a.workshop.open('vehicle',0);},time);
  await check('vehicle-'+width+'-'+time,true);await t.locator('[data-ws-upgrade="engine"]').tap();await t.waitForFunction(()=>!document.getElementById('ws-hold').disabled);await check('vehicle-preview-'+width+'-'+time,true);
 }
 if(errors.length)throw Error(errors.join('\n'));await cdp.detach();await context.close();return {samples:samples.length,edges:'真实购买、触摸暂停和取消、缺料、满级、空目录与武器回归通过',errors};
}
