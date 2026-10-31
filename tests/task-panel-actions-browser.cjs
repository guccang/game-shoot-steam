// 使用正式任务与面板的隔离手机回归：正文查详情，右侧只切换寻路。
async page=>{
 if(new URL(page.url()).port!=='4176')throw Error('仅限隔离验收端口');
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;
  const {freshProgress}=await import('/src/progression/progress.js');
  const {MAINLINE_IDS}=await import('/src/config/mainline.js');
  const {TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
  // 每个场景重新建立正式存档，冻结时间推进，仅测试用户点击的事件链。
  window.taskScene=async(id,near=false)=>{
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const p=freshProgress();p.arrival=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
   p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';p.mainline.navigationEnabled=false;p.weapons[0]=1;
   a.game.progress=p;a.game.reset();a.game.state='playing';a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=99999;a.game.update=()=>{};
   const o=(await import('/src/core/mainline-manager.js')).mainlineObjective(a.game);
   Object.assign(a.game.player,{x:o.site.x+(near?0:500),y:o.site.y});a.refresh();a.renderer.draw();
   return {label:o.label,action:(await import('/src/core/mainline-manager.js')).mainlineAction(a.game)};
  };
 });
 // 正文在寻路关闭时仍能打开详情，关闭窗口后偏好不变。
 results.push(await page.evaluate(()=>taskScene('pistol-upgrade')));
 await page.locator('#mainline-hud').click();await page.locator('#mainline-dialog').waitFor({state:'visible'});
 await page.screenshot({path:'output/playwright/task-panel-actions/task-details-390.png'});
 await page.locator('#mainline-close').click();
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('正文恢复了寻路');
 // 右侧开关只影响路线，两次操作分别开启、关闭，不打开任务页。
 for(const enabled of [true,false]){
  await page.locator('#task-navigation-toggle').click();
  const state=await page.evaluate(()=>({enabled:a.game.progress.mainline.navigationEnabled,dialogs:document.querySelectorAll('dialog[open]').length}));
  if(state.enabled!==enabled||state.dialogs)throw Error('右侧开关触发了任务正文');results.push(state);
 }
 await page.locator('#mainline-hud').focus();await page.keyboard.press('Enter');await page.locator('#mainline-dialog').waitFor({state:'visible'});await page.keyboard.press('Escape');
 results.push(await page.evaluate(()=>taskScene('pistol-upgrade',true)));
 await page.locator('#mainline-hud').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('工坊入口恢复了寻路');
 await page.locator('#ws-close').click();results.push({nearWorkshop:true});
 // 远程清缴只读数据，接取仍按原有距离限制；正文不再仅重新铺路。
 await page.evaluate(()=>taskScene('first-patrol'));
 await page.locator('#mainline-hud').click();await page.locator('#clearing-dialog').waitFor({state:'visible'});
 if(!await page.locator('#clearing-accept').isDisabled())throw Error('远程允许接取清缴');
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('清缴详情恢复寻路');
 await page.screenshot({path:'output/playwright/task-panel-actions/clearing-details-390.png'});await page.locator('#clearing-close').click();results.push({clearingInspect:true});
 // 随身地图任务直接打开地图；窄屏仍使用同一个正文入口。
 await page.setViewportSize({width:320,height:640});await page.evaluate(()=>taskScene('first-map'));
 await page.locator('#mainline-hud').click();await page.locator('#phone-dialog').waitFor({state:'visible'});
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('地图入口恢复寻路');
 await page.screenshot({path:'output/playwright/task-panel-actions/map-320.png'});
 await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
