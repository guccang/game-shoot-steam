// 分离单个不可中断绘制步骤，定位时间预算的超支来源。
async (page) => {
  await page.reload(); await page.bringToFront();
  return page.evaluate(async () => {
    (await import('/src/main.js')).application.destroy();
    const { buildGroundTile } = await import('/src/rendering/ground-tile.js');
    const { groundTiles } = await import('/src/rendering/ground-cache.js');
    const results = [];
    for (const spec of groundTiles({x:600,y:2400,w:1100,h:700})) {
      const steps = buildGroundTile(spec,'forest','autumn',null);
      let result, index=0;
      do { const t=performance.now(); result=steps.next(); const ms=performance.now()-t;
        if(ms>.7)results.push({key:spec.key,index,phase:result.done?'complete':result.value||'batch',ms}); index++;
      } while(!result.done);
      for(const c of [result.value.day,result.value.night]){c.width=c.height=1;}
    }
    return results.sort((a,b)=>b.ms-a.ms).slice(0,35);
  });
}
