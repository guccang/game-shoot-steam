// 矿轨连接纯几何：64格、20轨距、16种邻接组合，静态形体不改变驾驶路径。
const shapes=new Map(),directions=[[0,-1],[1,0],[0,1],[-1,0]];
// 坐标绕格心旋转，四种转角与三岔共享同一造型，端点严格落在邻格边界。
function rotate(p,angle){const c=Math.cos(angle),s=Math.sin(angle);return {x:p.x*c-p.y*s,y:p.x*s+p.y*c};}
// 二次弧线按固定精度采样，仅缓存最多16种连接形体。
function curve(a,b,c){return Array.from({length:13},(_,i)=>{const t=i/12,u=1-t;return {x:u*u*a[0]+2*u*t*b[0]+t*t*c[0],y:u*u*a[1]+2*u*t*b[1]+t*t*c[1]};});}
// 钢轨的两侧使用解析法线，弯段半径分别8和28，始终保持20轨距。
function bend(s){const arc=18*Math.PI/2;if(s<14)return {x:32-s,y:0,dx:-1,dy:0};if(s>14+arc)return {x:0,y:18+s-14-arc,dx:0,dy:1};const a=-Math.PI/2-(s-14)/18;return {x:18+Math.cos(a)*18,y:18+Math.sin(a)*18,dx:Math.sin(a),dy:-Math.cos(a)};}
// 连接位按北东南西编码；出口形体、枕木和尽头挡木一次生成。
export function mineRailShape(mask){
 mask=mask&15;if(shapes.has(mask))return shapes.get(mask);
 const exits=directions.map((_,i)=>i).filter(i=>mask&(1<<i)),paths=[],sleepers=[];let kind='isolated',angle=0,stop=null;
 // 端点到端点的钢轨路径，填充与描边由正式绘制器分批处理。
 const line=(...p)=>paths.push(p.map(([x,y])=>({x,y}))),tie=(x,y,angle=0)=>sleepers.push({x,y,angle});
 if(exits.length<2){kind=exits.length?'end':'isolated';angle=exits.length?(exits[0]-1)*Math.PI/2:0;for(const y of [-10,10])line([exits.length?-14:-18,y],[exits.length?32:18,y]);for(const x of exits.length?[-8,8,24]:[-8,8])tie(x,0);if(exits.length)stop={x:-15,y:0};}
 else if(exits.length===2&&(exits[0]+2)%4===exits[1]){kind='straight';angle=exits[0]===0?Math.PI/2:0;for(const y of [-10,10])line([-32,y],[32,y]);for(const x of [-24,-8,8,24])tie(x,0);}
 else if(exits.length===2){kind='bend';const start=exits.find(i=>exits.includes((i+1)%4));angle=(start-1)*Math.PI/2;const distance=28+18*Math.PI/2,positions=[0,14,...Array.from({length:12},(_,i)=>14+(i+1)*18*Math.PI/24),distance];for(const offset of [-10,10])paths.push(positions.map(s=>{const p=bend(s);return {x:p.x-p.dy*offset,y:p.y+p.dx*offset};}));for(let i=0;i<5;i++){const p=bend(5+(distance-10)*i/4);tie(p.x,p.y,Math.atan2(p.dy,p.dx));}}
 else if(exits.length===3){kind='tee';angle=directions.findIndex((_,i)=>!exits.includes(i))*Math.PI/2;line([-32,-10],[32,-10]);paths.push(curve([-32,10],[-10,10],[-10,32]),curve([32,10],[10,10],[10,32]));line([-7,17],[0,-5],[7,17]);for(const x of [-24,24])tie(x,0);for(const y of [-8,8,24])tie(0,y,Math.PI/2);}
 else{kind='cross';for(const x of [-10,10])line([x,-32],[x,32]);for(const y of [-10,10])for(const [a,b] of [[-32,-14],[-6,6],[14,32]])line([a,y],[b,y]);for(const y of [-24,-8,8,24])tie(0,y,Math.PI/2);for(const x of [-24,24])tie(x,0);}
 const result={mask,kind,exits,paths:paths.map(p=>p.map(v=>rotate(v,angle))),sleepers:sleepers.map(p=>({...rotate(p,angle),angle:p.angle+angle})),stop:stop?{...rotate(stop,angle),angle}:null};shapes.set(mask,result);return result;
}
