// 使用正式场景、连续帧猫猫和营地实体导出无界面参考，不生成替代美术。
async (page) => {
  if(new URL(page.url()).port!=='4186')throw Error('仅允许本任务隔离端口');
  await page.evaluate(async()=>{
    const {Game}=await import('/src/core/game.js');
    const {Renderer}=await import('/src/rendering/renderer.js');
    const {catSprites}=await import('/src/rendering/cat-animation.js');
    await catSprites.load();
    document.getElementById('title-reference')?.remove();
    const game=new Game();game.enemies=[];game.player.x=1000;game.player.y=850;game.player.angle=Math.PI/2;
    const canvas=document.createElement('canvas');canvas.id='title-reference';canvas.width=720;canvas.height=1280;
    canvas.style.cssText='position:fixed;inset:0;width:360px;height:640px;z-index:99999';document.body.append(canvas);
    const renderer=new Renderer(canvas,game,{time:'day',weather:'sun',forestSeason:'summer'});
    renderer.width=360;renderer.height=640;renderer.dpr=2;
    // 宣传背景不烘焙营地标签；图形及角色仍来自正式绘制器。
    renderer.c.fillText=()=>{};renderer.c.strokeText=()=>{};
    renderer.draw();window.titleReference={renderer,game,canvas};
  });
  // 使用原像素导出而非截屏缩放。
  return await page.locator('#title-reference').evaluate(n=>n.toDataURL());
}
