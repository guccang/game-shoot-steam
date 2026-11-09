// 地图面积配额按互斥地表统计，森林是有实际植被的林地区域，不按树冠投影重复计数。
export const TERRAIN_COVERAGE=Object.freeze({forest:.30,lake:.05,mountain:.05,meadow:.40,other:.20});
export const TERRAIN_LAYOUT_VERSION='2026-11-08-open-mountains';
export const COVERAGE_SAMPLE_STEP=80;
// 由40单位地表采样校准，另用20单位网格复核；手机启动时只比较阈值。
export const FOREST_COVER_THRESHOLDS=Object.freeze({forest:0.48546857935625615,meadow:-1.0130196622128143});
