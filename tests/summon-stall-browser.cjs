// 正式森林同屏回归：机械猫和金杯猫绕树接敌，检查逐帧碰撞、连续位移与实际命中。
async page=>{
 if(new URL(page.url()).port!=='4303')throw Error('仅允许隔离端口4303');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],results=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4303');await t.locator('#start').tap();await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 for(const kind of ['mechanical','crew'])for(const time of ['day','night']){
  await t.evaluate(async({kind,time})=>{
   const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{blocked}=await import('/src/physics/motion.js'),{updateMechanical}=await import('/src/combat/mechanical.js'),{updateCatCrew}=await import('/src/combat/cat-crew.js'),{vehicleCompanionContext}=await import('/src/combat/vehicle-companions.js');
   const g=a.game,p=freshProgress();p.weapon=15;p.weapons[15]=1;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';if(kind==='crew'){p.vehicleHulls[7]=1;p.vehicleIndex=7;}
   delete g.weapon;g.progress=validateProgress(p);g.reset();g.state='playing';g.workshopTrial=true;g.enemies=[];g.trees=[];g.boss=null;
   // 查找真实森林里可容纳整段绕行的小片干地，不替换地形或关闭碰撞。
   let origin;for(let x=1700;x<3000&&!origin;x+=100)for(let y=1600;y<2600&&!origin;y+=100){if([-80,0,80,160].every(dx=>[-80,0,80].every(dy=>!blocked(x+dx,y+dy,16,[],{mapId:'forest'}))))origin={x,y};}
   if(!origin)throw Error('未找到实际可通行场地');Object.assign(g.player,origin,{arena:null});
   if(kind==='crew'&&!g.summonVehicle())throw Error('金杯前置失败');
   const local=kind==='crew'?vehicleCompanionContext(g):g,base=local.weapon();local.weapon=()=>({...base,summonCount:1});
   const tick=kind==='crew'?updateCatCrew:updateMechanical;
   for(let i=0;i<120;i++){g.time+=1/60;tick(local,1/60);}
   const n=local.mechanical.nodes[0];Object.assign(n,{x:origin.x+90,y:origin.y,emerge:0,cooldown:0,windup:0});
   g.addTree(origin.x+110,origin.y,{radius:10});g.trees[0].hp=10000;
   const e=g.spawnEnemy(0,0,{x:origin.x+130,y:origin.y});Object.assign(e,{hp:10000,maxHp:10000,speed:0,damage:0,radius:16,mass:100000});
   window.stallSample={kind,time,start:{x:n.x,y:n.y},maxStep:0,collisions:0,path:0,target:e,node:n};
   // 只冻结随机世界事件，伙伴逐帧运行正式部署、寻路、步态和近战命中。
   g.update=dt=>{if(g.state!=='playing')return;const old={x:n.x,y:n.y};g.time+=dt;tick(local,dt);g.fx.update(dt);const d=Math.hypot(n.x-old.x,n.y-old.y);stallSample.maxStep=Math.max(stallSample.maxStep,d);stallSample.path+=d;if(blocked(n.x,n.y,n.radius,g.trees,n))stallSample.collisions++;};
   Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,weather:'sun',forestSeason:'summer',time:time==='day'?'night':'dusk'});document.getElementById('time-picture').click();
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
  },{kind,time});
  await t.screenshot({path:`output/playwright/summon-stall/${kind}-${time}-before.png`});
  await t.waitForFunction(()=>stallSample.target.hp<10000,null,{timeout:15000});
  const result=await t.evaluate(()=>({kind:stallSample.kind,time:stallSample.time,hp:stallSample.target.hp,path:stallSample.path,maxStep:stallSample.maxStep,collisions:stallSample.collisions,mode:stallSample.node.mode}));
  if(result.collisions||result.path<5||result.maxStep>20)throw Error('绕行碰撞或位移异常 '+JSON.stringify(result));results.push(result);
  await t.screenshot({path:`output/playwright/summon-stall/${kind}-${time}-hit.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();await page.evaluate(r=>window.summonStallResult=r,{results,errors});
}
