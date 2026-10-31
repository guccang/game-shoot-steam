// 种子小屋使用营地同源平涂与描边，底脚固定，招牌与货架均随实体排序。
export function drawSeedShop(c,item){
 c.save();c.translate(item.x,item.y);c.lineWidth=2.4;c.strokeStyle='#49674a';
 c.fillStyle='#294c3c28';c.beginPath();c.ellipse(5,5,67,16,0,0,Math.PI*2);c.fill();
 c.fillStyle='#eed8a4';c.beginPath();c.roundRect(-51,-74,102,76,5);c.fill();c.stroke();
 c.fillStyle='#bc955f';c.fillRect(-54,-4,108,8);c.strokeRect(-54,-4,108,8);
 c.fillStyle='#7d9a65';c.beginPath();c.moveTo(-62,-69);c.lineTo(-43,-109);c.lineTo(44,-109);c.lineTo(62,-69);c.closePath();c.fill();c.stroke();
 c.strokeStyle='#abc08a';for(const x of [-30,-8,14,36]){c.beginPath();c.moveTo(x,-104);c.lineTo(x-9,-73);c.stroke();}c.strokeStyle='#49674a';
 c.fillStyle='#54764c';c.beginPath();c.roundRect(-14,-43,29,44,3);c.fill();c.stroke();c.fillStyle='#edd896';c.beginPath();c.arc(7,-20,2.5,0,Math.PI*2);c.fill();
 c.fillStyle='#fff4d3';c.beginPath();c.roundRect(-44,-65,88,24,5);c.fill();c.stroke();c.fillStyle='#35563d';c.font='bold 15px sans-serif';c.textAlign='center';c.fillText('种子小屋',0,-48);
 c.fillStyle='#bb945f';for(const x of [-43,25]){c.fillRect(x,-27,20,27);c.strokeRect(x,-27,20,27);c.fillStyle='#e8dbaa';c.fillRect(x+3,-36,14,15);c.strokeRect(x+3,-36,14,15);c.strokeStyle='#628451';c.beginPath();c.moveTo(x+10,-24);c.lineTo(x+10,-32);c.moveTo(x+10,-29);c.lineTo(x+6,-32);c.moveTo(x+10,-28);c.lineTo(x+14,-31);c.stroke();c.strokeStyle='#49674a';c.fillStyle='#bb945f';}
 c.restore();
}
