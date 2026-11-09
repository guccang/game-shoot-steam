// 隔离本地存档验收死亡即时扣款、死亡重载、真实回城按钮和6秒提示。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 每次载入都从正式首页进入，冻结战斗只为稳定画面，致命伤仍调用hurt。
 async function enter(){await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.game.vehicle.active=false;a.refresh();});}
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.coins=12345;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
  await page.reload();await enter();
  for(const [width,height,phase,loss,remaining] of [[390,844,'day',1234,11111],[320,568,'night',1111,10000]]){
   await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;g.progress.living.patrolActive=true;Object.assign(g.player,(await import('/src/progression/story/clearing-site.js')).clearingSite(g.progress));g.player.invincible=0;g.hurt(1e9);a.refresh();},phase);
   if(await page.evaluate(()=>a.game.state)!=='dead'||await page.evaluate(()=>a.game.progress.coins)!==remaining)throw Error('死亡结算错误');
   await page.locator('#overlay').waitFor({state:'visible'});const death=await page.locator('#overlay-text').innerText();if(!death.includes(`已损失 ${loss} 金币`))throw Error(death);await page.screenshot({path:`output/playwright/death-coin-penalty/${width}-dead.png`});
   await page.reload();await enter();if(!await page.evaluate(({loss,remaining})=>a.game.state==='dead'&&a.game.deathPenaltyCoins===loss&&a.game.progress.coins===remaining,{loss,remaining}))throw Error('死亡刷新重复扣款或丢失收据');
   await page.locator('#resume').tap();await page.locator('#toast.visible').waitFor({state:'visible'});const text=await page.locator('#toast').innerText();if(!text.includes(`死亡惩罚：损失 ${loss} 金币（10%）`)||!text.includes(`剩余 ${remaining}`))throw Error(text);
   const info=await page.evaluate(()=>({state:a.game.state,map:a.game.mapId,coins:a.game.progress.coins,saved:JSON.parse(localStorage.getItem('forest-patrol-v1')),position:{x:a.game.player.x,y:a.game.player.y},fit:(()=>{const r=document.querySelector('#toast').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})()}));
   if(info.state!=='playing'||info.map!=='forest'||info.position.x!==900||info.position.y!==700||info.saved.coins!==remaining||info.saved.patrol.state!=='active'||!info.fit)throw Error('回城状态错误');
   if(!await page.evaluate(()=>Number(getComputedStyle(document.querySelector('#toast')).zIndex)>Number(getComputedStyle(document.querySelector('#nearby-interaction')).zIndex)))throw Error('惩罚提示被建筑按钮遮挡');
   await page.screenshot({path:`output/playwright/death-coin-penalty/${width}-returned.png`});checks.push({width,phase,loss,remaining,text,position:info.position});
   await page.evaluate(()=>a.game.start());if(await page.evaluate(()=>a.game.progress.coins)!==remaining)throw Error('重复开始扣款');await page.reload();await enter();if(await page.evaluate(()=>a.game.progress.coins)!==remaining)throw Error('回城后刷新扣款');
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }finally{await context.close();}
}
