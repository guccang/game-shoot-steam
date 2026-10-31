// 母巢围栏绕行实机验收：保留完整森林，连续帧观察入门动作和碰撞。
async page=>{
 if(new URL(page.url()).port!=='4283')throw Error('仅允许隔离端口');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 async function mount(width,night=false,gate=false){
  await page.setViewportSize({width,height:width===390?844:800});
  await page.evaluate(async({night,gate})=>{
   (window.hudApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   const p=freshProgress();p.weapons.fill(1);p.weapon=16;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:200,y:850};p.living.calendar={day:1,elapsed:night?1100000:400000};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:night?'night':'day',autoTime:false,autoWeather:false}));
   const {createApplication}=await import('/src/app/create-app.js');window.hudApp=createApplication();
  },{night,gate});
  await page.locator('#start').click();await page.waitForFunction(()=>hudApp.menu.page==='game');
  await page.evaluate(()=>{hudApp.game.update=()=>{};});
 }


 for(const [width,night] of [[1280,false],[390,true]]){
  await mount(width,night);
  await page.evaluate(async()=>{
   const g=hudApp.game,{updateSpider}=await import('/src/combat/spider.js'),{worldDistance}=await import('/src/world/coordinates.js'),{settlementBlocked}=await import('/src/world/settlements.js');
   Object.assign(g.spider.mother,{x:80,y:850,ready:true,mapId:'forest',arena:g.player.arena});
   window.spiderWalk={frames:0,distance:0,maxStep:0,collision:false,gate:false};
   g.update=dt=>{if(g.state!=='playing')return;const m=g.spider.mother,old={x:m.x,y:m.y};g.time+=dt;updateSpider(g,dt,false);const step=worldDistance(m,old);spiderWalk.frames++;spiderWalk.distance+=step;spiderWalk.maxStep=Math.max(spiderWalk.maxStep,step);spiderWalk.collision||=settlementBlocked(m.x,m.y,m.radius);spiderWalk.gate||=m.x>95&&m.x<145&&m.y>668&&m.y<790;};
   hudApp.refresh();
  });
  await page.screenshot({path:`output/playwright/spider-fence-corner/start-${width}-${night?'night':'day'}.png`});
  await page.waitForFunction(()=>hudApp.game.spider.mother.x>149&&hudApp.game.spider.mother.y>820,null,{timeout:25000});
  await page.waitForFunction(()=>!hudApp.game.spider.mother.moving,null,{timeout:10000});
  const result=await page.evaluate(()=>({...spiderWalk,x:hudApp.game.spider.mother.x,y:hudApp.game.spider.mother.y,trees:hudApp.game.trees.length}));
  if(result.collision||!result.gate||result.maxStep>12||!result.trees)throw Error(JSON.stringify(result));checks.push({width,night,...result});
  await page.screenshot({path:`output/playwright/spider-fence-corner/arrived-${width}-${night?'night':'day'}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,checks,errors};
}
