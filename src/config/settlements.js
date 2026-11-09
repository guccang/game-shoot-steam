import {REGIONAL_SETTLEMENTS} from './regional-camps.js';
// 聚落边界、门洞与清缴场共用世界坐标；木栏外就是可探索的森林。
import {TOWN_LAYOUT,TOWN_SHIFT_X} from './town-layout.js';
export const SETTLEMENTS=[
 {id:'sunleaf',name:'晴叶营地',...TOWN_LAYOUT.bounds,gates:[{side:'top',at:650+TOWN_SHIFT_X,width:360},{side:'bottom',at:690+TOWN_SHIFT_X,width:360},{side:'left',at:729,width:360},{side:'right',at:729,width:360}]},
 {id:'neighbors',name:'邻里小院',left:120+TOWN_SHIFT_X,right:TOWN_LAYOUT.bounds.right,top:TOWN_LAYOUT.bounds.bottom,bottom:2040,gates:[{side:'top',at:690+TOWN_SHIFT_X,width:360},{side:'bottom',at:600+TOWN_SHIFT_X,width:360},{side:'left',at:1850,width:360},{side:'right',at:1800,width:360}]},
 ...REGIONAL_SETTLEMENTS,
];
// 历史清缴存档与原地貌留白兼容；新任务不使用这个固定地点。
export const BOSS_CLEARING={id:'east-clearing',name:'东林清缴场',mapId:'forest',x:1600,y:400,radius:300};
