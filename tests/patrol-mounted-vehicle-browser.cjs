// 手机真实存储回归：上车后刷新、首页往返、主动下车后刷新均走正式应用入口。
async page=>{
  if(new URL(page.url()).port!=='4310')throw Error('仅允许本任务隔离端口4310');
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const t=await context.newPage(),errors=[],checks=[];t.on('pageerror',e=>errors.push(e.message));
  // 首次与刷新均通过玩家可见的开始按钮建图和恢复存档。
  async function enter(){
    await t.locator('#start').tap();
    await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  }
  // 同时检查运行时与刚写入的浏览器存档，避免只修复画面而漏存状态。
  async function check(mounted,label){
    const result=await t.evaluate(()=>({active:a.game.vehicle.active,index:a.game.vehicle.index,
      saved:JSON.parse(localStorage.getItem('forest-patrol-v1')).patrol.mountedVehicleIndex,
      parked:a.game.progress.campParking.owned.some(v=>v.hull===a.game.vehicle.index)}));
    if(result.active!==mounted||result.saved!==(mounted?5:null)||result.parked)throw Error(label+JSON.stringify(result));
    checks.push(label);
  }
  try{
    await t.goto('http://localhost:4310');await enter();
    await t.evaluate(async()=>{
      const {freshProgress,validateProgress}=await import('/src/game.js'),p=freshProgress();
      p.arrival={version:3,phase:'complete',keys:true,parked:true};
      p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
      p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
      for(const d of document.querySelectorAll('dialog[open]'))d.close();
      const g=a.game;g.progress=validateProgress(p);g.reset();g.state='playing';g.mainlineSpeech=null;g.arrivalScene=null;
      const {RANGER}=await import('/src/config/ranger-arrival.js');
      Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});a.refresh();
    });
    await t.locator('#vehicle-button').tap();await check(true,'上车立即写入乘坐状态');
    await t.reload();await enter();await check(true,'刷新并进入后继续骑车');
    await t.screenshot({path:'output/playwright/mounted-restore/reloaded-mounted.png'});
    await t.locator('#settings-button').tap();await t.locator('#settings-home').tap();
    await enter();await check(true,'返回首页再进入仍然骑车');
    await t.locator('#vehicle-button').tap();await check(false,'主动下车立即写入步行状态');
    await t.reload();await enter();await check(false,'下车后刷新保持步行');
    await t.screenshot({path:'output/playwright/mounted-restore/reloaded-on-foot.png'});
    if(errors.length)throw Error(errors.join('\n'));
    await page.evaluate(r=>window.mountedRestoreResult=r,{checks,errors});
  }catch(error){
    const state=await t.evaluate(()=>({page:a.menu.page,state:a.game.state,dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id),arrival:a.game.progress.arrival,button:document.getElementById('vehicle-button').outerHTML}));
    throw Error(error.message+'\n现场：'+JSON.stringify(state));
  }finally{await context.close();}
}
