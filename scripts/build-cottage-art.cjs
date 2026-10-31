// 在本地浏览器中用营地基础图元导出小屋母版，固定门槛锚点与二倍像素。
async page=>page.evaluate(async()=>{
 const {drawCottageArtwork}=await import('/src/rendering/cottage-art.js');
 const canvas=document.createElement('canvas');canvas.width=360;canvas.height=328;
 const c=canvas.getContext('2d');c.scale(2,2);c.translate(90,148);drawCottageArtwork(c);
 return {width:360,height:328,png:canvas.toDataURL('image/png').split(',')[1]};
})
