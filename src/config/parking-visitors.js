// 广场访客目录与玩家装备分离；正式车辆自动覆盖全部可获得型号，样车仅供参观。
import {COLLECTED_VEHICLES} from './vehicles.js';
export const SCIENCE_VEHICLES=[
 {id:'moon',name:'月梭',description:'双浮筒科考艇'},
 {id:'star',name:'星甲',description:'六足勘探车'},
 {id:'firewing',name:'萤翼',description:'折翼穿梭机'},
 {id:'forestwhale',name:'林鲸',description:'远航补给舱'},
 {id:'mosstiger',name:'苔虎',description:'钻探巡地车'},
 {id:'starring',name:'星环',description:'环轨观测舱'},
].map(m=>({...m,sciFi:true}));
export const VISITOR_MODELS=[...COLLECTED_VEHICLES.map((m,hull)=>({id:hull===1?'heavy':hull===3?'hover':'visitor-'+m.id,name:m.shortName,hull})),...SCIENCE_VEHICLES];
