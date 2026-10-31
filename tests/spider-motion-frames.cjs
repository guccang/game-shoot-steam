// 正式复核入口的连续帧留档，辅助实机场景观察关节、侧舱和前足，不替代同屏验收。
async page=>{
 await page.setViewportSize({width:1280,height:960});
 await page.evaluate(()=>{const c=document.createElement('canvas');c.id='motion-review';c.width=560;c.height=360;c.style.cssText='position:fixed;z-index:999999;left:20px;top:20px;background:#d6d6ad;width:560px;height:360px';document.body.append(c);});
 for(const phase of [.1,.3,.5,.9]){
  await page.evaluate(async phase=>{const {renderVisualCase}=await import('/src/rendering/visual-review.js');await renderVisualCase(document.getElementById('motion-review').getContext('2d'),'spider-motion',phase);},phase);
  await page.locator('#motion-review').screenshot({path:`output/playwright/spider-motion/pose-${phase}.png`});
 }
 await page.evaluate(()=>document.getElementById('motion-review').remove());
}
