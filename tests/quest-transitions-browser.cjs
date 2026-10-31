// 检查真实走近后的自动弹窗，以及故事转场对白在桌面、手机昼夜场景的可读性。
async page=>{
  if(new URL(page.url()).port!=='4267')throw Error('请在隔离端口4267运行任务验收');
  const errors=[],samples=[];page.on('pageerror',error=>errors.push(error.message));
  if(await page.locator('#living-dialog').isVisible())await page.locator('#living-close').click();
  await page.evaluate(async()=>{
    const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');
    g.progress.mainline.completed=[...MAINLINE_IDS];g.mainlineSpeech=null;g.mainlineTalkDelay=999;
    g.enemies=[];g.boss=null;g.livingBattle=null;g.state='playing';g.livingPreview=false;a.environment.livingPreview=false;
    g.progress.living.patrolActive=false;g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};
    Object.assign(g.progress.living.requests['neighbors-lunch'],{stage:0,completed:false});
    Object.assign(g.player,{x:680,y:1850});a.living.renderFrame();a.refresh();
  });
  await page.keyboard.down('ArrowLeft');
  try{await page.locator('#living-dialog').waitFor({state:'visible',timeout:5000});}
  finally{await page.keyboard.up('ArrowLeft');}
  await page.screenshot({path:'output/playwright/quest-transitions/walk-arrival.png'});
  // 由真实按钮完成首节点，页面先保留回应，再用下一目标按钮继续赶路。
  await page.locator('[data-living-do="neighbors-lunch"]').click();
  if(!await page.locator('#living-content').textContent().then(s=>s.includes('嫩叶先烫软')))throw Error('确认步骤后没有保留人物回应');
  await page.locator('[data-living-track="neighbors-lunch"]').click();
  if(await page.locator('#living-dialog').isVisible())throw Error('继续赶路后页面未关闭');
  for(const [width,height] of [[1280,800],[390,844],[320,568]])for(const time of ['day','night']){
    await page.setViewportSize({width,height});
    for(const [id,phase] of [['first-letter','report'],['first-vehicle','meet']]){
      const expected=await page.evaluate(async({id,phase,time})=>{
        const g=a.game,{MAINLINE_TASKS,MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js');
        const task=MAINLINE_TASKS.find(t=>t.id===id);
        g.progress.taskTracking={kind:'mainline'};g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));g.progress.mainline.phase=phase;
        g.mainlineSpeech={id,phase,line:0,elapsed:0,paused:true};g.mainlineTalkDelay=0;g.enemies=[];g.boss=null;g.state='playing';
        Object.assign(g.player,MAINLINE_SITES[task.site]);
        Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoWeather:false,autoTime:false});
        a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
        a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);
        a.renderer.camera.time=null;a.renderer.draw();a.refresh();
        return phase==='report'?task.guide.thanks:task.guide.cue;
      },{id,phase,time});
      await page.locator('#mainline-speech').waitFor({state:'visible'});
      await page.waitForTimeout(250);
      const sample=await page.locator('#mainline-speech').evaluate(node=>{
        const r=node.getBoundingClientRect(),f=document.getElementById('game-frame').getBoundingClientRect(),p=node.querySelector('p');
        // 气泡尾角有意伸出边框，不把它计为正文裁切。
        const content=[p,...node.querySelectorAll('button')].map(n=>n.getBoundingClientRect());
        return {text:p.textContent,x:r.x,y:r.y,width:r.width,height:r.height,clipped:p.scrollHeight>p.clientHeight+1||content.some(c=>c.bottom>r.bottom||c.right>r.right),outside:r.left<f.left||r.right>f.right||r.top<f.top||r.bottom>f.bottom};
      });
      if(sample.text!==expected||sample.clipped||sample.outside)throw Error(JSON.stringify({viewportWidth:width,time,id,...sample}));
      await page.screenshot({path:`output/playwright/quest-transitions/${id}-${width}-${time}.png`});
      samples.push({viewportWidth:width,time,id,...sample});
    }
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {walkArrival:true,confirmStep:true,samples,errors};
}
