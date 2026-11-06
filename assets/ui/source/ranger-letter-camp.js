// 信纸制图源稿：在游戏页面初始化后调用，复用正式绘制器并导出静态 WebP。
import {catSprites} from '../../../src/rendering/cat-animation.js';
import {drawCat} from '../../../src/rendering/characters.js';
import {drawScooterRear,drawScooterFront} from '../../../src/rendering/scooter.js';
import {drawBuildingArchitecture} from '../../../src/rendering/building-architecture.js';
import {drawForestTree} from '../../../src/rendering/forest-art.js';
import {loadFarmArt,drawNaturalFarmCrop} from '../../../src/rendering/farm.js';
import {drawWatering} from '../../../src/rendering/farm-water-tool.js';
import {drawMineShaft,drawMiningPickaxe} from '../../../src/rendering/mining.js';
import {drawOutdoorFishing} from '../../../src/rendering/outdoors.js';
import {drawHomeGlider} from '../../../src/rendering/home-glider.js';

// 各景使用同一张草地与小径，小屋、猫与电动车分别以原版脚点落地。
export async function paintLetterMap(game){
 await Promise.all([catSprites.load(),loadFarmArt()]);
 if(catSprites.status!=='ready')throw Error('来信制图缺少猫猫图集');
 const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1080;
 const c=canvas.getContext('2d');c.scale(2,2);
 // 用局部坐标排布景物，不改变源绘制器的尺寸和部件关系。
 function place(x,y,size,paint){c.save();c.translate(x,y);c.scale(size,size);paint();c.restore();}
 // 所有猫均取橘猫正式待机帧，武器、持竿与驾驶前罩按需叠加。
 function cat(x,y,size,armed=false){drawCat(c,x,y,0,-.12,size,0,3,null,1,null,0,false,false,null,0,null,0,!armed);}
 c.fillStyle='#b5cc8b';c.fillRect(0,0,360,540);
 // 林间小路从田边绕过矿洞，经小屋一直走到湖岸。
 c.lineCap='round';c.lineWidth=22;c.strokeStyle='#dfcda0';c.beginPath();c.moveTo(178,-15);c.bezierCurveTo(138,77,231,119,176,178);c.bezierCurveTo(118,244,182,282,179,336);c.bezierCurveTo(174,384,118,440,139,545);c.stroke();
 for(let i=0;i<87;i++){const x=(i*97+13)%360,y=(i*157+33)%540;c.fillStyle='#a9c383';c.beginPath();c.ellipse(x,y,3.2,1.5,0,0,7);c.fill();}
 // 图边用正式林木收束；中心留出活动和建筑轮廓。
 const trees=game.trees;
 if(!trees.length)throw Error('来信制图缺少林木样本');
 for(const [i,x,y,size] of [[0,5,42,.56],[2,61,36,.52],[3,135,14,.6],[1,355,53,.65],[0,-4,224,.63],[2,355,283,.52],[3,6,425,.60],[1,331,430,.61]]){
  drawForestTree(c,{...trees[i],x,y,size},0,0,true);
 }
 // 在暖土垄里种入正式成熟作物，前景猫用游戏内的水壶浇地。
 for(const [x,y,kind] of [[65,80,0],[94,80,0],[123,80,0],[65,109,1],[94,109,1],[123,109,1]]){
  c.fillStyle='#a5855f';c.beginPath();c.ellipse(x,y,19,8,0,0,7);c.fill();
  place(x,y,.56,()=>drawNaturalFarmCrop(c,kind,0,0,0,0,false,true));
 }
 place(39,112,.75,()=>{cat(0,0,1);drawWatering(c,game,{x:0,y:0},{x:72,y:1},{waterTargets:[{x:73,y:7}]},.45);});
 place(265,105,.72,()=>drawBuildingArchitecture(c,'weapons'));
 cat(240,136,.93,true);
 place(95,217,.95,()=>{drawScooterRear(c);cat(0,-30,1);drawScooterFront(c);});
 place(268,226,.95,()=>drawMineShaft(c,{x:0,y:0},false));
 place(235,245,.7,()=>{cat(0,0,1);drawMiningPickaxe(c,{player:{x:0,y:0},cottage:{direction:0}});});
 place(83,397,.68,()=>drawBuildingArchitecture(c,'cottage',false,0,3));
 drawHomeGlider(c,{x:258,y:376,angle:0},0,{height:2,remaining:1,distance:1},0,true);
 // 湖面与短岸线为钓竿和鱼漂留白，钓具与猫共用脚点。
 c.fillStyle='#ddd3a0';c.beginPath();c.moveTo(0,489);c.bezierCurveTo(130,509,173,423,360,451);c.lineTo(360,540);c.lineTo(0,540);c.fill();
 c.fillStyle='#86c6be';c.beginPath();c.moveTo(0,496);c.bezierCurveTo(130,516,174,431,360,458);c.lineTo(360,540);c.lineTo(0,540);c.fill();
 cat(123,469,.88);drawOutdoorFishing(c,{fishing:{phase:'waiting',water:{x:232,y:489},clock:1,lean:0,species:0}},{x:123,y:469});
 return canvas;
}
