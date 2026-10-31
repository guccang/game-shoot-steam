// 真实浏览器专项：不同台词镜头零位移，底部对白固定，移动端昼夜气泡仍在画面内。
async(page)=>{
  // 章节内目标仍用原交互按钮；世界目录入口改为可见的故事菜单。
  async function openWorldStory(){
    if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
    await page.locator('#story-button').click();
  }
  if(new URL(page.url()).port!=='4221')throw Error('仅允许隔离端口4221');
  const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();
  await openWorldStory();await page.getByRole('button',{name:'开始第一章',exact:true}).click();
  await page.locator('#story-speech').waitFor({state:'visible'});
  // 场景保持真实人物与绘制器，只固定对白阶段、昼夜和镜头初始位置。
  async function scene(width,height,time){
    await page.setViewportSize({width,height});
    await page.evaluate(async(time)=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      Object.assign(g.story,{stageId:'Q10',phase:'dialogue',dialogue:'intro',line:0});g.state='story';
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      const {EnvironmentTransition}=await import('/src/world/environment.js');
      a.renderer.light=new EnvironmentTransition(a.environment,performance.now()-20000);
      a.renderer.storyCamera.reset();a.refresh();
    },time);
    await page.waitForTimeout(1800);
  }
  // 同时读取真实视口和气泡位置，检查边界、底部位置及当前人物脚底。
  async function sample(){return page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,r=a.renderer;
    const n=document.getElementById('story-speech'),b=n.getBoundingClientRect(),f=document.getElementById('game-frame').getBoundingClientRect();
    const info=(await import('/src/rendering/story-guidance.js')).storySpeechInfo(a.game);
    return {...(await import('/src/rendering/visual-review.js')).inspectStoryCamera(r),line:a.game.story?.line,
      contained:b.left>=f.left&&b.right<=f.right&&b.top>=f.top&&b.bottom<=f.bottom,
      atBottom:n.dataset.placement==='bottom'&&b.bottom-f.top>=f.height*.6,
      feetVisible:info&&(info.anchor.y-r.view.y)*r.view.zoom<r.height,
      overflow:n.scrollWidth>n.clientWidth+1};
  });}
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
    await scene(width,height,time);const first=await sample();
    for(let line=1;line<=2;line++){
      await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.advanceStoryDialogue(false);a.refresh();});
      await page.waitForTimeout(120);const current=await sample();
      if(Math.hypot(current.view.x-first.view.x,current.view.y-first.view.y)>.25||current.view.zoom!==first.view.zoom)throw Error('切换说话者移动镜头 '+JSON.stringify({first,current}));
      if(!current.contained||!current.atBottom||!current.feetVisible||current.overflow)throw Error('气泡或人物出界 '+JSON.stringify(current));
    }
    samples.push({width,time,...await sample()});
    await page.screenshot({path:`output/playwright/story-camera/bubble-${width}-${time}.png`});
  }
  // 自动阅读也不能改变取景；暂停与跳过按钮仍使用正式流程。
  await scene(390,844,'day');const beforeAuto=await sample();
  await page.evaluate(async()=>{window.__storyCameraGame=(await import('/src/main.js')).application.game;});
  await page.waitForFunction(()=>window.__storyCameraGame.story?.line===1,null,{timeout:10000});
  const afterAuto=await sample();if(afterAuto.line!==1)throw Error('未等待到自动换句');if(Math.hypot(afterAuto.view.x-beforeAuto.view.x,afterAuto.view.y-beforeAuto.view.y)>.25)throw Error('自动换句移动镜头');
  await page.locator('#story-speech-pause').click();
  // 制造超出右边缘的旧画面，以实际帧连续采样校正速度；不移动角色本身。
  const movement=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,r=a.renderer;
    r.storyCamera.view={...r.storyCamera.view,x:r.storyCamera.view.x-250};
    const frames=[];
    for(let i=0;i<100;i++){await new Promise(resolve=>requestAnimationFrame(resolve));frames.push({x:r.view.x,y:r.view.y,zoom:r.view.zoom,time:performance.now()});}
    return frames;
  });
  for(let i=1;i<movement.length;i++){
    const a=movement[i-1],b=movement[i],pixels=Math.hypot(b.x-a.x,b.y-a.y)*b.zoom;
    if(pixels>13)throw Error('边缘校正存在单帧跳跃 '+pixels);
  }
  await page.waitForTimeout(500);const edge=await sample();if(!edge.contained||!edge.atBottom)throw Error('镜头偏移后底部对白不可见');
  samples.push({edge,first:movement[0],last:movement.at(-1)});
  await page.locator('#story-speech-skip').click();await page.waitForTimeout(1800);
  const finished=await sample();if(finished.active||finished.returning)throw Error('结束未恢复正常镜头');
  if(errors.length)throw Error(errors.join('\n'));
  return {pass:true,samples,autoLine:afterAuto.line,finished,errors,screenshots:6};
}
