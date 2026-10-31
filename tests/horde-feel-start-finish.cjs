// 在已初始化的隔离账号中开始首轮自然战斗；等待真实循环，不注入击杀或无敌。
async page=>{
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(()=>hordeFixture({weapon:1,round:0,level:3,time:'night'}));
 await page.waitForTimeout(30000);
 return await page.evaluate(()=>({state:hordeApp.game.state,wave:hordeApp.game.wave,hp:hordeApp.game.player.hp,kills:hordeApp.game.kills,bosses:hordeApp.game.progress.bosses}));
}
