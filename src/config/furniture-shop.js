// 家具小店的外部底座与室内样品共用稳定配置，商品实例仍由原家具存档管理。
import {TOWN_LAYOUT} from './town-layout.js';
import {decorDefinition} from './home-decor.js';
export const FURNITURE_SHOP={...TOWN_LAYOUT.furniture,id:'furniture-shop',name:'家具小铺',mapId:'forest'};
// 样品只展示原目录家具，不生成玩家库存；两侧陈列为中间通道留白。
export const FURNITURE_SHOP_DISPLAYS=[['sofa',70,275],['bookcase',65,125],['lamp',300,130],['stool',295,275]].map(([decor,x,y])=>({...decorDefinition(decor),id:'sample-'+decor,type:'furniture-display',decor,x,y}));
