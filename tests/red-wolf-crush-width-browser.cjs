// 红狼整车碾压：实际横向、纵向、斜向键盘行驶，手机昼夜同屏检查。
async page=>{
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.keyboard.up('ArrowRight');await page.keyboard.up('ArrowDown');
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
 // 两侧履带边缘放树，并在扫掠区外保留一棵，使用实际游戏更新验证零收益。
 for(const [dx,dy,time,width] of [[1,0,'day',390],[0,1,'day',390],[1,1,'night',320]]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async ({dx,dy,time})=>{
   const a=(await import('/src/main.js')).application;await a.ready;window.a=a;const g=a.game;
   const {blocked}=await import('/src/physics/motion.js'),{RED_WOLF_HULL:h}=await import('/src/config/red-wolf-geometry.js');
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   const env={time,weather:'sun',autoTime:false,autoWeather:false};Object.assign(a.environment,env);a.renderer.light=new EnvironmentTransition(env);a.renderer.tone=new SceneTone(env);
   if(g.vehicle.active)g.dismountVehicle();g.progress.vehicleIndex=6;g.vehicle=g.vehicles[6];g.progress.campParking.owned=g.progress.campParking.owned.filter(v=>v.hull!==6);
   let start;
   for(let y=1200;y<3600&&!start;y+=100)for(let x=800;x<4000&&!start;x+=100){
    if([-100,0,100,200,300].every(oy=>[-100,0,100,200,300].every(ox=>!blocked(x+ox,y+oy,20,[],{mapId:'forest',livingCollision:true}))))start={x,y};
   }
   if(!start)throw Error('未找到测试走廊');
   const d=Math.hypot(dx,dy),u={x:dx/d,y:dy/d},n={x:-u.y,y:u.x},side=Math.abs(n.x)*h.width/2+Math.abs(n.y)*h.length/2;
   window.widthTemplate??=g.trees.find(t=>t.hp>0);
   window.widthTrees=[-1,1,1].map((sign,i)=>({...widthTemplate,id:999+i,x:start.x+u.x*120+sign*n.x*(side+(i===2?34:-10)),y:start.y+u.y*120+sign*n.y*(side+(i===2?34:-10))+h.centerOffset,radius:6,size:.65,hp:10000,maxHp:10000}));
   g.trees=widthTrees;g.enemies=[];g.boss=null;g.spawnTimer=999;g.attackTimer=999;g.mainlineSpeech=null;
   g.updateWeaponAbility=()=>{};g.attack=()=>false;g.updateWaves=()=>{};g.vehicle.weaponIndex=null;
   window.beforeWidth={wood:g.progress.wood,coins:g.progress.coins,stumps:g.stumps.length};
   Object.assign(g.player,{...start,vx:0,vy:0,invincible:999});g.state='playing';
   for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
   if(!g.summonVehicle())throw Error('上车失败');a.refresh();
  },{dx,dy,time});
  const keys=[...(dx?['ArrowRight']:[]),...(dy?['ArrowDown']:[])];for(const key of keys)await page.keyboard.down(key);
  try{await page.waitForFunction(()=>widthTrees[0].hp===0&&widthTrees[1].hp===0,{},{timeout:10000});}
  finally{for(const key of keys)await page.keyboard.up(key);}
  await page.screenshot({path:`output/playwright/red-wolf-width/${dx}-${dy}-${time}.png`});
  const result=await page.evaluate(()=>({hp:widthTrees.map(t=>t.hp),wood:a.game.progress.wood-beforeWidth.wood,coins:a.game.progress.coins-beforeWidth.coins,stumps:a.game.stumps.length-beforeWidth.stumps}));
  if(JSON.stringify(result.hp)!=='[0,0,10000]'||result.wood||result.coins||result.stumps!==2)throw Error(JSON.stringify(result));checks.push({dx,dy,time,...result});
 }
 if(errors.length)throw Error(errors.join('；'));return {checks,errors};
}
