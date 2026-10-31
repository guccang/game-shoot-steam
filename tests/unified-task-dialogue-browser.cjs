// 正式界面专项：任务目录、实际接取及追踪、两套剧情的共享气泡和窄屏昼夜。
async page=>{
 if(new URL(page.url()).port!=='4254')throw Error('仅限任务气泡隔离端口4254');
 const errors=[],samples=[];page.on('pageerror',error=>errors.push(error.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.progress=(await import('/src/progression/progress.js')).freshProgress();a.game.reset();a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.refresh();});
 await page.locator('#start').click();
 await page.evaluate(()=>{const g=a.game;g.enemies=[];Object.assign(g.player,{x:1030,y:910});g.mainlineTalkDelay=0;a.refresh();});
 await page.locator('#mainline-speech').waitFor({state:'visible'});
 await page.locator('#mainline-speech-pause').click();
 const stopped=await page.evaluate(()=>a.game.mainlineSpeech.elapsed);await page.waitForTimeout(350);
 if(await page.evaluate(()=>a.game.mainlineSpeech.elapsed)!==stopped)throw Error('主线暂停仍在推进');
 await page.locator('#mainline-speech-pause').click();await page.waitForTimeout(150);
 if(await page.evaluate(()=>a.game.mainlineSpeech.elapsed)<=stopped)throw Error('继续讲述未恢复');
 await page.locator('#mainline-speech-pause').click();
 // 同一正式气泡在三种视口、昼夜取样；不替换角色、场景或样式。
 async function capture(kind){
  for(const [width,height] of [[1280,900],[390,844],[320,740]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    Object.assign(a.environment,{livingPreview:true,time,forestSeason:'summer',weather:'sun',autoTime:false,autoSeason:false,autoWeather:false});
    a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    a.renderer.resize();a.renderer.draw();a.refresh();
   },time);
   await page.waitForTimeout(600);
   const sample=await page.evaluate(async()=>{const {inspectTaskDialogue}=await import('/src/rendering/visual-review.js');return inspectTaskDialogue(a.game,document);});
   const visible=sample.bubbles.filter(b=>!b.hidden);
   if(visible.length!==1||visible[0].id!==kind+'-speech')throw Error('对白并存或消失');
   const b=visible[0];if(sample.overflow||b.overflow||b.rect.x<0||b.rect.right>width||b.rect.y<0||b.rect.bottom>height||b.buttons.some(x=>x.height<44))throw Error('气泡溢出或触摸目标过小 '+JSON.stringify(b));
   if(sample.bubbles[0].background!==sample.bubbles[1].background||sample.bubbles[0].font!==sample.bubbles[1].font||sample.bubbles[0].border!==sample.bubbles[1].border)throw Error('气泡样式不统一');
   samples.push({kind,width,time,...sample});
   await page.screenshot({path:`output/playwright/task-dialogue/${kind}-${width}-${time}.png`});
  }
 }
 await capture('mainline');await page.locator('#mainline-speech-skip').click();
 await page.locator('#map-dialog').waitFor({state:'visible'});await page.locator('#close-map').click();
 await page.locator('#mainline-info').click();
 if(await page.locator('#mainline-dialog details[open]').count()||await page.locator('.mainline-checklist .done').count()!==1)throw Error('短指引或地图勾选丢失');
 await page.locator('#mainline-close').click();
 if(!await page.evaluate(()=>a.game.progress.mainline.phase==='doing'&&a.game.progress.mainline.completed.length===0))throw Error('跳过谈话越过了任务目标');
 // 目录只查看不会改追踪；从目录进入常驻邻里，经正式按钮领取两份委托。
 async function openTasks(){if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();await page.locator('#story-button').click();}
 await page.evaluate(()=>{a.environment.livingPreview=false;a.game.livingPreview=false;Object.assign(a.game.player,{x:650,y:1840});a.refresh();});
 await openTasks();
 if(await page.locator('[data-story-chapter^="neighbors-"]').count())throw Error('旧邻里章节重复出现');
 await page.locator('[data-task-request="neighbors-lunch"]').click();
 await page.locator('[data-living-accept="neighbors-lunch"]').click();await page.locator('[data-living-accept="neighbors-night"]').click();
 await page.locator('#living-close').click();await page.waitForTimeout(150);await openTasks();
 const tracking=await page.evaluate(()=>JSON.stringify(a.game.progress.taskTracking));
 const states=await page.locator('.story-neighbor-row').allTextContents();
 if(!states[0].includes('已领取')||!states[1].includes('正在追踪'))throw Error('目录没有读取已接委托');
 await page.screenshot({path:'output/playwright/task-dialogue/catalog-320.png'});
 await page.locator('.story-task-group [data-task-panel="mainline"]').click();
 if(await page.evaluate(()=>JSON.stringify(a.game.progress.taskTracking))!==tracking)throw Error('查看主线抢走了追踪');
 await page.locator('#mainline-action').click();await page.waitForTimeout(150);
 if(!await page.evaluate(()=>a.game.progress.taskTracking.kind==='mainline'&&a.game.progress.living.requests['neighbors-night'].stage===0))throw Error('手动回主线丢失已领取委托');
 await page.evaluate(()=>{Object.assign(a.game.player,{x:970,y:790});a.game.mainlineTalkDelay=999;a.refresh();});
 await openTasks();await page.locator('[data-story-chapter="sunleaf-01"]').click();await page.locator('[data-story-command="enter"]').click();
 await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('#story-speech-pause').click();
 const storyLine=await page.evaluate(()=>a.game.story.line);await page.waitForTimeout(350);
 if(await page.evaluate(()=>a.game.story.line)!==storyLine)throw Error('故事暂停仍在换句');
 await capture('story');await page.locator('#story-speech-skip').click();
 if(!await page.evaluate(()=>a.game.story.phase!=='dialogue'))throw Error('故事跳过未走正式推进');
 if(errors.length)throw Error(errors.join('\n'));
 return {errors,states,samples,diagnostics:await page.evaluate(()=>a.renderer.diagnosticInfo())};
}
