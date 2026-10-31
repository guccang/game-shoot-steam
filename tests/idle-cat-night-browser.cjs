// 完整真实昼夜过渡录制：不跳转光照时钟，包含移动、炮塔射击和局部灯光。
async page=>{
 const root='C:/Users/zhengtingjun/.codex/worktrees/art-style-options/game-shoot/output/playwright/idle-cat-pine-v2/';
 const ctx=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:root,size:{width:390,height:844}}}),p=await ctx.newPage();
 try{
  await p.goto('http://localhost:4176/?artPreview=idle-cat-pine');await p.waitForFunction(()=>document.getElementById('vehicle-button')?.getAttribute('aria-pressed')==='true',{},{timeout:60000});
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;const e=a.game.spawnEnemy(0,0,{x:1140,y:845});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0});});
  await p.locator('#time-picture').tap();await p.locator('#time-picture').tap();
  await p.waitForFunction(()=>a.environment.time==='night');
  const start=await p.evaluate(()=>a.renderer.light.sample(performance.now()));
  await p.keyboard.down('ArrowLeft');await p.waitForTimeout(300);await p.keyboard.up('ArrowLeft');
  await p.waitForTimeout(9000);await p.screenshot({path:root+'transition-mid.png'});
  const mid=await p.evaluate(()=>a.renderer.light.sample(performance.now()));
  await p.waitForFunction(()=>a.renderer.light.sample(performance.now()).night>.999,{},{timeout:22000});
  await p.screenshot({path:root+'transition-night.png'});const end=await p.evaluate(()=>a.renderer.light.sample(performance.now()));
  if(!(start.night<mid.night&&mid.night<end.night))throw Error('夜色未连续推进');return {passed:true,start,mid,end};
 }finally{await ctx.close();await p.video().saveAs(root+'day-to-night.webm');}
}
