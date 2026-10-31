// 清澈风格实机检查：所有位置夹具仅选取真实地点，动作、天气和进出仍使用正式循环。
async page=>{
 const root='C:/Users/zhengtingjun/.codex/worktrees/art-style-options/game-shoot/output/playwright/clear-world-style/';
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:root,size:{width:390,height:844}}});
 const p=await context.newPage(),errors=[],samples=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto('http://localhost:4176/?artPreview=idle-cat-pine&artRevision=3');
  await p.waitForFunction(()=>document.querySelector('#vehicle-button')?.getAttribute('aria-pressed')==='true',null,{timeout:60000});
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;window.inspect=()=>import('/src/rendering/visual-review.js').then(m=>m.inspectClearWorld(a.renderer,document));a.game.spawnTimer=999;a.game.mainlineSpeech=null;});
  const storage=await p.evaluate(()=>JSON.stringify({...localStorage}));
  // 截图端点用原过渡器初始化；连续天气另行用真实按钮等待，不覆盖更新函数。
  async function environment(time,weather='sun',season='summer'){
   await p.evaluate(async({time,weather,season})=>{document.querySelector(`button[data-time="${time}"]`).click();document.querySelector(`button[data-weather="${weather}"]`).click();document.querySelector(`button[data-forest-season="${season}"]`).click();a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.seasons.reset(season);a.refresh();},{time,weather,season});
  }
  // 相同位置昼夜对照，保持镜头和实际碰撞；清除敌人仅防止检查过程中被击倒。
  async function photograph(name,position,time,weather='sun',season='summer'){
   await environment(time,weather,season);
   await p.evaluate(position=>{const g=a.game;g.enemies=[];g.spawnTimer=999;Object.assign(g.player,{...position,vx:0,vy:0});a.renderer.camera.time=null;},position);
   await p.waitForTimeout(450);await p.screenshot({path:root+name+'.png'});
   const s=await p.evaluate(()=>inspect());if(s.overflow||s.budget.contextLost||s.budget.ground>s.budget.groundLimit)throw Error('布局或缓存异常');samples.push({name,...s});
  }
  const sites=await p.evaluate(async()=>{
   const {COTTAGES}=await import('/src/world/scenery.js'),{NATURAL_TERRAIN}=await import('/src/world/natural-terrain.js'),{LIVING_PLACES}=await import('/src/config/living-world.js');
   return [...COTTAGES.map((c,i)=>({id:'building-'+i,x:c.x+75,y:c.y+65})),...NATURAL_TERRAIN.lakes.map((l,i)=>({id:'lake-'+i,x:l.x,y:l.y+l.ry+80})),...Object.values(LIVING_PLACES).filter((_,i)=>i%3===0).map((l,i)=>({id:'living-'+i,x:l.x+65,y:l.y+60}))];
  });
  for(const site of sites)for(const time of ['day','night'])await photograph(site.id+'-'+time,site,time);
  // 小屋积雪与夜间窗光同源，手机窄屏显示不改逻辑尺寸。
  await p.setViewportSize({width:320,height:568});
  for(const [time,weather,season]of [['day','sun','summer'],['night','rain','summer'],['day','snow','winter']])await photograph('cottage-320-'+weather,sites[0],time,weather,season);
  await p.setViewportSize({width:390,height:844});
  for(const weather of ['cloud','rain','thunder','snow'])await photograph('camp-'+weather,{x:1030,y:800},'day',weather,weather==='snow'?'winter':'summer');
  // 真实15秒天气切换中继续移动，再暂停检查动作时钟冻结。
  await photograph('weather-start',{x:1030,y:800},'day');
  await p.evaluate(()=>document.querySelector('button[data-weather="rain"]').click());
  const start=await p.evaluate(()=>inspect());await p.keyboard.down('ArrowLeft');await p.waitForTimeout(300);await p.keyboard.up('ArrowLeft');
  await p.waitForTimeout(6000);const mid=await p.evaluate(()=>inspect());await p.screenshot({path:root+'weather-mid.png'});
  await p.waitForFunction(()=>a.renderer.light.sample(performance.now()).rain>.999,null,{timeout:18000});const end=await p.evaluate(()=>inspect());
  if(!(start.light.rain<mid.light.rain&&mid.light.rain<end.light.rain))throw Error('天气未连续变化');
  await p.locator('#settings-button').tap();const paused=await p.evaluate(()=>a.game.time);await p.waitForTimeout(250);if(await p.evaluate(()=>a.game.time)!==paused)throw Error('暂停时钟未冻结');await p.locator('#close-settings').tap();
  // 九寨沟通过原地图切换接口进入，同屏核对专属水色与瀑布，并保留真实更新。
  await p.evaluate(()=>{a.game.boss=null;if(!a.game.switchMap('jiuzhaigou'))throw Error('地图切换失败');});
  for(const site of [{id:'valley-lake',x:710,y:780},{id:'valley-falls',x:1510,y:1640}])for(const time of ['day','night'])await photograph(site.id+'-'+time,site,time);
  await p.evaluate(()=>{if(!a.game.switchMap('forest'))throw Error('返回森林失败');});
  await environment('day');
  // 从真实门口候停进入两工坊，走动并由原出口候停返回室外。
  await p.locator('#vehicle-button').tap();await p.waitForFunction(()=>!a.game.vehicle.active);
  const rooms=await p.evaluate(async()=>Object.entries((await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS));
  const entered=[];
  for(const [kind,room]of rooms){
   await p.evaluate(room=>{const g=a.game;g.cottageDoorLatch=false;g.cottageEntry=null;Object.assign(g.player,{...room.door,vx:0,vy:0});a.renderer.camera.time=null;},room);
   await p.waitForFunction(kind=>a.game.cottage?.kind===kind,kind,{timeout:7000});entered.push(kind);
   for(const time of ['day','night']){await environment(time);await p.evaluate(async time=>{const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(v=>v.id===time).start+1000;a.refresh();},time);await p.waitForTimeout(250);await p.screenshot({path:root+'interior-'+kind+'-'+time+'.png'});}
   const before=await p.evaluate(()=>a.game.player.x);await p.keyboard.down('ArrowLeft');await p.waitForTimeout(300);await p.keyboard.up('ArrowLeft');if(await p.evaluate(()=>a.game.player.x)>=before)throw Error('工坊无法行走');
   await p.evaluate(room=>{Object.assign(a.game.player,{...room.exit,vx:0,vy:0});},room);await p.waitForFunction(()=>!a.game.cottage,null,{timeout:7000});
  }
  if(await p.evaluate(()=>JSON.stringify({...localStorage}))!==storage)throw Error('试玩写入用户存档');
  if(errors.length)throw Error(errors.join('\n'));
  return {passed:true,designCriterion:'clear-world-style',samples,weatherTransition:{start:start.light,mid:mid.light,end:end.light,moved:end.player},entered,storageUnchanged:true,errors};
 }finally{await context.close();await p.video().saveAs(root+'runtime.webm');}
}
