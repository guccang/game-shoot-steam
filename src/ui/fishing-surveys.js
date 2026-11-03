// 调查复用手机标准分区；不新增覆盖战场的常驻任务窗。
import {FISH_SPECIES,FISH_WATERS} from '../config/fish-catalog.js';
import {fishingSurveyDefinition,fishingSurveyProgress} from '../progression/fishing-surveys.js';
import {fishingPreview} from '../core/lake-fishing.js';
// 位置来自数值坐标与固定目录，存档文本不直接进入页面。
export function fishingSurveyMarkup(game){
 const state=game.progress.outdoors.surveys,def=fishingSurveyDefinition(state),a=state.active,progress=fishingSurveyProgress(state);
 const place=a?`${a.depth?'地下'+a.depth+'层':FISH_WATERS[a.water]} · 湖区坐标 ${Math.round(a.x)}，${Math.round(a.y)}`:'',ready=fishingPreview(game);
 return `<section class="ui-section fishing-surveys"><h3>湖泊调查 · 已完成 ${state.completed} 份</h3><b>${def.name}</b><p>${def.description}</p>${a?`<p>${place}</p>${def.id==='focus'?`<p>指定鱼：${FISH_SPECIES.find(f=>f.id===a.target).name}</p>`:''}<p role="status">调查进度 ${progress} / ${def.goal} · 奖励 ${def.reward} 金币</p><button class="ui-button ui-button--primary" data-outdoor-action="survey-claim" ${progress<def.goal?'disabled':''}>领取调查奖励</button>`:`<p>走到湖岸接取当地委托，地表与地下均可调查。仅记录接取后在指定水域收进鱼护的鱼；无需交出鱼获。</p><p>奖励 ${def.reward} 金币</p><button class="ui-button" data-outdoor-action="survey-accept" ${!ready.lake||ready.shore.distance>85?'disabled':''}>接取当前湖泊调查</button>`}</section>`;
}
