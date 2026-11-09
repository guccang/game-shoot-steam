// 在正式应用中受伤、返营、观察回血，记录手机昼夜和满血隐藏；服务默认4175，由调用页面选择隔离端口。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const p=(await import('/src/progression/progress.js')).freshProgress(),cfg=await import('/src/config/monster-camps.js');p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.bosses=20;p.fireDispatch.next=999999;p.living.position=cfg.campVisitorSite(cfg.MONSTER_CAMPS[6]);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;window.cfg=await import('/src/config/monster-camps.js');window.camps=await import('/src/core/battle/monster-camps.js');window.bars=await import('/src/rendering/enemies.js');window.camp=cfg.MONSTER_CAMPS[6];
  const g=a.game;g.attackTimer=g.encounterTimer=g.mainlineTalkDelay=999999;g.mainlineSpeech=null;g.player.invincible=999999;Object.assign(g.player,camp);camps.updateMonsterCamps(g,.04);window.actors=g.enemies.filter(e=>e.monsterCamp===camp.id);
  for(const e of actors)g.hit(e,e.maxHp*.6);
  Object.assign(g.player,{x:camp.x+900,y:camp.y});for(let i=0;i<30;i++)camps.updateMonsterCamps(g,.05);
  if(actors.some(e=>e.campState!=='idle'))throw Error('未完成返营');
  Object.assign(g.player,{x:camp.x,y:camp.y-cfg.MONSTER_CAMP_RULES.radius-18});a.renderer.camera.time=null;
 });
 // 记录真实帧时间推进，绿色进度必须跟随HP增长；无复制展示对象。
 await page.waitForTimeout(500);
 const before=await page.evaluate(()=>actors.map(e=>({hp:e.hp,bar:bars.enemyHealthBarView(e)})));
 await page.screenshot({path:'output/playwright/camp-healing-bar/progress-before.png'});
 await page.waitForTimeout(2200);
 const after=await page.evaluate(()=>actors.map(e=>({hp:e.hp,bar:bars.enemyHealthBarView(e)})));
 if(after.some((e,i)=>!e.bar||e.bar.color!=='#a9d68b'||e.hp<=before[i].hp||e.bar.fraction<=before[i].bar.fraction))throw Error('回血进度未增长');
 await page.screenshot({path:'output/playwright/camp-healing-bar/progress-after.png'});samples.push({before,after});
 for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{Object.assign(a.environment,{time:phase,autoTime:false,weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;a.renderer.camera.time=null;},phase);
  await page.waitForTimeout(350);await page.screenshot({path:`output/playwright/camp-healing-bar/healing-${width}-${phase}.png`});
  const state=await page.evaluate(()=>({bars:actors.map(e=>bars.enemyHealthBarView(e)),overflow:document.documentElement.scrollWidth>innerWidth}));if(state.overflow||state.bars.some(b=>!b))throw Error('血条缺失或页面溢出');samples.push({width,phase,...state});
 }
 // 加速正式模拟至恢复完成，实际绘制入口不再返回血条。
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{for(let i=0;i<800;i++)camps.updateMonsterCamps(a.game,.05);if(actors.some(e=>e.hp!==e.maxHp||bars.enemyHealthBarView(e)!==null))throw Error('满血未隐藏');});await page.waitForTimeout(350);await page.screenshot({path:'output/playwright/camp-healing-bar/full-health.png'});
 if(errors.length)throw Error(errors.join('\n'));return {samples,fullHidden:true,errors};
}
