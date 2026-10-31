// 正式循环交互验收：连续行走、停止、上下载具与夜景同屏，不用静止渲染替代真实动作。
async (page) => {
  if (new URL(page.url()).port !== '4186') throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const {catSprites}=await import('/src/rendering/cat-animation.js');
    if(!await catSprites.load())throw Error('猫猫动画图集缺失');
    const {EnvironmentTransition}=await import('/src/world/environment.js');
    const {SceneTone}=await import('/src/rendering/scene-tone.js');
    const env={time:'day',weather:'sun',autoTime:false,autoWeather:false};
    Object.assign(a.environment,env);a.renderer.light=new EnvironmentTransition(env);a.renderer.tone=new SceneTone(env);
    Object.assign(g.player,{x:940,y:820});g.enemies=[];g.spawnTimer=999;g.attackTimer=999;
    g.random=()=>.42;for(const [x,y]of [[850,920],[1060,930]])g.spawnEnemy(0,100,{x,y});
    window.campReview=a;
  });
  await page.keyboard.down('ArrowRight');
  try{await page.waitForFunction(()=>window.campReview.game.player.x>975);}finally{await page.keyboard.up('ArrowRight');}
  const moving=await page.evaluate(()=>({...window.campReview.game.player.bodyAnimation}));
  if(!(moving.moveTime>0))throw Error('真实移动未推进动画');
  await page.waitForFunction(()=>window.campReview.game.player.bodyAnimation.moveWeight<0.1);
  await page.screenshot({path:'output/playwright/camp-clearing/interaction-day.png'});
  await page.evaluate(()=>{const g=window.campReview.game;g.progress.vehicleHulls[0]=1;if(!g.summonVehicle())throw Error('载具未召唤');});
  await page.keyboard.down('ArrowRight');
  try{await page.waitForFunction(()=>window.campReview.game.player.x>1020);}finally{await page.keyboard.up('ArrowRight');}
  await page.screenshot({path:'output/playwright/camp-clearing/interaction-mounted-day.png'});
  await page.evaluate(async()=>{
    const a=window.campReview,g=a.game;g.dismountVehicle();Object.assign(g.player,{x:940,y:1020});
    const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
    const env={time:'night',weather:'rain',autoTime:false,autoWeather:false};
    Object.assign(a.environment,env);a.renderer.light=new EnvironmentTransition(env);a.renderer.tone=new SceneTone(env);
  });
  await page.waitForFunction(()=>window.campReview.game.player.bodyAnimation.moveWeight<0.1);
  await page.screenshot({path:'output/playwright/camp-clearing/interaction-canopy-night.png'});
  const result=await page.evaluate(async()=>{
    const a=window.campReview,g=a.game;g.pause();const stopped=JSON.stringify(g.player.bodyAnimation);g.update(.1,{x:1,y:0});
    if(JSON.stringify(g.player.bodyAnimation)!==stopped)throw Error('暂停仍推进动画');
    const {campCanopyAlpha}=await import('/src/rendering/forest-art.js');const tree=g.trees.find(t=>t.x===940&&t.y===1070);
    const alpha=campCanopyAlpha(tree,g.player);if(alpha>=.4)throw Error('树冠没有让出猫猫');
    a.destroy();return {animationContinuous:true,mounted:true,paused:true,canopyAlpha:alpha};
  });
  if(errors.length)throw Error(errors.join(';'));return {...result,errors};
}

