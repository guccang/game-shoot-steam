// 车型挂点与施工共用；单侧部件坐标以车体原点为准，第二侧只镜像位置。
import {JINBEI_BODY_SCALE as VAN_SCALE} from './jinbei.js';
export const VEHICLE_UPGRADE_MOUNTS=[
 {armor:[23,13],engine:[24,-17]},
 {armor:[30,14],engine:[34,-17]},
 {armor:[22,10],engine:[24,-18]},
 {armor:[33,12],engine:[32,-7]},
 {armor:[28,20],engine:[23,-39]},
 {armor:[0,-2],engine:[-23,0]},
 {armor:[36,14],engine:[40,-20]},
 {armor:[33*VAN_SCALE,17*VAN_SCALE,VAN_SCALE],engine:[26*VAN_SCALE,-36*VAN_SCALE,VAN_SCALE]},
 {armor:[29,16],engine:[27,-29]},
];
// 工坊部件卡使用全等级联合包围，不因升一级而放大整个零件。
export const VEHICLE_UPGRADE_BOUNDS={armor:{left:-20,top:-18,width:40,height:36},engine:{left:-20,top:-22,width:40,height:40}};
