// 普通场景真实绘制验收：恢复正常倍率，手机与桌面昼夜同屏包含猫猫、载具、怪物和 UI。
async page => {
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离验收端口');
  const errors=[],views=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;window.normalReview=a;
    if(g.realm)g.leaveRealm();g.progress.weapon=0;g.progress.weapons[0]=1;g.progress.vehicleHulls[0]=1;
    g.reset();g.start();g.player.invincible=999;g.progress.vehicleIndex=0;
    if(!g.summonVehicle())throw Error('正式载具未能上场');
    const enemy=g.spawnEnemy(0,0,{x:g.player.x+105,y:g.player.y+90});
    Object.assign(enemy,{hp:100000,maxHp:100000,speed:0,damage:0});
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    if(!await(await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('角色连续帧图集加载失败');
    a.refresh();
  });
  for(const [width,height] of [[320,568],[390,844],[1280,900]]){
    await page.setViewportSize({width,height});
    // 等待 ResizeObserver 完成画布尺寸重建，避免截到调整窗口的透明过渡帧。
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    for(const time of ['day','night']){
      const view=await page.evaluate(async time=>{
        const a=window.normalReview,g=a.game,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        const {SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(a.environment,0);r.tone=new SceneTone(a.environment,0);
        r.resize();g.setViewport(r.width,r.height);r.camera.setZoomStep(6);r.draw();a.refresh();
        if(r.view.zoom!==(r.width<500?.85:1.05)||r.camera.zoomStep!==0)throw Error('普通场景仍为远景或继承缩放');
        const x=(g.player.x-r.view.x)*r.view.zoom,y=(g.player.y-r.view.y)*r.view.zoom;
        if(x<40||x>r.width-40||y<80||y>r.height-100)throw Error('角色超出正常构图');
        const builds=r.ground.stats().builds;for(let i=0;i<3;i++)r.draw();
        if(r.ground.stats().builds!==builds)throw Error('相同镜头反复重建地形缓存');
        return {width:r.width,height:r.height,time,zoom:r.view.zoom,playerScreen:{x,y},enemies:g.enemies.length,vehicle:g.vehicle.active};
      },time);views.push(view);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await page.evaluate(()=>{const r=window.normalReview.renderer;if(r.c.getImageData(Math.floor(r.canvas.width/2),Math.floor(r.canvas.height/2),1,1).data[3]===0)throw Error('截屏时正式画布为空');});
      await page.screenshot({path:`output/playwright/normal-camera-${width}-${time}.png`});
    }
  }
  if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:['normal-scene-camera'],views,errors};
}
