// 工坊屋顶锚点实机验收：默认4175，已有服务运行时允许4176隔离验证。
async page=>{
 if(!['4175','4176'].includes(new URL(page.url()).port))throw Error('请使用本地验收端口');
 const errors=[],samples=[];page.on('pageerror',error=>errors.push(error.message));
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.progress.weapon=0;
  g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.enemies=[];g.vehicle.active=false;
  window.originalUpdate=g.update.bind(g);g.update=()=>{};
  window.rooms=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});a.refresh();
 });
 // 两种工坊只显示升级按钮，逐一验证昼夜、窄屏、横屏和宽视窗。
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,800]])for(const time of ['day','night'])for(const kind of ['weapons','vehicle']){
  await page.setViewportSize({width,height});
  await page.evaluate(async({kind,time})=>{
   const g=a.game,door=rooms[kind].door;g.cottage=null;g.vehicle.active=false;g.mainlineSpeech=null;Object.assign(g.player,{x:door.x,y:door.y+55,vx:0,vy:0});
   g.enemies=[];g.spawnEnemy(0,0,{x:door.x+140,y:door.y+80},{ambient:true});
   g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time});
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.refresh();
  },{kind,time});
  await page.waitForTimeout(200);
  const info=await page.locator('#nearby-interaction').evaluate(node=>({hidden:node.hidden,text:node.innerText,buttons:[node].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,disabled:b.disabled};}),overflow:document.documentElement.scrollWidth>innerWidth}));
  if(info.hidden||info.overflow||info.buttons.some(b=>b.w<44||b.h<44||b.x<0||b.y<0||b.x+b.w>width||b.y+b.h>height||b.disabled))throw Error(JSON.stringify({kind,width,height,time,info}));
  if(await page.locator('#operation-guide').isVisible())throw Error('主线提示覆盖工坊操作');
  samples.push({kind,width,height,time,info});
  if([320,390,844,1280].includes(width))await page.screenshot({path:`output/playwright/workshop-building-anchor/${kind}-${width}-${time}.png`});
 }
 // 在不同角色位置读取实际镜头投影，按钮中心必须始终对应建筑而非角色。
 const anchors=[];
 await page.setViewportSize({width:390,height:844});
 for(const kind of ['weapons','vehicle'])for(const offset of [-40,40]){
  await page.evaluate(({kind,offset})=>{const door=rooms[kind].door;Object.assign(a.game.player,{x:door.x+offset,y:door.y+55});a.renderer.camera.time=null;a.refresh();},{kind,offset});
  await page.waitForTimeout(150);
  const result=await page.evaluate(async kind=>{
   const v=a.renderer.view,site=rooms[kind].site,p=(await import('/src/world/coordinates.js')).nearest(site,{x:v.x+v.w/2,y:v.y+v.h/2});
   const button=document.querySelector('#nearby-interaction'),r=button.getBoundingClientRect(),canvas=a.renderer.canvas.getBoundingClientRect();
   return {actual:r.x+r.width/2,expected:canvas.x+(p.x-v.x)*v.zoom,player:canvas.x+(a.game.player.x-v.x)*v.zoom};
  },kind);
  if(Math.abs(result.actual-result.expected)>1||Math.abs(result.actual-result.player)<10)throw Error('按钮未固定在建筑 '+JSON.stringify(result));
  anchors.push({kind,offset,...result});
 }
 await page.locator('#nearby-interaction').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 if(await page.evaluate(()=>!!a.game.cottage))throw Error('升级按钮不应进入房间');
 await page.locator('#ws-close').click();
 if(errors.length)throw Error(errors.join('\n'));
 return {samples:samples.length,anchors,errors};
}