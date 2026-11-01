// 木材实物与营地仓库共用配置，重量按每份木头计算。
import {TOWN_LAYOUT} from './town-layout.js';
export const WOOD_ITEM={id:'material:wood',name:'木头',category:'material',mass:.5,icon:{kind:'resource',key:'wood'},description:'采集后直接飞入背包或当前载具，占用对应负重。',use:'收取后会满载时跳过，不生成地面物品；返回营地，在货舱与仓库页面入库后用于建设和制作。'};
export const CAMP_WAREHOUSE={x:TOWN_LAYOUT.warehouse.x,y:TOWN_LAYOUT.warehouse.y+22,mapId:'forest',name:'营地仓库',bounds:TOWN_LAYOUT.bounds};
