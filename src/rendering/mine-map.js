// 正式地下探索图：未知区、已知地块、连续铁轨和位置标记分层绘制。
const ink='#315c43';
// 仅绘制快照中的已知地块，不能通过缩放看到未走访天然地形。
export function drawMineExplorationMap(canvas,model,view,direction=1){
 const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height),dpr=Math.min(2,canvas.ownerDocument.defaultView.devicePixelRatio||1);
 if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
 const c=canvas.getContext('2d'),s=view.scale,x=p=>width/2+(p.x-view.x)*s,y=p=>height/2+(p.y-view.y)*s;
 c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#526958';c.fillRect(0,0,width,height);
 for(const cell of model.cells){const px=x(cell)-s/2,py=y(cell)-s/2;if(px>width||py>height||px+s<0||py+s<0)continue;c.fillStyle=cell.water?'#78aaa6':'#d4c69b';c.fillRect(px,py,s+.3,s+.3);}
 // 连续金色轨面叠加深绿轮缘；放大后枕木和孤立轨节可辨。
 c.lineCap='round';c.lineJoin='round';
 for(const [color,line] of [[ink,Math.max(3,s*.24)],['#f3cf7b',Math.max(1.5,s*.1)]]){
  c.strokeStyle=color;c.lineWidth=line;c.beginPath();for(const segment of model.segments){c.moveTo(x(segment.a),y(segment.a));c.lineTo(x(segment.b),y(segment.b));}c.stroke();
 }
 for(const cell of model.rails){
  const px=x(cell),py=y(cell);if(px<-s||py<-s||px>width+s||py>height+s)continue;
  c.fillStyle='#f3cf7b';c.strokeStyle=ink;c.lineWidth=1;if(cell.degree!==2){c.beginPath();c.arc(px,py,Math.max(1.8,Math.min(3,s*.16)),0,Math.PI*2);c.fill();c.stroke();}
  if(s>=12){c.strokeStyle='#8d744a';c.lineWidth=1.4;for(const next of cell.links||[]){const dx=next.x-cell.x,dy=next.y-cell.y;for(const f of [.25,.5,.75]){const xx=px+dx*s*f,yy=py+dy*s*f;c.beginPath();c.moveTo(xx-dy*s*.2,yy-dx*s*.2);c.lineTo(xx+dy*s*.2,yy+dx*s*.2);c.stroke();}}}
 }
 c.font='bold 12px sans-serif';c.textAlign='center';const labels=[{left:x(model.position)-10,right:x(model.position)+10,top:y(model.position)+11,bottom:y(model.position)+28}];
 for(const marker of model.markers){const px=x(marker),py=y(marker);c.fillStyle=marker.kind==='home'?'#e4b56b':'#8bbcc1';c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.roundRect(px-6,py-6,12,12,3);c.fill();c.stroke();c.fillStyle='#fff4d0';c.strokeStyle=ink;c.lineWidth=3;mapLabel(c,marker.name,px,py,labels,width,height);}
 const px=x(model.position),py=y(model.position);c.save();c.translate(px,py);c.rotate(direction*Math.PI/2-Math.PI/2);c.beginPath();c.moveTo(10,0);c.lineTo(-7,-7);c.lineTo(-4,0);c.lineTo(-7,7);c.closePath();c.fillStyle='#fff3c7';c.strokeStyle=ink;c.lineWidth=2;c.fill();c.stroke();c.restore();
 c.fillStyle='#fff4d0';c.strokeStyle=ink;c.lineWidth=3;c.strokeText('你',px,py+24);c.fillText('你',px,py+24);
 c.textAlign='left';c.fillText('北 ↑',12,22);
 return {designCriterion:'mine-exploration-map',width,height,scale:s,cells:model.cells.length,rails:model.rails.length,segments:model.segments.length,markers:model.markers.length,bitmapBytes:canvas.width*canvas.height*4};
}

// 入口文字避让玩家和其他标记，缩小时不把多个名称叠在同一个位置。
function mapLabel(c,text,x,y,occupied,width,height){
 const half=c.measureText(text).width/2;
 for(const [px,py] of [[x,y-12],[x+half+12,y+4],[x-half-12,y+4],[x,y+24]]){
  const box={left:px-half-2,right:px+half+2,top:py-12,bottom:py+3};
  if(box.left<2||box.right>width-2||box.top<25||box.bottom>height-2||occupied.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top))continue;
  occupied.push(box);c.strokeText(text,px,py);c.fillText(text,px,py);return;
 }
}
