// 隔离手机存档，正式点击地下施工、开掘、铺轨、矿车与洞口，并留存连续运行视频。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mining/video',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],reviews=[];page.on('pageerror',e=>errors.push(e.message));
 // 所有施工均点击正式按钮，关闭统一暂停页后等待事务完成。
 async function build(kind,ahead=false){await page.locator('#mine-build').tap();await page.locator(`[data-mine-build="${kind}"]${ahead?'[data-ahead]':':not([data-ahead])'}`).tap();await page.waitForFunction(()=>a.game.state==='playing');await page.waitForTimeout(120);}
 // 设置时段只改变测试环境，实际绘制仍消费正式历法。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(150);}
 // 地下已挖通格内定位用于逐项设施比较，开掘过程另用真实触摸持续移动。
 async function stand(x,y){await page.evaluate(async({x,y})=>Object.assign(a.game.player,(await import('/src/config/mining.js')).minePoint({x,y})),{x,y});}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.coins=100000;p.wood=10000;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.enemies=[];g.spawnTimer=999999;
   Object.assign(g.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.construction.door);a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForFunction(()=>a.game.cottage?.kind==='construction');await page.locator('[data-room-item="shopkeeper"]').tap();await page.locator('[data-npc-service]').tap();await page.locator('[data-build="basement"]').tap();
  if(!await page.locator('[data-build="basement"]').isDisabled())throw Error('地下室重复购买未禁用');await page.screenshot({path:'output/playwright/mining/company-service.png'});await page.locator('[data-build-close]').tap();
  await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.construction.exit));await page.waitForFunction(()=>!a.game.cottage);
  await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/cottage.js')).COTTAGE.door));await page.waitForFunction(()=>a.game.cottage?.kind==='cottage');await page.locator('[data-cottage-target="basement"]').tap();await page.waitForFunction(()=>a.game.cottage?.kind==='mine',null,{timeout:20000});
  await page.evaluate(()=>{a.game.progress.mining.seed=1847;});
  await page.locator('[data-mine-tool="pick"]').tap();
  const cdp=await context.newCDPSession(page),before=await page.evaluate(()=>a.game.player.x);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:125,y:490}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:205,y:490}]});await page.waitForTimeout(7500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const mined=await page.evaluate(()=>({x:a.game.player.x,ore:a.game.progress.mining.ore,dug:Object.keys(a.game.progress.mining.dug).length}));
  if(mined.x<before+250||mined.ore<3||mined.dug<12)throw Error('触屏持续开矿未推进：'+JSON.stringify(mined));
  await page.locator('[data-mine-tool="pick"]').tap();
  // 停止挖矿后打开施工页，暂停期间矿石与角色时钟都不前进。
  await page.locator('#mine-build').tap();const frozen=await page.evaluate(()=>({time:a.game.time,ore:a.game.progress.mining.ore}));await page.waitForTimeout(500);const frozenAfter=await page.evaluate(()=>({time:a.game.time,ore:a.game.progress.mining.ore}));if(JSON.stringify(frozen)!==JSON.stringify(frozenAfter))throw Error('建设页暂停未冻结');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);await page.screenshot({path:`output/playwright/mining/build-${size.width}.png`});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('地下建设页横向溢出');}
  await page.locator('[data-mine-close]').first().tap();await page.setViewportSize({width:390,height:844});
  // 建造专项补足材料，只用于缩短反复采集时间，不替代前面的真实产矿验证。
  await page.evaluate(()=>{a.game.progress.mining.ore=100;});
  for(const x of [0,1,2,3]){await stand(x,0);await build('rail');}
  await stand(1,0);await build('lamp');await stand(2,0);await build('sign');await stand(0,0);await build('cart');
  await page.locator('#mine-board').tap();await page.locator('#mine-drive').tap();await page.waitForTimeout(800);await page.locator('#mine-drive').tap();
  const stopped=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,wheel:a.game.progress.mining.carts[0].wheel}));await page.waitForTimeout(500);if(JSON.stringify(stopped)!==JSON.stringify(await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,wheel:a.game.progress.mining.carts[0].wheel}))))throw Error('停车后车体或轮毂仍在移动');
  await page.locator('#mine-drive').tap();await page.waitForTimeout(3200);if(!await page.evaluate(()=>a.game.cottage.running))throw Error('矿车没有持续折返');await page.locator('#mine-drive').tap();
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){
   await page.setViewportSize(size);
   for(const time of ['day','night']){await phase(time);await page.screenshot({path:`output/playwright/mining/mine-${size.width}-${time}.png`});const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMining(a.game,a.renderer,document));if(review.overflow||review.buttons.some(b=>b.width<44||b.height<44))throw Error('地下手机触控或溢出不合格：'+JSON.stringify(review));reviews.push(review);}
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#mine-board').tap();
  // 挖掘地形从原矿道继续向北拓展，寻找真实地表无障碍落点。
  await stand(3,0);await page.locator('[data-mine-tool="pick"]').tap();await page.keyboard.down('ArrowUp');await page.waitForTimeout(6500);await page.keyboard.up('ArrowUp');await page.locator('[data-mine-tool="pick"]').tap();
  const shaftCell=await page.evaluate(async()=>{const {mineCell,minePoint,mineKey}=await import('/src/config/mining.js'),{canOpenShaft}=await import('/src/core/mining.js'),g=a.game,saved={x:g.player.x,y:g.player.y};for(const key of Object.keys(g.progress.mining.dug)){const [x,y]=key.split(',').map(Number);Object.assign(g.player,minePoint({x,y}));if(canOpenShaft(g))return {x,y};}Object.assign(g.player,saved);return null;});if(!shaftCell)throw Error('实挖区域没有合法洞口位置');
  await page.locator('#mine-build').tap();await page.locator('[data-mine-shaft]').tap();await page.waitForFunction(()=>a.game.progress.mining.shafts.length===1,null,{timeout:10000});await page.locator('#mine-exit').tap();await page.waitForFunction(()=>!a.game.cottage);
  // 从侧面留出完整洞口，再在同一正式场景检查昼夜光照。
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');
  for(const time of ['day','night']){await phase(time);await page.screenshot({path:`output/playwright/mining/surface-${time}.png`});}
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(500);await page.keyboard.up('ArrowDown');await stand(shaftCell.x,shaftCell.y);await page.waitForFunction(()=>a.game.cottage?.kind==='mine',null,{timeout:10000});
  await stand(0,0);await page.locator('#mine-exit').tap();await page.waitForFunction(()=>a.game.cottage?.kind==='cottage');await page.screenshot({path:'output/playwright/mining/return-home.png'});
  const saved=await page.evaluate(async()=>{const g=a.game,p=(await import('/src/progression/progress.js')).validateProgress(g.progress);if(!g.livingPersist(g.progress))throw Error('最终存档失败');return {basement:p.homeDecor.basement,dug:Object.keys(p.mining.dug).length,rails:Object.keys(p.mining.rails).length,carts:p.mining.carts.length,shafts:p.mining.shafts.length,cat:(await import('/src/rendering/cat-animation.js')).catSprites.stats()};});
  if(saved.cat.status!=='ready')throw Error('角色原图集没有成功加载');
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  const restored=await page.evaluate(()=>({basement:a.game.progress.homeDecor.basement,rails:Object.keys(a.game.progress.mining.rails).length,carts:a.game.progress.mining.carts.length,shafts:a.game.progress.mining.shafts.length}));if(!restored.basement||restored.rails!==4||restored.carts!==1||restored.shafts!==1)throw Error('刷新丢失矿区存档：'+JSON.stringify(restored));
  if(errors.length)throw Error(errors.join('\n'));return {mined,saved,restored,reviews,errors};
 }catch(error){await page.screenshot({path:'output/playwright/mining/failure.png'});throw error;}
 finally{await context.close();}
}
