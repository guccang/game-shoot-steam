// 默认连接4175端口；允许从已打开的隔离测试服务继承地址，不修改用户存档。
async original=>{
 const base=new URL(original.url()||'http://localhost:4175').origin,context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-cart-controls/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 与正式世界时钟一致地切换昼夜，环境只在隔离上下文修改。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(120);}
 // 正式DOM和绘制器采样用于验收，截图供人工复核。
 async function shot(name){
  await page.waitForTimeout(180);await page.screenshot({path:'output/playwright/mine-cart-controls/'+name+'.png'});
  const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMineCartControls(a.game,a.renderer,document));
  if(review.overflow||review.dialogs.some(d=>d.overflow||d.buttons.some(b=>b.width<43.9||b.height<43.9)))throw Error('布局不合格 '+JSON.stringify(review));reviews.push({name,...review});
 }
 // 模拟实际触屏拖动与松手，兼顾页面摇杆及世界摇杆。
 async function drag(x,y,dx,dy){
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:x+dx,y:y+dy}]});
  await page.waitForTimeout(140);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(150);
 }
 // 对真实矿车状态断言方向、起停及持久化次数。
 async function heading(direction){
  await page.waitForTimeout(150);
  const state=await page.evaluate(()=>({heading:a.game.progress.mining.carts[0].heading,running:a.game.cottage.running}));
  if(state.heading!==direction||state.running)throw Error('方向或停车状态错误 '+JSON.stringify(state));
 }
 try{
  await page.goto(base);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();window.mc=await import('/src/config/mining.js');window.mi=await import('/src/core/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining.js')).openBasement(p.mining);p.wood=200;p.mining.ore=100;
   for(let i=-4;i<=4;i++)for(const cell of [{x:i,y:0},{x:0,y:i}]){const key=mc.mineKey(cell);p.mining.dug[key]=true;p.mining.bridges[key]=true;p.mining.rails[key]=true;}
   p.mining.carts=[{id:1,...mc.MINING.home,heading:1,departure:null,previous:null,wheel:0}];p.mining.nextCart=2;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=99999;window.saves=0;g.livingPersist=()=>{saves++;return true;};a.refresh();
  });

  await page.locator('#mine-tools-toggle').tap();
  // 路口页沿用同一摇杆键盘；自动模式仍可恢复。
  await page.locator('#mine-route').tap();await page.keyboard.press('ArrowUp');await page.waitForTimeout(150);
  if(await page.evaluate(()=>a.game.progress.mining.junctions['0,0'])!==0)throw Error('路口键盘保存失败');
  await page.locator('#mine-route').tap();await shot('junction-direction');await page.locator('[data-route-auto]').tap();await page.waitForTimeout(150);
  if(await page.evaluate(()=>a.game.progress.mining.junctions['0,0'])!==undefined)throw Error('自动选路未恢复');
  // 触摸取消不提交，松开中心也不提交。
  await page.locator('#mine-board').tap();await page.locator('#mine-route').tap();
  const box=await page.locator('#mine-direction-stick').boundingBox(),cdp=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
  const saves=await page.evaluate(()=>saves);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x,y:y-30}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();await page.waitForTimeout(100);
  if(!await page.locator('#mine-direction-dialog').isVisible()||await page.evaluate(()=>saves)!==saves)throw Error('取消触摸仍提交');
  await page.locator('#mine-direction-stick').tap();if(!await page.locator('#mine-direction-dialog').isVisible())throw Error('死区误提交');
  await page.locator('[data-route-direction="3"]').tap();await heading(3);
  await page.locator('#mine-board').tap();await phase('day');await page.locator('#mine-remove').tap();await shot('removal-day');await page.locator('[data-remove-close]').first().tap();
  // 横屏短高度可以滚动选中第三项，并在固定底栏确认；失败保留设施和材料。
  await page.setViewportSize({width:844,height:390});await page.locator('#mine-remove').tap();await page.locator('[data-remove-choice="2"]').tap();await shot('removal-short-selected');
  const before=await page.evaluate(()=>({ore:a.game.progress.mining.ore,wood:a.game.progress.wood,carts:a.game.progress.mining.carts.length}));
  await page.evaluate(()=>{a.game.livingPersist=()=>false;});await page.locator('[data-remove-confirm]').tap();await page.waitForTimeout(150);
  const after=await page.evaluate(()=>({ore:a.game.progress.mining.ore,wood:a.game.progress.wood,carts:a.game.progress.mining.carts.length}));
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('UI保存失败仍回收');
  // 确认页切层后立即关闭，不能拿上一层的目标回收下一层。
  await page.evaluate(async()=>{const g=a.game;g.livingPersist=()=>true;g.progress.mining.layers[2]=(await import('/src/progression/mine-layers.js')).freshMineLayer(2,{x:0,y:0},()=>.3);});
  await page.locator('#mine-remove').tap();await page.locator('[data-remove-choice="2"]').tap();
  await page.evaluate(()=>{a.game.cottage.depth=2;a.refresh();});await page.waitForTimeout(150);
  if(await page.locator('#mine-removal-dialog').isVisible()||await page.evaluate(()=>a.game.progress.mining.carts.length)!==1)throw Error('过期确认未清理');
  if(errors.length)throw Error(errors.join('/'));return {scenes:reviews.length,errors,reviews};
 }catch(e){await page.screenshot({path:'output/playwright/mine-cart-controls/edge-failure.png'});throw e;}finally{await context.close();}
}
