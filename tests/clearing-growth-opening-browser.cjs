// 隔离浏览器验收首轮小配额、正式五波推进及500生命领主，击杀快进明确走正式结算入口。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('只允许4175隔离端口');
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=['first-map'];p.mainline.phase='doing';p.living.position={x:810,y:965};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
 await page.setViewportSize({width:390,height:900});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;Object.assign(a.game.player,{x:810,y:965});a.refresh();});
 await page.keyboard.press('KeyE');await page.locator('#clearing-dialog').waitFor({state:'visible'});
 await page.locator('#clearing-accept').click();
 await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing');
 const opening=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;Object.assign(g.player,{x:1600,y:400});g.attackTimer=999;
  for(let i=0;i<30;i++)g.updateWaves(.5);a.refresh();
  return {wave:g.wave,spawned:g.waveSpawned,alive:g.enemies.filter(e=>e.hp>0).length};
 });
 if(opening.wave!==1||opening.spawned!==2||opening.alive!==2)throw Error('首波数量错误 '+JSON.stringify(opening));
 await page.locator('#wave-help').click();const count=await page.locator('#wave-help-count').textContent();
 if(count!=='0 / 2')throw Error('首波面板配额错误 '+count);await page.locator('#wave-help-close').click();
 await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing');
 await page.screenshot({path:'output/playwright/clearing-growth/opening.png'});
 const result=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,rows=[];
  for(let wave=1;wave<=5;wave++){
   let ticks=0;while(!g.boss&&g.wave===wave&&ticks++<300){
    g.updateWaves(.5);for(const e of g.enemies)if(e.hp>0)g.hit(e,e.hp);
    if(g.waveRest>0||g.boss){rows.push({wave,kills:g.waveKills});break;}
   }
   if(wave<5)g.updateWaves(3);
  }
  a.refresh();return {rows,boss:g.boss&&{hp:g.boss.maxHp,speed:g.boss.speed},wave:g.wave};
 });
 if(JSON.stringify(result.rows.map(r=>r.kills))!==JSON.stringify([2,3,4,5,6])||result.boss?.hp!==500||result.boss?.speed!==34)throw Error('首轮推进错误 '+JSON.stringify(result));
 // 等待快进击杀的飘字自然消退后检查正式领主画面。
 await page.waitForTimeout(1600);
 await page.screenshot({path:'output/playwright/clearing-growth/first-boss.png'});
 if(errors.length)throw Error(errors.join(';'));return {opening,count,...result,errors};
}
