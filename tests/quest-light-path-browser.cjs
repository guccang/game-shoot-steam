// 任务导航专项：正式HUD与Canvas、实际键盘移动、绕障和阶段清理。
async(page)=>{
 if(new URL(page.url()).port!=='4247')throw Error('仅使用隔离端口4247');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();localStorage.clear();localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;window.questApp=a;g.progress.arrival.phase='complete';g.arrivalScene=null;g.state='playing';Object.assign(g.player,{x:970,y:790});
  if(!g.enterStory('sunleaf-01','sunleaf-post'))throw Error('进入章节失败');
  g.story.phase='prepare';g.chooseStoryLoadout('line-patrol');
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  Object.assign(g.story,{stageId:'Q20',phase:'active',dialogue:null,trial:null,combat:null});Object.assign(g.player,{x:900,y:700});g.state='playing';g.attackTimer=999;g.enemies=[];a.refresh();
 });
 // 直接读取正式规划结果，并扫掠检查每段，不以截图中的点位代替碰撞验证。
 async function inspect(label){
  const result=await page.evaluate(async()=>{
   const a=questApp,s=(await import('/src/rendering/visual-review.js')).inspectQuestLightPath(a.game,document),{questLineClear}=await import('/src/physics/quest-route.js');
   const n=document.querySelector('.story-navigation-distance'),r=n.getBoundingClientRect(),q=n.closest('.quest,.boss-hud').getBoundingClientRect();
   return {...s,clear:s.route?.points.every((p,i,ps)=>!i||questLineClear(ps[i-1],p,{...a.game.player,mapId:a.game.mapId},a.game.trees)),contained:r.left>=q.left&&r.right<=q.right&&r.bottom<=q.bottom,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  if(!result.route?.reachable||result.dots.length<1||result.dots.length>24||!result.clear||result.hidden||result.overflow||!result.contained||result.distanceText!==Math.ceil(result.route.distance)+'米')throw Error(label+' '+JSON.stringify(result));
  samples.push({label,distance:result.distanceText,dots:result.dots.length,visited:result.route.visited});return result;
 }
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{const a=questApp,g=a.game;Object.assign(g.player,{x:900,y:700});g.time+=1;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();},time);
  await page.waitForTimeout(150);await inspect(width+'-'+time);await page.screenshot({path:`output/playwright/quest-light-path/path-${width}-${time}.png`});
 }
 const before=await inspect('before-move');await page.keyboard.down('s');await page.waitForTimeout(250);await page.keyboard.up('s');await page.waitForTimeout(100);const after=await inspect('after-move');
 if(after.route.distance>=before.route.distance)throw Error('实际移动后距离未减小');
 // 在路中放置正式树对象，确认光点折返绕行而非穿过树干。
 await page.evaluate(()=>{const g=questApp.game;Object.assign(g.player,{x:900,y:700});g.story.combat=null;delete g.player.arena;g.enemies=[];g.trees=[...g.trees,{...g.trees[0],x:840,y:800,radius:32,hp:1000,maxHp:1000}];g.time+=1;questApp.refresh();});
 const obstacle=await inspect('tree-detour');if(obstacle.route.points.length<=2)throw Error('未绕开路中树');await page.screenshot({path:'output/playwright/quest-light-path/tree-detour-320.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/quest-light-path/reduced-320.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 // 暂停与关闭详情恢复，目标切换不残留；抵达范围收起光点。
 await page.locator('#settings-button').click();
 if(await page.evaluate(async()=> (await import('/src/core/navigation/story-route.js')).storyRouteState(questApp.game))!==null)throw Error('暂停残留路径');
 await page.locator('#settings-done').click();await page.waitForFunction(()=>questApp.game.state==='playing');await inspect('resume');
 const lifecycle=await page.evaluate(async()=>{
  const g=questApp.game,{storyRouteState}=await import('/src/core/navigation/story-route.js');
  Object.assign(g.story,{stageId:'Q30',routeId:'road',group:0});g.time+=1;const next=storyRouteState(g);if(next.site!=='ROAD1')throw Error('旧目标残留');
  Object.assign(g.player,{x:630,y:1040});const near=storyRouteState(g);if(!near.near||near.points.length)throw Error('抵达不清理');
  g.story.phase='dialogue';if(storyRouteState(g)!==null)throw Error('对白不清理');
  g.leaveStory();if(storyRouteState(g)!==null)throw Error('退出不清理');return true;
 });
 if(errors.length)throw Error(errors.join(';'));
 return {pass:true,designCriterion:'quest-light-path',samples,movement:true,detour:true,lifecycle,errors};
}
