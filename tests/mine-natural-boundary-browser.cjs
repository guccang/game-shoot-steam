// 在隔离手机浏览器检查真实四边四角、贴边行走、外围开采与连续镜头，不改玩家存档。
async original=>{
 const base=original.url().startsWith('http://localhost:')?new URL(original.url()).origin:'http://localhost:4175';
 const onlyDeep=new URL(original.url()).hash==='#deep-edge';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-natural-boundary/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 昼夜切换使用游戏历法与色调，保持同一地形和实体。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(120);}
 // 布置已开掘的边沿通道，边界值沿用真实一层或真实生成的深层，不改地形判定。
 async function position(side,depth=1){await page.evaluate(({side,depth})=>{
  const g=a.game;g.state='playing';g.cottage.depth=depth;g.cottage.ride=null;g.cottage.running=false;g.cottage.tool=null;g.cottage.autoDig=false;g.cottage.dig=null;g.cottage.scanWait=999;g.cottage.hurtWait=999;
  const l=depth===1?g.progress.mining:g.progress.mining.layers[depth],b=l.bounds,p={x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};
  if(side.includes('west'))p.x=b.left+20;if(side.includes('east'))p.x=b.right-20;if(side.includes('north'))p.y=b.top+20;if(side.includes('south'))p.y=b.bottom-20;
  const cell=mc.mineCell(p);for(let y=cell.y-5;y<=cell.y+5;y++)for(let x=cell.x-5;x<=cell.x+5;x++){const c={x,y},key=mc.mineKey(c);if(ec.mineCellArea(c,l)>0){l.dug[key]=true;if(ec.mineTerrain(c,l).water)l.bridges[key]=true;}}
  Object.assign(g.player,p,{hp:999,vx:0,vy:0});g.cottage.notice='外围坚硬岩层 · 可沿岩壁探索';
  const q={x:Math.min(b.right-100,Math.max(b.left+100,p.x+90)),y:Math.min(b.bottom-100,Math.max(b.top+100,p.y+45))},cc=mc.mineCell(q),cp=mc.minePoint(cc);l.carts=[{id:1,...cp,heading:1,wheel:0}];l.rails={};
  for(let dx=-1;dx<=1;dx++){const c={x:cc.x+dx,y:cc.y},key=mc.mineKey(c),point=mc.minePoint(c);if(ec.mineInsideBounds(l,point.x,point.y)){l.rails[key]=true;l.dug[key]=true;if(ec.mineTerrain(c,l).water)l.bridges[key]=true;}}
  const animal={x:Math.min(b.right-90,Math.max(b.left+90,p.x-90)),y:Math.min(b.bottom-90,Math.max(b.top+90,p.y-70))};l.animals={'boundary-actor':{key:'boundary-actor',kind:'beetle',...animal,hp:10000,respawn:0,clock:0,phase:'roam',timer:0,death:0}};
  window.bound=b;a.refresh();
 },{side,depth});await page.waitForTimeout(180);}
 // 保存正式画面，记录可见巨石与原地形缓存预算；像素审美另外人工复核。
 async function shot(name){await page.screenshot({path:'output/playwright/mine-natural-boundary/'+name+'.png'});const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMineNaturalBoundary(a.game,a.renderer,document));if(r.overflow||!r.boundary?.rocks||r.boundary.opaqueMasks!==0||r.buttons.some(b=>b.width<43.9||b.height<43.9))throw Error('边界或手机布局失败 '+JSON.stringify(r));reviews.push({name,...r});}
 // 真实触屏拖动进入固定游戏循环，不能用改坐标冒充贴边走位。
 async function move(dx,dy,ms){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:430}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180+dx,y:430+dy}]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();window.mc=await import('/src/config/mining.js');window.ec=await import('/src/config/mine-ecology.js');window.mi=await import('/src/core/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.wood=200;p.mining.ore=100;
   p.mining.layers[2]=(await import('/src/progression/mine-layers.js')).freshMineLayer(2,{x:8,y:4},()=>.31);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=999;a.refresh();
  });
  if(!onlyDeep){
  for(const side of ['north','east','south','west','north-west','north-east','south-west','south-east'])for(const time of ['day','night']){await position(side);await phase(time);await shot(side+'-'+time);}
  await position('west');const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
  await move(-70,0,700);if(!await page.evaluate(()=>a.game.player.x>=bound.left+10-.01))throw Error('触屏穿过西侧岩壁');
  const startY=await page.evaluate(()=>a.game.player.y);await move(0,70,500);if(await page.evaluate(()=>a.game.player.y)<=startY+10)throw Error('无法沿岩壁行走');await shot('wall-walking');
  await page.locator('[data-mine-tool="pick"]').tap();const ore=await page.evaluate(()=>a.game.progress.mining.ore);await move(-70,0,900);
  if(await page.evaluate(()=>a.game.progress.mining.ore)!==ore||!await page.evaluate(()=>a.game.cottage.notice.includes('坚硬岩层')))throw Error('外围仍可挖掘或没有提示');await shot('unbreakable');
  await page.locator('[data-mine-tool="pick"]').tap();await page.locator('#mine-build').tap();const frozen=await page.evaluate(()=>a.game.progress.mining.age);await page.waitForTimeout(250);if(await page.evaluate(()=>a.game.progress.mining.age)!==frozen)throw Error('暂停仍推进');await page.locator('[data-mine-close]').first().tap();await page.waitForFunction(()=>a.game.state==='playing');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){
   await page.setViewportSize(size);for(const time of ['day','night']){await position('north-west',2);await phase(time);await shot('deep-'+size.width+'-'+time);}
  }
  }
  // 深层右下边界是非整格的小数范围，刷新必须保持同一岩层位置。
  for(const time of ['day','night']){await page.setViewportSize({width:390,height:844});await position('south-east',2);await phase(time);await shot('deep-fractional-'+time);}
  const saved=await page.evaluate(async()=>{const g=a.game;const result=(await import('/src/core/mine-transactions.js')).miningCommit(g,()=>{},'边界验收保存');if(!result.ok)throw Error('隔离存档失败');return structuredClone(g.progress.mining.layers[2].bounds);});
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.mc=await import('/src/config/mining.js');window.ec=await import('/src/config/mine-ecology.js');window.mi=await import('/src/core/mining.js');const g=a.game;g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);
  });
  if(JSON.stringify(saved)!==JSON.stringify(await page.evaluate(()=>a.game.progress.mining.layers[2].bounds)))throw Error('刷新改变深层边界');
  await position('south-east',2);await phase('night');await shot('deep-fractional-restored');
  // 采样真实渲染耗时，保留有界可见几何，不把本机结果当作其他设备保证。
  await page.setViewportSize({width:390,height:844});await position('north-west',2);
  const performanceSample=await page.evaluate(async()=>{const {drawMining}=await import('/src/rendering/mining.js'),times=[];for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);const t=performance.now();drawMining(a.renderer);times.push(performance.now()-t);}times.sort((a,b)=>a-b);return {median:times[15],p95:times[28],review:a.renderer.mineBoundaryReview,landscape:a.renderer.mineLandscapeReview};});
  if(errors.length)throw Error(errors.join(' / '));return {base,scenes:reviews.length,errors,performanceSample,reviews};
 }catch(error){await page.screenshot({path:'output/playwright/mine-natural-boundary/failure.png'});throw error;}finally{await context.close();}
}
