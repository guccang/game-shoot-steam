// 路点与终点的共用视觉：奶油亮芯、森林绿轮廓，浅路面和夜间均可辨认。
export const NAVIGATION_STYLE={spacing:36,maxScale:1.65,dotRadius:5.5,pinLift:64};

// 小屏缩放下补足辨识尺寸，同时限制世界占地，避免盖住人物与战斗预警。
export function navigationScale(zoom=1){return Math.min(NAVIGATION_STYLE.maxScale,Math.max(1,1/Math.max(.1,zoom)));}

// 靠近顶部任务卡时把标记移到目标下侧，指尖翻转仍指向原落点。
export function navigationPinBelow(p,view){return (p.y-view.y)*(view.zoom||1)<250;}

// 向下避让时让整个标记越过任务卡底边；限制引线长度，不把远处目标拉进视口。
export function navigationPinLift(p,view){
 const zoom=view.zoom||1,screenY=(p.y-view.y)*zoom;
 return navigationPinBelow(p,view)?Math.min(160,Math.max(NAVIGATION_STYLE.pinLift,(200-screenY)/(navigationScale(zoom)*zoom)+32)):NAVIGATION_STYLE.pinLift;
}

// 路点锚定地面，箭头按真实路线折向；减少动态时保持固定亮度。
export function drawNavigationDot(c,p,time,zoom,reduced){
 const scale=navigationScale(zoom);
 c.save();c.translate(p.x,p.y);c.scale(scale,scale);
 c.globalAlpha=reduced?1:.92+.08*Math.sin(time*3-p.distance/45);
 c.beginPath();c.ellipse(0,0,10,7,0,0,Math.PI*2);c.fillStyle='#fff0ad35';c.fill();
 c.beginPath();
 if(p.arrow){c.rotate(p.angle);c.moveTo(8,0);c.lineTo(-6,-6);c.lineTo(-3,0);c.lineTo(-6,6);c.closePath();}
 else c.ellipse(0,0,NAVIGATION_STYLE.dotRadius,4,0,0,Math.PI*2);
 c.fillStyle='#fff0ad';c.strokeStyle='#315747';c.lineWidth=2.4;c.lineJoin='round';c.stroke();c.fill();
 c.restore();
}

// 终点保留贴地椭圆，以深浅双边区别普通脚底阴影与战斗范围。
export function drawNavigationRing(c,p,time,reduced){
 c.save();c.translate(p.x,p.y);c.globalAlpha=reduced?1:.94+.06*Math.sin(time*2.5);
 c.beginPath();c.ellipse(0,0,55,28,0,0,Math.PI*2);c.fillStyle='#fff0ad28';c.fill();
 c.strokeStyle='#315747';c.lineWidth=8;c.stroke();c.strokeStyle='#fff0ad';c.lineWidth=4;c.stroke();
 c.beginPath();c.ellipse(0,0,43,20,0,0,Math.PI*2);c.strokeStyle='#fff5cd';c.lineWidth=2;c.stroke();c.restore();
}

// 竖直标记绘制在实体之后，尖端与脚底通过短虚线相连，不被树冠或建筑吞没。
export function drawNavigationPin(c,p,time,zoom,reduced,below=false,baseLift=NAVIGATION_STYLE.pinLift){
 const scale=navigationScale(zoom),lift=baseLift+(reduced?0:Math.sin(time*2.5)*3);
 c.save();c.translate(p.x,p.y);c.scale(scale,below?-scale:scale);c.lineCap='round';c.lineJoin='round';
 c.setLineDash([3,5]);c.beginPath();c.moveTo(0,-7);c.lineTo(0,-lift+34);
 c.strokeStyle='#315747';c.lineWidth=4;c.stroke();c.strokeStyle='#fff0ad';c.lineWidth=2;c.stroke();c.setLineDash([]);
 c.translate(0,-lift);c.beginPath();c.moveTo(-14,0);c.quadraticCurveTo(0,-10,14,0);c.lineTo(14,17);c.lineTo(0,32);c.lineTo(-14,17);c.closePath();
 c.fillStyle='#fff0ad';c.strokeStyle='#315747';c.lineWidth=3;c.fill();c.stroke();
 c.beginPath();c.moveTo(-6,8);c.lineTo(0,15);c.lineTo(6,8);c.strokeStyle='#315747';c.lineWidth=3;c.stroke();c.restore();
}
