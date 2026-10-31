// 红狼真实键盘碾树验收；默认 4175，也支持本任务隔离服务器。
async page=>{
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const {freshProgress}=await import('/src/game.js'),p=freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:true};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  p.restoration.cottageRested=true;p.vehicleHulls.fill(1);
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));
 });
 await page.reload();await page.locator('#start').click();
 // 保留正式游戏循环和移动，仅关闭炮击，避免把射击伐木误当成碾压。
 for(const [index,time,width] of [[0,'day',390],[6,'day',390],[6,'night',320]]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async ({index,time})=>{
   const a=(await import('/src/main.js')).application;await a.ready;window.a=a;
   const g=a.game,{blocked}=await import('/src/physics/motion.js');
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   const env={time,weather:'sun',autoTime:false,autoWeather:false};Object.assign(a.environment,env);
   a.renderer.light=new EnvironmentTransition(env);a.renderer.tone=new SceneTone(env);
   if(g.vehicle.active)g.dismountVehicle();g.progress.vehicleIndex=index;g.vehicle=g.vehicles[index];
   g.progress.campParking.owned=g.progress.campParking.owned.filter(v=>v.hull!==index);
   let spot;
   for(let y=1200;y<2600&&!spot;y+=80)for(let x=800;x<2600&&!spot;x+=80)
    if([-80,-40,0,40,80,120,180].every(dx=>!blocked(x+dx,y,20,[],{mapId:'forest',livingCollision:true})))spot={x,y};
   window.treeTemplate??=g.trees.find(t=>t.hp>0);
   window.crushTree={...treeTemplate,...spot,id:999,radius:20,hp:10000,maxHp:10000};g.trees=[crushTree];
   g.enemies=[];g.boss=null;g.spawnTimer=999;g.attackTimer=999;g.mainlineSpeech=null;
   g.updateWeaponAbility=()=>{};g.attack=()=>false;g.updateWaves=()=>{};g.vehicle.weaponIndex=null;
   window.beforeCrush={wood:g.progress.wood,coins:g.progress.coins,stumps:g.stumps.length,drops:g.drops.length};
   Object.assign(g.player,{x:spot.x-70,y:spot.y,vx:0,vy:0});g.state='playing';
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   if(!g.summonVehicle())throw Error('上车失败');a.refresh();
  },{index,time});
  await page.keyboard.down('ArrowRight');
  if(index===6){
   await page.waitForFunction(()=>crushTree.hp===0);
   await page.screenshot({path:`output/playwright/red-wolf-crush/${time}-burst.png`});
  }
  await page.waitForTimeout(900);await page.keyboard.up('ArrowRight');
  const result=await page.evaluate(()=>({x:a.game.player.x,tree:crushTree.x,hp:crushTree.hp,active:a.game.vehicle.active,
   wood:a.game.progress.wood-beforeCrush.wood,coins:a.game.progress.coins-beforeCrush.coins,
   stumps:a.game.stumps.length-beforeCrush.stumps,drops:a.game.drops.length-beforeCrush.drops}));
  if(!result.active||(index===6?result.hp!==0||result.x<result.tree+32||result.stumps!==1:result.hp!==10000||result.x>result.tree-31))throw Error('碾压错误 '+JSON.stringify(result));
  if(result.wood||result.coins||result.drops)throw Error('碾压发放了奖励 '+JSON.stringify(result));checks.push({index,time,...result});
  await page.screenshot({path:`output/playwright/red-wolf-crush/${index}-${time}-after.png`});
 }
 await page.locator('#vehicle-button').click();
 const landed=await page.evaluate(async()=>{const g=a.game,{blocked}=await import('/src/physics/motion.js');return !g.vehicle.active&&!g.player.treePass&&!blocked(g.player.x,g.player.y,12,g.trees,g.player);});
 if(!landed)throw Error('下车失败');if(errors.length)throw Error(errors.join('；'));
 return {checks,landed,errors};
}
