// 正式运行时移动性能采样：同一路线、固定场景、真实矿车与手机视口，不改玩家存档。
async original=>{
 const base=new URL(original.url()).origin,tag=new URL(original.url()).hash.slice(1)||'sample';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'#'+tag);await page.locator('#start').tap();await page.evaluate(async()=>{
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

  await page.evaluate(()=>{const g=a.game;Object.assign(g.player,g.progress.mining.carts[0]);a.refresh();
   window.times={logic:[],render:[]};
   window.phaseTimes={};if(location.hash==='#profile'){const p=g.profiler,start=p.start.bind(p),end=p.end.bind(p),active=new Map();p.start=name=>{active.set(name,performance.now());return start(name);};p.end=name=>{if(active.has(name)){const values=phaseTimes[name]||=[];values.push(performance.now()-active.get(name));active.delete(name);}return end(name);};}const update=g.update.bind(g),draw=a.renderer.draw.bind(a.renderer);
   g.update=(...args)=>{const start=performance.now();const r=update(...args);times.logic.push(performance.now()-start);return r;};
   a.renderer.draw=(...args)=>{const start=performance.now();const r=draw(...args);times.render.push(performance.now()-start);return r;};
  });await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-board').tap();await page.locator('#mine-drive').tap();await page.locator('#mine-tools-toggle').tap();
  // 采样实际 RAF 和插值镜头，只报告本机数据，不将其当作设备帧率保证。
  async function measure(name){return await page.evaluate(async name=>{
   times.logic=[];times.render=[];const frames=[],positions=[];let prior=performance.now();
   for(let i=0;i<150;i++){await new Promise(requestAnimationFrame);const now=performance.now();frames.push(now-prior);prior=now;positions.push(a.renderer.mineView.x);}
   const summary=values=>{const n=[...values].sort((a,b)=>a-b);return {count:n.length,mean:n.reduce((s,v)=>s+v,0)/n.length,p95:n[Math.floor(n.length*.95)],max:n.at(-1)};};
   return {name,logic:summary(times.logic),render:summary(times.render),frame:summary(frames),longFrames:frames.filter(x=>x>34).length,distance:Math.max(...positions)-Math.min(...positions),landscape:a.renderer.mineLandscapeReview,cart:a.renderer.mineCartRiderReview};
  },name);}
  const quiet=await measure('cart-quiet');await page.screenshot({path:'output/playwright/mine-motion/'+tag+'-day.png'});
  await page.evaluate(()=>{const g=a.game,l=g.progress.mining;for(let i=0;i<8;i++){const key=mc.mineKey({x:mc.mineCell(site).x+i%4-2,y:mc.mineCell(site).y+Math.floor(i/4)-1});l.animals[key]={key,kind:'spore',x:site.x+(i%4-2)*45,y:site.y+(Math.floor(i/4)?85:-85),hp:100000,clock:0,phase:'recover',timer:999,respawn:0};}g.progress.supplies.hand.light=300;g.magazines[0].ammo=12;g.magazines[0].remaining=0;});
  const combat=await measure('cart-combat');
  await page.evaluate(async()=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id==='night');a.game.progress.living.calendar.elapsed=phase.start+phase.duration*.5;});
  const night=await measure('cart-night');await page.screenshot({path:'output/playwright/mine-motion/'+tag+'-night.png'});
  await page.locator('#mine-tools-toggle').tap();await page.locator('#mine-drive').tap();await page.locator('#mine-board').tap();await page.locator('#mine-tools-toggle').tap();await page.keyboard.down('ArrowRight');const walk=await measure('walking');await page.keyboard.up('ArrowRight');
  if(errors.length)throw Error(errors.join('/'));const phases=await page.evaluate(()=>Object.entries(phaseTimes).map(([name,values])=>({name,mean:values.reduce((s,v)=>s+v,0)/values.length,max:Math.max(...values)})).sort((a,b)=>b.mean-a.mean));return {designCriterion:'mine-motion-performance',tag,quiet,combat,night,walk,phases,errors};
 }finally{await context.close();}
}
