// 正式页面验证单行怪潮、双环数据、换波、领主状态与详情退出，不运行全量战斗测试。
async page=>{
 if(new URL(page.url()).port!=='4279')throw Error('仅用于隔离端口4279');
 const errors=[],samples=[],states=[];page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress(),gate=(await import('/src/config/camp-defense.js')).CAMP_GATES.find(g=>g.id==='top');
  p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.living.position={x:gate.x,y:gate.y+50};p.vehicleHulls[1]=2;p.vehicleIndex=1;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.setViewportSize({width:390,height:900});await page.locator('#start').click();
 await page.locator('[data-camp-gate="top"]').click();await page.locator('#camp-primary').click();
 await page.locator('#camp-defense-hud').waitFor({state:'visible'});
 // 固定场景只隔离战斗时间；HUD、环境、正式渲染和所有按钮仍按原路径运行。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;window.hudOriginalUpdate=g.update;g.update=()=>{};g.campDefense.timer=3;a.refresh();});
 // 每次读取实际圆环、行高和子项中心，保证不是仅修改隐藏文本。
 async function inspect(label){const sample=await page.evaluate(async()=>{const v=await import('/src/rendering/visual-review.js');return v.inspectCompactHordeHud(document);});
  if(sample.hud.height>48||sample.hud.top<0||sample.hud.bottom>900||sample.overflow||sample.items.some(b=>Math.abs(b.y+b.height/2-sample.hud.y-sample.hud.height/2)>1))throw Error('未保持屏内单行 '+JSON.stringify(sample));
  if(sample.order.join(',')!=='camp-hp,camp-boss,camp-wave-status,camp-help')throw Error('HP、领主、进度、详情顺序错误');
  states.push({label,...sample});return sample;}
 let s=await inspect('开始等待');if(s.time!==0||s.kills!==0||s.wave!=='1')throw Error('首波初始化错误');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;(await import('/src/core/camp/camp-defense.js')).updateCampDefense(a.game,1.5);a.refresh();});
 s=await inspect('等待一半');if(s.time!==50||s.timeOffset!==50||s.killOffset!==100)throw Error('等待环不独立');
 await page.screenshot({path:'output/playwright/compact-horde-hud/countdown-half.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.update=window.hudOriginalUpdate;a.game.state='paused';a.refresh();});
 await page.waitForTimeout(350);s=await inspect('暂停');if(s.time!==50)throw Error('暂停推进了倒计时');
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense,m=await import('/src/core/camp/camp-defense.js');g.state='playing';g.update=()=>{};
  m.updateCampDefense(g,1.5);g.enemies=[];r.spawned=32;g.summonVehicle();g.player.angle=-Math.PI/2;
  for(let i=0;i<32;i++){const e=g.spawnEnemy(0,0,{x:g.player.x+(i%8-3.5)*28,y:g.player.y-145-Math.floor(i/8)*32},{ambient:true});
   Object.assign(e,{campDefense:true,arena:r.arena,hp:1000,maxHp:1000,speed:0,damage:0});if(i<16){e.hp=0;m.campDefenseKill(g,e);}}
  g.enemies=g.enemies.filter(e=>e.hp>0);a.renderer.camera.time=null;
  a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();
 });
 s=await inspect('清理一半');if(s.time!==100||s.kills!==16||s.killOffset!==50||s.count!==32)throw Error('清怪环不独立');
 for(const lighting of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};},lighting);
  await page.waitForTimeout(21000);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});await page.waitForTimeout(250);
   samples.push({lighting,width,...await inspect(`${lighting}-${width}`)});
   await page.screenshot({path:`output/playwright/compact-horde-hud/${width}-${lighting}.png`});}
 }
 await page.setViewportSize({width:390,height:900});
 // 用真实触摸点击窄屏问号，避免只依靠程序调用验证命中区域。
 const help=await page.locator('#camp-help').boundingBox(),touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:help.x+help.width/2,y:help.y+help.height/2}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 await page.locator('#camp-defense-dialog').waitFor({state:'visible'});
 if(!await page.locator('.camp-ring-key').isVisible()||!await page.locator('#camp-leave').isVisible())throw Error('说明或退出入口丢失');
 await page.screenshot({path:'output/playwright/compact-horde-hud/details.png'});await page.locator('#camp-close').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,m=await import('/src/core/camp/camp-defense.js');
  for(const e of g.enemies){e.hp=0;m.campDefenseKill(g,e);}g.enemies=[];m.updateCampDefense(g,0);a.refresh();});
 s=await inspect('进入第二波');if(s.wave!=='2'||s.time!==0||s.kills!==0||s.timeOffset!==100||s.killOffset!==100)throw Error('换波未重置');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense,c=(await import('/src/config/camp-defense.js')).CAMP_DEFENSE;
  r.wave=10;r.cleared=9;r.timer=0;r.waveKills=r.spawned=c.waves[9].count;(await import('/src/core/camp/camp-defense.js')).updateCampDefense(g,0);a.refresh();});
 s=await inspect('领主登场');if(s.wave!=='10'||s.total!=='/10'||s.boss!=='active'||s.killOffset!==0)throw Error('领主阶段错误');
 await page.screenshot({path:'output/playwright/compact-horde-hud/boss.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;(await import('/src/core/camp/camp-defense.js')).rescueCampDefense(a.game,'death');a.refresh();});
 s=await inspect('伙伴接应');if(s.boss!=='active')throw Error('接应误报领主已击败');
 await page.locator('#camp-help').click();await page.locator('#camp-leave').click();
 const exited=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.update=window.hudOriginalUpdate;
  return !a.game.campDefense&&document.getElementById('camp-defense-hud').hidden&&!document.getElementById('camp-defense-dialog').open;});
 if(!exited||errors.length)throw Error('退出或资源异常 '+JSON.stringify(errors));
 return {samples,states,exited,errors};
}
