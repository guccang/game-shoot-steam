// 默认本地4175；并行占用时使用4176工作树。验证正式结算按钮恢复后的第一帧，不先等待寻路。
async original=>{
 const url=new URL(original.url());if(url.hostname!=='localhost'||!['4175','4176'].includes(url.port))throw Error('仅允许本地验收');
 const context=await original.context().browser().newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));await page.goto(original.url());await page.locator('#start').tap();
  await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   window.nav=await import('/src/core/story-route.js');window.frames=[];window.record=false;
   const draw=a.renderer.draw.bind(a.renderer);
   // 在正式绘制入口采样首帧，避免点击后先等待路径完成而掩盖空白。
   a.renderer.draw=(...args)=>{if(record&&a.game.state==='playing'){const r=nav.storyRouteState(a.game,a.renderer.view);frames.push({dots:nav.visibleRouteDots(r,a.renderer.view).length,planning:r?.planning,searchStarts:r?.searchStarts,site:r?.site});}return draw(...args);};
  });
  for(const [action,task,phase,width,height] of [['end','first-patrol','day',393,852],['end','pistol-field','night',393,852],['close','weapon-field','night',320,568],['escape','vehicle-field','day',393,852],['end','aircraft-field','night',393,852],['next',null,'night',393,852]]){
   await page.setViewportSize({width,height});
   await page.evaluate(async({action,task,phase})=>{
    record=false;frames=[];const {freshProgress}=await import('/src/game.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js'),p=freshProgress();
    p.heroes[0]=5;
    p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=action==='next'?[...MAINLINE_IDS]:MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(task));p.mainline.currentId=action==='next'?null:task;p.mainline.phase=action==='next'?'complete':'doing';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
    const g=a.game;let seed=6;g.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.arrivalScene=null;g.livingPreview=false;a.environment.livingPreview=false;
    // 战斗按正式波次手动推进，实时帧只推进时钟，保持角色完全静止。
    g.update=dt=>{if(g.state==='playing')g.time+=dt;};
    const approach=(await import('/src/config/clearing.js')).CLEARING_APPROACH;Object.assign(g.player,{x:approach.x,y:approach.y});
    const accepted=(await import('/src/core/clearing-guide.js')).acceptClearingPost(g);if(!accepted.ok)throw Error(action+': '+accepted.message);
    const site=g.progress.living.clearingSite;Object.assign(g.player,{x:site.x,y:site.y});
    for(let i=0;i<1200&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}if(!g.boss)throw Error('正式领主未生成');
    if(action==='next'){
     const {planQuestRoute}=await import('/src/physics/quest-route.js');let position=null;
     for(let i=0;i<32&&!position;i++){const angle=i*Math.PI/16,point={x:site.x+Math.cos(angle)*500,y:site.y+Math.sin(angle)*500};if(planQuestRoute({...g.player,...point,mapId:g.mapId,livingCollision:true},site,g.trees).reachable)position=point;}
     if(!position)throw Error('未找到范围外可达位置');Object.assign(g.player,position);
    }
    // 故意不手动更新教学阶段，覆盖领主刚死就弹出结算、还没走下一逻辑帧的情况。
    // 保留战斗期间手动打开告示牌产生的旧路线，结束必须恢复主线交付。
    if(action!=='next')(await import('/src/core/world-navigation.js')).requestWorldNavigation(g,approach,'去清缴告示牌接取',{direct:true});
    g.hit(g.boss,1e9);g.numbers=[];g.particles=[];
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
    Object.assign(a.environment,{time:phase,weather:'sun',autoTime:false,autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },{action,task,phase});
   await page.locator('#task-reward-dialog').waitFor({state:'visible'});
   const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,xp:a.game.progress.campLevel.xp,bosses:a.game.progress.bosses}));
   await page.evaluate(()=>{record=true;frames=[];});
   if(action==='escape')await page.keyboard.press('Escape');
   else await page.locator(action==='end'?'#task-reward-end-clearing':action==='close'?'#task-reward-close':'#task-reward-next-clearing').tap();
   await page.waitForFunction(()=>frames.length>=10);
   const result=await page.evaluate(async before=>{
    record=false;const g=a.game,first=frames[0],empty=frames.filter(f=>!f.dots).length,route=nav.storyRouteState(g,a.renderer.view),goal=(await import('/src/core/world-navigation.js')).worldNavigationObjective(g),{questLineClear}=await import('/src/physics/quest-route.js');
    if(!first.dots||first.planning||first.searchStarts!==0||empty)throw Error('恢复首帧仍无路点 '+JSON.stringify(frames));
    if(g.player.x!==before.x||g.player.y!==before.y||g.progress.campLevel.xp!==before.xp||g.progress.bosses!==before.bosses)throw Error('验收改变位置或重复领奖');
    if(!route.points.every((p,i,points)=>!i||questLineClear(points[i-1],p,{...g.player,mapId:g.mapId,livingCollision:true},g.trees)))throw Error('路径穿过障碍');
    return {first,empty,frames:frames.length,goal:goal.key,phase:g.progress.mainline.phase,state:g.state,active:g.progress.living.patrolActive};
   },before);
   if(result.active!==(action==='next')||result.goal!==(action==='next'?'boss-clearing':'camp')||action!=='next'&&result.phase!=='report')throw Error('结算目标未正确切换 '+JSON.stringify(result));
   await page.screenshot({path:`output/playwright/clearing-complete-route/${task||action}-${width}-${phase}.png`});samples.push({action,task,time:phase,width,...result});
  }
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'navigation-path-cache',samples,errors};
 }finally{await context.close();}
}
