// 以浏览器实际 Path2D 像素比较旧三角填充和新轮廓，不用不同机位截图掩盖裂缝。
async page=>await page.evaluate(async()=>{
 const {freshMining,openBasement}=await import('/src/progression/mining/mining.js'),{minePoint}=await import('/src/config/mining.js'),{buildMineSurface}=await import('/src/world/mine-surface.js'),{mineSurfaceContours,createMineSurfaceCache}=await import('/src/world/mine-surface-cache.js');
 const results=[];
 for(const seed of [1847,3291])for(const edge of [false,true]){
  const l=freshMining();openBasement(l);l.seed=seed;if(edge)l.bounds={left:0,top:0,right:4599.3,bottom:1149.7};
  const p=minePoint({x:63,y:8}),rect={x:p.x-180,y:p.y-180,w:360,h:360},mesh=buildMineSurface(l,rect),chunks=createMineSurfaceCache().sample(l,rect);
  for(const kind of ['open','water']){
   const data=[];
   for(const polygons of [mesh[kind],chunks.items.flatMap(c=>mineSurfaceContours(c.value[kind]))]){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=360;const c=canvas.getContext('2d',{willReadFrequently:true}),path=new Path2D();
    for(const points of polygons){path.moveTo(points[0].x,points[0].y);for(const point of points.slice(1))path.lineTo(point.x,point.y);path.closePath();}
    c.translate(-rect.x,-rect.y);c.fill(path);data.push(c.getImageData(0,0,360,360).data);
   }
   let different=0,max=0;for(let i=3;i<data[0].length;i+=4){const difference=Math.abs(data[0][i]-data[1][i]);if(difference>5)different++;max=Math.max(max,difference);}
   if(different>360*360*.001)throw Error('轮廓像素不一致 '+JSON.stringify({seed,edge,kind,different,max}));results.push({seed,edge,kind,different,max});
  }
 }
 return results;
})
