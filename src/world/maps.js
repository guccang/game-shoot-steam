import {TOWN_LAYOUT} from '../config/town-layout.js';
import { i18nText } from "../i18n/index.js";
// 地图目录只描述地名、入口与游览说明；旧存档默认进入原森林。
export const MAPS = [
  { id: 'forest', name: i18nText("ui.title-menu.9c72997020"), subtitle: i18nText("world.maps.248304e70d"), spawn: {...TOWN_LAYOUT.spawn}, description: i18nText("world.maps.d854501f77") },
  { id: 'jiuzhaigou', name: i18nText("world.maps.7d9b9d78af"), subtitle: i18nText("world.maps.d7a4d4693a"), spawn: { x: 1485, y: 1625 }, description: i18nText("world.maps.755732a17e") },
];
