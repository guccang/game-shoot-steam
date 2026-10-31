// 室内颜色补查使用真实日历时段，仍由正式门口进入和原角色移动离开。
async page=>{
 const root='C:/Users/zhengtingjun/.codex/worktrees/art-style-options/game-shoot/output/playwright/clear-world-style/';
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
 const p=await context.newPage(),errors=[],samples=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto('http://localhost:4176/?artPreview=idle-cat-pine&artRevision=3');
  await p.waitForFunction(()=>document.querySelector('#vehicle-button')?.getAttribute('aria-pressed')==='true',null,{timeout:60000});
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.game.spawnTimer=999;});
  const storage=await p.evaluate(()=>JSON.stringify({...localStorage}));
  await p.locator('#vehicle-button').tap();
  const rooms=await p.evaluate(async()=>Object.entries((await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS));
  for(const [kind,room]of rooms){
   await p.evaluate(room=>{a.game.cottageDoorLatch=false;a.game.cottageEntry=null;Object.assign(a.game.player,{...room.door,vx:0,vy:0});},room);
   await p.waitForFunction(kind=>a.game.cottage?.kind===kind,kind,{timeout:7000});
   for(const time of ['day','night']){
    const phase=await p.evaluate(async time=>{const {LIVING_PHASES}=await import('/src/config/living-world.js'),{calendarView}=await import('/src/world/living-calendar.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(v=>v.id===time).start+1000;a.refresh();return calendarView(a.game.progress.living.calendar).id;},time);
    if(phase!==time)throw Error('室内日历时段不符');await p.waitForTimeout(250);await p.screenshot({path:root+'interior-'+kind+'-'+time+'.png'});samples.push({kind,time,phase});
   }
   const before=await p.evaluate(()=>a.game.player.x);await p.keyboard.down('ArrowLeft');await p.waitForTimeout(300);await p.keyboard.up('ArrowLeft');if(await p.evaluate(()=>a.game.player.x)>=before)throw Error('室内移动失败');
   await p.evaluate(room=>Object.assign(a.game.player,{...room.exit,vx:0,vy:0}),room);await p.waitForFunction(()=>!a.game.cottage,null,{timeout:7000});
  }
  if(await p.evaluate(()=>JSON.stringify({...localStorage}))!==storage)throw Error('试玩存档隔离失败');
  if(errors.length)throw Error(errors.join('\n'));return {passed:true,samples,storageUnchanged:true,errors};
 }finally{await context.close();}
}
