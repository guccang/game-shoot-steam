// 正式图标与首个任务介绍验收：4175端口配合隔离浏览器上下文，不访问实际玩家存档。
async browserPage=>{
 if(new URL(browserPage.url()).port!=='4175')throw Error('游戏测试使用4175端口');
 const context=await browserPage.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4175');
 await page.reload();await page.evaluate(()=>import('/src/main.js'));await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});await page.waitForFunction(()=>a.menu.page==='game');
 await page.evaluate(async()=>{if(a.game.story)a.game.leaveStory();for(const d of document.querySelectorAll('dialog[open]'))d.close();const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.phase='doing';p.mainline.seen.map=1;p.mainline.distance=80;p.vehicleHulls[0]=1;p.vehicleIndex=0;a.game.progress=p;a.game.reset();a.game.state='playing';a.game.update=()=>{};a.game.mainlineSpeech=null;Object.assign(a.game.player,{x:800,y:900});a.game.summonVehicle();a.game.spawnEnemy(0,0,{x:900,y:930},{ambient:true});a.refresh();});
 const records=[];
 // 从正式审核入口读取矩形与状态，检查图标位于任务卡内部右侧且保持资源栏间距。
 async function inspect(){
  const result=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectTaskNavigation(a.game,document);return {...r,overflow:document.documentElement.scrollWidth>innerWidth};});
  if(!result.visible||result.icon!=='0 0 32 32'||result.button.width<44||result.button.height<44||!result.inside||!result.matchesResources||Math.abs(result.resourceGap-6)>1||result.overflow)throw Error('图标布局不合格 '+JSON.stringify(result));
  if(await page.locator('#mainline-info').count())throw Error('问号仍存在');records.push(result);return result;
 }
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(async()=>{(await import('/src/core/mainline-manager.js')).updateMainline(a.game,.05);a.refresh();});
 if(!await page.evaluate(()=>a.game.progress.mainline.phase==='report'&&a.game.progress.mainline.navigationEnabled!==false&&a.game.progress.mainline.seen.navigation===0))throw Error('认路任务仍强制操作寻路开关');
 if(await page.locator('#task-navigation-toggle.operation-source').count())throw Error('仍高亮要求切换寻路');
 await inspect();await page.screenshot({path:'output/navigation-toggle/icon-introduction-320.png'});
 await page.locator('#task-navigation-toggle').tap();if(!await page.evaluate(()=>a.game.progress.mainline.seen.navigation===0&&a.game.progress.mainline.navigationEnabled===false))throw Error('自主关闭寻路失败');
 await page.reload();await page.evaluate(()=>import('/src/main.js'));await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.refresh();});await page.waitForFunction(()=>a.menu.page==='game');
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.navigation===0&&a.game.progress.mainline.navigationEnabled===false))throw Error('关闭选择未保存');
 await page.evaluate(async()=>{a.game.progress.mainline.completed=['first-map','first-patrol'];a.game.progress.mainline.phase='doing';a.game.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);Object.assign(a.game.player,{x:800,y:900});a.game.enemies=[];a.game.spawnEnemy(0,0,{x:900,y:930},{ambient:true});a.game.summonVehicle();a.game.mainlineSpeech=null;a.refresh();});
 await page.locator('#task-navigation-toggle').tap();
 for(const [width,height]of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,900]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{a.game.progress.living.calendar={day:0,elapsed:time==='night'?220000:1000};a.environment.weather='sun';a.environment.autoWeather=false;},time);await page.waitForFunction(time=>a.environment.time===time,time);await page.evaluate(async()=>{a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},time);
  await inspect();const stageBefore=await page.evaluate(()=>JSON.stringify({phase:a.game.progress.mainline.phase,completed:a.game.progress.mainline.completed,story:a.game.story?.stageId}));await page.screenshot({path:`output/navigation-toggle/icon-on-${width}-${time}.png`});await page.locator('#task-navigation-toggle').tap();if(await page.locator('dialog[open]').count()||stageBefore!==await page.evaluate(()=>JSON.stringify({phase:a.game.progress.mainline.phase,completed:a.game.progress.mainline.completed,story:a.game.story?.stageId})))throw Error('开关误触了任务操作');await inspect();await page.screenshot({path:`output/navigation-toggle/icon-off-${width}-${time}.png`});await page.locator('#task-navigation-toggle').tap();
 }
 // 入职与故事任务共用图标，检查窄屏右侧仍在边界内，关闭不影响任务阶段。
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(async()=>{const p=(await import('/src/progression/progress.js')).freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,wood:80});p.wood=80;a.game.progress=p;a.game.reset();a.game.state='playing';a.refresh();});
 await inspect();await page.locator('#task-navigation-toggle').tap();await page.screenshot({path:'output/navigation-toggle/icon-arrival-off-320.png'});
 await page.locator('#arrival-goal').tap();if(!await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('入职目标未恢复寻路');
 await page.evaluate(async()=>{const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.progress=p;g.reset();g.state='playing';const posts=await import('/src/core/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,'sunleaf-01')));if(!g.enterStory('sunleaf-01','sunleaf-post'))throw Error('故事夹具无法进入');g.story.phase='prepare';g.chooseStoryLoadout('frost-guard');g.startStoryStage();Object.assign(g.story,{stageId:'TO_RELAY',phase:'active',dialogue:null});g.state='playing';a.refresh();});
 await inspect();await page.screenshot({path:'output/navigation-toggle/icon-story-on-320.png'});await page.locator('#task-navigation-toggle').tap();await inspect();
 if(!await page.locator('#story-navigation').isHidden())throw Error('故事方向仍然显示');await page.screenshot({path:'output/navigation-toggle/icon-story-off-320.png'});
 if(errors.length)throw Error(errors.join(' / '));
 await context.close();await browserPage.evaluate(r=>window.navigationIconResult=r,records);
}
