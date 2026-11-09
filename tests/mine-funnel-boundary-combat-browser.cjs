// 默认连接4175端口；允许从已打开的隔离测试服务继承地址，不修改用户存档。
async original=>{
 const base=new URL(original.url()||'http://localhost:4175').origin,context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-funnel-boundary/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 与正式世界时钟一致地切换昼夜，环境只在隔离上下文修改。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(120);}

 // 使用正式地形寻找真实岩壁，后续只用键盘/触屏驱动玩家，不替换碰撞函数。
 async function scene(kind){
  await page.evaluate(async kind=>{
   const g=a.game,l=g.progress.mining;g.state='playing';g.cottage.tool=null;g.cottage.autoDig=false;g.cottage.combat=null;g.cottage.scanWait=99999;g.reducedMotion=false;
   l.bounds=window.originalBounds;l.dug={};l.bridges={};l.animals={};l.seed=1847;
   for(let y=16;y<=26;y++)for(let x=24;x<=36;x++){const k=mc.mineKey({x,y});l.dug[k]=l.bridges[k]=true;}
   Object.assign(g.player,mc.minePoint({x:30,y:20}),{vx:0,vy:0});
   if(kind==='wall'){
    let found;
    for(let y=18;y<=24&&!found;y++)for(let x=26;x<=34&&!found;x++){const k=mc.mineKey({x,y});delete l.dug[k];const p=mc.minePoint({x:x-1,y}),z=mc.minePoint({x:x+1,y});if(combat.clipMineCombatLine(g,p,z).blocked)found={x,y};else l.dug[k]=true;}
    if(!found)throw Error('没有真实岩壁');Object.assign(g.player,mc.minePoint({x:found.x-1,y:found.y}));
   }else{
    const p=g.player;l.bounds={left:p.x-120,right:p.x+26,top:p.y-150,bottom:p.y+150};
    if(kind==='corridor')l.bounds={left:p.x-26,right:p.x+26,top:p.y-150,bottom:p.y+150};
   }
   combat.updateMineCombat(g,0);
   const b=g.cottage.combat,original=b.constrainFlyingNode;window.metrics={samples:0,maxCorrection:0,maxStep:0,invalid:0,previous:new Map(),start:performance.now()+1200};
   // 只观察正式约束前后的位移，不改变控制输入或模拟时间。
   b.constrainFlyingNode=node=>{
    const before={x:node.x,y:node.y};original(node);
    if(performance.now()<metrics.start)return;
    const prior=metrics.previous.get(node.index),now={x:g.player.x+node.x,y:g.player.y+node.y};
    metrics.samples++;metrics.maxCorrection=Math.max(metrics.maxCorrection,Math.hypot(node.x-before.x,node.y-before.y));
    if(prior)metrics.maxStep=Math.max(metrics.maxStep,Math.hypot(now.x-prior.x,now.y-prior.y));
    if(!motion.mineOccupancy(g,now.x,now.y,0,true))metrics.invalid++;
    metrics.previous.set(node.index,now);
   };a.refresh();
  },kind);
  await page.waitForTimeout(3500);
 }
 // 连续轨迹和截图一起检查，不以单张静止预览代替稳定性验收。
 async function shot(name){
  const result=await page.evaluate(async()=>({...(await import('/src/rendering/visual-review.js')).inspectMineFunnelBoundary(a.game,a.renderer),samples:metrics.samples,maxCorrection:metrics.maxCorrection,maxStep:metrics.maxStep,invalid:metrics.invalid,night:a.renderer.mineReview?.night,nodes:a.game.funnel.nodes.map(n=>({x:n.x,y:n.y,goalX:n.flight.goalX,goalY:n.flight.goalY})),overflow:document.documentElement.scrollWidth>innerWidth}));
  await page.screenshot({path:'output/playwright/mine-funnel-boundary/'+name+'.png'});
  if(result.samples<30||result.invalid||result.overflow||result.maxCorrection>8||result.maxStep>20)throw Error('飞控验收失败 '+JSON.stringify(result));reviews.push({name,...result});
 }
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();
   window.mc=await import('/src/config/mining.js');window.combat=await import('/src/core/mining/mine-combat.js');window.motion=await import('/src/physics/mine-motion.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.weapon=12;p.weapons[12]=1;p.mining.seed=1847;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);(await import('/src/core/mining/mining.js')).enterMine(g);g.livingPersist=()=>true;window.originalBounds=g.progress.mining.bounds;a.refresh();
  });

  for(const time of ['day','night']){
   await phase(time);await scene('wall');
   await page.evaluate(()=>{
    const g=a.game,p={x:g.player.x,y:g.player.y-100},key=mc.mineKey(mc.mineCell(p));
    g.progress.mining.animals[key]={key,kind:'spore',...p,hp:10000,maxHp:10000,respawn:0,clock:0,walk:0,phase:'recover',timer:999,death:0};window.targetKey=key;
    metrics.maxCorrection=metrics.maxStep=metrics.invalid=metrics.samples=0;metrics.previous.clear();metrics.start=performance.now()+1000;
   });
   await page.waitForTimeout(3500);await shot('fighting-wall-'+time);
   if(await page.evaluate(()=>a.game.progress.mining.animals[targetKey].hp)>=10000)throw Error('靠墙浮游炮未造成伤害');
  }
  if(errors.length)throw Error(errors.join('/'));return {scenes:reviews.length,errors,reviews};
 }catch(e){await page.screenshot({path:'output/playwright/mine-funnel-boundary/combat-failure.png'});throw e;}finally{await context.close();}
}
