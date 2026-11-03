// 场景点击范围和行走参数集中配置，界面与规则读取相同门口和家具尺寸。
import {WORKSHOP_INTERIORS,interiorLayout} from './workshop-interiors.js';
import {RANGER_COTTAGE} from '../world/workshop.js';

export const SCENE_APPROACH=Object.freeze({doorHalfWidth:36,doorDepth:44,arrivalRadius:8,waypointRadius:6,slowdownDistance:24,maxTravel:60,blockedWait:3,searchBudget:4096,bedHeight:146,stairsExtraHeight:48});
// 所有已有营业房共用正式布局，仓库沿用室外存取页面。
export const CLICK_BUILDINGS=[{...interiorLayout({kind:'cottage'}),site:{...RANGER_COTTAGE,width:140,height:150}},...Object.values(WORKSHOP_INTERIORS)].map(layout=>({...layout,site:{width:140,height:150,...layout.site}}));
