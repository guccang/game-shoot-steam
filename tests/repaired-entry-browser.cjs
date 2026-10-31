// 未完成教学的已修复建筑真实点击与候停入室检查，使用当前服务或默认4175。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(page.url()||'http://localhost:4175');await page.setViewportSize({width:390,height:844});
 await page.locator('#start').click();await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const p=(await import('/src/progression/progress.js')).freshRangerProgress();Object.assign(p.arrival,{phase:'gather',keys:true,x:865,y:790});
  p.restoration.repaired=['tower','cottage','garage'];a.game.progress=p;a.game.reset();a.game.start();a.game.fireClock=99999;
  const site=(await import('/src/world/realm-entrances.js')).REALM_ENTRANCES.find(e=>e.mode==='tower');Object.assign(a.game.player,{x:site.x,y:site.y+60});
  a.renderer.camera.time=null;for(const d of document.querySelectorAll('dialog[open]'))d.close();a.refresh();
 });await page.waitForTimeout(700);
 await page.locator('[data-world-realm="tower"]').click();await page.waitForFunction(()=>a.game.realm?.mode==='tower');
 await page.waitForFunction(()=>document.getElementById('ranger-arrival').hidden&&!document.getElementById('game-frame').classList.contains('arrival-active'));
 await page.screenshot({path:'output/playwright/farm-access-sign/early-tower.png'});
 await page.waitForFunction(()=>a.game.enemies.length>0);await page.evaluate(()=>{a.game.leaveRealm();a.refresh();});
 await page.waitForFunction(()=>!document.getElementById('ranger-arrival').hidden);
 await page.getByRole('button',{name:'继续巡游',exact:true}).click();
 // 测试定位在房门外，只有正式每帧候停计时可以进入小屋。
 await page.evaluate(async()=>{const {COTTAGE}=await import('/src/config/cottage.js');Object.assign(a.game.player,COTTAGE.door,{vx:0,vy:0});a.renderer.camera.time=null;a.refresh();});
 await page.waitForFunction(()=>a.game.cottage?.kind==='cottage');await page.waitForFunction(()=>document.getElementById('ranger-arrival').hidden);
 await page.screenshot({path:'output/playwright/farm-access-sign/early-cottage.png'});
 const result=await page.evaluate(()=>({phase:a.game.progress.arrival.phase,pending:a.game.arrivalPending,room:a.game.cottage.kind}));
 if(!result.pending||errors.length)throw Error(JSON.stringify({result,errors}));return {result,errors};
}
