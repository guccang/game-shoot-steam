import {EQUIPMENT_QUESTS} from './equipment-quests.js';
import { i18nText } from "../i18n/index.js";
import {TOWN_LAYOUT} from './town-layout.js';
// 世界任务入口表：地点与故事内容解耦；每个入口仅列出当地提供的故事。
export const STORY_POSTS = [
  {id:'sunleaf-post',mapId:'forest',name:i18nText("config.story-posts.7a0887579e"),...TOWN_LAYOUT.story,approach:{dx:0,dy:30},radius:120,
    chapters:['sunleaf-01','sunleaf-02','sunleaf-03','sunleaf-04','sunleaf-05','sunleaf-06','sunleaf-side-expedition','sunleaf-side-guardian'],
    collection:{title:i18nText("config.story-posts.b2651d4a02"),text:i18nText("config.story-posts.a49700658a"),
      duplicateCoins:1500,options:[{id:'frostbranch',kind:'weapons',index:11},
        {id:'patrol-supplies',kind:'resources',name:i18nText("config.story-posts.7183a2f679"),resources:{coins:1200,wood:400,parts:8}}]}},
  {id:'monster-neighbors',mapId:'forest',name:i18nText("config.monster-stories.a69263b626"),...TOWN_LAYOUT.neighborsPost,approach:{dx:0,dy:40},radius:120,
    chapters:['neighbors-lunch','neighbors-night','neighbors-market'],
    equipmentChapters:EQUIPMENT_QUESTS.map(q=>q.chapter),
    collection:{title:i18nText("config.story-posts.649024a0ca"),text:i18nText("config.story-posts.19857dfe63"),
      duplicateCoins:1000,options:[{id:'firefly',kind:'weapons',index:1},{id:'hovercraft',kind:'vehicle',index:3}]}},
];
