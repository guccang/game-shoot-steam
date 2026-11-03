// 小屋门口、家具底座和操作距离共用数据，绘制不会另造碰撞轮廓。
import {RANGER_COTTAGE} from '../world/workshop.js';
export const COTTAGE={door:{x:RANGER_COTTAGE.x,y:RANGER_COTTAGE.y+12},wait:1,exitWait:1,radius:26,clickRadius:155,width:480,height:560,spawn:{x:240,y:490},exit:{x:240,y:538},exitRadius:26,bed:{x:105,y:157},bedRadius:65,bedWait:1};
// 各层共用同一楼梯和落脚点，摆放时保留梯身与前方通道。
export const COTTAGE_STAIRS={id:'stairs',x:410,y:410,width:76,height:110,landing:{x:410,y:490},downLanding:{x:410,y:320},radius:28,wait:1};
// 每层独立布置；只有一楼设床和室外出口。
export function cottageFloor(room){return Number.isSafeInteger(room?.floor)&&room.floor>=0?room.floor:0;}
export const COTTAGE_FURNITURE=[
 {id:'bed',x:62,y:140,width:66,height:112},
 {id:'desk',x:273,y:112,width:100,height:46},
 {id:'chair',x:272,y:156,width:30,height:28},
 {id:'cabinet',x:292,y:265,width:66,height:38},
 {id:'plant',x:46,y:288,width:26,height:24},
];
