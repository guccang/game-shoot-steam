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
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();window.mc=await import('/src/config/mining.js');window.mi=await import('/src/core/mining/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.wood=200;p.mining.ore=100;
   for(let i=-4;i<=4;i++)for(const cell of [{x:i,y:0},{x:0,y:i}]){const key=mc.mineKey(cell);p.mining.dug[key]=true;p.mining.bridges[key]=true;p.mining.rails[key]=true;}
   p.mining.carts=[{id:1,...mc.MINING.home,heading:1,departure:null,previous:null,wheel:0}];p.mining.nextCart=2;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=99999;window.saves=0;g.livingPersist=()=>{saves++;return true;};a.refresh();
  });
  await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-board').tap();await page.waitForTimeout(150);
  const origin=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
  // 方向页仍可只预选方向；场景方向直接起步由mine-work-controls-browser覆盖。
  await page.locator('#mine-route').tap();await page.keyboard.press('ArrowUp');await heading(0);
  const saves=await page.evaluate(()=>saves);await page.locator('#mine-route').tap();await page.keyboard.press('a');await heading(3);
  if(await page.evaluate(()=>saves)!==saves+1)throw Error('长按重复保存');
  await page.locator('#mine-route').tap();const initialStick=await page.locator('#mine-direction-stick').boundingBox();await drag(initialStick.x+initialStick.width/2,initialStick.y+initialStick.height/2,32,0);await heading(1);
  if(await page.evaluate(o=>a.game.player.x!==o.x||a.game.player.y!==o.y,origin))throw Error('方向页预选意外开车');
  for(const time of ['day','night']){
   await phase(time);await shot('world-'+time);await page.locator('#mine-route').tap();await shot('direction-'+time);
   if(await page.evaluate(()=>a.game.state)!=='paused')throw Error('页面未暂停');
   const box=await page.locator('#mine-direction-stick').boundingBox();await drag(box.x+box.width/2,box.y+box.height/2,0,-32);await heading(0);
   await page.locator('#mine-route').tap();await page.keyboard.down('s');await page.waitForTimeout(300);await page.keyboard.down('s');await page.keyboard.up('s');await heading(2);
  }
  // 起步后真实前进，中途停车只能沿当前轨段前进或后退。
  await page.locator('#mine-drive').tap();await page.waitForTimeout(90);await page.locator('#mine-drive').tap();
  const moved=await page.evaluate(()=>a.game.player.y);if(moved<=origin.y)throw Error('未沿所选方向移动');
  await page.locator('#mine-route').tap();await page.keyboard.press('ArrowRight');
  if(!await page.locator('#mine-direction-dialog').isVisible())throw Error('无轨方向错误关闭');
  await shot('invalid-direction');await page.keyboard.press('ArrowUp');await heading(0);
  await page.locator('#mine-board').tap();await page.locator('#mine-remove').tap();await shot('occupied-rail');
  if(!await page.locator('[data-remove-choice="0"]').isDisabled())throw Error('占用铁轨可拆除');
  await page.locator('[data-remove-choice="2"]').tap();await page.locator('[data-remove-close]').last().tap();
  if(await page.evaluate(()=>a.game.progress.mining.carts.length)!==1)throw Error('取消仍回收');
  await page.locator('#mine-remove').tap();await page.locator('[data-remove-choice="2"]').tap();await page.locator('[data-remove-confirm]').tap();await page.waitForTimeout(150);
  if(await page.evaluate(()=>a.game.progress.mining.carts.length)!==0)throw Error('矿车未回收');
  await page.locator('#mine-remove').tap();await page.locator('[data-remove-choice="0"]').tap();await shot('confirm-rail');
  const before=await page.evaluate(()=>({rails:Object.keys(a.game.progress.mining.rails).length,ore:a.game.progress.mining.ore,wood:a.game.progress.wood}));
  await page.locator('[data-remove-confirm]').tap();await page.waitForTimeout(150);
  const after=await page.evaluate(()=>({rails:Object.keys(a.game.progress.mining.rails).length,ore:a.game.progress.mining.ore,wood:a.game.progress.wood}));
  if(after.rails!==before.rails-1||after.ore!==before.ore+1||after.wood!==before.wood+2)throw Error('拆轨返还异常');
  await page.locator('#mine-map-open').tap();await page.waitForTimeout(150);
  if(await page.evaluate(()=>a.renderer.mineMapReview.rails)!==after.rails)throw Error('地图残留铁轨');await page.locator('[data-map-close]').tap();
  // 复建轨车验证回收后的继续施工，接着验收短屏与既有桌面竖版容器。
  await page.evaluate(()=>{const g=a.game;Object.assign(g.player,mc.MINING.home);g.cottage.direction=1;if(!g.progress.mining.rails['0,0'])mi.buildMine(g,'rail');if(!mi.buildMine(g,'cart').ok)throw Error('复建失败');mi.rideMineCart(g);a.refresh();});
  for(const size of [{width:320,height:568},{width:360,height:640},{width:430,height:932},{width:844,height:390},{width:1280,height:900}]){
   await page.setViewportSize(size);await page.locator('#mine-route').tap();await shot('layout-direction-'+size.width);await page.locator('[data-route-close]').first().tap();
   await page.locator('#mine-board').tap();await page.locator('#mine-remove').tap();await shot('layout-removal-'+size.width);await page.locator('[data-remove-close]').first().tap();await page.locator('#mine-board').tap();
  }
  if(errors.length)throw Error(errors.join('/'));return {scenes:reviews.length,errors,reviews};
 }catch(e){await page.screenshot({path:'output/playwright/mine-cart-controls/failure.png'});throw e;}finally{await context.close();}
}
