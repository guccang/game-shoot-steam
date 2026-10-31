// 最终连续录制使用正式状态机展示蓄力、单发、走位及击退碎裂，不再改变游戏规则。
async page=>{
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,{Game}=await import('/src/core/game.js');const g=a.game;g.update=Game.prototype.update;g.state='playing';g.attackTimer=9999;g.player.invincible=0;g.player.hp=g.maxHp();g.enemies.forEach((e,i)=>{e.x=900+[-100,100,-120,120,0][i];e.y=850+[-30,-30,120,120,165][i];e.knockTime=e.pushX=e.pushY=e.z=e.rollAngle=0;e.damage=1;e.assault={phase:'chase',elapsed:0,hit:false};});a.refresh();});
 await page.waitForFunction(async()=>{const g=(await import('/src/main.js')).application.game;return g.enemies.some(e=>e.species==='acorn-slinger'&&e.assault.phase==='windup');});
 await page.screenshot({path:'output/playwright/ranged-enemies/active-windup.png'});
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(250);await page.keyboard.up('ArrowDown');
 await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.enemyBolts.length>0);
 await page.screenshot({path:'output/playwright/ranged-enemies/active-bolt.png'});await page.waitForTimeout(1500);
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game,e=g.enemies.find(e=>e.species==='spore-spitter');g.hit(e,1e9,false,{direction:{x:-1,y:0},impulse:90,power:2});});
 await page.waitForTimeout(120);await page.screenshot({path:'output/playwright/ranged-enemies/active-defeat.png'});await page.waitForTimeout(1300);
 return await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {state:g.state,playerHp:g.player.hp,remainingSpecies:g.enemies.map(e=>e.species),bolts:g.enemyBolts.length};});
}
