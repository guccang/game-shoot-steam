// 真实刷新后从车库交接后的采集检查点继续，避免主菜单状态混入交互验收。
async page=>{
 await page.reload();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;if(a.game.progress.arrival.phase!=='gather'||!a.game.progress.arrival.keys)throw Error('Gather checkpoint lost');});await page.locator('#start').click();
}
