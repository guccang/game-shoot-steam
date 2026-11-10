// 建筑换装作用域只在正式建筑画笔中启用，缓存回调捕获同一外观，角色与远方营地不受影响。
let current=null;
// 当前作用域用于墙面和屋顶的同步材质。
export function campBuildingFinish(){return current;}
// 默认组合保持原画笔与原缓存的表现。
export function setCampBuildingFinish(finish){current=finish?.material==='wood'&&finish?.shape==='round'?null:finish;}
// 稳定缓存键不包含动画或逐帧数据。
export function campBuildingFinishKey(){return current?current.material+':'+current.shape:'original';}
// 缓存异步预热时恢复创建时的外观，完成或异常均还原调用方。
export function withCampBuildingFinish(finish,paint,c){const previous=current;setCampBuildingFinish(finish);try{return paint(c);}finally{current=previous;}}
// 在已有墙面剪裁内增加木板或砌石结构，不遮盖后绘制的门窗。
export function drawCampWallFinish(c,left,top,width,height){const f=current;if(!f)return;c.save();c.fillStyle=f.material==='stone'?'#b6bdab':'#c5ab7e';c.fillRect(left,top,width,height);c.strokeStyle=f.material==='stone'?'#83907b':'#a08761';c.lineWidth=1.1;for(let y=top+14,row=0;y<top+height;y+=16,row++){c.beginPath();c.moveTo(left,y);c.lineTo(left+width,y);c.stroke();if(f.material==='stone')for(let x=left+16+(row%2)*17;x<left+width;x+=35){c.beginPath();c.moveTo(x,y-16);c.lineTo(x,y);c.stroke();}}if(f.material==='wood'){for(const x of [left+7,left+width-12]){c.fillStyle='#8e7956';c.fillRect(x,top,5,height);}}c.restore();}
