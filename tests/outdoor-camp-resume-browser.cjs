// 通过手机柜台交谈尝试室内驻营，检查关闭提示后真实摇杆仍能行走。
async page=>{
 await page.goto('http://localhost:4175');
 await page.locator('#start').tap();
 await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
 await page.evaluate(async()=>{
  const {application}=await import('/src/main.js');
  await application.ready;
  const game=application.game;
  const progress=(await import('/src/progression/progress.js')).freshProgress();
  progress.arrival={version:3,phase:'complete',keys:true};
  progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];
  progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(site=>site.id);
  game.progress=progress;
  game.reset();
  game.state='playing';
  game.mainlineSpeech=null;
  game.vehicle.active=false;
  const {outdoor}= (await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS;
  Object.assign(game.player,outdoor.door);
  if(!(await import('/src/core/cottage.js')).enterWorkshop(game,'outdoor'))throw Error('未进入户外用品店');
  Object.assign(game.player,{x:150,y:260});
  application.refresh();
 });
 await page.locator('[data-room-item=shopkeeper]').tap();
 await page.locator('[data-npc-service]').tap();
 const camp=page.locator('[data-outdoor-action=vehicle]');
 await camp.tap();
 await camp.tap();
 if(!/屋外/.test(await page.locator('#outdoor-message').innerText()))throw Error('缺少室内驻营提示');
 await page.locator('#outdoor-close').tap();
 const {state,x,campPlaced}=await page.evaluate(async()=>{
  const {game}=(await import('/src/main.js')).application;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return {state:game.state,x:game.player.x,campPlaced:!!game.progress.outdoors.camp};
 });
 if(state!=='playing'||campPlaced)throw Error('关闭装备页后状态异常：'+state);
 const touch=await page.context().newCDPSession(page);
 try{
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:95,y:550}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y:550}]});
  await page.waitForFunction(async start=>(await import('/src/main.js')).application.game.player.x>start+8,x,{timeout:3000});
 }finally{
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touch.detach();
 }
 return {ok:true};
}
