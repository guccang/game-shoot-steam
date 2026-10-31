// 正式运行时采样邻里对白：仅定位当前任务，昼夜和面板仍由原绘制器处理。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ids=['pistol-parts','buy-shotgun','weapon-style','first-vehicle','vehicle-service','vehicle-field','own-hover','hover-service','hover-horde','tower','own-aircraft','aircraft-service','aircraft-field','advanced-license','own-controller','controller-setup','long-patrol','controller-horde','neighbor-seed-shop'];let samples=0;
 for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){
  await page.setViewportSize({width,height});
  for(const id of ids)for(const phase of ['meet','report']){
   await page.evaluate(async({id,phase,time})=>{
    const app=(await import('/src/main.js')).application;await app.ready;window.storyApp=app;
    const {MAINLINE_TASKS,MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js'),task=MAINLINE_TASKS.find(t=>t.id===id),p=(await import('/src/progression/progress.js')).freshProgress();
    p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase=phase;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.farm.delivery.nextAt=Date.now()+3600000;p.farm.wildMaps=['forest','jiuzhaigou'];
    if(task.seedDelivery){p.mainline.gardening={taskId:id,purchased:2};p.farm.seeds[0]=2;}
    const part=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);p.living.calendar={day:1,elapsed:part.start+part.duration/2};
    const g=app.game;g.progress=p;g.reset();g.state='playing';g.enemies=[];g.boss=null;g.fireClock=99999;g.mainlineTalkDelay=99999;Object.assign(g.player,MAINLINE_SITES[task.site]);g.mainlineSpeech={id,phase,elapsed:0,paused:true};
    for(const d of document.querySelectorAll('dialog[open]'))d.close();Object.assign(app.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});app.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(app.environment,0);app.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(app.environment,0);app.renderer.camera.time=null;app.refresh();
   },{id,phase,time});
   await page.locator('#mainline-speech').waitFor({state:'visible'});
   const layout=await page.locator('#mainline-speech').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,over:n.scrollWidth>n.clientWidth+1,text:n.querySelector('p').textContent,buttons:[...n.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)};});
   if(layout.left<0||layout.right>width+1||layout.bottom>height+1||layout.over||layout.buttons.some(h=>h<44))throw Error(JSON.stringify({id,phase,width,layout}));samples++;
   if((id==='buy-shotgun'&&time==='day'||id==='hover-service'&&time==='night')&&phase==='meet')await page.screenshot({path:`output/playwright/equipment-seeds/${id}-${time}.png`});
  }
 }
 await page.evaluate(()=>{storyApp.game.mainlineSpeech=null;document.getElementById('mainline-book-menu').click();});await page.locator('#mainline-dialog').waitFor({state:'visible'});
 const reward=await page.locator('.mainline-reward').innerText();if(!reward.includes('雏菊种子 ×3')||!reward.includes('直接解锁购买'))throw Error('奖励说明缺少赠种解锁');
 await page.screenshot({path:'output/playwright/equipment-seeds/seed-reward-book.png'});
 if(errors.length)throw Error(errors.join('\n'));return {samples,viewports:[390,320],dayNight:true,reward,errors};
}
