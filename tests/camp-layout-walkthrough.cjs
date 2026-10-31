// 布局补充实机检查：前后绕行、320宽触控，以及与用户截图相同的出生点视角。
async(page)=>{
 if(new URL(page.url()).port!=='4229')throw Error('仅允许隔离端口4229');
 await page.setViewportSize({width:320,height:568});
 const moved=[];
 for(const site of [{x:480,y:650},{x:1000,y:300},{x:1060,y:1260}]){
  await page.evaluate(p=>{const a=campApp,g=a.game;Object.assign(g.player,{x:p.x-85,y:p.y+50,pushX:0,pushY:0});g.enemies=[];g.waveWarning=0;g.spawnTimer=999;g.encounterTimer=999;g.player.invincible=999;a.renderer.camera.time=null;a.renderer.draw();a.refresh();},site);
  const before=await page.evaluate(()=>campApp.game.player.y);
  await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w');
  const behind=await page.evaluate(()=>campApp.game.player.y);
  await page.keyboard.down('s');await page.waitForTimeout(800);await page.keyboard.up('s');
  const after=await page.evaluate(()=>campApp.game.player.y);if(behind>=before-10||after<=behind+10)throw Error('无法从侧面前后绕行');moved.push({site,before,behind,after});
 }
 await page.evaluate(()=>{const a=campApp;Object.assign(a.game.player,{x:480,y:725});a.renderer.camera.time=null;a.renderer.draw();a.refresh();});
 await page.locator('.world-workshop-entry').click();if(!await page.locator('#workshop-dialog').isVisible())throw Error('320宽工坊入口不可用');await page.keyboard.press('Escape');
 await page.evaluate(()=>{const a=campApp;Object.assign(a.game.player,{x:970,y:790});a.renderer.camera.time=null;a.renderer.draw();a.refresh();});
 await page.locator('[data-story-post="sunleaf-post"]').click();if(!await page.locator('#story-dialog').isVisible())throw Error('320宽故事入口不可用');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});
 for(const time of ['day','night']){
  await page.evaluate(async time=>{const a=campApp,g=a.game;g.dismountVehicle();Object.assign(g.player,{x:900,y:700,pushX:0,pushY:0});g.enemies=[];g.waveWarning=0;g.spawnTimer=999;
   Object.assign(a.environment,{time,autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},time);
  await page.waitForTimeout(200);await page.screenshot({path:`output/playwright/camp-layout/spawn-390-${time}.png`});
 }
 return {passed:true,moved};
}
