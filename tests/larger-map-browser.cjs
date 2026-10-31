// 扩展地图验收：隔离端口检查新林区、完整河道、区域标记及循环边界。
async(page)=>{
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.reload();await page.locator('#start').click();
  const result=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    const {WORLD}=await import('/src/world/coordinates.js');
    const {BIOMES}=await import('/src/world/biomes.js');
    a.game.enemies=[];a.game.attackTimer=a.game.spawnTimer=999;
    if(WORLD.width!==3600||WORLD.height!==2800||!a.renderer.ground)throw Error('世界尺寸或分块背景错误');
    return {world:WORLD,trees:a.game.trees.length,zones:BIOMES.map(z=>({id:z.id,x:z.x,y:z.y}))};
  });
  for(const zone of result.zones){
    await page.evaluate(async(z)=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:z.x,y:z.y});a.refresh();},zone);
    await page.waitForTimeout(500);
    await page.screenshot({path:`output/playwright/larger-map/${zone.id}.png`});
  }
  await page.locator('#map-button').click();
  await page.screenshot({path:'output/playwright/larger-map/region-map.png'});
  if(await page.locator('#region-legend > div').count()!==4)throw Error('等级区域丢失');
  await page.keyboard.press('Escape');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.player.x=3598;a.game.player.y=2798;});
  await page.keyboard.down('d');await page.keyboard.down('s');await page.waitForTimeout(400);await page.keyboard.up('d');await page.keyboard.up('s');
  await page.screenshot({path:'output/playwright/larger-map/seam.png'});
  const crossed=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.player;return p.x>3600&&p.y>2800;});
  if(!crossed)throw Error('新边界移动被截断');
  if(errors.length)throw Error(errors.join('\n'));
  return {...result,crossed,errors};
}
