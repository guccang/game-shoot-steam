// SVG 图集只在加载时栅格化一次；切片弯曲继续由正式绘制器逐帧执行。
export async function loadFarmSheet(file){
 const source=new Image();source.src='/assets/farm/'+file;
 try{
  await source.decode();
  if(!file.endsWith('.svg'))return source;
  // 保留清单原尺寸、透明边缘和裁切坐标；不为单株、昼夜或动画帧制造副本。
  const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;
  let url;
  try{
   const context=canvas.getContext('2d');if(!context)throw Error('无法创建作物图集画布');
   context.drawImage(source,0,0);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('作物图集转换失败')),'image/png'));
   url=URL.createObjectURL(blob);const image=new Image();image.src=url;await image.decode();return image;
  }finally{
   if(url)URL.revokeObjectURL(url);canvas.width=canvas.height=1;
  }
 }catch(error){throw new Error('农田作物图集加载失败：'+file,{cause:error});}
}
