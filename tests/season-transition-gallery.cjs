// 工作台按相同材质路径采样完整四季，记录山湖雪量与叶色的连续变化。
async(page)=>{
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 await page.reload();await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();});
 await page.setViewportSize({width:1200,height:600});
 for(const [from,to] of [['spring','summer'],['summer','autumn'],['autumn','winter'],['winter','spring']])for(const night of [false,true]) {
  await page.evaluate(async({from,to,night})=>{
   const {renderVisualCase}=await import('/src/rendering/visual-review.js');
   document.getElementById('fade-gallery')?.remove();
   const canvas=document.createElement('canvas');canvas.id='fade-gallery';canvas.width=1200;canvas.height=600;canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:1200px;height:600px';document.body.append(canvas);
   const c=canvas.getContext('2d');
   for(const [i,time] of [0,10,20].entries()) {
    const tile=document.createElement('canvas');tile.width=400;tile.height=600;
    await renderVisualCase(tile.getContext('2d'),`landscape-group-0-${from}-to-${to}${night?'-night':''}`,time);c.drawImage(tile,i*400,0);
   }
  },{from,to,night});
  await page.screenshot({path:`output/playwright/season-soft-transition/landscape-${from}-${to}-${night?'night':'day'}.png`});
 }
 return {designCriterion:'season-soft-transition',pairs:4,dayNight:true,samples:[0,10,20]};
}
