// 默认使用4175，允许已有服务占用时采用独立本地端口；全程隔离浏览器存档。
async page=>{
 const origin=new URL(page.url());if(!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('只允许本地验收，默认端口4175');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));
 try{
  await t.goto(origin.origin);
  await t.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.living.position={x:1000,y:1035};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
  await t.reload();await t.locator('#start').click();
  await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;Object.assign(a.game.player,{x:1000,y:1035});a.renderer.camera.time=null;a.refresh();});
  await t.locator('#nearby-interaction[data-interaction="clearing"]').waitFor({state:'visible'});
  if(await t.locator('#nearby-interaction').innerText()!=='点告示牌接取')throw Error('未接任务没有接取提示');
  // 在真实触控页面中打开清缴页，主线尚未到清缴教学也能接取。
  await t.locator('#nearby-interaction').tap();await t.locator('#clearing-dialog').waitFor({state:'visible'});
  await t.locator('#clearing-accept').tap();await t.locator('#clearing-dialog').waitFor({state:'hidden'});
  await t.waitForFunction(()=>document.getElementById('nearby-interaction').textContent==='查看清缴委托');
  // 主线进行到清缴教学时，场景不得叠加旧的黄色任务提示。
  await t.evaluate(async()=>{const tasks=(await import('/src/config/mainline.js')).MAINLINE_TASKS;const p=a.game.progress;p.mainline.completed=tasks.slice(0,tasks.findIndex(q=>q.id==='first-patrol')).map(q=>q.id);p.mainline.phase='doing';p.living.patrolActive=false;a.refresh();});
  for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});
   await t.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();},phase);
   await t.waitForFunction(()=>!document.getElementById('nearby-interaction').hidden&&document.getElementById('nearby-interaction').textContent==='点告示牌接取');
   // 等待两次绘制，让画布尺寸观察器及正式DOM投影完成，不推进逻辑。
   await t.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const state=await t.evaluate(async()=>await(await import('/src/rendering/visual-review.js')).inspectBuildingProximityPrompt(a.renderer,document));
   if(!state.visible||!state.touchTarget||state.overflow||state.greenAction||state.duplicateGuide||state.anchorError>1)throw Error(JSON.stringify(state));
   if(await t.locator('#mainline-hud').isVisible())throw Error('到达告示牌仍显示重复路线卡');
   await t.screenshot({path:`output/playwright/building-proximity-prompts/${width}-${phase}.png`});checks.push({width,phase,state});
  }
  await t.setViewportSize({width:390,height:844});
  // 固定镜头前先验证两侧绕行仍指向同一世界锚点，再检查远离后隐藏。
  for(const x of [940,1060]){await t.evaluate(x=>{a.game.player.x=x;a.refresh();},x);await t.waitForFunction(()=>!document.getElementById('nearby-interaction').hidden);const s=await t.evaluate(async()=>await(await import('/src/rendering/visual-review.js')).inspectBuildingProximityPrompt(a.renderer,document));if(s.anchor.x!==1000||s.anchor.y!==882)throw Error('提示跟随玩家');}
  await t.evaluate(()=>{a.game.player.x=1200;a.refresh();});await t.locator('#nearby-interaction').waitFor({state:'hidden'});await t.locator('#mainline-hud').waitFor({state:'visible'});
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors,accept:true,farHidden:true};
 }finally{await context.close();}
}
