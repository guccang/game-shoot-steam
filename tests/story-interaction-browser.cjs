// 真实手机短按与拖动验证现场箭头，保留正式游戏循环、镜头和调查计时。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 try{
  await page.goto(original.url()||'http://localhost:4175');
  await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.story.chapters['sunleaf-01'].completed=true;
   const {STORAGE_KEYS,WORLD_SAVE_REVISION}=await import('/src/platform/storage.js');localStorage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
  });
  await page.reload();await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   window.interaction=await import('/src/core/story-interaction.js');window.definition=await import('/src/core/story-definition.js');
   // 夹具只跳过路途战斗，点击、调查、对白和镜头仍执行正式实现。
   window.stage=async(chapter,id)=>{
    const g=a.game;if(g.story?.chapterId!==chapter){if(g.story)g.leaveStory();g.progress.story.run=null;
     const {storyPostForChapter,storyPostApproach}=await import('/src/core/story-posts.js');
     g.state='playing';Object.assign(g.player,storyPostApproach(storyPostForChapter(g,chapter)));g.enemies=[];g.boss=null;
     if(!g.enterStory(chapter))throw Error('进入章节失败 '+JSON.stringify({chapter,state:g.state,mainline:g.progress.mainline,arrival:g.progress.arrival,repaired:g.progress.restoration.repaired,run:g.progress.story.run,defense:g.campDefense,fire:g.fireActive,post:storyPostForChapter(g,chapter)}));g.advanceStoryDialogue(true);g.chooseStoryLoadout(definition.storyDefinition(g).loadouts[0].id);g.startStoryStage();
    }
    Object.assign(g.story,{stageId:id,phase:'active',dialogue:null,interacting:0,flags:{},combat:null,trial:null});g.state='playing';g.enemies=[];g.boss=null;
    Object.assign(g.player,interaction.storyInteractionTarget(g));g.player.x-=36;g.player.y-=24;a.refresh();
   };
   window.review=async()=> (await import('/src/rendering/visual-review.js')).inspectStoryInteraction(a.renderer,document);
   await stage('sunleaf-01','Q40');
  });
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').tap();
  for(const [width,height,time] of [[320,740,'day'],[390,844,'night'],[430,932,'day'],[844,390,'night']]){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
   },time);await page.locator('#story-interact').waitFor({state:'visible'});await page.waitForTimeout(300);
   const r=await page.evaluate(()=>review());
   if(r.target!=='mint'||r.box.width<44||r.box.height<44||r.overflow||r.cue.top<r.frame.top||r.cue.bottom>r.frame.bottom)throw Error('手机箭头布局失败 '+JSON.stringify(r));
   await page.screenshot({path:`output/playwright/story-world-interaction/mint-${width}-${time}.png`});checks.push(r);
  }
  // 人物在镜头偏上方时，横屏顶栏不盖住箭头；仍指向同一个角色本体。
  await page.evaluate(()=>{const target=interaction.storyInteractionTarget(a.game);Object.assign(a.game.player,{x:target.x-20,y:target.y+35});});await page.waitForTimeout(400);
  const side=await page.evaluate(async()=>{const r=await review(),hud=document.getElementById('quest').getBoundingClientRect();return {...r,direction:document.getElementById('story-interact').dataset.cue,hudBottom:hud.bottom};});
  if(side.direction==='top'||side.cue.top<side.hudBottom||side.cue.left<side.frame.left||side.cue.right>side.frame.right)throw Error('横屏侧向箭头布局失败 '+JSON.stringify(side));
  await page.screenshot({path:'output/playwright/story-world-interaction/mint-landscape-side.png'});checks.push(side);
  await page.evaluate(()=>stage('sunleaf-01','Q40'));
  await page.setViewportSize({width:390,height:844});
  const t1=await page.evaluate(()=>document.querySelector('.story-interact-cue').style.transform);await page.waitForTimeout(170);
  const t2=await page.evaluate(()=>document.querySelector('.story-interact-cue').style.transform);if(t1===t2)throw Error('箭头没有动态反馈');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  if(!(await page.evaluate(()=>document.querySelector('.story-interact-cue').style.transform)).includes('0px'))throw Error('减少动态未停止箭头');
  await page.emulateMedia({reducedMotion:'no-preference'});
  // 从目标上拖动只走路，不开始交谈；正式插值镜头与命中区仍同步。
  const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y})),box=await page.locator('#story-interact').boundingBox();
  const x=box.x+box.width/2,y=box.y+box.height-25,touch=await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+38,y}]});await page.waitForTimeout(160);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();await page.waitForTimeout(80);
  const after=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,interacting:a.game.story.interacting}));
  if(Math.hypot(after.x-before.x,after.y-before.y)<2||after.interacting)throw Error('拖动误交互或不能移动 '+JSON.stringify({before,after}));checks.push({drag:{before,after}});
  const projection=await page.evaluate(()=>{const target=interaction.storyInteractionTarget(a.game),v=a.renderer.view,c=a.renderer.canvas.getBoundingClientRect(),b=document.getElementById('story-interact').getBoundingClientRect();return Math.abs(b.x+b.width/2-(c.x+(target.x-v.x)*v.zoom));});
  if(projection>1)throw Error('移动后点击区域未跟随镜头 '+projection);checks.push({projectionError:projection});
  await page.evaluate(()=>{a.game.player.x+=300;});await page.locator('#story-interact').waitFor({state:'hidden'});
  await page.evaluate(()=>stage('sunleaf-01','Q40'));await page.locator('#story-interact').waitFor({state:'visible'});
  // 直接点人物本体，不能依赖原底部按钮或测试脚本调用交互方法。
  const actor=await page.locator('#story-interact').boundingBox();await page.touchscreen.tap(actor.x+actor.width/2,actor.y+actor.height-25);
  await page.waitForFunction(()=>a.game.story.interacting>0);await page.locator('#story-speech').waitFor({state:'visible'});
  if(await page.locator('#story-interact').isVisible())throw Error('对白中仍有点击箭头');
  await page.locator('#story-speech-skip').tap();await page.locator('#story-close').tap();await page.locator('#story-interact').waitFor({state:'visible'});
  await page.locator('#story-interact').tap();await page.locator('#story-dialog').waitFor({state:'visible'});checks.push({actorClick:true,prepareReopen:true});
  await page.locator('#story-close').tap();
  await page.evaluate(()=>stage('sunleaf-02','PICKUP'));if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').tap();
  await page.locator('#story-interact').waitFor({state:'visible'});await page.waitForTimeout(300);
  const medicine=await page.evaluate(()=>review());if(medicine.target!=='medicine')throw Error('药箱箭头误指向薄荷');
  await page.screenshot({path:'output/playwright/story-world-interaction/medicine-night.png'});checks.push(medicine);
  const item=await page.locator('#story-interact').boundingBox();await page.touchscreen.tap(item.x+item.width/2,item.y+item.height-22);
  await page.waitForFunction(()=>a.game.story.interacting>0);await page.locator('#story-speech').waitFor({state:'visible'});
  const dialogue=await page.evaluate(()=>a.game.story.dialogue);if(dialogue!=='pickup')throw Error('点击药箱没有触发取药');
  await page.locator('#story-speech-skip').tap();await page.evaluate(()=>stage('sunleaf-02','DOCK'));await page.locator('#story-interact').waitFor({state:'visible'});
  await page.keyboard.press('e');await page.waitForFunction(()=>a.game.story.interacting>0);checks.push({itemClick:true,keyboard:true});
  if(errors.length)throw Error(errors.join('\n'));const result={checks,errors};await original.evaluate(r=>window.storyInteractionResult=r,result);return result;
 }catch(error){await page.screenshot({path:'output/playwright/story-world-interaction/failure.png'});await original.evaluate(r=>window.storyInteractionFailure=r,{message:error.message,errors});throw error;}finally{await context.close();}
}
