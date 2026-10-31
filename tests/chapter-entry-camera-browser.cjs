// 第二章镜头回归：真实任务按钮接取，核对首帧、换句、跳过、暂离及同档恢复。
async page=>{
 if(new URL(page.url()).port!=='4284')throw Error('仅允许4284隔离端口');
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.story.chapters['sunleaf-01'].completed=true;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.living.position={x:970,y:790};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.cameraApp=(await import('/src/main.js')).application;});
 // 目录仍通过可见菜单和原接取按钮操作，不直接创建章节会话。
 async function enter(){
  if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
  await page.locator('#story-button').click();await page.locator('[data-story-chapter="sunleaf-02"]').click();
  await page.locator('[data-story-command="enter"]').click();
  await page.locator('#story-speech').waitFor({state:'visible'});
  await page.locator('#story-speech-pause').click();
  await page.waitForTimeout(1600);
 }
 // 只比较实际章节的帧，普通镜头预期值取自正式CombatCamera的当帧偏移。
 async function record(){await page.evaluate(()=>{
  const a=cameraApp,r=a.renderer;window.cameraFrames=[];window.cameraDraw=r.draw;
  r.draw=function(...args){const out=cameraDraw.apply(this,args),v=this.view,g=a.game;
   if(g.story&&v)cameraFrames.push({x:v.x,y:v.y,zoom:v.zoom,normalX:g.player.x+this.camera.x-v.width/v.zoom/2,normalY:g.player.y+this.camera.y-v.height/v.zoom/2});return out;};
 });}
 // 同屏量测使用已有审核入口，补充气泡与人物可见性。
 async function sample(){return page.evaluate(async()=>{
  const a=cameraApp,r=a.renderer,v=r.view,n=document.getElementById('story-speech'),b=n.getBoundingClientRect(),f=document.getElementById('game-frame').getBoundingClientRect();
  const info=(await import('/src/rendering/story-guidance.js')).storySpeechInfo(a.game);
  return {...(await import('/src/rendering/visual-review.js')).inspectStoryCamera(r),night:r.light.sample(performance.now()).night,
   contained:b.left>=f.left&&b.right<=f.right+1&&b.top>=f.top&&b.bottom<=f.bottom,
   aboveHead:b.bottom-f.top<=Number(n.dataset.anchorY)+2,feetVisible:info&&(info.anchor.y-v.y)*v.zoom<v.height,
   overflow:n.scrollWidth>n.clientWidth+1};
 });}
 for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   const a=cameraApp,g=a.game;if(g.story)g.leaveStory();a.dialogs?.close?.('story-dialog');g.progress.story.run=null;
   Object.assign(g.player,{x:970,y:790});g.enemies=[];g.boss=null;g.state='playing';g.mainlineSpeech=null;
   const timing=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase);
   g.progress.living.calendar={day:1,elapsed:timing.start+timing.duration/2};
   (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
   Object.assign(a.environment,{weather:'sun',autoWeather:false});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
   a.refresh();a.renderer.draw();
  },phase);
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').click();
  await page.waitForTimeout(200);
  await record();await enter();
  const frames=await page.evaluate(()=>{cameraApp.renderer.draw=cameraDraw;return cameraFrames;});
  const first=frames[0];if(!first||Math.hypot(first.x-first.normalX,first.y-first.normalY)>.01)throw Error('章节首帧继承森林旧镜头 '+JSON.stringify(first));
  const before=await sample();
  if(!before.contained||!before.aboveHead||!before.feetVisible||before.overflow)throw Error('对白或人物不可见 '+JSON.stringify(before));
  if(phase==='night'?before.night<.95:before.night>.05)throw Error('昼夜夹具未生效');
  await page.evaluate(()=>{cameraApp.game.advanceStoryDialogue(false);cameraApp.refresh();});await page.waitForTimeout(150);
  const next=await sample();if(Math.hypot(next.view.x-before.view.x,next.view.y-before.view.y)>.25)throw Error('同段换句移动镜头');
  await page.screenshot({path:`output/playwright/chapter-camera/entry-${width}-${phase}.png`});
  await page.locator('#story-speech-skip').click();await page.waitForTimeout(1600);
  const ended=await sample();if(ended.active||ended.returning)throw Error('对白结束未恢复');
  const shift=Math.max(...frames.map(f=>Math.hypot(f.x-first.x,f.y-first.y)*f.zoom));
  // 最短屏幕只允许气泡避让需要的少量移动，其他视口无需移动。
  if(shift>(height<600?50:.25))throw Error('出现多余镜头扫动 '+shift);
  results.push({width,height,phase,first,shift,frames:frames.length,before,next,ended});
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').click();
 }
 // 暂离首帧直接回森林；同一个存档重新进入对白也不能从森林扫向检查点。
 await page.evaluate(()=>{const a=cameraApp;a.game.leaveStory();a.refresh();a.renderer.draw();});
 const left=await page.evaluate(()=>({active:cameraApp.renderer.storyCamera.active,returning:cameraApp.renderer.storyCamera.returning,scene:cameraApp.renderer.storyCamera.scene}));
 if(left.active||left.returning||left.scene)throw Error('暂离继承旧对白镜头');
 await page.evaluate(()=>{const g=cameraApp.game;g.progress.story.run.dialogue='intro';g.progress.story.run.phase='dialogue';});
 await record();await enter();
 const restored=await page.evaluate(()=>{cameraApp.renderer.draw=cameraDraw;return cameraFrames[0];});
 if(Math.hypot(restored.x-restored.normalX,restored.y-restored.normalY)>.01)throw Error('恢复沿用旧镜头');
 if(errors.length)throw Error(errors.join('\n'));
 return {pass:true,results,left,restored,errors};
}
