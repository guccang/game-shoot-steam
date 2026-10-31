// 正式绘制器同倍率对照与锚点采样：像素验收不使用另画的预览替身。
async page=>{
 const report=await page.evaluate(async()=>{
  const {drawScenery}=await import('/src/rendering/scenery.js');
  const {loadCozyCottage}=await import('/src/rendering/cozy-cottage.js');await loadCozyCottage();
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=328;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.scale(2,2);c.translate(90,148);drawScenery(c,{kind:'cottage',x:0,y:0,size:1});
  const alpha=(x,y)=>c.getImageData(180+x*2,296+y*2,1,1).data[3];
  for(const [x,y] of [[0,0],[0,6],[-40,0],[40,-5]])if(alpha(x,y)<200)throw Error('墙根或门阶未落在正式锚点：'+x+','+y);
  for(const [x,y] of [[0,13],[-40,12],[40,12]])if(alpha(x,y)!==0)throw Error('资源包含悬空底板或超出矮门阶');
  window.cottageReview=document.createElement('canvas');cottageReview.id='cottage-series-review';cottageReview.width=840;cottageReview.height=280;
  cottageReview.style.cssText='position:fixed;inset:0;width:840px;height:280px;z-index:99999';document.body.append(cottageReview);
  window.drawCottageSeries=night=>{const ctx=cottageReview.getContext('2d');ctx.fillStyle=night?'#647e66':'#b1c080';ctx.fillRect(0,0,840,280);for(const [x,item,name] of [[135,{kind:'cottage'},'巡林小屋'],[395,{kind:'cottage',workshop:true},'武器工坊'],[670,{kind:'garage'},'载具工坊']]){ctx.fillStyle=night?'#e3dfae':'#45634d';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText(name,x,260);drawScenery(ctx,{...item,x,y:218,size:1},night);}};
  return {wallContact:true,thresholdContact:true,transparentBelow:true};
 });
 await page.setViewportSize({width:900,height:360});
 for(const night of [0,1]){await page.evaluate(n=>drawCottageSeries(n),night);await page.locator('#cottage-series-review').screenshot({path:'docs/art-reference/cozy-cottage/series-'+(night?'night':'day')+'.png'});}
 await page.evaluate(()=>cottageReview.remove());return report;
}
