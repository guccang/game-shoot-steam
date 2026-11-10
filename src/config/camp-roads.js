// 房屋与营门保留主路宽度，小型交互设施只接细长支路。
export const CAMP_FACILITY_PATH_WIDTH=24;
export const CAMP_HOUSE_ROAD_WIDTH=56;
const footpathIds=new Set(['delivery','football','pasture','trade','story','clearing','camp','pottery','roost','guardian','rogue','tent']);
// 身份判断独立于中文名称，保存和切换材质不改变道路用途。
export function campBuildingRoadWidth(building){return building.placementKind==='sign'||footpathIds.has(building.id)?CAMP_FACILITY_PATH_WIDTH:CAMP_HOUSE_ROAD_WIDTH;}
// 未标注的旧路与营门接驳线仍按主路绘制和避让。
export function campPathWidth(path){return path.width||CAMP_HOUSE_ROAD_WIDTH;}
