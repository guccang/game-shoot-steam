// 手机从野外场景短按帐篷收营，验证失败后原地重试和实际收纳位置。
async page=>{
 await page.goto('http://localhost:4175');
 await page.locator('#start').tap();
 await page.evaluate(async()=>{
  const {application:a}=await import('/src/main.js');await a.ready;
  const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];
  p.vehicleHulls[0]=1;p.vehicleIndex=0;p.outdoors.tent=true;
  g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;
  g.mainlineTalkDelay=g.spawnTimer=g.fireClock=99999;g.enemies=[];g.boss=null;
  const {deployCamp}=await import('/src/core/outdoors.js');
  for(let y=1900;y<7000&&!g.progress.outdoors.camp;y+=300)for(let x=1900;x<9000;x+=300){
   Object.assign(g.player,{x,y});if(deployCamp(g).ok)break;
  }
  const camp=g.progress.outdoors.camp;if(!camp)throw Error('没有可用营地');
  Object.assign(g.player,{x:camp.x,y:camp.y+70});
  g.progress.campParking.owned=[{...camp,x:camp.x+100,y:g.player.y,hull:0,spot:null,hp:1,ammo:0,reload:0}];
  g.progress.logistics.builds[0].wood=9999;g.progress.logistics.bagWood=999;
  a.renderer.camera.time=null;a.refresh();
 });
 // 从绘制镜头换算帐篷布面的触点，不直接调用界面回调。
 await page.waitForFunction(async()=>{
  const {game,renderer}=(await import('/src/main.js')).application;
  const v=renderer.view,c=game.progress.outdoors.camp;
  return v&&c.x-52>v.x&&c.x-52<v.x+v.w&&c.y-40>v.y&&c.y-40<v.y+v.h;
 });
 const point=await page.evaluate(async()=>{
  const {game,renderer}=(await import('/src/main.js')).application;
  const v=renderer.view,c=game.progress.outdoors.camp,r=renderer.canvas.getBoundingClientRect();
  return {x:r.left+(c.x-52-v.x)*r.width/v.w,y:r.top+(c.y-40-v.y)*r.height/v.h};
 });
 await page.touchscreen.tap(point.x,point.y);
 const panel=page.locator('#outdoor-dialog[open]'),pack=panel.locator('[data-outdoor-action=pack]');
 await pack.tap();
 if(!/请先清理/.test(await panel.locator('#outdoor-message').innerText()))throw Error('双满时未提示清理');
 await page.evaluate(async()=>{
  const {game}=(await import('/src/main.js')).application;
  if(!game.progress.outdoors.camp)throw Error('未保留营地');
  game.progress.logistics.builds[0].wood=0;
 });
 await pack.tap();
 await page.waitForFunction(async()=>{
  const {game}=(await import('/src/main.js')).application;
  return game.state==='playing'&&!game.progress.outdoors.camp&&game.progress.outdoors.tentHull===0;
 });
 if(!/仓库/.test(await page.locator('#toast').innerText()))throw Error('收营后未告知装备去向');
 return true;
}
