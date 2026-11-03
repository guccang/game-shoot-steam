// 默认连接4175端口；允许从已打开的隔离测试服务继承地址，不修改用户存档。
async original=>{
 const base=new URL(original.url()||'http://localhost:4175').origin,context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-cart-live-steering/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 与正式世界时钟一致地切换昼夜，环境只在隔离上下文修改。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(120);}
 // 正式DOM和绘制器采样用于验收，截图供人工复核。
 async function shot(name){
  await page.waitForTimeout(180);await page.screenshot({path:'output/playwright/mine-cart-live-steering/'+name+'.png'});
  const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMineCartControls(a.game,a.renderer,document));
  if(review.overflow||review.dialogs.some(d=>d.overflow||d.buttons.some(b=>b.width<43.9||b.height<43.9)))throw Error('布局不合格 '+JSON.stringify(review));reviews.push({name,...review});
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

  await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-board').tap();
  // 每次在路口西侧重新起步；保存的路口方向为南，实时北向应覆盖它。
  async function reset(){
   await page.evaluate(()=>{
    const g=a.game,c=g.progress.mining.carts[0];g.cottage.running=false;
    Object.assign(c,mc.minePoint({x:-3,y:0}),{from:null,target:null,previous:null,heading:1,departure:null});Object.assign(g.player,{x:c.x,y:c.y});
    g.progress.mining.junctions['0,0']=2;a.refresh();
   });await page.waitForTimeout(120);
  }
  for(const scenario of [{time:'day',width:320,key:'w',name:'wasd'},{time:'night',width:390,key:'ArrowUp',name:'arrows'},{time:'night',width:390,key:null,name:'joystick'}]){
   await page.setViewportSize({width:scenario.width,height:scenario.width===320?568:844});await reset();await phase(scenario.time);
   await page.locator('#mine-drive').tap();
   let cdp=null;
   if(scenario.key)await page.keyboard.down(scenario.key);
   else{
    cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:195,y:320}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:195,y:255}]});
   }
   await page.waitForFunction(()=>a.game.progress.mining.carts[0].y<mc.MINING.home.y-12,{},{timeout:10000});
   // 自动南向未被改写，实际矿车已从连接点进入北向轨道。
   const result=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,heading:a.game.progress.mining.carts[0].heading,running:a.game.cottage.running,rule:a.game.progress.mining.junctions['0,0'],home:mc.MINING.home}));
   if(!await page.locator('#mine-message').textContent().then(t=>t.includes('行驶中')))throw Error('驾驶提示未更新');
   if(result.x!==result.home.x||result.heading!==0||!result.running||result.rule!==2)throw Error('实时选路异常 '+JSON.stringify(result));
   await shot(scenario.name+'-'+scenario.time);
   if(scenario.key)await page.keyboard.up(scenario.key);else{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
   await page.locator('#mine-drive').tap();
  }
  // 提前松开北向输入，抵达时恢复预设南向，证明不是残留方向队列。
  await reset();await page.locator('#mine-drive').tap();await page.keyboard.down('ArrowUp');await page.waitForTimeout(120);await page.keyboard.up('ArrowUp');
  await page.waitForFunction(()=>a.game.progress.mining.carts[0].y>mc.MINING.home.y+12,{},{timeout:10000});await shot('released-uses-junction');await page.locator('#mine-drive').tap();
  if(errors.length)throw Error(errors.join('/'));return {scenes:reviews.length,errors,reviews};
 }catch(e){await page.screenshot({path:'output/playwright/mine-cart-live-steering/failure.png'});throw e;}finally{await context.close();}
}
