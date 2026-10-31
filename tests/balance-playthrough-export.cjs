// 导出已经持续运行的正式RAF观察；未满三十分钟时明确失败，不快进时间。
async page=>{
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const report=await page.evaluate(async()=>{
    const t=window.economyPlaytest,a=(await import('/src/main.js')).application;
    if(!t?.end||t.end<1800)throw Error('真实运行尚未满三十分钟');
    const {economyFor}=await import('/src/config/economy.js');
    return {kind:t.kind,seconds:t.end,deaths:t.deaths,events:t.events,progress:t.progress,
      activeSeconds:t.progress.economyLog.seconds,config:economyFor(a.game.progress),
      note:'自动键盘方向与正式交易，真实RAF和怪物AI；不是人工试玩。前期路径曾停留角落，之后改为追踪敌人。使用校准过程候选参数，保留当时配置。'};
  });
  const download=page.waitForEvent('download');
  await page.evaluate(report=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='real-raf-30min.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},report);
  await(await download).saveAs('docs/balance-reports/real-raf-30min.json');
  await page.screenshot({path:'output/playwright/economy-30min.png'});
  return {seconds:report.seconds,activeSeconds:report.activeSeconds,deaths:report.deaths,last:report.events.at(-1),note:report.note};
}
