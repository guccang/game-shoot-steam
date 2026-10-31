// 小屋门口、家具底座和操作距离共用数据，绘制不会另造碰撞轮廓。
import {RANGER_COTTAGE} from '../world/workshop.js';
export const COTTAGE={door:{x:RANGER_COTTAGE.x,y:RANGER_COTTAGE.y+12},wait:1,exitWait:1,radius:26,clickRadius:155,width:360,height:360,spawn:{x:180,y:300},exit:{x:180,y:338},exitRadius:26,bed:{x:105,y:157},bedRadius:65};
export const COTTAGE_FURNITURE=[
 {id:'bed',x:62,y:140,width:66,height:112},
 {id:'desk',x:273,y:112,width:100,height:46},
 {id:'chair',x:272,y:156,width:30,height:28},
 {id:'cabinet',x:292,y:265,width:66,height:38},
 {id:'plant',x:46,y:288,width:26,height:24},
];
