// 正式浏览器检查邻里接取、移动导航、道路镜像和昼夜小屏；不替代实体手机验收。
async page=>{
 if(new URL(page.url()).port!=='4251')throw Error('请使用隔离端口4251');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;await a.ready;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;Object.assign(a.game.player,{x:650,y:1840});a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;});
 if(!await page.locator('#living-menu').isVisible())await page.locator('#field-menu-toggle').click();
 await page.locator('#living-menu').click();
 await page.locator('[data-living-accept="neighbors-lunch"]').click();
 await page.locator('[data-living-accept="neighbors-night"]').click();
 await page.locator('#living-close').click();await page.waitForTimeout(200);
 await page.evaluate(()=>{Object.assign(a.game.player,{x:690,y:1350});a.game.attackTimer=999;a.game.enemies=[];});
 await page.waitForTimeout(650);
 // 正式路径与每段扫掠一致，只显示最新接取的当前请求。
 async function inspect(label){
  const r=await page.evaluate(async()=>{
   const {inspectLivingGuidance}=await import('/src/rendering/visual-review.js'),{questLineClear}=await import('/src/physics/quest-route.js');
   const g=a.game,s=inspectLivingGuidance(g,a.renderer.view);
   return {routes:s.routes.map(r=>({id:r.id,near:r.near,reachable:r.reachable,distance:r.distance,points:r.points.length,clear:r.points.every((p,i,ps)=>!i||questLineClear(ps[i-1],p,{...g.player,livingCollision:true,mapId:g.mapId},g.trees))})),overflow:document.documentElement.scrollWidth>innerWidth,roadCount:s.roads.length};
  });
  if(r.routes.length!==1||r.routes[0].id!=='neighbors-night'||r.routes.some(r=>!r.reachable||!r.clear)||r.overflow)throw Error(label+JSON.stringify(r));
  samples.push({label,...r});return r;
 }
 const before=await inspect('move-before');
 await page.keyboard.down('s');await page.waitForTimeout(550);await page.keyboard.up('s');await page.waitForTimeout(100);
 const after=await inspect('move-after');if(after.routes[0].distance>=before.routes[0].distance)throw Error('真实走位未更新路线');
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:900});
  await page.evaluate(async time=>{
   const g=a.game;Object.assign(g.player,{x:650,y:1520});g.progress.living.calendar.elapsed=time==='day'?100000:1000000;
   Object.assign(a.environment,{livingPreview:true,time,weather:'sun',forestSeason:'spring',autoWeather:false,autoTime:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
   g.time+=1;a.refresh();
  },time);
  await page.waitForTimeout(200);await inspect(width+'-'+time);
  await page.screenshot({path:'output/playwright/living-guidance/'+width+'-'+time+'.png'});
 }
 if(!await page.locator('#living-menu').isVisible())await page.locator('#field-menu-toggle').click();
 await page.locator('#living-menu').click();
 if((await page.evaluate(async()=> (await import('/src/core/navigation/living-route.js')).livingRouteStates(a.game))).length)throw Error('对话未清理');
 await page.locator('#living-close').click();await page.waitForTimeout(200);await inspect('dialog-resume');
 // 移动经过旧版会逐点翻转的纵向阈值，正式地面不应有道路穿过此空地。
 await page.evaluate(()=>{Object.assign(a.game.player,{x:690,y:200});});
 await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');
 await page.screenshot({path:'output/playwright/living-guidance/mirror-threshold.png'});
 const mirror=await page.evaluate(async()=>{const {visibleLivingRoads}=await import('/src/world/living-road-view.js');return visibleLivingRoads({x:550,y:0,w:450,h:250}).length;});
 if(mirror)throw Error('镜像阈值仍出现假路');
 if(errors.length)throw Error(errors.join(';'));
 return {pass:true,designCriterion:'living-road-guidance',samples,mirror,errors};
}
