// 极小全景下逐格点击真实屏幕中心，避免透明触摸区域重叠时误选相邻格位。
async page=>{
  if(new URL(page.url()).port!=='4187')throw Error('仅使用隔离验收端口');
  await page.reload();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;window.targetReview=a;
    if(a.game.realm)a.game.leaveRealm();a.game.state='playing';a.game.enterRealm('guardian');
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  });
  const checked=[];
  for(const [width,height] of [[844,390],[320,568],[390,844]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{const a=window.targetReview;a.renderer.camera.setZoomStep(0);a.renderer.resize();a.renderer.draw();a.refresh();});
    for(let slot=0;slot<8;slot++){
      const pad=page.locator('[data-guardian-slot="'+slot+'"]'),box=await pad.boundingBox();
      await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
      if(await pad.getAttribute('aria-pressed')!=='true')throw Error('全景格位错选：'+width+'/'+slot);
      await page.locator('.guardian-build-panel [data-guardian-close]').click();
    }
    checked.push({width,height,slots:8});
  }
  return {checked};
}