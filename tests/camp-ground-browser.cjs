// 用真实Canvas逐像素比较先白天后夜色与一次完整构建，覆盖边界和季节来源层。
async page=>page.evaluate(async()=>{
 const {buildGroundTile}=await import('/src/rendering/ground-tile.js'),{GroundCache}=await import('/src/rendering/ground-cache.js');
 const result=[];
 for(const season of ['spring','winter'])for(const spec of [{key:'1:4',x:384,y:1536,w:384,h:384},{key:'0:0',x:0,y:0,w:384,h:384}]){
  const transition=season==='winter'?{active:true,progress:.4,from:{spring:1},revision:1}:null;
  const steps=buildGroundTile(spec,'forest',season,transition);let next;do{next=steps.next();}while(!next.done);const before=next.value;
  const cache=new GroundCache();cache.setSeason(season,transition);
  const day=cache.get(spec,0);if(day.night)throw Error('白天提前构建了夜色');const after=cache.get(spec,1);
  for(const key of ['day','night','fromDay','fromNight']){
   if(!before[key]&&!after[key])continue;
   if(!before[key]||!after[key])throw Error('缺失纹理 '+key);
   const a=before[key].getContext('2d').getImageData(0,0,before[key].width,before[key].height).data;
   const b=after[key].getContext('2d').getImageData(0,0,after[key].width,after[key].height).data;
   let differences=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;
   if(differences)throw Error('地块像素变化 '+JSON.stringify({season,spec,key,differences}));
   result.push({season,key:spec.key,layer:key,differences});before[key].width=before[key].height=1;
  }
  cache.dispose();if(cache.stats().bytes||cache.stats().pendingBytes)throw Error('地块销毁没有释放');
 }
 return result;
})
