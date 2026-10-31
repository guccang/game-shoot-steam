// 真触屏上下文记录连通区行走、绕建筑与点击；不以鼠标事件代替触摸。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/town-touch-video',size:{width:390,height:844}}});
 const t=await context.newPage(),errors=[];t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4291');
 await t.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await t.reload();await t.locator('#start').tap();
 await t.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  a.game.enemies=[];a.game.spawnTimer=a.game.fireClock=a.game.attackTimer=999;
  Object.assign(a.game.player,{x:690,y:1330,vx:0,vy:0});a.renderer.camera.time=null;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});
 });
 const cdp=await context.newCDPSession(t);
 // 一次拖动持续推进实际游戏帧，位置不在中途重设。
 async function drag(dx,dy,ms){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:500}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130+dx,y:500+dy}]});
  await t.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await t.waitForTimeout(200);
 }
 await drag(0,65,1700);
 const joined=await t.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 if(joined.y<1420)throw Error('触摸穿过连接处失败 '+JSON.stringify(joined));
 await drag(0,-65,1500);
 const returned=await t.evaluate(()=>a.game.player.y);
 if(returned>joined.y-70)throw Error('触摸返回失败');
 await t.screenshot({path:'output/playwright/town-touch-joined.png'});
 // 工坊侧后、门前与另一侧形成连续绕行，检查身体透显和脚底排序。
 await t.evaluate(()=>{Object.assign(a.game.player,{x:235,y:550,vx:0,vy:0});a.renderer.camera.time=null;});
 await drag(0,65,1000);await drag(65,0,2100);await drag(0,-65,1100);
 await t.screenshot({path:'output/playwright/town-touch-workshop-side.png'});
 await t.evaluate(async()=>{
  const p=(await import('/src/config/story-posts.js')).STORY_POSTS[0];
  Object.assign(a.game.player,{x:p.x,y:p.y+30,vx:0,vy:0});a.renderer.camera.time=null;
 });
 await t.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='post-sunleaf-post');
 await t.locator('#nearby-interaction').tap();await t.locator('#story-dialog').waitFor({state:'visible'});
 await t.screenshot({path:'output/playwright/town-touch-task.png'});await t.locator('#story-close').tap();
 await t.evaluate(async()=>{
  const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
  a.environment.time='dusk';document.getElementById('time-picture').click();a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
  Object.assign(a.game.player,{x:690,y:1360,vx:0,vy:0});a.renderer.camera.time=null;
 });
 await drag(65,0,1000);await drag(-65,0,1000);
 await t.screenshot({path:'output/playwright/town-touch-night.png'});
 const inspection=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectTownLayout(a.game,a.renderer,document));
 const video=t.video();await context.close();const videoPath=await video.path();
 if(errors.length||inspection.overflow)throw Error(JSON.stringify({errors,inspection}));
 return {joined,returned,videoPath,errors,inspection};
}
