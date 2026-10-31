// 使用正式渲染与键盘移动，逐帧核对玩家短句及NPC交谈提示。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.phase='meet';
   a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.enemies=[];a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999999;a.game.arrivalScene=null;a.game.fireClock=999999;
   Object.assign(a.game.player,{x:580,y:560,invincible:99999});a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#operation-guide[data-stage="talk"] .operation-tip').waitFor({state:'visible',timeout:10000});
  for(const phase of ['day','night']){
   await page.evaluate(async phase=>{
    Object.assign(a.environment,{time:phase,weather:'sun',livingPreview:true,autoTime:false,autoWeather:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    Object.assign(a.game.player,{x:580,y:560});a.renderer.camera.time=null;a.refresh();document.activeElement?.blur();
   },phase);
   await page.keyboard.down('ArrowLeft');
   const sample=await Promise.all([page.evaluate(async()=>{
    let count=0,error=0,visible=0;const start=a.game.player.x;
    return new Promise(resolve=>{
     // 在应用每帧提交之后读取实际DOM；气泡中心应与本帧热点中心对齐。
     function capture(){const source=document.getElementById('mainline-npc'),tip=document.querySelector('.operation-tip'),layer=document.getElementById('operation-guide');
      if(!source.hidden&&!layer.hidden){visible++;const s=source.getBoundingClientRect(),b=tip.getBoundingClientRect(),view=document.getElementById('game-frame').getBoundingClientRect();const expected=Math.max(view.left+8,Math.min(view.right-tip.offsetWidth-8,s.left+s.width/2-tip.offsetWidth/2));error=Math.max(error,Math.abs(b.left-expected));}
      if(++count>=45)resolve({type:'npc',count,visible,error,moved:Math.abs(a.game.player.x-start),state:a.game.state,phase:a.game.progress.mainline.phase,speech:!!a.game.mainlineSpeech,dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>n.id)});else requestAnimationFrame(capture);
     }requestAnimationFrame(capture);
    });
   }), (async()=>{await page.waitForTimeout(350);await page.keyboard.up('ArrowLeft');})()]).then(([result])=>result);
   await page.keyboard.up('ArrowLeft');if(sample.error>.06||sample.visible<35||sample.moved<10)throw Error(JSON.stringify(sample));results.push({...sample,phase});await page.screenshot({path:'output/playwright/steady-speech-bubbles/npc-'+phase+'.png'});
  }
  await page.evaluate(async()=>{
   const g=a.game,{storyPostForChapter,storyPostApproach}=await import('/src/core/story-posts.js');Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));
   if(!g.enterStory('sunleaf-01'))throw Error('无法准备章节');g.story.stageId='Q40';g.story.phase='active';g.state='playing';g.story.dialogue=null;g.story.activeCue={id:'supply-care',speaker:'player',text:'连备用零件都留下了……她一定打算自己回来取。',remaining:60,age:0};
   g.enemies=[];g.trees=[];Object.assign(g.player,{x:2200,y:400,invincible:99999});a.renderer.camera.time=null;a.refresh();
  });
  for(const mounted of [false,true]){
   await page.evaluate(mounted=>{const g=a.game;g.vehicle.active=mounted;g.story.activeCue.age=0;g.story.activeCue.remaining=60;g.enemies=[];Object.assign(g.player,{x:2200,y:400});a.renderer.camera.time=null;a.refresh();document.activeElement?.blur();},mounted);
   await page.locator('#story-chatter').waitFor({state:'visible'});await page.keyboard.down('ArrowRight');
   const sample=await page.evaluate(async()=>{
    const {storyCueInfo}=await import('/src/rendering/story-guidance.js'),{nearest}=await import('/src/world/coordinates.js');let count=0,error=0,oldError=0,visible=0;const start=a.game.player.x;
    return new Promise(resolve=>{
     // 当前表现快照是Canvas的唯一锚点来源，旧逻辑坐标仅用于比较误差。
     function capture(){const n=document.getElementById('story-chatter'),r=a.renderer,v=r.view,info=storyCueInfo(r.renderGame);
      if(!n.hidden&&info){visible++;const f=document.getElementById('game-frame').getBoundingClientRect(),c=r.canvas.getBoundingClientRect(),p=nearest(info.anchor,{x:v.x+v.w/2,y:v.y+v.h/2});const x=(p.x-v.x)*v.zoom+c.left-f.left,y=(p.y-info.head-v.y)*v.zoom+c.top-f.top;error=Math.max(error,Math.abs(Number(n.dataset.anchorX)-x),Math.abs(Number(n.dataset.anchorY)-y));oldError=Math.max(oldError,Math.abs(a.game.player.x-r.renderGame.player.x)*v.zoom);}
      if(++count>=60)resolve({type:'player',count,visible,error,oldError,moved:Math.abs(a.game.player.x-start)});else requestAnimationFrame(capture);
     }requestAnimationFrame(capture);
    });
   });
   await page.keyboard.up('ArrowRight');if(sample.error>.01||sample.visible<45||sample.moved<10)throw Error(JSON.stringify(sample));results.push({...sample,mounted});await page.screenshot({path:'output/playwright/steady-speech-bubbles/player-'+(mounted?'vehicle':'walk')+'.png'});
  }
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
 }finally{await context.close();}
}
