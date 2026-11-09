// 累计盾牌实机验收：正式绘制、两门入口、昼夜、长数字、领取和续档。
async page=>{
 if(new URL(page.url()).port!=='4285')throw Error('仅允许4285隔离端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.campDefense.runs=9;
  p.vehicleIndex=0;p.vehicleHulls[0]=3;p.vehicleWeapons[17]=3;p.vehicleLoadouts[0]=17;
  p.living.position={x:180,y:690};localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.setViewportSize({width:390,height:900});await page.locator('#start').click();
 await page.evaluate(async()=>{window.signApp=(await import('/src/main.js')).application;await signApp.ready;const g=signApp.game;
  Object.assign(g.player,(await import('/src/core/vehicles/camp-parking.js')).vehicleParkingSite(g,0));if(!g.summonVehicle())throw Error('召唤战车失败');
  window.signUpdate=g.update;g.update=()=>{};
 });
 // 正式审核入口与Canvas文字绘制同时核对，不以隐藏DOM文字代替牌面。
 async function inspect(expected){await page.waitForFunction(n=>[...document.querySelectorAll('[data-camp-gate]')].every(h=>h.getAttribute('aria-label').includes(`已完成${n}次`)),expected);const s=await page.evaluate(async()=>{
  const a=signApp,r=a.renderer,c=r.ctx||r.context||r.canvas.getContext('2d'),texts=[],fill=c.fillText;
  c.fillText=function(text,...args){texts.push(String(text));return fill.call(this,text,...args);};try{r.draw();}finally{c.fillText=fill;}
  return {...(await import('/src/rendering/visual-review.js')).inspectHordeCompletedSign(a.game,document),texts,night:r.light.sample(performance.now()).night,vehicle:a.game.vehicle.active};
 });
 if(s.overflow||s.completed!==expected||s.signs.length!==2||s.signs.some(p=>p.completed!==expected||p.countText!==String(expected)))throw Error('累计牌面数据错误 '+JSON.stringify(s));
 if(s.texts.includes('兽潮已完成')||s.texts.includes(`${expected} 次`)||!s.texts.includes(String(expected)))throw Error('正式Canvas没有绘制次数');
 if(s.hits.some(h=>!h.label.includes(`已完成${expected}次`)))throw Error('无障碍名称未同步');return s;
 }
 for(const gate of ['left','top']){
  await page.evaluate(async gate=>{
   const a=signApp,g=a.game,m=(await import('/src/rendering/camp-defense.js')).campDefenseObjects(g).find(p=>p.id===gate);
   Object.assign(g.player,{x:m.x+45,y:m.y+75});g.enemies=[];
   const e=g.spawnEnemy(0,0,{x:m.x-75,y:m.y+55},{ambient:true});Object.assign(e,{hp:1000,maxHp:1000,speed:0,damage:0});
   a.refresh();a.renderer.draw();
  },gate);
  for(const phase of ['day','night']){
   await page.evaluate(async phase=>{
    const a=signApp,t=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase);
    a.game.progress.living.calendar={day:1,elapsed:t.start+t.duration/2};(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{weather:'sun',autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();
   },phase);
   for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(180);const s=await inspect(9);
    if(!s.vehicle||Math.abs(s.night-Number(phase==='night'))>.01||s.hits.find(h=>h.id===gate).hidden)throw Error('同屏夹具未就绪');
    samples.push({gate,phase,width,...s});await page.screenshot({path:`output/playwright/horde-completed-sign/${gate}-${width}-${phase}.png`});
   }
  }
 }
 await page.setViewportSize({width:390,height:900});
 for(const count of [0,10,999999]){
  await page.evaluate(n=>{signApp.game.progress.campDefense.runs=n;signApp.refresh();},count);await inspect(count);
  await page.screenshot({path:`output/playwright/horde-completed-sign/count-${count}.png`});
 }
 await page.evaluate(async()=>{const a=signApp,g=a.game;g.progress.campDefense.runs=9;g.enemies=[];g.update=signUpdate;
  const gate=(await import('/src/config/camp-defense.js')).CAMP_GATES.find(p=>p.id==='left');Object.assign(g.player,{x:gate.x+55,y:gate.y-60});g.state='playing';a.refresh();});
 // 实际驾驶绕行，确认扩大的纯装饰牌不会新增通行阻挡。
 const start=await page.evaluate(()=>({x:signApp.game.player.x,y:signApp.game.player.y}));
 await page.keyboard.down('KeyD');await page.waitForTimeout(450);await page.keyboard.up('KeyD');
 const moved=await page.evaluate(()=>({x:signApp.game.player.x,y:signApp.game.player.y}));if(moved.x-start.x<15)throw Error('实际驾驶未移动');
 await page.keyboard.down('KeyA');await page.waitForTimeout(450);await page.keyboard.up('KeyA');await page.waitForTimeout(150);
 // 点击新牌面顶部：原热点范围外的新区域也必须能打开原守门面板。
 const point=await page.evaluate(async()=>{const a=signApp,v=a.renderer.view,b=a.renderer.canvas.getBoundingClientRect(),m=(await import('/src/rendering/camp-defense.js')).campDefenseObjects(a.game).find(p=>p.id==='left');return {x:b.left+(m.x-v.x)*v.zoom,y:b.top+(m.y-129-v.y)*v.zoom};});
 const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
 await page.locator('#camp-defense-dialog').waitFor({state:'visible'});
 if(!(await page.locator('#camp-content').textContent()).includes('已完成 9 次兽潮'))throw Error('点击后缺少累计详细说明');
 await page.screenshot({path:'output/playwright/horde-completed-sign/details.png'});await page.locator('#camp-primary').click();
 await page.waitForFunction(()=>signApp.game.state==='playing'&&!!signApp.game.campDefense);
 await page.evaluate(async()=>{const a=signApp,g=a.game,r=g.campDefense;g.enemies=[];Object.assign(r,{wave:10,waveKills:86,spawned:86,timer:0});(await import('/src/core/camp/camp-defense.js')).updateCampDefense(g,.01);g.hit(g.boss,g.boss.hp);a.refresh();});
 await page.locator('.camp-grade').waitFor({state:'visible'});
 if(await page.evaluate(()=>signApp.game.progress.campDefense.runs)!==9)throw Error('领奖前提前加次数');
 await page.locator('#camp-primary').click();await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').click();
 await page.waitForFunction(()=>signApp.game.state==='playing');await inspect(10);
 await page.screenshot({path:'output/playwright/horde-completed-sign/claimed.png'});
 await page.evaluate(()=>{signApp.game.progress.campDefense.runs=999999;signApp.refresh();});await inspect(999999);await page.screenshot({path:'output/playwright/horde-completed-sign/west-max.png'});await page.evaluate(()=>{signApp.game.progress.campDefense.runs=10;signApp.refresh();});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.signApp=(await import('/src/main.js')).application;});await page.waitForTimeout(300);await inspect(10);
 await page.screenshot({path:'output/playwright/horde-completed-sign/restored.png'});
 if(errors.length)throw Error(errors.join('\n'));return {pass:true,samples,movement:{start,moved},claimed:10,restored:10,errors};
}
