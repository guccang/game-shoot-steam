// 隔离端口验证领主真实入口、五场轮换以及各机制的手机画面。
async(page)=>{
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();localStorage.removeItem('forest-patrol-v1');});
 await page.reload();await page.locator('#start').click();
 const order=[];
 for(let index=0;index<5;index++){
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.kills+=12;a.game.enemies=[];a.game.spawnTimer=999;a.game.attackTimer=999;a.refresh();});
  await page.locator('#boss-button').click();
  const name=await page.locator('#boss-name').textContent();order.push(name);
  if(await page.locator('#boss-tactic').count()!==0 || !await page.locator('#boss-name').isVisible()||await page.locator('#quest').isVisible())throw Error('领主UI错误');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.hit(a.game.boss,1e8);a.refresh();});
 }
 if(new Set(order).size!==5)throw Error('领主未轮换');
 const results=[];
 for(const width of [320,390,580]){
  await page.setViewportSize({width,height:width===320?568:width===580?928:844});
  for(let index=0;index<4;index++){
   for(const stage of ['warning','active']){
    const result=await page.evaluate(async({index,stage})=>{
     const a=(await import('/src/main.js')).application,g=a.game,r=a.renderer;a.destroy();
     const {BOSSES}=await import('/src/config/bosses.js');
     g.progress.bosses=index;g.progress.hero=0;g.progress.heroes[0]=1;g.progress.weapon=0;g.reset();g.start();g.kills=12;g.enemies=[];g.spawnTimer=999;g.attackTimer=999;
     g.summonBoss();g.boss.attack=0;g.boss.speed=0;
     // 移除贴身遮挡树以观察美术；保留背景树林、道路与河流。
     g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>235);
     const duration=stage==='warning'?.6:BOSSES[index].windup+(index===0?.3:index===2?.45:.6);
     for(let t=0;t<duration;t+=.01)g.update(.01);
     const night=stage==='active';Object.assign(a.environment,{time:night?'night':'day',weather:night?'rain':'sun',autoTime:false,autoWeather:false});
     const {EnvironmentTransition}=await import('/src/world/environment.js');r.light=new EnvironmentTransition(a.environment,performance.now());
     document.getElementById('game-frame').dataset.time=a.environment.time;document.getElementById('game-frame').dataset.weather=a.environment.weather;
     document.getElementById('environment-button').textContent=night?'☾ 夜晚 · 小雨':'☀ 白昼 · 晴朗';
     r.resize();g.setViewport(r.width,r.height);r.draw();a.refresh();
     document.getElementById('toast').classList.remove('visible');
     if(stage==='warning'){
      const view=r.view,left=(g.boss.x-view.x-110)*view.zoom,right=(g.boss.x-view.x+110)*view.zoom;
      if(left<0||right>r.width)throw Error('领主入场剪影超出屏幕');
     }
     if(document.documentElement.scrollWidth>innerWidth)throw Error('横向溢出');
     const panel=document.getElementById('boss-hud').getBoundingClientRect();
     if(panel.left<0||panel.right>innerWidth||panel.height>90)throw Error('领主HUD溢出');
     if(!document.getElementById('boss-name').textContent.includes(BOSSES[index].name))throw Error('名称错误');
     const snapshot=JSON.stringify([g.boss,g.hazards]);r.draw();r.draw();if(snapshot!==JSON.stringify([g.boss,g.hazards]))throw Error('绘制推进攻击');
     return {kind:g.boss.kind,phase:g.boss.ai.phase,hazards:g.hazards.length,hudHeight:panel.height};
    },{index,stage});
    await page.screenshot({path:`output/playwright/boss-roster/${width}-${result.kind}-${stage}.png`});results.push({width,stage,...result});
   }
  }
 }
 // 独立画布记录统一美术全貌，确认四个新剪影不依赖 DOM 或战斗更新。
 await page.evaluate(async()=>{
  const {drawNewBoss}=await import('/src/rendering/bosses.js');const {BOSSES}=await import('/src/config/bosses.js');
  const canvas=document.createElement('canvas');canvas.id='boss-gallery';canvas.width=1000;canvas.height=330;canvas.style='position:fixed;inset:0;z-index:9999;background:#f5f1df;width:1000px;height:330px';document.body.append(canvas);
  const c=canvas.getContext('2d');c.fillStyle='#f5f1df';c.fillRect(0,0,1000,330);
  for(let i=0;i<4;i++){
   c.save();c.translate(125+i*250,220);c.scale(1.15,1.15);drawNewBoss(c,{kind:BOSSES[i].id,x:0,y:0,ai:{phase:'windup'},hp:100},1,true);c.restore();
   c.fillStyle='#304e40';c.font='bold 21px sans-serif';c.textAlign='center';c.fillText(BOSSES[i].name,125+i*250,272);
   c.fillStyle='#78866b';c.font='14px sans-serif';c.fillText(BOSSES[i].title,125+i*250,301);
  }
 });
 await page.setViewportSize({width:1000,height:330});await page.locator('#boss-gallery').screenshot({path:'output/playwright/boss-roster/roster.png'});
 await page.evaluate(()=>document.getElementById('boss-gallery').remove());
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.renderer.resize();a.renderer.draw();});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();
 if(errors.length)throw Error(errors.join(';'));
 return {order,results,renderReadOnly:true,reducedMotion:true,errors};
}
