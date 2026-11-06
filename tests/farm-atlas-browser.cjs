// 原尺寸像素等价、失败重试及正式作物绘制性能；输出不是华为实机帧率。
async page=>{
 await page.goto('http://localhost:4175');
 return await page.evaluate(async()=>{
  const {loadFarmSheet}=await import('/src/rendering/farm-atlas.js'),manifest=await(await fetch('/assets/farm/manifest.json')).json();
  const {drawGrowingCrop}=await import('/src/rendering/farm-growth.js'),results=[];
  for(const file of manifest.runtimeFiles){
   const original=new Image();original.src='/assets/farm/'+file;await original.decode();const prepared=await loadFarmSheet(file);
   if(original.naturalWidth!==prepared.naturalWidth||original.naturalHeight!==prepared.naturalHeight)throw Error('图集尺寸改变');
   // 使用与加载器相同的默认画布后端；允许预乘透明色舍入，透明轮廓必须一致。
   const canvas=document.createElement('canvas');canvas.width=original.naturalWidth;canvas.height=original.naturalHeight;const c=canvas.getContext('2d');
   c.drawImage(original,0,0);const before=c.getImageData(0,0,canvas.width,canvas.height).data;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(prepared,0,0);const after=c.getImageData(0,0,canvas.width,canvas.height).data;let differences=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])differences++;
   let maxAlpha=0,maxVisible=0;for(let i=0;i<before.length;i+=4){maxAlpha=Math.max(maxAlpha,Math.abs(before[i+3]-after[i+3]));for(let k=0;k<3;k++)maxVisible=Math.max(maxVisible,Math.abs(before[i+k]*before[i+3]-after[i+k]*after[i+3])/255);}
   if(maxAlpha!==0||maxVisible>1)throw Error('图集可见像素改变：'+JSON.stringify({file,differences,maxAlpha,maxVisible}));
   const entries=Object.entries(manifest.crops).filter(([key,value])=>value.file===file&&key.endsWith('-2')).map(([,v])=>v),bench=document.createElement('canvas');bench.width=780;bench.height=1688;const ctx=bench.getContext('2d');ctx.scale(2,2);const costs=[[],[]];
   // 交错采样并预热，避免先后顺序、初始化和图片上传影响中位数。
   for(let frame=0;frame<50;frame++)for(const index of frame%2?[1,0]:[0,1]){
    const start=performance.now();ctx.clearRect(0,0,390,844);for(let i=0;i<72;i++){const rect=entries[i%entries.length].rect,scale=Math.min(49/rect[2],67/rect[3]);drawGrowingCrop(ctx,index?prepared:original,rect,25+i%6*56,80+Math.floor(i/6)*56,rect[2]*scale,rect[3]*scale,{time:frame/60,phase:i*.8},2,.85);}ctx.getImageData(0,0,1,1);if(frame>=10)costs[index].push(performance.now()-start);
   }
   const stats=values=>{values.sort((a,b)=>a-b);return {median:values[20],p95:values[38]};};results.push({file,pixels:canvas.width*canvas.height,differences,maxAlpha,maxVisible,original:stats(costs[0]),prepared:stats(costs[1])});
  }
  // 转换失败不返回占位图，资源再次可用后允许重试。
  let failed=false;try{await loadFarmSheet('missing-performance-test.svg');}catch(e){failed=e.message.includes('农田作物图集加载失败');}if(!failed)throw Error('缺失图集未明确失败');
  const {loadFarmArt,farmArtBudget}=await import('/src/rendering/farm.js');await Promise.all([loadFarmArt(),loadFarmArt()]);const budget=farmArtBudget();if(budget.sheets!==4||budget.pixels!==4591968)throw Error('图集预算不符');
  return {results,budget,missingResourceRejected:failed};
 });
}
