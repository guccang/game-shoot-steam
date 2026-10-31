// 单屏武器工坊针对性回归：正式DOM、交易、草稿与手机触控施工。
async page=>{
 if(new URL(page.url()).port!=='4307')throw Error('仅允许隔离端口4307');
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4307');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});
 // 检查右侧无滚动、按钮可触达；左侧列表允许独立滑动。
 async function check(label,shot=false){
  await t.waitForTimeout(60);
  const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));
  const size=t.viewportSize();
  const bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);
  if(s.overflow.length||bad.length||s.territory)throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));
  samples.push({label,page:s.page,stage:s.stage,canvasBytes:s.canvasBytes});if(shot)await t.screenshot({path:'output/playwright/workshop-layout/'+label+'.png'});
 }
 // 最小屏检查每种武器及其购买、升级、成长与改装，覆盖特殊召唤器和五材料价格。
 const order=await t.evaluate(async()=>(await import('/src/config/weapons.js')).WEAPON_DISPLAY_ORDER);
 for(const i of order){
  await t.evaluate(i=>{a.game.progress.weapons[i]=0;a.workshop.open('weapons',i);},i);await check('catalog-buy-'+i);
  await t.evaluate(i=>{a.game.progress.weapons[i]=1;a.workshop.open('weapons',i);},i);await check('catalog-upgrade-'+i);
  await t.locator('#ws-function-unlock').tap();await check('catalog-growth-'+i);
  await t.locator('#ws-function-modify').tap();await check('catalog-modify-'+i);
 }
 // 资源不足仍看全报价与来源；免费购买也必须保留购买入口。
 await t.evaluate(()=>{a.game.progress.weapons[0]=0;a.workshop.open('weapons',0);});await check('free-buy',true);await t.locator('#ws-purchase').tap();
 if(!await t.evaluate(()=>a.game.progress.weapons[0]>0))throw Error('免费购买未提交');
 await t.evaluate(()=>{a.game.progress.weapons[16]=0;a.game.progress.coins=a.game.progress.wood=0;for(const k of Object.keys(a.game.progress.materials))a.game.progress.materials[k]=0;a.workshop.open('weapons',16);});await check('shortage',true);
 if(!await t.locator('#ws-purchase').isDisabled())throw Error('不足仍可购买');
 await t.locator('#ws-resources [data-resource-info]').first().tap();await t.locator('#close-resource-help').tap();
 await t.evaluate(()=>{a.game.progress.coins=a.game.progress.wood=100000;for(const k of Object.keys(a.game.progress.materials))a.game.progress.materials[k]=999;a.workshop.render();});
 const coins=await t.evaluate(()=>a.game.progress.coins);await t.locator('#ws-purchase').tap();if(!await t.evaluate(coins=>a.game.progress.weapons[16]>0&&a.game.progress.coins<coins,coins))throw Error('购买扣费错误');
 // 点选部件自动试装，再使用真实触摸长按确认。
 await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('[data-ws-upgrade="damage"]').tap();await check('selected-upgrade',true);await t.waitForTimeout(1200);await check('draft-upgrade',true);
 const before=await t.evaluate(()=>JSON.stringify(a.game.progress));await t.locator('#ws-function-unlock').tap();if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==before)throw Error('切页扣费');
 await t.locator('#ws-function-upgrade').tap();await t.locator('[data-ws-upgrade="damage"]').tap();await t.waitForTimeout(1200);
 const cdp=await context.newCDPSession(t);
 // 触控事件落在正式控件位置，不直接调用提交函数。
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});}
 const hold=await t.locator('#ws-hold').boundingBox();await touch('touchStart',hold.x+hold.width/2,hold.y+hold.height/2);await t.waitForFunction(()=>a.game.progress.weapons[0]===2,null,{timeout:8000});await touch('touchEnd');await check('completed-upgrade',true);
 if(!await t.evaluate(()=>a.game.progress.weapons[0]===2))throw Error('触控施工未提交');
 // 改装、恢复原厂与试射返回均走可见正式按钮。
 await t.locator('#ws-function-modify').tap();await t.locator('[data-ws-part="1"]').tap();await t.locator('#ws-socket').tap();await check('draft-modify',true);await t.locator('#ws-confirm').tap();if(!await t.evaluate(()=>a.game.progress.mods[0]===1))throw Error('改装未提交');
 await t.locator('#ws-reset').tap();await check('free-reset',true);await t.locator('#ws-confirm').tap();if(!await t.evaluate(()=>a.game.progress.mods[0]===0))throw Error('恢复原厂未提交');
 await t.locator('#ws-test').tap();await t.waitForFunction(()=>document.getElementById('weapon-trial-title').textContent!=='准备演练场');if(await t.locator('#weapon-trial-dialog').getAttribute('data-error'))throw Error('演练失败');await t.locator('#weapon-trial-close').tap();
 // 左侧真实滑动后切换末尾型号，右侧工作台不跟随滚动。
 const shelf=await t.locator('#ws-shelf').boundingBox();await touch('touchStart',shelf.x+30,shelf.y+shelf.height-20);await touch('touchMove',shelf.x+30,shelf.y+20);await touch('touchEnd');
 if(!await t.evaluate(()=>document.getElementById('ws-shelf').scrollTop>0&&document.getElementById('ws-function-panel').scrollTop===0))throw Error('列表未独立滑动');
 await t.locator('[data-ws-item="'+order.at(-1)+'"]').tap();await check('shelf-selection',true);await cdp.detach();
 // 同一正式场景在昼夜及手机横竖屏采样，宽屏只检查既有手机容器。
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,900]])for(const time of ['day','night']){
  await t.locator('#ws-close').tap();await t.setViewportSize({width,height});
  await t.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.game.selectVehicle(0);a.game.summonVehicle();a.game.spawnEnemy(0,125);a.renderer.resize();a.refresh();a.renderer.draw();a.game.progress.weapons[3]=0;a.workshop.open('weapons',3);},time);
  for(const tab of ['buy','upgrade','modify','unlock']){await t.locator('#ws-function-'+tab).tap();await check(tab+'-'+width+'-'+time,true);}
 }
 // 购买页清空后没有旧预览，恢复已有目录后能继续操作。
 await t.evaluate(()=>{a.game.progress.weapons.fill(1);a.workshop.open('weapons',0);});await t.locator('#ws-function-buy').tap();if(!await t.locator('#ws-empty-catalog').isVisible()||await t.locator('.ws-center').isVisible())throw Error('空目录残留');await t.locator('#ws-empty-action').tap();await check('empty-return');
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {designCriterion:'workshop-weapon-focus',samples:samples.length,transactions:'购买、升级、改装、免费恢复通过',touch:'列表独立滑动与长按升级通过',errors};
}
