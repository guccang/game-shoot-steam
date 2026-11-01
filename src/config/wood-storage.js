// 木材实物与营地仓库共用配置，重量按每份木头计算。
import {TOWN_LAYOUT} from './town-layout.js';
export const WOOD_ITEM={id:'material:wood',name:'木头',category:'material',mass:.5,icon:{kind:'resource',key:'wood'},description:'靠近地面木材0.5秒拾取，占用背包或载具负重。',use:'载荷不足时木材留在地面；返回营地，在货舱与仓库页面入库后用于建设和制作。'};
// 接近范围按步行与驾驶分别配置；每堆独立等待，余量不得把载荷填满到无法移动。
export const WOOD_GROUND={wait:.5,footRadius:38,vehicleRadius:64,mergeRadius:24,mergeLimit:8,noticeSeconds:4};
export const CAMP_WAREHOUSE={x:TOWN_LAYOUT.warehouse.x,y:TOWN_LAYOUT.warehouse.y+22,mapId:'forest',name:'营地仓库',bounds:TOWN_LAYOUT.bounds};
