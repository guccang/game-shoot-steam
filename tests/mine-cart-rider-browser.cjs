// 矿车座位实机采样：正式插值、车轮、猫连续帧、真实驾驶与暂停，使用隔离存档。
async original=>{
 const base=original.url().startsWith('http://localhost:')?new URL(original.url()).origin:'http://localhost:4175';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-cart-rider-stability/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 使用正式历法改变昼夜，保留正式地形、猫与矿车绘制。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(100);}
 // 采样实际绘制器和所有可见按钮，截图仍需人工检查文字与遮挡。
 async function shot(name){
  await page.screenshot({path:'output/playwright/mine-cart-rider-stability/'+name+'.png'});
  const r=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectMineCartRider(a.game,a.renderer,document);r.visibleButtons=[...document.querySelectorAll('#mine-controls button,#mine-direction-dialog button')].filter(b=>b.getClientRects().length).map(b=>({text:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}));return r;});
  if(r.overflow||r.visibleButtons.some(b=>b.width<43.9||b.height<43.9))throw Error('布局或触控失败 '+JSON.stringify(r));reviews.push({name,...r});
 }
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.mc=await import('/src/config/mining.js');window.mi=await import('/src/core/mining/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;
   const ec=await import('/src/config/mine-ecology.js');let origin=null;
   for(let y=6;y<50&&!origin;y++)for(let x=6;x<50&&!origin;x++)if([-1,0,1].every(dy=>[-1,0,1].every(dx=>!ec.mineTerrain({x:x+dx,y:y+dy},p.mining).water)))origin={x,y};
   if(!origin)throw Error('缺少干燥路口');window.site=mc.minePoint(origin);window.junctionKey=mc.mineKey(origin);
   for(let dx=-5;dx<=5;dx++)for(let dy=-5;dy<=5;dy++){const cell={x:origin.x+dx,y:origin.y+dy},key=mc.mineKey(cell);p.mining.dug[key]=true;if(ec.mineTerrain(cell,p.mining).water)p.mining.bridges[key]=true;if(dx===0||dy===0)p.mining.rails[key]=true;}
   p.mining.carts=[{id:1,x:site.x-128,y:site.y,heading:1,departure:null,wheel:0}];
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=999;g.cottage.hurtWait=999;g.progress.mining.animals={};Object.assign(g.player,site);a.refresh();
  });

  // 逐显示帧采样正式绘制锚点，同时读取原图集实际帧号，不能用静止图片通过稳定性检查。
  async function measure(name,count=140){const result=await page.evaluate(async({name,count})=>{const {catSprites}=await import('/src/rendering/cat-animation.js'),samples=[];for(let i=0;i<count;i++){await new Promise(requestAnimationFrame);const r=a.renderer.mineCartRiderReview,g=a.renderer.renderGame;if(r)samples.push({...r,frame:catSprites.tracks.get(g.player.bodyAnimation)?.[g.progress.hero]?.frame});}const range=k=>Math.max(...samples.map(s=>s[k]))-Math.min(...samples.map(s=>s[k]));return {name,count:samples.length,maxError:Math.max(...samples.map(s=>s.cameraError)),screenRange:[range('screenX'),range('screenY')],idleRange:range('idleTime'),frames:new Set(samples.map(s=>s.frame)).size,walkWeight:Math.max(...samples.map(s=>s.moveWeight)),worldDistance:samples.slice(1).reduce((sum,s,i)=>sum+Math.hypot(s.x-samples[i].x,s.y-samples[i].y),0),wheelRange:range('wheel')};},{name,count});if(result.count<count*.9||result.maxError>1e-7||result.screenRange.some(v=>v>1e-6))throw Error('座位仍抖动 '+JSON.stringify(result));return result;}
  await page.evaluate(()=>{const g=a.game;g.cottage.hurtWait=999;g.progress.mining.animals={};Object.assign(g.player,g.progress.mining.carts[0]);g.progress.mining.junctions[junctionKey]=0;a.refresh();});await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-board').tap();await page.locator('#mine-drive').tap();await page.waitForFunction(()=>a.game.cottage.running);
  const movement=[];for(const time of ['day','night']){await phase(time);movement.push(await measure('driving-'+time));await shot('driving-'+time);}
  if(movement.some(r=>r.frames<8||r.idleRange<1||r.walkWeight>.01||r.worldDistance<30||r.wheelRange<.5))throw Error('驾驶或真实待机未持续 '+JSON.stringify(movement));
  // 原子事务替换整份矿区对象，仍按层和ID接续插值；不改车的位置来伪造稳定。
  const saved=await page.evaluate(async()=>{const g=a.game,old=g.progress.mining.carts[0],r=(await import('/src/core/mining/mine-transactions.js')).miningCommit(g,()=>{},'矿车保存验证');return {ok:r.ok,replaced:g.progress.mining.carts[0]!==old};});if(!saved.ok||!saved.replaced)throw Error('事务准备失败');movement.push(await measure('after-save',60));
  await page.locator('#mine-drive').tap();await page.waitForFunction(()=>!a.game.cottage.running);const stopped=await page.evaluate(()=>[a.game.player.x,a.game.player.y,a.game.progress.mining.carts[0].wheel]);const rest=await measure('stopped',50);if(JSON.stringify(stopped)!==JSON.stringify(await page.evaluate(()=>[a.game.player.x,a.game.player.y,a.game.progress.mining.carts[0].wheel]))||rest.worldDistance>1e-8||rest.wheelRange>1e-8)throw Error('停车后仍移动');await shot('stopped');
  await page.locator('#mine-route').tap();const paused=await page.evaluate(()=>JSON.stringify(a.game.player.bodyAnimation));await page.waitForTimeout(300);if(await page.evaluate(()=>JSON.stringify(a.game.player.bodyAnimation))!==paused)throw Error('暂停仍推进身体帧');await page.locator('[data-route-close]').first().tap();await page.locator('#mine-drive').tap();await page.waitForFunction(()=>a.game.cottage.running);movement.push(await measure('restart',60));
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);for(const time of ['day','night']){await phase(time);movement.push(await measure('size-'+size.width+'-'+time,35));await shot('phone-'+size.width+'-'+time);}}
  await page.emulateMedia({reducedMotion:'reduce'});const reduced=await measure('reduced-motion',50);if(reduced.frames!==1)throw Error('减少动态未生效');await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#mine-drive').tap();await page.locator('#mine-board').tap();
  await page.evaluate(()=>{Object.assign(a.game.player,{x:site.x+20,y:site.y});a.game.cottage.scanWait=999;});await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);const walk=await page.evaluate(()=>a.game.player.bodyAnimation.moveWeight);await page.keyboard.up('ArrowRight');if(walk<.5)throw Error('下车后步行动画未恢复');
  if(errors.length)throw Error(errors.join(' / '));return {movement,rest,reduced,saved,walk,reviews,errors};
 }catch(error){await page.screenshot({path:'output/playwright/mine-cart-rider-stability/failure.png'});throw error;}finally{await context.close();}
}
