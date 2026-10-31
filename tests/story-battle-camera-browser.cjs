// 剧情战斗镜头专项：用正式开波/Boss入口，逐帧比较地图视角，并实际输入验证跟随。
async(page)=>{
 if(new URL(page.url()).port!=='4233')throw Error('仅限隔离端口4233');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();
 await page.evaluate(async()=>{window.cameraApp=(await import('/src/main.js')).application;await cameraApp.ready;});
 await page.locator('#start').click();
 await page.evaluate(()=>{if(!cameraApp.game.enterStory())throw Error('第一章未进入');cameraApp.refresh();});
 await page.locator('#story-speech').waitFor({state:'visible'});
 await page.waitForTimeout(1800);
 const bubble=await page.evaluate(()=>{
  const a=cameraApp,before={...a.renderer.view};a.game.advanceStoryDialogue(false);a.refresh();a.renderer.draw();
  return {before,after:{...a.renderer.view}};
 });
 if(Math.hypot(bubble.before.x-bubble.after.x,bubble.before.y-bubble.after.y)>.25||bubble.before.zoom!==bubble.after.zoom)throw Error('同屏换句镜头跳动');
 await page.locator('#story-speech-skip').click();
 await page.evaluate(()=>{const g=cameraApp.game;g.chooseStoryLoadout('frost-guard');g.startStoryStage();g.state='story';});
 await page.locator('#story-close').click();
 await page.waitForTimeout(1800);
 for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night'])for(const battle of ['wave','boss']){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await page.evaluate(async({time,battle})=>{
   const a=cameraApp,g=a.game,r=a.renderer,{STORY_SITES}=await import('/src/config/story.js');
   Object.assign(g.story,{stageId:battle==='wave'?'Q20':'Q60',phase:'active',dialogue:null,combat:null});
   g.state='story';g.enemies=[];g.boss=null;g.aimLock=null;delete g.player.arena;
   const site=STORY_SITES[battle==='wave'?'SIGN':'BOSS'];Object.assign(g.player,{x:site.x,y:site.y+95});
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
   r.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);
   r.storyCamera.reset();r.camera.time=null;r.draw();a.refresh();return {...r.view};
  },{time,battle});
  const opening=await page.evaluate(async battle=>{
   const a=cameraApp,g=a.game,r=a.renderer,encounter=await import('/src/core/story-encounters.js');
   if(battle==='wave')encounter.beginStoryWave(g,'SIGN',6,4);else encounter.spawnStoryBoss(g,'boar');
   r.draw();a.refresh();return {view:{...r.view},prepared:r.prepareGround(),radius:g.player.arena.radius};
  },battle);
  for(const v of [opening.view,opening.prepared]){
   if(v.zoom!==before.zoom||Math.hypot(v.x-before.x,v.y-before.y)>.001)throw Error('进入战斗或缓存预热改变取景');
  }
  // 暂停逻辑时钟采样表现帧，能捕获旧版随墙钟逐步拉远的错误；圈仍由正式规则创建。
  const frames=await page.evaluate(async()=>{
   const out=[];for(let i=0;i<45;i++){await new Promise(resolve=>requestAnimationFrame(resolve));out.push({...cameraApp.renderer.view});}return out;
  });
  if(frames.some(v=>v.zoom!==before.zoom||Math.hypot(v.x-before.x,v.y-before.y)>.001))throw Error('战斗过程中自动缩放或移到圆心');
  if(opening.radius!==(battle==='wave'?330:420))throw Error('战斗边界被修改');
  // 同屏复核包含近处普通怪或Boss、角色、载具和环境，不用预览绘制器替代。
  await page.evaluate(async battle=>{
   const a=cameraApp,g=a.game;
   if(battle==='wave'){const {spawnStoryEnemy}=await import('/src/core/story-encounters.js');spawnStoryEnemy(g,g.player.arena,0);g.story.combat.spawned=1;Object.assign(g.enemies[0],{x:g.player.x-75,y:g.player.y+85});}
   else Object.assign(g.boss,{x:g.player.x-85,y:g.player.y+110});
   a.renderer.draw();a.refresh();
  },battle);
  await page.screenshot({path:'output/playwright/story-battle-camera/'+battle+'-'+width+'-'+time+'.png'});
  const after=await page.evaluate(async battle=>{
   const a=cameraApp,g=a.game;
   if(battle==='wave'){g.enemies=[];g.story.combat.spawned=g.story.combat.total;(await import('/src/core/story-encounters.js')).updateStoryWave(g,.01);}
   else{
    const b=g.boss;g.hit(b,1e9);if(g.boss)g.hit(b,1e9);
    // 领主死亡后由正式任务调度确认援兵已清空，再退出该战斗阶段。
    g.state='playing';(await import('/src/core/story-manager.js')).updateStory(g,.01);g.state='story';
   }
   a.renderer.draw();a.refresh();return {view:{...a.renderer.view},arena:!!g.player.arena};
  },battle);
  if(after.arena||after.view.zoom!==before.zoom||Math.hypot(after.view.x-before.x,after.view.y-before.y)>.001)throw Error('清场改变取景或残留边界 '+JSON.stringify({before,after}));
  samples.push({width,time,battle,zoom:before.zoom,radius:opening.radius,frames:frames.length,unchanged:true});
 }
 // 真正开启游戏时钟并用键盘走位：镜头必须跟随玩家，而不是锁在圆心。
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.evaluate(async()=>{
  const a=cameraApp,g=a.game,{STORY_SITES}=await import('/src/config/story.js'),{beginStoryWave}=await import('/src/core/story-encounters.js');
  Object.assign(g.story,{stageId:'Q20',phase:'active',dialogue:null,combat:null});Object.assign(g.player,STORY_SITES.SIGN);
  g.enemies=[];g.boss=null;delete g.player.arena;beginStoryWave(g,'SIGN',6,4);g.story.combat.timer=999;
  g.state='playing';g.attackTimer=999;if(g.vehicle.module)g.vehicle.module.cooldown=999;
  a.renderer.storyCamera.reset();a.renderer.camera.time=null;a.renderer.draw();a.refresh();
 });
 const start=await page.evaluate(()=>({x:cameraApp.game.player.x,y:cameraApp.game.player.y,view:{...cameraApp.renderer.view}}));
 await page.keyboard.down('s');await page.waitForTimeout(750);await page.keyboard.up('s');
 const moved=await page.evaluate(()=>({x:cameraApp.game.player.x,y:cameraApp.game.player.y,view:{...cameraApp.renderer.view},arena:{...cameraApp.game.player.arena}}));
 if(Math.hypot(moved.x-start.x,moved.y-start.y)<30||Math.abs((moved.view.y-start.view.y)-(moved.y-start.y))>2||moved.view.zoom!==start.view.zoom)throw Error('圈内走位未沿用地图跟随 '+JSON.stringify({start,moved}));
 if(errors.length)throw Error(errors.join('\n'));
 return {passed:true,designCriterion:'story-battle-camera-consistency',samples,bubble,movement:{start,moved},errors};
}
