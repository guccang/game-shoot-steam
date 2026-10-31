// 用正式Canvas生成器测量四向缓存；默认4175，也可继承CLI隔离服务地址。
// 对照前将修改前ground-cache.js保存到output/playwright/ground-four-way/baseline.js，
// 并把其相对导入解析为/src/下原模块；基线仅作本地测量，不作为运行时资源分发。
async original => {
 const context=await original.context().browser().newContext({viewport:{width:440,height:793},isMobile:true,hasTouch:true}),page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(60000);
 try {
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();});
  const results=await page.evaluate(async()=>{
   const {GroundCache,groundTiles,groundWarmView}=await import('/src/rendering/ground-cache.js');
   const {GroundCache:Before}=await import('/output/playwright/ground-four-way/baseline.js');
   const view={x:2039.951,y:268.422,w:440/.85,h:793/.85},results=[];
   // 统计构建片段实耗与跨RAF完成时长，不能把桌面结果当作iPhone实测。
   async function warm(Cache,name){
    const cache=new Cache();cache.prepare(view,0);const start=performance.now(),slices=[];
    for(let n=0;(cache.pending.length||cache.work)&&n<3000;n++){
     await new Promise(requestAnimationFrame);const t=performance.now();cache.advance(2);slices.push(performance.now()-t);
     cache.prepare(view,0);
    }
    if(cache.pending.length||cache.work)throw Error('预热未完成：'+name);
    const stats=cache.stats(),record={name,count:stats.count,bytes:stats.bytes,wallMs:performance.now()-start,
     workMs:slices.reduce((a,b)=>a+b,0),slices:slices.length,maxSliceMs:Math.max(...slices),stats};
    results.push(record);return cache;
   }
   const before=await warm(Before,'原版一圈'),after=await warm(GroundCache,'四周一屏');
   const canvas=document.createElement('canvas');canvas.width=440;canvas.height=793;
   const c=canvas.getContext('2d',{willReadFrequently:true});
   // 同样完整纹理、坐标和缩放，比较昼夜像素，避免以删细节或空白替代优化。
   function pixels(cache,v,night){c.setTransform(.85,0,0,.85,-v.x*.85,-v.y*.85);cache.draw(c,v,night);return c.getImageData(0,0,440,793).data;}
   const coverage=[],pixelChecks=[];
   for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1]]){
    const v={...view,x:view.x+dx*view.w,y:view.y+dy*view.h},specs=groundTiles(v);
    coverage.push({dx,dy,beforeMissing:specs.filter(s=>!before.tiles.get(s.key)?.night).length,afterMissing:specs.filter(s=>!after.tiles.get(s.key)?.night).length});
    for(const night of [0,1]){
     const a=pixels(before,v,night),b=pixels(after,v,night);let mismatch=0;
     for(let n=0;n<a.length;n++)if(a[n]!==b[n])mismatch++;
     pixelChecks.push({dx,dy,night,mismatch});if(mismatch)throw Error('地面像素变化：'+JSON.stringify(pixelChecks.at(-1)));
    }
   }
   if(after.syncMisses)throw Error('预热后四向仍发生同步补建');
   const area=groundTiles(groundWarmView(view)),budget=[...new Map(area.map(s=>[s.key,s])).values()].reduce((n,s)=>n+(s.w+4)*(s.h+4)*8,0);
   before.dispose();after.dispose();return {device:navigator.userAgent,view,budget,results,coverage,pixelChecks};
  });
  if(errors.length)throw Error(errors.join('\n'));return {...results,errors};
 }finally{await context.close();}
}
