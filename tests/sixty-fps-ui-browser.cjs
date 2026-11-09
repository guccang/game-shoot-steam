// 接续性能夹具，验证正式手机HUD、真实点击、昼夜与对白开合；截图不用于FPS计时。
async page=>{
 const errors=[],samples=[];page.on('pageerror',error=>errors.push(error.message));
 await page.evaluate(()=>{a.game.update=()=>{};a.game.fx.items=[];a.game.mainlineSpeech=null;Object.assign(a.game.player,{x:800,y:900});a.game.spawnEnemy(0,0,{x:920,y:930},{ambient:true});a.renderer.camera.time=null;a.refresh();});
 // 对重复提交进行真实DOM观测，避免只比较写法而漏掉样式失效。
 const stable=await page.evaluate(async()=>{
  const {createTaskNavigation}=await import('/src/ui/task-navigation.js'),ui=createTaskNavigation({game:a.game,root:document,onChange(){}});
  ui.render();const nodes=[...document.querySelectorAll('#task-navigation-toggle')],button=nodes.at(-1),observer=new MutationObserver(()=>{});
  observer.observe(button,{attributes:true,childList:true,subtree:true});
  for(const node of document.querySelectorAll('.task-route-anchor'))observer.observe(node,{attributes:true});
  for(let i=0;i<100;i++)ui.render();const mutations=observer.takeRecords().length;
  const state=a.game.state;a.game.state='paused';ui.render();const pausedHidden=button.hidden;a.game.state=state;
  observer.disconnect();ui.dispose();a.refresh();if(mutations||!pausedHidden)throw Error('任务开关重复写入或暂停显隐异常');return {mutations,pausedHidden};
 });
 // 每个尺寸都在正式日夜场景检查44px命中区、资源栏间距和独立开关行为。
 for(const [width,height]of [[320,568],[390,844],[1080,921]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{
   Object.assign(a.environment,{time,weather:'sun',livingPreview:true,autoTime:false,autoWeather:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
   a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  },time);await page.waitForTimeout(200);
  const before=await page.evaluate(()=>JSON.stringify({phase:a.game.progress.mainline.phase,completed:a.game.progress.mainline.completed}));
  await page.locator('#task-navigation-toggle').click();
  const info=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectSixtyFps(a.renderer,document));
  const n=info.navigation;if(!n.visible||!n.inside||n.button.width<44||n.button.height<44||info.overflow||Math.abs(n.resourceGap-6)>1||!info.interpolation.separateState)throw Error('HUD或插值回归 '+JSON.stringify(info));
  const label=await page.locator('#task-navigation-toggle').getAttribute('aria-pressed');if(label!==String(n.enabled)||!await page.locator('#task-navigation-toggle svg').count())throw Error('开关图标和语义未同步');
  const toast=await page.locator('#toast').evaluate(node=>({visible:node.classList.contains('visible'),top:node.getBoundingClientRect().top}));
  if(!toast.visible||toast.top<n.anchor.bottom)throw Error('提示遮挡任务栏');
  if(before!==await page.evaluate(()=>JSON.stringify({phase:a.game.progress.mainline.phase,completed:a.game.progress.mainline.completed}))||await page.locator('dialog[open]').count())throw Error('开关误触任务');
  samples.push({width,height,time,...info});await page.screenshot({path:`output/playwright/sixty-fps/ui-${width}-${time}.png`});await page.locator('#task-navigation-toggle').click();
 }
 // 主线从正式管理器进入对白，暂停、跳过后确认HUD恢复，而非只手改hidden属性。
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const g=a.game,m=await import('/src/core/story/mainline-manager.js'),c=await import('/src/config/mainline.js');g.progress.mainline=(await import('/src/progression/progress.js')).freshProgress().mainline;g.progress.taskTracking={kind:'mainline'};Object.assign(g.player,c.MAINLINE_SITES[m.mainlineTask(g).site]);g.mainlineTalkDelay=0;m.updateMainline(g,.1);a.renderer.camera.time=null;a.refresh();});
 await page.locator('#mainline-speech').waitFor({state:'visible'});await page.locator('#mainline-speech-pause').click();
 if(!await page.evaluate(()=>a.game.mainlineSpeech.paused))throw Error('对白暂停失败');
 await page.screenshot({path:'output/playwright/sixty-fps/mainline-dialogue.png'});await page.locator('#mainline-speech-skip').click();
 if(await page.locator('#map-dialog').isVisible())await page.locator('#close-map').click();
 await page.waitForFunction(()=>!a.game.mainlineSpeech&&document.getElementById('mainline-speech').hidden);
 await page.evaluate(async()=>{const g=a.game;g.mainlineTalkDelay=999;g.state='playing';const posts=await import('/src/core/story/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,'sunleaf-01')));if(!g.enterStory('sunleaf-01','sunleaf-post'))throw Error('故事夹具进入失败');a.refresh();});
 await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-pause').click();await page.screenshot({path:'output/playwright/sixty-fps/story-dialogue.png'});await page.locator('#story-speech-skip').click();
 await page.waitForFunction(()=>!a.game.story.dialogue&&document.getElementById('story-speech').hidden&&!document.getElementById('game-frame').classList.contains('story-speaking'));
 if(errors.length)throw Error(errors.join(' / '));return {stable,samples,dialogues:true,errors};
}
