// 补充检查小屏工坊及树前、树后、侧面绕行，截图仍由正式场景分层绘制。
async page=>{
  if(new URL(page.url()).port!=='4217')throw Error('仅允许隔离验收端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    if(!await page.locator('#vehicles-button').isVisible())await page.locator('#field-menu-toggle').click();
    await page.locator('#vehicles-button').click();
    await page.screenshot({path:`output/playwright/pinecone-wheels/workshop-${width}.png`});
    if(await page.evaluate(()=>document.querySelector('#workshop-dialog').scrollWidth>document.querySelector('#workshop-dialog').clientWidth))throw Error('工坊横向溢出');
    await page.getByRole('button',{name:'关闭工坊',exact:true}).click();
  }
  await page.setViewportSize({width:1280,height:960});await page.bringToFront();
  if(await page.locator('#resume').isVisible())await page.locator('#resume').click();
  const setup=await page.evaluate(async()=>{
    const a=wheelApp,g=a.game;g.reset();g.start();g.summonVehicle();g.spawnTimer=999;g.hurt=()=>{};g.attackTimer=999;g.enemies=[];
    // 选用真实营地树并保留周围实体；仅阻止本次复核的自动砍树干扰遮挡观察。
    g.attack=()=>{};g.vehicle.module.cooldown=999;
    const tree=g.trees.filter(t=>t.hp>0&&t.x>650&&t.x<1000&&t.y>950&&t.y<1200).sort((a,b)=>a.x-b.x)[0];
    if(!tree)throw Error('缺少营地树，不能跳过遮挡验收');
    Object.assign(g.player,{x:tree.x,y:tree.y-42,vx:0,vy:0,invincible:0});
    Object.assign(a.environment,{time:'day',weather:'sun',forestSeason:'summer'});
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.refresh();
    return {tree:{x:tree.x,y:tree.y},start:{x:g.player.x,y:g.player.y}};
  });
  await page.waitForTimeout(150);await page.screenshot({path:'output/playwright/pinecone-wheels/occlusion-back.png'});
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(520);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(250);
  await page.screenshot({path:'output/playwright/pinecone-wheels/occlusion-side.png'});
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(1100);await page.keyboard.up('ArrowDown');await page.waitForTimeout(250);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(520);await page.keyboard.up('ArrowRight');await page.waitForTimeout(300);
  await page.screenshot({path:'output/playwright/pinecone-wheels/occlusion-front.png'});
  const end=await page.evaluate(()=>({x:wheelApp.game.player.x,y:wheelApp.game.player.y}));
  if(end.y<=setup.start.y+35)throw Error('绕行未经过树前');
  if(errors.length)throw Error(errors.join('\n'));return {setup,end,errors};
}
