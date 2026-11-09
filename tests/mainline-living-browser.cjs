// 合并生活圈后的窄范围验收：主线接取巡护、地图引导和普通波次共用正式入口。
async(page)=>{
 if(new URL(page.url()).port!=='4251')throw Error('仅限主线隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const g=a.game,{MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js');
  Object.assign(a.environment,{livingPreview:false});g.livingPreview=false;g.progress.living.patrolActive=false;
  g.progress.mainline.completed=MAINLINE_IDS.slice(0,1);g.progress.mainline.phase='doing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;
  g.enemies=[];g.boss=null;Object.assign(g.player,MAINLINE_SITES.camp);g.state='playing';a.refresh();
 });
 await page.locator('#mainline-hud').click();await page.locator('#living-dialog').waitFor({state:'visible'});
 await page.locator('#living-patrol').click();await page.locator('#living-close').click();
 const result=await page.evaluate(async()=>{
  const g=a.game,{MAINLINE_SITES}=await import('/src/config/mainline.js'),{mainlineObjective}=await import('/src/core/story/mainline-manager.js');
  const started=g.progress.living.patrolActive,key=mainlineObjective(g).key;
  Object.assign(g.player,MAINLINE_SITES.patrol);g.state='playing';g.waveWarning=0;g.spawnTimer=0;g.respawnDelay=0;g.waveRest=0;a.renderer.draw();g.updateWaves(.05);a.refresh();
  return {started,key,enemies:g.enemies.length,completed:g.progress.mainline.completed.length};
 });
 if(!result.started||result.key!=='patrol'||result.enemies<1||result.completed!==1)throw Error('巡护入口衔接失败 '+JSON.stringify(result));
 await page.screenshot({path:'output/playwright/mainline/merged-patrol-320.png'});
 if(errors.length)throw Error(errors.join('\n'));return {result,errors};
}
