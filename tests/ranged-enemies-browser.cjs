// 隔离端口实机复核：真实移动输入、两种部件动作、昼夜混战、手机与资源预算。
async page => {
  if(new URL(page.url()).port!=='4204')throw Error('仅允许隔离验收端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式资源加载失败');
    const g=a.game;g.reset();g.start();g.updateWaves=()=>{};g.progress.vehicleHulls[0]=1;
    Object.assign(g.player,{x:900,y:850,invincible:999});g.enemies=[];g.wave=6;g.waveWarning=0;g.attackTimer=9999;
    // 耐久测试靶只延长观察时间，攻击、脚步、预警和碰撞走正式入口。
    for(const [species,dx,dy] of [['spore-spitter',-100,-30],['acorn-slinger',100,-30],['slime',-110,110],['slime',100,120],['slime',0,165]]){
      const e=g.spawnEnemy(0,0,{x:900+dx,y:850+dy});Object.assign(e,{species,flying:false,hp:1e7,maxHp:1e7,speed:species==='slime'?15:50,damage:2});
    }
    Object.assign(a.environment,{time:'day',weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.refresh();
  });
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);
  const samples=[];for(let i=0;i<40;i++){
    await page.waitForTimeout(200);samples.push(await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {bolts:g.enemyBolts.length,phases:g.enemies.filter(e=>e.species!=='slime').map(e=>[e.species,e.assault.phase,e.assault.elapsed])};}));
  }
  if(!samples.some(s=>s.bolts>0)||samples.some(s=>s.bolts>6))throw Error('远程弹量异常');
  for(const species of ['spore-spitter','acorn-slinger'])for(const phase of ['windup','recovery'])
    if(!samples.some(s=>s.phases.some(p=>p[0]===species&&p[1]===phase)))throw Error('缺少真实部件动作 '+species+phase);
  await page.evaluate(async()=>{(await import('/src/main.js')).application.game.attackTimer=0;});
  // 真实键盘走位绕过锁定射线，再用触摸摇杆移动并取消，确保新怪不影响原控制。
  const start=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.player;return {x:p.x,y:p.y};});
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(300);await page.keyboard.up('ArrowDown');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:590}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:140,y:590}]});await page.waitForTimeout(300);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  const moved=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.player;return {x:p.x,y:p.y};});
  if(Math.hypot(moved.x-start.x,moved.y-start.y)<30)throw Error('移动未生效');
  if(!await page.locator('#joystick').isHidden())throw Error('取消未释放摇杆');
  // 用同一组正式对象固定画面，仅冻结更新时钟（不打开暂停遮罩），避免比较时种类逃出镜头。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.state='playing';g.update=()=>{};Object.assign(g.player,{x:900,y:850,invincible:0,flash:0});g.fx.items=[];g.numbers=[];g.shots=[];g.projectiles=[];
    const positions=[[-100,-30],[100,-30],[-110,100],[100,110],[0,160]];
    g.enemies.forEach((e,i)=>{const [dx,dy]=positions[i];e.x=900+dx;e.y=850+dy;e.knockTime=e.z=e.rollAngle=0;});a.refresh();});
  const budgets=[];
  for(const width of [1280,390,320])for(const time of ['day','night']){
    await page.setViewportSize({width,height:width===1280?960:844});
    budgets.push(await page.evaluate(async({time,width})=>{
      const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
      a.environment.time=time;a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');
      if(time==='night'&&!a.game.vehicle.active)a.game.summonVehicle();if(time==='day'&&a.game.vehicle.active)a.game.dismountVehicle();
      a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();return {width,time,bolts:a.game.enemyBolts.length};
    },{time,width}));await page.screenshot({path:`output/playwright/ranged-enemies/field-${width}-${time}.png`});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/ranged-enemies/reduced-320.png'});await page.emulateMedia({reducedMotion:'no-preference'});
  const frames=await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{monsterAtlasStats}=await import('/src/rendering/monster-atlas.js');
    const before=monsterAtlasStats();const gallery=document.createElement('canvas');gallery.id='ranged-gallery';gallery.width=1200;gallery.height=500;
    gallery.style.cssText='position:absolute;z-index:999;top:0;left:0;width:1200px;background:#eee8c8';document.body.append(gallery);
    const c=gallery.getContext('2d'),tile=document.createElement('canvas');tile.width=400;tile.height=250;const frames=[];
    for(let i=0;i<6;i++){await renderVisualCase(tile.getContext('2d'),'ranged-enemy-variety',i*.24);frames.push(tile.toDataURL());c.drawImage(tile,(i%3)*400,Math.floor(i/3)*250);}
    const after=monsterAtlasStats();if(before.bytes!==after.bytes)throw Error('远程怪新增图集缓存');
    return {unique:new Set(frames).size,before,after};
  });
  await page.setViewportSize({width:1280,height:960});await page.locator('#ranged-gallery').screenshot({path:'output/playwright/ranged-enemies/frames.png'});
  await page.evaluate(()=>document.getElementById('ranged-gallery').remove());
  if(frames.unique!==6)throw Error('动作连续帧缺少局部变化');if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'ranged-enemy-variety',maximumBolts:Math.max(...samples.map(s=>s.bolts)),movement:Math.hypot(moved.x-start.x,moved.y-start.y),budgets,frames,errors};
}
