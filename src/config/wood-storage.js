// 木材实物与营地仓库共用配置，重量按每份木头计算。
import {TOWN_LAYOUT} from './town-layout.js';
export const WOOD_ITEM={id:'material:wood',name:'木头',category:'material',mass:.5,icon:{kind:'resource',key:'wood'},description:'采集后尚未入库的木材，会占用背包或载具负重。',use:'返回营地，在背包与货舱中存入仓库，随后可用于建设、购买和制作。'};
export const CAMP_WAREHOUSE={x:TOWN_LAYOUT.weapons.x,y:TOWN_LAYOUT.weapons.y+95,mapId:'forest',name:'营地仓库',bounds:TOWN_LAYOUT.bounds};
