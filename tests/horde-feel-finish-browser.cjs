// 自然战斗收尾：不注入击杀或无敌，验证结算续战、保存失败重试和刷新续档。
async page=>{
 await page.waitForFunction(()=>hordeApp.game.progress.bosses===1,null,{timeout:45000});
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});
 const before=await page.evaluate(async()=>{
  const g=hordeApp.game;
  window.hordeFinishSave=g.livingPersist;
  g.livingPersist=()=>false;
  return {x:g.player.x,y:g.player.y,coins:g.progress.coins,wood:g.progress.wood,kills:g.kills,bosses:g.progress.bosses,
   field:g.progress.mainline.seen.weaponField,review:(await import('/src/rendering/visual-review.js')).inspectTaskReward(g,document)};
 });
 if(before.kills<72||before.field!==1||!before.review.nextClearing||before.review.overflow)throw Error(JSON.stringify(before));
 await page.screenshot({path:'output/playwright/horde-feel/reward-320.png'});
 await page.locator('#task-reward-next-clearing').click();
 if(!await page.locator('#task-reward-dialog').isVisible())throw Error('保存失败时关闭了结算');
 const error=await page.locator('#task-reward-error').textContent();if(!error)throw Error('未显示保存失败');
 // 在暂停状态下观察续接事务的钱包；恢复战斗后还会拾取场上剩余的掉落物。
 await page.evaluate(()=>{hordeApp.game.livingPersist=p=>{window.hordeAcceptedWallet={coins:p.coins,wood:p.wood};return window.hordeFinishSave(p);};});
 await page.locator('#task-reward-next-clearing').click();
 await page.waitForTimeout(800);
 const next=await page.evaluate(async()=>{
  const g=hordeApp.game;
  return {x:g.player.x,y:g.player.y,active:g.progress.living.patrolActive,wave:g.wave,bosses:g.progress.bosses,
   coins:g.progress.coins,wood:g.progress.wood,site:(await import('/src/progression/clearing-site.js')).clearingSite(g.progress),
   acceptedWallet:window.hordeAcceptedWallet,dialog:document.querySelector('#task-reward-dialog').open,state:g.state};
 });
 if(!next.active||next.dialog||next.bosses!==1||next.acceptedWallet.coins!==before.coins||next.acceptedWallet.wood!==before.wood||Math.hypot(next.x-before.x,next.y-before.y)>30)throw Error(JSON.stringify({before,next}));
 await page.evaluate(()=>{hordeApp.game.livingPersist=window.hordeFinishSave;});
 await page.waitForTimeout(3500);
 await page.screenshot({path:'output/playwright/horde-feel/continue-320.png'});
 await page.reload();await page.locator('#start').click();
 const restored=await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;await a.ready;
  return {active:a.game.progress.living.patrolActive,bosses:a.game.progress.bosses,wave:a.game.wave,field:a.game.progress.mainline.seen.weaponField};
 });
 if(!restored.active||restored.bosses!==1||restored.wave<6||restored.field!==1)throw Error(JSON.stringify(restored));
 return {before,error,next,restored};
}
