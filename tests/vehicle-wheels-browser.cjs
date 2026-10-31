// 隔离端口真实驾驶验收：收藏、四轮连续帧、昼夜同屏、手机触摸及桌面键盘。
async page => {
  if(new URL(page.url()).port!=='4217')throw Error('仅允许隔离验收端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.removeItem('forest-patrol-v1');});await page.reload();
  await page.evaluate(async()=>{window.wheelApp=(await import('/src/main.js')).application;if(!await wheelApp.ready)throw Error('素材未就绪');});
  if(await page.locator('#start').isVisible())await page.locator('#start').click();
  await page.locator('#vehicles-button').click();
  if(!(await page.locator('#ws-name').innerText()).includes('松果轮式战车'))throw Error('收藏名称未更新');
  await page.screenshot({path:'output/playwright/pinecone-wheels/collection-desktop.png'});
  await page.getByRole('button',{name:'驾驶',exact:true}).click();
  if(await page.getByRole('button',{name:'关闭工坊',exact:true}).isVisible())await page.getByRole('button',{name:'关闭工坊',exact:true}).click();
  if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
  await page.waitForFunction(()=>wheelApp.game.state==='playing');
  if(!await page.evaluate(()=>wheelApp.game.vehicle.active))throw Error('真实上车失败');
  const scenes=[];
  for(const width of [1280,390,320])for(const time of ['day','night']) {
    await page.setViewportSize({width,height:width===1280?960:844});
    await page.bringToFront();
    if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
    await page.evaluate(async time=>{
      const a=wheelApp,g=a.game;
      // 保留森林、碰撞、正式攻击与渲染，只固定怪物血量以便反复观察独立操枪。
      g.enemies=[];g.boss=null;g.spawnTimer=999;g.hurt=()=>{};g.waveWarning=0;g.updateWaves=()=>{};
      Object.assign(g.player,{x:800,y:850,vx:0,vy:0,invincible:0});
      for(const [dx,dy] of [[110,55],[-115,80],[145,-50]]) {
        const e=g.spawnEnemy(0,0,{x:800+dx,y:850+dy});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0});
      }
      const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
      Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
      a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.renderer.resize();a.refresh();
    },time);
    const start=await page.evaluate(()=>({x:wheelApp.game.player.x,phase:wheelApp.game.vehicle.wheelPhase}));
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(280);
    await page.screenshot({path:`output/playwright/pinecone-wheels/field-${width}-${time}.png`});
    await page.keyboard.up('ArrowRight');await page.waitForTimeout(450);
    const end=await page.evaluate(()=>({x:wheelApp.game.player.x,phase:wheelApp.game.vehicle.wheelPhase}));
    if(end.x<=start.x||end.phase===start.phase)throw Error('键盘未驱动真实车轮');
    await page.keyboard.down('ArrowLeft');await page.waitForTimeout(220);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(650);
    const stopped=await page.evaluate(()=>wheelApp.game.vehicle.wheelPhase);await page.waitForTimeout(200);
    if(Math.abs(await page.evaluate(()=>wheelApp.game.vehicle.wheelPhase)-stopped)>1e-5)throw Error('停车后车轮仍转动');
    if(width!==1280) {
      // CDP 触摸经过正式输入监听，验证小屏拖动仍可驾驶。
      const client=await page.context().newCDPSession(page);
      const box=await page.locator('#game').boundingBox(),x=box.x+box.width*.35,y=box.y+box.height*.6;
      const previous=await page.evaluate(()=>wheelApp.game.player.y);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-55}]});
      await page.waitForTimeout(240);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
      if(await page.evaluate(()=>wheelApp.game.player.y)>=previous)throw Error('触摸驾驶未向上移动');
    }
    scenes.push({width,time,start,end});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('小屏横向溢出');
  }
  await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{
    // 正式绘制器逐帧与其他车型并排，不建立验收专用车体。
    const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{drawVehicleIcon}=await import('/src/rendering/vehicle.js');
    const gallery=document.createElement('canvas');gallery.id='wheel-gallery';gallery.width=1440;gallery.height=760;
    gallery.style.cssText='position:fixed;z-index:9999;top:0;left:0;width:1200px;background:#eee8c8';document.body.append(gallery);
    const c=gallery.getContext('2d'),tile=document.createElement('canvas');tile.width=480;tile.height=420;
    for(let i=0;i<6;i++) {const t=tile.getContext('2d');t.clearRect(0,0,480,420);await renderVisualCase(t,'vehicle-wheels',i*.18);c.drawImage(tile,i%3*480,Math.floor(i/3)*260,480,420);}
    tile.width=320;tile.height=200;
    for(let i=0;i<4;i++){drawVehicleIcon(tile.getContext('2d'),i);c.drawImage(tile,i*350,550);}
  });
  await page.locator('#wheel-gallery').screenshot({path:'output/playwright/pinecone-wheels/continuous-and-roster.png'});
  await page.evaluate(()=>document.getElementById('wheel-gallery').remove());
  await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/pinecone-wheels/reduced.png'});await page.emulateMedia({reducedMotion:'no-preference'});
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'vehicle-wheels',scenes,errors};
}
