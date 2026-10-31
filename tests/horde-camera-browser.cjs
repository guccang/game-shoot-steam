// 怪潮正式页面验收：北门入口、昼夜三种屏宽、转向连续帧和真实键盘走位。
async page => {
 if(new URL(page.url()).port!=='4278')throw Error('仅用于隔离端口4278，不改本机游戏存档');
 const errors=[],samples=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  const gate=(await import('/src/config/camp-defense.js')).CAMP_GATES.find(g=>g.id==='top');
  p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';
  p.living.position={x:gate.x,y:gate.y+50};p.vehicleHulls[1]=2;p.vehicleIndex=1;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.setViewportSize({width:390,height:900});
 await page.locator('#start').click();await page.locator('[data-camp-gate="top"]').click();
 await page.locator('#camp-defense-dialog').waitFor({state:'visible'});
 await page.locator('#camp-primary').click();await page.locator('#camp-defense-hud').waitFor({state:'visible'});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense;
  g.summonVehicle();g.attackTimer=99999;g.vehicle.module.cooldown=99999;r.timer=99999;r.elapsed=-99999;g.enemies=[];
  // 固定敌群生命与位置，保持正式动作、绘制和自动瞄准，避免截图过程中换波。
  for(let row=0;row<4;row++)for(let col=-3;col<=3;col++){
   const e=g.spawnEnemy(0,0,{x:g.player.x+col*32,y:g.player.y-145-row*36},{ambient:true});
   Object.assign(e,{campDefense:true,arena:r.arena,hp:99999,maxHp:99999,speed:0,damage:0});
  }
  g.player.angle=-Math.PI/2;g.player.aimInitialized=true;
  a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();
 });
 for(const lighting of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;
   a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};},lighting);
  await page.waitForTimeout(21000);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(350);
   const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,v=await import('/src/rendering/visual-review.js');
    return {...v.inspectHordeCamera(a.game,a.renderer),hud:v.inspectCampDefense(a.game,document),visible:a.renderer.visibleStats};});
   if(sample.hud.overflow||sample.hud.overlappingHud)throw Error('界面越界或 HUD 重叠');
   if(Math.abs(sample.frontRatio-.7)>.02)throw Error('朝向比例不符 '+JSON.stringify(sample));
   samples.push({lighting,...sample});await page.screenshot({path:`output/playwright/horde-facing-camera/${width}-${lighting}.png`});
  }
 }
 await page.setViewportSize({width:390,height:900});
 // 冻结战斗，只推进正式镜头时钟，逐帧记录持续反向移动的观察方向调整。
 const turn=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,review=await import('/src/rendering/visual-review.js');
  // 仅冻结测试场景的战斗更新，不触发暂停面板遮挡连续构图证据。
  const update=g.update;g.update=()=>{};g.state='playing';g.player.angle=-Math.PI/2;g.player.vx=g.player.vy=0;
  const time=g.time;for(let i=1;i<=240;i++){g.time=time+i/60;a.renderer.draw();}
  const before=review.inspectHordeCamera(g,a.renderer);g.player.angle=Math.PI/2;g.player.vy=100;
  const origin=g.time,start=performance.now(),frames=[];
  await new Promise(resolve=>{
   // 真实动画帧推进正式绘制器，读回最终屏幕投影而非复制缓动公式。
   function frame(now){g.time=origin+Math.max(0,now-start)/1000;a.renderer.draw();frames.push(review.inspectHordeCamera(g,a.renderer));
    if(now-start<4000)requestAnimationFrame(frame);else resolve();}
   requestAnimationFrame(frame);
  });
  const first=frames[0],last=frames.at(-1);
  let maxPixelsPerSecond=0;
  for(let i=1;i<frames.length;i++){
   const dt=frames[i].time-frames[i-1].time;
   if(dt>0)maxPixelsPerSecond=Math.max(maxPixelsPerSecond,Math.abs(frames[i].player.y-frames[i-1].player.y)/dt);
  }
  g.update=update;
  return {before,first,last,frames:frames.length,maxPixelsPerSecond};
 });
 if(turn.frames<30||Math.abs(turn.first.player.y-turn.before.player.y)>31||Math.abs(turn.last.frontRatio-.7)>.003||turn.maxPixelsPerSecond>301)throw Error('转向未平滑 '+JSON.stringify(turn));
 await page.screenshot({path:'output/playwright/horde-facing-camera/turned-south.png'});
 // 从正式输入驱动移动，确认投影偏移没有改变走位与角色跟随。
 const beforeMove=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.state='playing';g.enemies=[];g.aimLock=null;g.trees=[];return {x:g.player.x,y:g.player.y};});
 await page.keyboard.down('KeyA');await page.waitForTimeout(500);await page.keyboard.up('KeyA');
 const afterMove=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {x:a.game.player.x,y:a.game.player.y,angle:a.game.player.angle,view:(await import('/src/rendering/visual-review.js')).inspectHordeCamera(a.game,a.renderer)};});
 if(beforeMove.x-afterMove.x<5)throw Error('键盘移动未生效');
 await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');
 if(errors.length)throw Error(errors.join('\n'));
 return {samples,turn,beforeMove,afterMove,errors};
}
