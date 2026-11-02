// 湖岸抵达回归：保留未结束的远处清缴，通过正式导航按钮、移动和触屏完整钓鱼。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],out='output/playwright/fishing-shore-fix/';
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 // 沿用玩家的野外菜单，不直接调用开始钓鱼事务。
 async function open(){if(!await page.locator('#outdoor-menu').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#outdoor-menu').tap();await page.locator('#outdoor-dialog[open]').waitFor();}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress(),ids=(await import('/src/config/mainline.js')).MAINLINE_IDS,restoration=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
   window.sites=await import('/src/world/outdoor-sites.js');window.navigation=await import('/src/core/world-navigation.js');window.coordinates=await import('/src/world/coordinates.js');const {blocked}=await import('/src/physics/motion.js');const {MONSTER_CAMPS}=await import('/src/config/monster-camps.js');
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...ids];p.mainline.phase='complete';p.restoration.repaired=restoration.map(r=>r.id);p.restoration.cottageRested=true;p.outdoors.rod=true;p.outdoors.bait=20;p.living.patrolActive=true;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.vehicle.active=false;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=g.attackTimer=99999;g.random=()=>.4;
   // 选取真实可走的最后几步，避免把准备位置直接放进湖岸后方的岩石或建筑。
   let shore=null;
   search:for(const candidate of sites.fishingShores(g))for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
    const start={x:candidate.x+dx*88,y:candidate.y+dy*88};if(MONSTER_CAMPS.some(c=>c.mapId==='forest'&&coordinates.worldDistance(start,c)<600))continue;
    if(blocked(start.x,start.y,16,g.trees,{mapId:'forest',livingCollision:true}))continue;
    Object.assign(g.player,start);const nearest=sites.fishingShores(g)[0];if(!nearest||nearest.distance<=85||nearest.distance>90)continue;
    const sx=nearest.x-start.x,sy=nearest.y-start.y,mx=Math.abs(sx)>Math.abs(sy)?Math.sign(sx):0,my=mx?0:Math.sign(sy);
    if([2,4,6,8,10,12,16].some(n=>blocked(start.x+mx*n,start.y+my*n,16,g.trees,{mapId:'forest',livingCollision:true})))continue;
    shore=nearest;break search;
   }
   if(!shore)throw Error('未找到可步行复现的湖岸边界');window.shore=shore;
   g.progress.living.clearingSite={id:'patrol-clearing',name:'本次清缴地点',mapId:'forest',x:shore.x+1800,y:shore.y,radius:300,origin:{x:shore.x+1800,y:shore.y+400}};
   Object.assign(g.player,{vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
  });
  await open();await page.locator('[data-outdoor-action=shore]').tap();await page.waitForFunction(()=>a.game.state==='playing');
  const target=await page.evaluate(()=>navigation.worldNavigationDiagnostics(a.game).intent?.site);
  if(!target||!target.id.startsWith('fishing-'))throw Error('尚不能抛竿，湖岸导航已提前消失');
  const initialDistance=await page.evaluate(target=>coordinates.worldDistance(a.game.player,target),target);if(initialDistance<=85||initialDistance>90)throw Error('未站在问题边界 '+initialDistance);
  // 真实移动最后几步，抵达判定与开始抛竿共用85单位范围。
  const key=await page.evaluate(target=>Math.abs(target.x-a.game.player.x)>Math.abs(target.y-a.game.player.y)?(target.x>a.game.player.x?'d':'a'):(target.y>a.game.player.y?'s':'w'),target);
  await page.keyboard.down(key);try{await page.waitForFunction(target=>coordinates.worldDistance(a.game.player,target)<=80,target);}finally{await page.keyboard.up(key);}
  await page.waitForFunction(()=>!navigation.worldNavigationDiagnostics(a.game).intent);
  await open();await page.locator('[data-outdoor-action=fish]').tap();await page.waitForFunction(()=>a.game.state==='playing'&&a.game.fishing?.phase==='ready');
  if(!await page.evaluate(()=>a.game.progress.living.patrolActive))throw Error('钓鱼清空了原清缴任务');
  // 昼夜和手机宽度只调整视口与光照，鱼竿、湖泊和人物继续使用正式绘制器。
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,autoTime:false,weather:'sun',autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(100);
   if(!await page.locator('#fishing-hud').isVisible())throw Error('湖岸操作条没有显示');await page.screenshot({path:out+width+'-'+time+'.png'});
  }
  const cdp=await context.newCDPSession(page);let held=false;
  // 触控卷线轮只发送手势，不设置钓鱼阶段、张力或鱼获。
  async function touch(down,side=0){if(!down){if(held)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});held=false;return;}const r=await page.locator('#fishing-control').boundingBox();if(!r)throw Error('抛竿按钮不可见');await cdp.send('Input.dispatchTouchEvent',{type:held?'touchMove':'touchStart',touchPoints:[{x:r.x+r.width*(side<0?.18:side>0?.82:.5),y:r.y+r.height/2}]});held=true;}
  await touch(true);await page.waitForTimeout(800);await touch(false);await page.waitForFunction(()=>a.game.fishing?.phase==='waiting');
  if(await page.evaluate(()=>a.game.progress.outdoors.bait)!==19)throw Error('抛竿扣饵错误');await page.waitForFunction(()=>a.game.fishing?.phase==='bite');await touch(true);await page.waitForFunction(()=>a.game.fishing?.phase==='fight');
  for(let i=0;i<300;i++){
   const f=await page.evaluate(()=>a.game.fishing&&({phase:a.game.fishing.phase,tension:a.game.fishing.tension,direction:a.game.fishing.direction}));if(f?.phase==='landed')break;if(f?.phase!=='fight')throw Error('钓鱼意外中断 '+JSON.stringify(f));if(f.tension>.7)await touch(false);else if(f.tension<.4||held)await touch(true,-(f.direction||1));await page.waitForTimeout(100);
  }
  await touch(false);await page.waitForFunction(()=>a.game.fishing?.phase==='landed');await page.locator('[data-fish-keep]').tap();await page.waitForFunction(()=>a.game.progress.outdoors.caught===1&&!a.game.fishing);
  const result=await page.evaluate(()=>({bait:a.game.progress.outdoors.bait,caught:a.game.progress.outdoors.caught,patrolActive:a.game.progress.living.patrolActive}));if(!result.patrolActive)throw Error('收鱼改变原清缴任务');await page.screenshot({path:out+'caught.png'});
  if(errors.length)throw Error(errors.join('\n'));return {initialDistance,target,result,errors};
 }catch(error){await page.screenshot({path:out+'failure.png'});const state=await page.evaluate(()=>({state:a.game.state,notice:a.game.outdoorNotice,phase:a.game.fishing?.phase,player:{x:a.game.player.x,y:a.game.player.y},navigation:navigation.worldNavigationDiagnostics(a.game),active:a.game.progress.living.patrolActive}));throw Error(error.message+' '+JSON.stringify(state));}finally{await context.close();}
}
