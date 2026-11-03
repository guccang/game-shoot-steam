// 正式浏览器触控验收：隔离存档，沿轨驾驶、路口设置、刷新及昼夜手机页面。
async original=>{
 const base=original.url().startsWith('http://localhost:')?new URL(original.url()).origin:'http://localhost:4175';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-cart-directions/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 使用正式历法改变昼夜，保留正式地形、猫与矿车绘制。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(100);}
 // 采样实际绘制器和所有可见按钮，截图仍需人工检查文字与遮挡。
 async function shot(name){
  await page.screenshot({path:'output/playwright/mine-cart-directions/'+name+'.png'});
  const r=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectMineCartDirections(a.game,a.renderer,document);r.visibleButtons=[...document.querySelectorAll('#mine-controls button,#mine-direction-dialog button')].filter(b=>b.getClientRects().length).map(b=>({text:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}));return r;});
  if(r.overflow||r.visibleButtons.some(b=>b.width<43.9||b.height<43.9))throw Error('布局或触控失败 '+JSON.stringify(r));reviews.push({name,...r});
 }
 // 下车后把角色定位到测试路口附近；交互和存档仍由正式按钮完成。
 async function atJunction(){await page.evaluate(()=>{const g=a.game;g.cottage.ride=null;g.cottage.running=false;Object.assign(g.player,{x:site.x+38,y:site.y+38});a.refresh();});}
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.mc=await import('/src/config/mining.js');window.mi=await import('/src/core/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining.js')).openBasement(p.mining);p.mining.seed=1847;
   const ec=await import('/src/config/mine-ecology.js');let origin=null;
   for(let y=6;y<50&&!origin;y++)for(let x=6;x<50&&!origin;x++)if([-1,0,1].every(dy=>[-1,0,1].every(dx=>!ec.mineTerrain({x:x+dx,y:y+dy},p.mining).water)))origin={x,y};
   if(!origin)throw Error('缺少干燥路口');window.site=mc.minePoint(origin);window.junctionKey=mc.mineKey(origin);
   for(let dx=-5;dx<=5;dx++)for(let dy=-5;dy<=5;dy++){const cell={x:origin.x+dx,y:origin.y+dy},key=mc.mineKey(cell);p.mining.dug[key]=true;if(ec.mineTerrain(cell,p.mining).water)p.mining.bridges[key]=true;if(dx===0||dy===0)p.mining.rails[key]=true;}
   p.mining.carts=[{id:1,x:site.x-128,y:site.y,heading:1,departure:null,wheel:0}];
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=999;g.cottage.hurtWait=999;g.progress.mining.animals={};Object.assign(g.player,site);a.refresh();
  });
  await page.locator('#mine-route').tap();if(await page.evaluate(()=>a.game.state)!=='paused')throw Error('方向页未暂停');
  await shot('junction-options');await page.locator('[data-route-direction="0"]').tap();await page.waitForFunction(()=>a.game.progress.mining.junctions[junctionKey]===0);
  // 在路口以西登车，不输入方向，检验下次经过确实自动向北。
  await page.evaluate(()=>{Object.assign(a.game.player,a.game.progress.mining.carts[0]);a.refresh();});await page.locator('#mine-board').tap();await page.locator('#mine-drive').tap();
  if(!await page.locator('#mine-route').isDisabled())throw Error('行驶中仍允许选向');
  await page.waitForFunction(()=>a.game.player.y<site.y-15,null,{timeout:10000});await page.locator('#mine-drive').tap();
  const stopped=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,wheel:a.game.progress.mining.carts[0].wheel}));await page.waitForTimeout(250);
  if(JSON.stringify(stopped)!==JSON.stringify(await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,wheel:a.game.progress.mining.carts[0].wheel}))))throw Error('停车移动');
  await page.locator('#mine-route').tap();if(!await page.locator('[data-route-direction="1"]').isDisabled())throw Error('轨段中间可横向离轨');
  await shot('stopped-options');await page.locator('[data-route-direction="2"]').tap();await page.waitForFunction(()=>a.game.progress.mining.carts[0].heading===2);
  if(await page.evaluate(()=>a.game.player.y)!==stopped.y)throw Error('选择方向瞬移');
  await page.locator('#mine-drive').tap();await page.waitForFunction(y=>a.game.player.y>y+4,stopped.y);await page.locator('#mine-drive').tap();
  // 保存和刷新保留原位轨段、方向与路口，不恢复成格心。
  const saved=await page.evaluate(()=>({key:junctionKey,cart:a.game.progress.mining.carts[0],junctions:a.game.progress.mining.junctions}));
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.mc=await import('/src/config/mining.js');window.mi=await import('/src/core/mining.js');});
  await page.evaluate(key=>{window.junctionKey=key;const [x,y]=key.split(',').map(Number);window.site=mc.minePoint({x,y});},saved.key);
  const restored=await page.evaluate(()=>({cart:a.game.progress.mining.carts[0],junctions:a.game.progress.mining.junctions}));
  if(saved.cart.x!==restored.cart.x||saved.cart.y!==restored.cart.y||saved.cart.target!==restored.cart.target||restored.cart.heading!==saved.cart.heading||restored.junctions[saved.key]!==0)throw Error('刷新丢失方向或位置 '+JSON.stringify({saved,restored}));
  await page.evaluate(()=>{const g=a.game;g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=999;g.cottage.hurtWait=999;});await atJunction();
  // 保存失败显示重试反馈，原方向保留；随后通过同一按钮重试。
  await page.evaluate(()=>{window.persist=a.game.livingPersist;a.game.livingPersist=()=>false;});
  await page.locator('#mine-route').tap();await page.locator('[data-route-direction="3"]').tap();await page.waitForFunction(()=>a.game.cottage.notice.includes('保存失败'));
  if(await page.evaluate(()=>a.game.progress.mining.junctions[junctionKey])!==0)throw Error('失败保存污染路口');
  await page.evaluate(()=>a.game.livingPersist=persist);await page.locator('#mine-route').tap();await page.locator('[data-route-direction="3"]').tap();await page.waitForFunction(()=>a.game.progress.mining.junctions[junctionKey]===3);
  // 实际从路口前后侧步行，复核箭头不增加通行阻挡。
  for(const key of ['ArrowUp','ArrowLeft','ArrowRight','ArrowDown']){await page.keyboard.down(key);await page.waitForTimeout(150);await page.keyboard.up(key);}
  await atJunction();
  for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1280,height:900}]){
   await page.setViewportSize(size);
   for(const time of ['day','night']){
    await page.evaluate(()=>{const g=a.game,c=g.progress.mining.carts[0];Object.assign(c,{x:site.x-64,y:site.y,target:null,from:null});g.progress.mining.animals={'1,-1':{key:'1,-1',kind:'spore',x:site.x+90,y:site.y-64,hp:10000,respawn:0,clock:0,phase:'roam',timer:0,death:0}};g.cottage.scanWait=999;});await atJunction();await phase(time);await shot('scene-'+size.width+'-'+time);
   }
   await page.locator('#mine-route').tap();await shot('panel-'+size.width);if(size.width===320||size.height===390){await page.locator('[data-route-direction="3"]').scrollIntoViewIfNeeded();await shot('panel-scroll-'+size.width);}await page.locator('[data-route-close]').first().tap();await page.waitForFunction(()=>a.game.state==='playing');
  }
  await page.setViewportSize({width:390,height:844});await atJunction();await page.locator('#mine-route').tap();await page.locator('[data-route-auto]').tap();await page.waitForFunction(()=>a.game.progress.mining.junctions[junctionKey]===undefined);
  if(errors.length)throw Error(errors.join(' / '));return {base,saved,restored,scenes:reviews.length,errors,reviews};
 }catch(error){await page.screenshot({path:'output/playwright/mine-cart-directions/failure.png'});throw error;}finally{await context.close();}
}
