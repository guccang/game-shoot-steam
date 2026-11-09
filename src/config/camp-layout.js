import {FARM_SEED_SHOP} from './farm.js';
// 可移动设施的稳定身份、原始锚点和手机规划网格；不保存显示名称作为关联键。
import {TOWN_LAYOUT} from './town-layout.js';
export const CAMP_LAYOUT_GRID=20;
export const CAMP_ROAD_WIDTH=56;
export const CAMP_BUILDINGS=Object.entries({cottage:'巡林小屋',weapons:'武器工坊',garage:'载具工坊',warehouse:'小屋仓库',warehouseDepot:'后院仓库',outdoor:'户外用品店',ammo:'弹药补给铺',repair:'维修中心',catHome:'猫窝',furniture:'家具小铺',construction:'建筑公司',refinery:'提炼厂',factory:'加工厂',story:'回信驿',clearing:'清缴告示牌',rogue:'远征光门',tower:'时空塔',guardian:'守护祭坛'}).map(([id,name])=>({id,name,...TOWN_LAYOUT[id],width:TOWN_LAYOUT[id].width||(['cottage'].includes(id)?150:110),height:TOWN_LAYOUT[id].height||(['cottage'].includes(id)?160:100)})).concat([{...FARM_SEED_SHOP,id:'seed',name:'种子小屋'}]);
// 原坐标单独保存，运行设施迁移不会反过来改变默认规划。
export function normalizeCampLayout(raw){const positions={};for(const b of CAMP_BUILDINGS){const p=raw?.positions?.[b.id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-1120&&p.x<=790&&p.y>=-58&&p.y<=1400)positions[b.id]={x:Math.round(p.x/CAMP_LAYOUT_GRID)*CAMP_LAYOUT_GRID,y:Math.round(p.y/CAMP_LAYOUT_GRID)*CAMP_LAYOUT_GRID};}return {version:1,positions};}
// 从草稿或已保存配置读取建筑脚底；未搬动时完全沿用旧坐标。
export function campBuildingPosition(layout,building){return {...building,...layout?.positions?.[building.id]};}
