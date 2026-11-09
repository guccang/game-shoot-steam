// 隔离上下文验证清缴材料追踪、真实击杀到账、详情暂停恢复和昼夜窄屏布局。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[],dir='output/playwright/clearing-material-hud';page.on('pageerror',e=>errors.push(e.message));
 // 从正式绘制器审核入口读取UI，检查与波次、领主栏和设置的空间关系。
 async function inspect(label){const r=await page.evaluate(async()=>{
  const r=(await import('/src/rendering/visual-review.js')).inspectClearingMaterialTracking(a.game,document),frame=document.getElementById('game-frame').getBoundingClientRect();
  const cards=['quest','boss-hud'].map(id=>document.getElementById(id)).filter(n=>!n.hidden&&n.offsetHeight),bottom=Math.max(...cards.map(n=>n.getBoundingClientRect().bottom));
  const g=a.game,expected=(await import('/src/progression/workshop/equipment-goals.js')).equipmentRequirements(g.progress,g.progress.equipmentGoal.kind,g.progress.equipmentGoal.index).filter(row=>row.missing>0).map(row=>row.key);
  return {...r,expected,bottom,frame:{left:frame.left,right:frame.right},clipped:[...document.querySelectorAll('.clearing-goal-resource')].some(n=>n.scrollWidth>n.clientWidth+1)};
 });if(JSON.stringify(r.resources.map(row=>row.key))!==JSON.stringify(r.expected)||r.resources.some(row=>row.met))throw Error('资源筛选错误 '+JSON.stringify(r));if(!r.visible||!r.clearing||r.box.height<44||r.box.top<r.bottom+5||r.box.left<r.frame.left||r.box.right>r.frame.right||r.overflow||r.clipped)throw Error(label+JSON.stringify(r));samples.push({label,...r});return r;}
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.bosses=4;p.living.patrolActive=true;p.equipmentGoal={kind:'weapons',index:6};p.weapons[6]=0;p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.wildScatterVersion=1;p.vehicleHulls[0]=1;p.vehicleIndex=0;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.update=()=>{};g.spawnTimer=999;g.enemies=[];
   const site=(await import('/src/progression/story/clearing-site.js')).clearingSite(p);Object.assign(g.player,site);g.wave=21;g.summonVehicle();a.renderer.camera.time=null;a.refresh();
  });
  await inspect('怪潮初始');
  // 实际击杀精英触发材料结算，观察应用正常刷新，不由测试替换HUD文字。
  const before=await page.evaluate(()=>a.game.progress.materials.parts);
  await page.evaluate(()=>{const g=a.game,e=g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y+30},{ambient:true});e.rank=2;e.biome='pine';g.hit(e,1e9);});
  await page.waitForFunction(before=>a.game.progress.materials.parts>before&&document.querySelector('[data-goal-resource="parts"] b').textContent.startsWith(String(a.game.progress.materials.parts)+'/'),before);
  await inspect('击杀实时到账');
  await page.locator('#equipment-goal').tap();await page.locator('#equipment-goal-dialog').waitFor({state:'visible'});if(await page.evaluate(()=>a.game.state)!=='paused')throw Error('详情未暂停');
  await page.locator('#close-goal').tap();await page.waitForFunction(()=>a.game.state==='playing');await inspect('关闭详情恢复');
  await page.locator('#task-navigation-toggle').tap();await inspect('关闭寻路保留追踪');await page.locator('#task-navigation-toggle').tap();
  for(const [width,height]of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const e=a.environment;Object.assign(e,{time,autoTime:false,autoWeather:false,weather:'sun',livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.refresh();},time);await page.waitForTimeout(180);
   await inspect(`${width}-${time}`);await page.screenshot({path:`${dir}/${width}-${time}.png`});
  }
  await page.setViewportSize({width:320,height:568});await page.evaluate(()=>{a.game.boss={type:'boss',kind:'boar',name:'铁牙野猪王',x:a.game.player.x+130,y:a.game.player.y+80,hp:900,maxHp:1200,radius:45,phase:'walk',flash:0};a.refresh();});await inspect('领主战');await page.screenshot({path:dir+'/boss-320.png'});
  // 精确达成后移除该项，尚缺的资源继续显示；详情仍能查看已完成的完整需求。
  await page.evaluate(async()=>{const g=a.game,rows=(await import('/src/progression/workshop/equipment-goals.js')).equipmentRequirements(g.progress,'weapons',6);g.progress.materials.parts=rows.find(r=>r.key==='parts').need;a.refresh();});
  const partial=await inspect('零件精确达成');if(partial.resources.some(r=>r.key==='parts'))throw Error('达成项未移除');await page.screenshot({path:dir+'/missing-only-320.png'});
  await page.locator('#equipment-goal').tap();if(!await page.locator('#goal-details .requirement-row.met').count())throw Error('完整需求缺少已完成资源');await page.locator('#close-goal').tap();
  await page.evaluate(()=>{a.game.progress.materials={parts:9999999,crystal:9999999,core:9999999};a.refresh();});const met=await inspect('材料齐备但金币木材不足');if(met.resources.some(r=>!['coins','wood'].includes(r.key)))throw Error('齐备材料仍显示');await page.screenshot({path:dir+'/met-320.png'});
  await page.evaluate(()=>{a.game.progress.coins=a.game.progress.wood=9999999;a.refresh();});const ready=await inspect('全部备齐');if(ready.resources.length||!ready.text.includes('资源已备齐'))throw Error('齐备提示不正确');await page.screenshot({path:dir+'/ready-320.png'});
  await page.evaluate(()=>{a.game.progress.materials.crystal=0;a.refresh();});const spent=await inspect('晶体再次不足');if(spent.resources.length!==1||spent.resources[0].key!=='crystal')throw Error('缺口未恢复');await page.screenshot({path:dir+'/crystal-short-320.png'});
  await page.evaluate(()=>{a.game.progress.equipmentGoal={kind:'vehicle',index:2};a.game.progress.vehicleHulls[2]=0;a.refresh();});await inspect('切换车型目标');
  await page.evaluate(()=>{a.game.progress.equipmentGoal=null;a.refresh();});if(await page.locator('#equipment-goal').isVisible())throw Error('取消未隐藏');
  await page.evaluate(()=>{a.game.progress.equipmentGoal={kind:'weapons',index:6};a.game.boss=null;a.game.progress.living.patrolActive=false;a.refresh();});if(await page.evaluate(()=>document.getElementById('equipment-goal').classList.contains('clearing-material-goal')))throw Error('离开清缴未恢复原样式');
  await page.evaluate(()=>{a.game.progress.living.patrolActive=true;a.game.progress.weapons[6]=1;a.refresh();});if(await page.locator('#equipment-goal').isVisible())throw Error('已拥有目标未隐藏');
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'clearing-material-tracking',samples,errors};
 }finally{await context.close();}
}
