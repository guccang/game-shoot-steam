// 复现截图中的清缴赶路卡，真实触摸关路点、点正文、再开路点；隔离浏览器存档。
async original=>{
 const results=[],errors=[];
 for(const [width,height,time] of [[320,568,'day'],[320,568,'night'],[390,844,'day'],[390,844,'night']]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async time=>{
    window.a=(await import('/src/main.js')).application;await a.ready;window.nav=await import('/src/core/world-navigation.js');
    const p=(await import('/src/progression/progress.js')).freshProgress();p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
    p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.mainline.trackingPaused=true;p.taskTracking={kind:'none'};p.living.patrolActive=true;
    const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.update=()=>{};
    window.site=(await import('/src/progression/clearing-site.js')).clearingSite(p);Object.assign(g.player,{x:site.x+600,y:site.y});a.renderer.camera.time=null;
    Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,time,weather:'sun'});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   },time);
   await page.waitForTimeout(150);
   const card=page.locator('#mainline-hud'),toggle=page.locator('#task-navigation-toggle');
   const title=await card.locator('b').textContent();if(title!=='前往清缴场站牌附近')throw Error('未复现截图卡片');
   const before=await page.evaluate(()=>{
    // 保存会刷新日历与巡游快照，只比较任务、战斗进度和钱包，开关偏好单独核验。
    window.routeTaskSnapshot=()=>{const g=a.game,p=g.progress;return JSON.stringify({mainline:{...p.mainline,navigationEnabled:true},tracking:p.taskTracking,patrolActive:p.living.patrolActive,wave:g.wave,waveKills:g.waveKills,coins:p.coins,wood:p.wood});};return routeTaskSnapshot();
   });
   await toggle.tap();
   // 正文高度改变后，等既有按钮过渡与下一帧定位完成再测量触控矩形。
   await page.waitForTimeout(350);
   await page.waitForFunction(async()=>(await import('/src/rendering/visual-review.js')).inspectTaskNavigation(a.game,document).inside);
   if(!await card.isVisible()||!await toggle.isVisible()||await toggle.getAttribute('aria-pressed')!=='false'||await card.locator('b').textContent()!==title)throw Error('关闭后任务卡或开关消失');
   const off=await page.evaluate(async()=>({objective:nav.worldNavigationObjective(a.game),route:(await import('/src/core/story-route.js')).storyRouteState(a.game),target:(await import('/src/rendering/story-guidance.js')).storyGuidanceState(a.game).target,review:(await import('/src/rendering/visual-review.js')).inspectTaskNavigation(a.game,document),progress:routeTaskSnapshot()}));
   if(off.objective||off.route||off.target||off.progress!==before||!off.review.inside||off.review.button.width<44||off.review.button.height<44)throw Error('关闭状态不正确 '+JSON.stringify(off));
   await page.screenshot({path:`output/playwright/navigation-card-toggle/off-${width}-${time}.png`});
   await card.tap();await page.locator('#clearing-dialog').waitFor({state:'visible'});
   if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('查看清缴详情重新开启了路点');
   await page.locator('#clearing-dialog button[aria-label*="关闭"]').tap();
   await toggle.tap();if(await toggle.getAttribute('aria-pressed')!=='true'||!await card.isVisible())throw Error('无法重新开启');
   const on=await page.evaluate(async()=>({key:nav.worldNavigationObjective(a.game)?.key,target:!!(await import('/src/rendering/story-guidance.js')).storyGuidanceState(a.game).target}));
   if(on.key!=='boss-clearing'||!on.target)throw Error('未恢复同一站牌目标');
   await page.screenshot({path:`output/playwright/navigation-card-toggle/on-${width}-${time}.png`});
   // 普通临时访问同样保留卡片，点击正文仍打开原本的访问操作。
   await page.evaluate(async()=>{a.game.progress.living.patrolActive=false;const sites=(await import('/src/config/mainline.js')).MAINLINE_SITES;Object.assign(a.game.player,sites.camp);nav.requestWorldNavigation(a.game,sites.westGate,'前往西门',{direct:true,action:{type:'camp-defense',gate:'left'}});a.refresh();});
   await toggle.tap();if(!await card.isVisible()||await card.locator('b').textContent()!=='前往西门')throw Error('临时访问卡消失');
   await card.tap();await page.locator('#phone-dialog').waitFor({state:'visible'});if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('查看访问目标开启了路点');
   results.push({width,time,title,offHiddenRoute:true,cardRetained:true,reopened:on.key,visitAction:true});
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
