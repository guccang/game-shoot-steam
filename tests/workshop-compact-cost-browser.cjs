// 紧凑费用区专项：正式报价、触控、费用聚合与手机布局。
async page=>{
 if(new URL(page.url()).port!=='4309')throw Error('仅允许隔离端口4309');
 for(const c of page.context().browser().contexts())if(c!==page.context())await c.close();
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4309');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});
 // 检查右侧无滚动、按钮可触达；左侧列表允许独立滑动。
 async function check(label,shot=false){
  await t.waitForTimeout(60);
  const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));
  const size=t.viewportSize();
  const bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);
  if(s.overflow.length||bad.length||s.territory){await t.screenshot({path:'output/playwright/workshop-compact-cost/failure.png'});throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));}
  samples.push({label,page:s.page,stage:s.stage,canvasBytes:s.canvasBytes});if(shot)await t.screenshot({path:'output/playwright/workshop-compact-cost/'+label+'.png'});
 }
 await t.emulateMedia({reducedMotion:'reduce'});
 const measurements=[];
 // 普通武器、三项属性和召唤器代表不同密度，均从正式武器配置和报价生成。
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,900]]){
  await t.setViewportSize({width,height});
  for(const [index,part,label] of [[0,'rate','two'],[9,'rate','three-stats'],[16,'coordination','materials']]){
   await t.evaluate(index=>a.workshop.open('weapons',index),index);await t.locator('[data-ws-upgrade="'+part+'"]').tap();await check(label+'-'+width,true);
   const geometry=await t.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect();const cells=[...document.querySelectorAll('#ws-resources > *')].map(n=>n.getBoundingClientRect());return {height:rect('#workshop-dialog .ws-footer').height,gap:cells[1].left-cells[0].right,resources:cells.length};});
   if(geometry.gap>9)throw Error('材料仍被均分拉开'+JSON.stringify(geometry));if(label==='two'&&geometry.height>118)throw Error('两材料底栏未压紧'+JSON.stringify(geometry));measurements.push({width,label,...geometry});
  }
 }
 await t.setViewportSize({width:320,height:568});await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('[data-ws-upgrade="rate"]').tap();
 await t.locator('#ws-resources [data-resource-info="coins"]').tap();if(!await t.locator('#close-resource-help').isVisible())throw Error('金币说明未打开');await t.locator('#close-resource-help').tap();
 await t.locator('#ws-resources [data-resource-info="wood"]').tap();await t.locator('#close-resource-help').tap();
 const original=await t.evaluate(()=>JSON.stringify(a.game.progress)),cdp=await context.newCDPSession(t),b=await t.locator('#ws-hold').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await t.waitForFunction(()=>parseFloat(document.getElementById('ws-hold').style.getPropertyValue('--work-progress'))>10);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await check('paused',true);
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==original)throw Error('松手提前扣费');
 // 缺料保留完整数量与说明，不挤压确认按钮。
 await t.evaluate(()=>{a.game.progress.coins=a.game.progress.wood=0;for(const k of Object.keys(a.game.progress.materials))a.game.progress.materials[k]=0;a.workshop.open('weapons',16);});await t.locator('[data-ws-upgrade="coordination"]').tap();await check('shortage',true);if(!await t.locator('#ws-hold').isDisabled())throw Error('缺料确认可用');
 // 昼夜使用正式场景背景，手机底板继续保持可读。
 for(const time of ['day','night']){
  await t.setViewportSize({width:390,height:844});await t.evaluate(async time=>{a.game.progress.coins=a.game.progress.wood=100000;for(const k of Object.keys(a.game.progress.materials))a.game.progress.materials[k]=999;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.workshop.open('weapons',0);},time);await t.locator('[data-ws-upgrade="rate"]').tap();await check(time,true);
 }
 if(errors.length)throw Error(errors.join('\n'));await cdp.detach();await context.close();return {samples:samples.length,measurements,interaction:'金币/木头来源、长按暂停、缺料通过',errors};
}
