// 正式建筑画笔与缓存逐像素对照，并比较同组建筑的提交耗时和绘图调用数。
async page=>{
 await page.goto('http://localhost:4175');
 return await page.evaluate(async()=>{
  await document.fonts.ready;const {campBuildingCache:cache}=await import('/src/rendering/camp-building-cache.js');
  const modules=[['warehouse','drawWarehouse'],['cat-home','drawCatHome'],['furniture-shop','drawFurnitureShop'],['seed-shop','drawSeedShop'],['legendary-workshop','drawLegendaryWorkshop'],['ammo-shop','drawAmmoShop'],['construction-company','drawConstructionCompany']];
  const painters=await Promise.all(modules.map(async([file,name])=>(await import('/src/rendering/'+file+'.js'))[name])),results=[];
  // 每份像素证据只读回一次，避免浏览器因频繁读回改用另一种抗锯齿后端。
  const surface=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=640;const c=canvas.getContext('2d');c.scale(2,2);return c;};
  // 相同2倍像素网格，包含屋顶、接触影、弹药坡道和建筑公司牌子。
  for(let i=0;i<painters.length;i++)for(const night of [0,1])for(const winter of [false,true]){
   cache.clear();const source=surface(),target=surface();painters[i](source,{x:160,y:250},night,winter);const before=source.getImageData(0,0,640,640).data;cache.advance();
   painters[i](target,{x:160,y:250},night,winter);const after=target.getImageData(0,0,640,640).data;let alpha=0,error=0,missing=0;
   for(let n=0;n<before.length;n+=4){alpha=Math.max(alpha,Math.abs(before[n+3]-after[n+3]));if(before[n+3]>32&&after[n+3]===0)missing++;for(let k=0;k<3;k++)error=Math.max(error,Math.abs(before[n+k]*before[n+3]-after[n+k]*after[n+3])/255);}
   results.push({kind:modules[i][0],night,winter,alpha,error,missing});
   if(missing||alpha>2||error>2)throw Error('建筑缓存裁切或颜色改变：'+JSON.stringify(results.at(-1)));
  }
  cache.clear();const c=surface(),nativeDraw=cache.draw;const times={raw:[],cached:[]};
  const drawGroup=()=>{c.clearRect(0,0,320,320);for(const paint of painters)paint(c,{x:160,y:250},1,true);};
  drawGroup();while(cache.stats().pending)cache.advance();
  // 交错对比，原始路径直接调用同一正式画笔，避免重复分配造成假收益。
  for(let frame=0;frame<80;frame++)for(const mode of frame%2?['raw','cached']:['cached','raw']){
   cache.draw=mode==='raw'?function(ctx,key,bounds,paint){paint(ctx);}:nativeDraw;
   const start=performance.now();for(let repeat=0;repeat<10;repeat++)drawGroup();const ms=(performance.now()-start)/10;if(frame>=10)times[mode].push(ms);
  }
  cache.draw=nativeDraw;
  const stats=values=>{values.sort((a,b)=>a-b);return {median:values[Math.floor(values.length/2)],p95:values[Math.floor(values.length*.95)]};};
  const budget=cache.stats();if(budget.bytes>budget.maxBytes||budget.count!==7)throw Error('缓存预算或数量不符');
  // 模拟实际通知链路：恢复代际变化后不能继续命中旧画布。
  const old=[...cache.entries.values()][0].canvas;old.dispatchEvent(new Event('contextlost'));drawGroup();if(old.width!==1||cache.stats().count!==0)throw Error('画布恢复未释放缓存');while(cache.stats().pending)cache.advance();
  const {artStyle,commitArtStyle}=await import('/src/art-styles/state.js'),style=artStyle();commitArtStyle(style==='clear'?'classic':'clear');drawGroup();if(cache.stats().count!==0)throw Error('风格切换误用旧缓存');while(cache.stats().pending)cache.advance();commitArtStyle(style);
  return {designCriterion:'camp-building-static-cache',pixels:results,timing:{raw:stats(times.raw),cached:stats(times.cached)},budget,recovery:true,styleSwitch:true};
 });
}
