// 接轨正式手机验收：16种连接、现场铺轨换形、弯道驾驶急停与昼夜分层。
async original=>{
 const base=original.url().startsWith('http://localhost:')?new URL(original.url()).origin:'http://localhost:4175';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-rail-junctions/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 使用正式历法改变昼夜，保留正式地形、猫与矿车绘制。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(100);}
 // 采样实际绘制器和所有可见按钮，截图仍需人工检查文字与遮挡。
 async function shot(name){
  await page.screenshot({path:'output/playwright/mine-rail-junctions/'+name+'.png'});
  const r=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectMineRailJunctions(a.game,a.renderer,document);r.visibleButtons=[...document.querySelectorAll('#mine-controls button,#mine-direction-dialog button')].filter(b=>b.getClientRects().length).map(b=>({text:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}));return r;});
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

  // 测试准备仅布置短轨段，猫、车辆、景观和运行循环仍全部使用正式游戏。
  async function layout(mask){await page.evaluate(mask=>{const g=a.game,l=g.progress.mining,[x,y]=junctionKey.split(',').map(Number);l.rails={[junctionKey]:true};l.junctions={};for(let i=0;i<4;i++)if(mask&(1<<i)){const d=mc.MINE_DIRECTIONS[i];for(let n=1;n<=3;n++)l.rails[mc.mineKey({x:x+d.x*n,y:y+d.y*n})]=true;}const arm=mc.MINE_DIRECTIONS.findIndex((_,i)=>mask&(1<<i)),d=mc.MINE_DIRECTIONS[Math.max(0,arm)];l.carts=[{id:1,x:site.x+d.x*128,y:site.y+d.y*128,heading:(arm+2)%4,departure:null,wheel:0}];g.cottage.ride=null;g.cottage.running=false;g.cottage.tool=null;g.cottage.autoDig=false;g.cottage.scanWait=999;g.cottage.hurtWait=999;g.progress.wood=1000;l.ore=1000;Object.assign(g.player,{x:site.x+70,y:site.y+70});l.animals={'1,-1':{key:'1,-1',kind:'spore',x:site.x+108,y:site.y-65,hp:10000,respawn:0,clock:0,phase:'roam',timer:0,death:0}};a.refresh();},mask);await page.waitForTimeout(100);}
  for(let mask=0;mask<16;mask++){await layout(mask);await phase('day');await shot('shape-'+mask+'-day');if([6,14,15].includes(mask)){await phase('night');await shot('shape-'+mask+'-night');}}
  // 从弯道东侧上车，真实经过路口转向南方，并验证停车位置和轮毂立即停止。
  await layout(6);await phase('day');await page.evaluate(()=>{Object.assign(a.game.player,a.game.progress.mining.carts[0]);a.refresh();});await page.locator('#mine-board').tap();await page.locator('#mine-drive').tap();await page.waitForFunction(()=>a.game.player.y>site.y+18);await shot('bend-driving');await page.locator('#mine-drive').tap();const stopped=await page.evaluate(()=>[a.game.player.x,a.game.player.y,a.game.progress.mining.carts[0].wheel]);await page.waitForTimeout(250);if(JSON.stringify(stopped)!==JSON.stringify(await page.evaluate(()=>[a.game.player.x,a.game.player.y,a.game.progress.mining.carts[0].wheel])))throw Error('弯轨停车漂移');await page.locator('#mine-board').tap();
  // 现场施工第三个出口：由正式按钮消费材料，原弯轨下一帧变为三岔。
  await page.evaluate(()=>{const [x,y]=junctionKey.split(',').map(Number);Object.assign(a.game.player,mc.minePoint({x:x-1,y}));a.refresh();});await page.locator('#mine-build').tap();await page.locator('[data-mine-build="rail"]:not([data-ahead])').tap();await page.waitForFunction(()=>a.game.progress.mining.rails[mc.mineKey(mc.mineCell(a.game.player))]);await page.evaluate(()=>Object.assign(a.game.player,{x:site.x+38,y:site.y+38}));await page.waitForTimeout(120);if(!await page.evaluate(()=>a.renderer.mineReview.railKinds.tee))throw Error('铺轨未更新交接造型');await shot('built-tee');
  await page.locator('#mine-route').tap();await page.locator('[data-route-direction="2"]').tap();await page.waitForFunction(()=>a.game.progress.mining.junctions[junctionKey]===2);await shot('tee-direction');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){await page.setViewportSize(size);for(const time of ['day','night']){await phase(time);await shot('phone-'+size.width+'-'+time);}}
  if(errors.length)throw Error(errors.join(' / '));return {scenes:reviews.length,stopped,reviews,errors};
 }catch(error){await page.screenshot({path:'output/playwright/mine-rail-junctions/failure.png'});throw error;}finally{await context.close();}
}
